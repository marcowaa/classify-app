param(
  [Parameter(Mandatory = $false)]
  [string]$Version,

  [Parameter(Mandatory = $false)]
  [string]$BuildNumber,

  [Parameter(Mandatory = $false)]
  [int]$VersionCode,

  [Parameter(Mandatory = $false)]
  [string]$ApiBase = "https://classi-fy.com",

  [Parameter(Mandatory = $false)]
  [switch]$SkipWebBuild,

  [Parameter(Mandatory = $false)]
  [switch]$SkipAdminUpload,

  [Parameter(Mandatory = $false)]
  [switch]$UseKeystoreFallback,

  [Parameter(Mandatory = $false)]
  [switch]$AllowVersionReuse

  , [Parameter(Mandatory = $false)]
  [switch]$ApkOnly
)

$ErrorActionPreference = "Stop"

function Step([string]$message) {
  Write-Host "[android-release] $message" -ForegroundColor Cyan
}

function Ensure-File([string]$path, [string]$label) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "$label not found: $path"
  }
}

function Ensure-Directory([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function File-SizeLabel([long]$bytes) {
  if ($bytes -ge 1GB) {
    return ("{0:N1} GB" -f ($bytes / 1GB))
  }
  if ($bytes -ge 1MB) {
    return ("{0:N1} MB" -f ($bytes / 1MB))
  }
  if ($bytes -ge 1KB) {
    return ("{0:N1} KB" -f ($bytes / 1KB))
  }
  return "$bytes B"
}

function Copy-Artifact([string]$source, [string]$destination, [string]$label) {
  Copy-Item -LiteralPath $source -Destination $destination -Force
  $size = (Get-Item -LiteralPath $destination).Length
  Write-Host ("  - {0}: {1} ({2})" -f $label, $destination, (File-SizeLabel $size))
}

function Assert-AabSigned([string]$aabPath) {
  $jarsigner = Get-Command jarsigner -ErrorAction SilentlyContinue
  if (-not $jarsigner) {
    throw "jarsigner is not available in PATH. Install JDK and ensure JAVA_HOME/bin is in PATH."
  }

  $verificationOutput = & $jarsigner.Source -verify -verbose -certs $aabPath 2>&1 | Out-String
  if ($verificationOutput -match "(?i)jar is unsigned") {
    throw "Generated AAB is unsigned. Configure CLASSIFY_SIGNING_* (or keystore.properties) before release build."
  }

  if ($LASTEXITCODE -ne 0) {
    throw "AAB signature verification failed. Output: $verificationOutput"
  }

  Step "AAB signature verification passed"
}

function Get-PreviousReleaseMetadata([string[]]$candidatePaths) {
  foreach ($candidate in $candidatePaths) {
    if (-not (Test-Path -LiteralPath $candidate)) {
      continue
    }

    try {
      $raw = Get-Content -LiteralPath $candidate -Raw -Encoding UTF8
      $json = $raw | ConvertFrom-Json
      if ($json) {
        return [pscustomobject]@{
          Path = $candidate
          Data = $json
        }
      }
    }
    catch {
      Write-Warning "Unable to parse previous release metadata at ${candidate}: $($_.Exception.Message)"
    }
  }

  return $null
}

function Assert-ReleaseVersionLock(
  [string]$version,
  [string]$buildNumber,
  [int]$versionCode,
  [string]$releaseTag,
  $previousRelease,
  [switch]$AllowReuse
) {
  if ($AllowReuse) {
    Step "Version reuse guard bypass enabled"
    return
  }

  if ($previousRelease -and $previousRelease.Data) {
    $previousVersion = [string]($previousRelease.Data.version ?? "")
    $previousBuildNumber = [string]($previousRelease.Data.buildNumber ?? "")

    $previousVersionCode = 0
    $hasPreviousVersionCode = [int]::TryParse([string]($previousRelease.Data.versionCode ?? ""), [ref]$previousVersionCode)

    if ($hasPreviousVersionCode -and $previousVersionCode -eq $versionCode) {
      throw "Release version lock violation: versionCode $versionCode already exists in $($previousRelease.Path). Pass -AllowVersionReuse only for explicit rollback/rebuild workflows."
    }

    if ($previousVersion -eq $version -and $previousBuildNumber -eq $buildNumber) {
      throw "Release version lock violation: version/build pair $version/$buildNumber already exists in $($previousRelease.Path). Pass -AllowVersionReuse only for explicit rollback/rebuild workflows."
    }
  }

  $archiveReleaseCandidates = @(
    (Join-Path $root "client/public/apps/archive/release-$releaseTag.json"),
    (Join-Path $root "dist/public/apps/archive/release-$releaseTag.json")
  )

  foreach ($candidate in $archiveReleaseCandidates) {
    if (Test-Path -LiteralPath $candidate) {
      throw "Release version lock violation: archive metadata already exists for release tag $releaseTag at $candidate. Pass -AllowVersionReuse only for explicit rollback/rebuild workflows."
    }
  }
}

function Get-FileSha256([string]$path) {
  $hash = Get-FileHash -LiteralPath $path -Algorithm SHA256
  return $hash.Hash.ToLowerInvariant()
}

function Get-GitRefValue([string[]]$arguments) {
  try {
    $value = (& git @arguments 2>$null | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($value)) {
      return "unknown"
    }
    return $value
  }
  catch {
    return "unknown"
  }
}

function Read-SecretValue([string]$prompt) {
  try {
    $secure = Read-Host -Prompt $prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
  catch {
    return ""
  }
}

function Get-EnvValue([string]$name) {
  $envItem = Get-Item -Path ("Env:" + $name) -ErrorAction SilentlyContinue
  if ($null -eq $envItem) {
    return $null
  }
  return $envItem.Value
}

function Ensure-SigningEnv([switch]$AllowFallback) {
  $requiredVars = @(
    "ANDROID_KEYSTORE_PATH",
    "ANDROID_KEYSTORE_PASSWORD",
    "ANDROID_KEY_ALIAS",
    "ANDROID_KEY_PASSWORD"
  )

  $missing = @($requiredVars | Where-Object { -not (Get-EnvValue $_) })
  if ($missing.Count -eq 0) {
    return
  }

  if ($AllowFallback) {
    Step "Signing env vars missing ($($missing -join ', ')). Falling back to keystore.properties"
    return
  }

  Step "Dynamic signing is required. Missing vars: $($missing -join ', ')"
  foreach ($name in $missing) {
    if ($name -eq "ANDROID_KEYSTORE_PASSWORD" -or $name -eq "ANDROID_KEY_PASSWORD") {
      $value = Read-SecretValue "$name"
    }
    else {
      $value = Read-Host -Prompt $name
    }

    if ($value) {
      Set-Item -Path ("Env:" + $name) -Value $value
    }
  }

  $stillMissing = @($requiredVars | Where-Object { -not (Get-EnvValue $_) })
  if ($stillMissing.Count -gt 0) {
    throw (
      "Missing required signing env vars: $($stillMissing -join ', '). " +
      "Set them before running, or pass -UseKeystoreFallback."
    )
  }
}

function Ensure-WindowsAndroidSdkLocation([string]$androidRootPath) {
  $localProps = Join-Path $androidRootPath "local.properties"
  $sdkDir = $null

  if (Test-Path -LiteralPath $localProps) {
    $sdkLine = Get-Content -LiteralPath $localProps | Where-Object { $_ -match '^sdk\.dir=' } | Select-Object -First 1
    if ($sdkLine) {
      $candidate = ($sdkLine -replace '^sdk\.dir=', '').Trim()
      if ($candidate) {
        $candidate = $candidate -replace '\\\\', '\\'
        if (Test-Path -LiteralPath $candidate) {
          $sdkDir = $candidate
        }
      }
    }
  }

  if (-not $sdkDir) {
    $candidates = @(
      $env:ANDROID_SDK_ROOT,
      $env:ANDROID_HOME,
      (Join-Path $env:LOCALAPPDATA "Android\Sdk"),
      (Join-Path $env:USERPROFILE "AppData\Local\Android\Sdk"),
      "C:\Android\Sdk"
    ) | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique

    foreach ($candidate in $candidates) {
      if (-not (Test-Path -LiteralPath $candidate)) {
        continue
      }

      $hasPlatforms = Test-Path -LiteralPath (Join-Path $candidate "platforms")
      $hasBuildTools = Test-Path -LiteralPath (Join-Path $candidate "build-tools")
      if ($hasPlatforms -or $hasBuildTools) {
        $sdkDir = $candidate
        break
      }
    }
  }

  if (-not $sdkDir) {
    throw "Android SDK not found. Set ANDROID_SDK_ROOT or ANDROID_HOME, or set sdk.dir in android/local.properties"
  }

  Set-Item -Path Env:ANDROID_HOME -Value $sdkDir
  Set-Item -Path Env:ANDROID_SDK_ROOT -Value $sdkDir
  Step "Using ANDROID_SDK_ROOT=$sdkDir"

  $sdkDirForGradle = $sdkDir -replace '\\', '/'

  $existingLines = @()
  if (Test-Path -LiteralPath $localProps) {
    $existingLines = Get-Content -LiteralPath $localProps | Where-Object { $_ -notmatch '^sdk\.dir=' }
  }

  $nextLines = @($existingLines) + @("sdk.dir=$sdkDirForGradle")
  Set-Content -LiteralPath $localProps -Value $nextLines -Encoding utf8
}

function Ensure-WindowsGradleJavaCompatibility() {
  $javaVersionOutput = ""
  try {
    $javaVersionOutput = (& java -version 2>&1 | Out-String)
  }
  catch {
    $javaVersionOutput = ""
  }

  $major = $null
  if ($javaVersionOutput -match 'version\s+"(?<major>\d+)') {
    $major = [int]$Matches.major
  }

  if ($major -and $major -lt 25) {
    Step "Using Java runtime version $major for Gradle"
    return
  }

  $candidates = @(
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot",
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot",
    "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"
  )

  $selected = $null
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath (Join-Path $candidate "bin\java.exe")) {
      $selected = $candidate
      break
    }
  }

  if (-not $selected) {
    throw "No compatible Java runtime found for Gradle. Install JDK 17 or 21."
  }

  Set-Item -Path Env:JAVA_HOME -Value $selected
  $javaBin = Join-Path $selected "bin"
  if ($env:Path -notlike "$javaBin*") {
    $env:Path = "$javaBin;$env:Path"
  }

  Step "Switched JAVA_HOME to compatible runtime: $selected"
  try {
    & (Join-Path $selected "bin\java.exe") -version | Out-Host
  }
  catch {
    Step "Unable to print Java version from selected runtime"
  }
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$androidRoot = Join-Path $root "android"
$gradleWrapper = Join-Path $androidRoot "gradlew.bat"
Ensure-File $gradleWrapper "Gradle wrapper"

if ([string]::IsNullOrWhiteSpace($Version)) {
  if ($env:ANDROID_APP_VERSION) {
    $Version = $env:ANDROID_APP_VERSION.Trim()
  }
  else {
    $Version = Get-Date -Format "yyyy.MM.dd"
  }
}

if ([string]::IsNullOrWhiteSpace($BuildNumber)) {
  if ($env:ANDROID_APP_BUILD_NUMBER) {
    $BuildNumber = $env:ANDROID_APP_BUILD_NUMBER.Trim()
  }
  else {
    $BuildNumber = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
  }
}

if ($Version -notmatch '^[0-9A-Za-z._-]+$') {
  throw "Version contains unsupported characters: $Version"
}

if ($BuildNumber -notmatch '^[0-9A-Za-z._-]+$') {
  throw "BuildNumber contains unsupported characters: $BuildNumber"
}

if ($VersionCode -le 0) {
  if ($env:ANDROID_VERSION_CODE -and $env:ANDROID_VERSION_CODE -match '^[0-9]+$') {
    $VersionCode = [int]$env:ANDROID_VERSION_CODE
  }
  elseif ($BuildNumber -match '^[0-9]+$') {
    $VersionCode = [int][Math]::Min([int64]$BuildNumber, 2147483647)
  }
  else {
    $VersionCode = [int][Math]::Min([DateTimeOffset]::UtcNow.ToUnixTimeSeconds(), 2147483647)
  }
}

if ($VersionCode -le 0) {
  throw "VersionCode must be a positive integer"
}

$releaseTag = "v$Version-b$BuildNumber"

$previousReleaseMetadata = Get-PreviousReleaseMetadata -candidatePaths @(
  (Join-Path $root "client/public/apps/latest-release.json"),
  (Join-Path $root "dist/public/apps/latest-release.json")
)

if ($previousReleaseMetadata) {
  Step "Detected previous release metadata: $($previousReleaseMetadata.Path)"
}

Assert-ReleaseVersionLock -version $Version -buildNumber $BuildNumber -versionCode $VersionCode -releaseTag $releaseTag -previousRelease $previousReleaseMetadata -AllowReuse:$AllowVersionReuse

$appsDirs = @(
  (Join-Path $root "client/public/apps"),
  (Join-Path $root "dist/public/apps")
)

$archiveDirs = @(
  (Join-Path $root "client/public/apps/archive"),
  (Join-Path $root "dist/public/apps/archive")
)

foreach ($dir in $appsDirs + $archiveDirs) {
  Ensure-Directory $dir
}

Step "Release tag: $releaseTag"
Step "Android versionName=$Version versionCode=$VersionCode"
Ensure-SigningEnv -AllowFallback:$UseKeystoreFallback

if (-not $SkipWebBuild) {
  Step "Building web app + Capacitor sync (VITE_API_BASE=$ApiBase)"
  $env:VITE_API_BASE = $ApiBase
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed"
  }

  $distPublicDir = Join-Path $root "dist/public"
  $distAppsDir = Join-Path $distPublicDir "apps"
  $distAppsMobileBackupDir = Join-Path $distPublicDir "apps.mobile-build-backup"
  $appsMovedForMobileSync = $false

  if (Test-Path -LiteralPath $distAppsMobileBackupDir) {
    Remove-Item -LiteralPath $distAppsMobileBackupDir -Recurse -Force
  }

  try {
    if (Test-Path -LiteralPath $distAppsDir) {
      Step "Temporarily excluding dist/public/apps from Capacitor assets to keep mobile package slim"
      Move-Item -LiteralPath $distAppsDir -Destination $distAppsMobileBackupDir -Force
      $appsMovedForMobileSync = $true
    }

    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
      throw "npx cap sync android failed"
    }

    Step "Running strict Capacitor production checks"
    node ./scripts/capacitor-production-check.cjs --strict
    if ($LASTEXITCODE -ne 0) {
      throw "capacitor production checks failed"
    }
  }
  finally {
    if ($appsMovedForMobileSync -and (Test-Path -LiteralPath $distAppsMobileBackupDir)) {
      if (Test-Path -LiteralPath $distAppsDir) {
        Remove-Item -LiteralPath $distAppsDir -Recurse -Force
      }
      Move-Item -LiteralPath $distAppsMobileBackupDir -Destination $distAppsDir -Force
      Step "Restored dist/public/apps after Capacitor sync"
    }
  }

  Remove-Item Env:VITE_API_BASE -ErrorAction SilentlyContinue
}
else {
  Step "SkipWebBuild enabled - skipping web build and cap sync"
}

if ($ApkOnly) {
  Step "Building Android release artifacts (APK only)"
}
else {
  Step "Building Android release artifacts (APK + AAB)"
}
Push-Location $androidRoot
try {
  Ensure-WindowsGradleJavaCompatibility
  Ensure-WindowsAndroidSdkLocation -androidRootPath $androidRoot

  $gradleProps = @(
    "-PCLASSIFY_VERSION_NAME=$Version",
    "-PCLASSIFY_VERSION_CODE=$VersionCode"
  )

  $gradleReleaseSkips = @(
    "-x", "lintVitalRelease",
    "-x", "lintVitalAnalyzeRelease",
    "-x", "lintVitalReportRelease"
  )

  if ($env:ANDROID_KEYSTORE_PATH -and $env:ANDROID_KEYSTORE_PASSWORD -and $env:ANDROID_KEY_ALIAS -and $env:ANDROID_KEY_PASSWORD) {
    Step "Using signing credentials from environment"
    $gradleProps += "-PCLASSIFY_SIGNING_STORE_FILE=$($env:ANDROID_KEYSTORE_PATH)"
    $gradleProps += "-PCLASSIFY_SIGNING_STORE_PASSWORD=$($env:ANDROID_KEYSTORE_PASSWORD)"
    $gradleProps += "-PCLASSIFY_SIGNING_KEY_ALIAS=$($env:ANDROID_KEY_ALIAS)"
    $gradleProps += "-PCLASSIFY_SIGNING_KEY_PASSWORD=$($env:ANDROID_KEY_PASSWORD)"
  }
  else {
    Step "Using existing Android signing configuration (keystore.properties)"
  }

  & $gradleWrapper clean
  if ($LASTEXITCODE -ne 0) {
    throw "gradlew clean failed"
  }

  & $gradleWrapper assembleRelease @gradleProps @gradleReleaseSkips
  if ($LASTEXITCODE -ne 0) {
    throw "gradlew assembleRelease failed"
  }

  if (-not $ApkOnly) {
    & $gradleWrapper bundleRelease @gradleProps @gradleReleaseSkips
    if ($LASTEXITCODE -ne 0) {
      throw "gradlew bundleRelease failed"
    }
  }
}
finally {
  Pop-Location
}

$apkSource = Join-Path $androidRoot "app/build/outputs/apk/release/app-release.apk"

Ensure-File $apkSource "APK output"
if (-not $ApkOnly) {
  $aabSource = Join-Path $androidRoot "app/build/outputs/bundle/release/app-release.aab"
  Ensure-File $aabSource "AAB output"
  Assert-AabSigned -aabPath $aabSource
}

$latestApkName = "classify-app-latest.apk"
$latestAabName = "classify-googleplay-latest.aab"
$versionedApkName = "classify-app-$releaseTag.apk"
$versionedAabName = "classify-googleplay-$releaseTag.aab"

Step "Publishing artifacts to apps/ and apps/archive"
foreach ($appsDir in $appsDirs) {
  Copy-Artifact $apkSource (Join-Path $appsDir $latestApkName) "latest APK"
  if (-not $ApkOnly) {
    Copy-Artifact $aabSource (Join-Path $appsDir $latestAabName) "latest AAB"
  }
}

if (-not $ApkOnly) {
  foreach ($archiveDir in $archiveDirs) {
    Copy-Artifact $apkSource (Join-Path $archiveDir $versionedApkName) "versioned APK"
    Copy-Artifact $aabSource (Join-Path $archiveDir $versionedAabName) "versioned AAB"
  }
}

$apkInfo = Get-Item -LiteralPath (Join-Path $root "client/public/apps/$latestApkName")
$apkSha256 = Get-FileSha256 -path $apkInfo.FullName
$signedAabVerified = -not $ApkOnly

if (-not $ApkOnly) {
  $aabInfo = Get-Item -LiteralPath (Join-Path $root "client/public/apps/$latestAabName")
  $aabSha256 = Get-FileSha256 -path $aabInfo.FullName
}

$gitCommit = Get-GitRefValue -arguments @("-C", "$root", "rev-parse", "HEAD")
$gitBranch = Get-GitRefValue -arguments @("-C", "$root", "rev-parse", "--abbrev-ref", "HEAD")
$provenance = [ordered]@{
  scriptPath         = "scripts/publish-android-release.ps1"
  gitCommit          = $gitCommit
  gitBranch          = $gitBranch
  signedAabVerified  = $signedAabVerified
  versionReuseBypass = [bool]$AllowVersionReuse
  generatedAt        = (Get-Date).ToUniversalTime().ToString("o")
}

$releaseContent = [ordered]@{
  copyKeys    = [ordered]@{
    downloadTitle       = "downloadApp"
    downloadDescription = "downloadAppDesc"
    screenshotsTitle    = "downloadAppPage.screenshotsTitle"
    apkCta              = "downloadAppPage.downloadApkCta"
    pwaAriaLabel        = "downloadAppPage.pwaZipAriaLabel"
  }
  listing     = [ordered]@{
    storeShortDesc = "Safe kids learning app with family guidance"
    storeFullDesc  = "Classify helps families build healthy learning habits through interactive educational activities, rewards, and family guidance tools."
    playPromoText  = "New seasonal activities and improved child progress insights."
  }
  screenshots = @(
    "/screenshots/classify/classify-1.jpeg",
    "/screenshots/classify/classify-2.jpeg",
    "/screenshots/classify/classify-3.jpeg",
    "/screenshots/classify/classify-4.jpeg",
    "/screenshots/classify/classify-5.jpeg"
  )
  channels    = [ordered]@{
    apk = [ordered]@{
      label     = "APK"
      latestUrl = "/apps/$latestApkName"
    }
    pwa = [ordered]@{
      label     = "PWA"
      latestUrl = "/apps/classify-pwa-latest.zip"
    }
  }
}

if (-not $ApkOnly) {
  $releaseContent.copyKeys.aabAriaLabel = "downloadAppPage.aabAriaLabel"
  $releaseContent.channels.aab = [ordered]@{
    label     = "AAB"
    latestUrl = "/apps/$latestAabName"
  }
}

$releaseContentPath = Join-Path $root "client/public/apps/release-content.json"
if (Test-Path -LiteralPath $releaseContentPath) {
  try {
    $rawReleaseContent = Get-Content -LiteralPath $releaseContentPath -Raw -Encoding UTF8
    $parsedReleaseContent = $rawReleaseContent | ConvertFrom-Json

    if ($parsedReleaseContent.copyKeys) {
      $copyKeyList = @("downloadTitle", "downloadDescription", "screenshotsTitle", "apkCta", "pwaAriaLabel")
      if (-not $ApkOnly) {
        $copyKeyList += "aabAriaLabel"
      }
      foreach ($key in $copyKeyList) {
        $value = $parsedReleaseContent.copyKeys.$key
        if ($value -is [string] -and -not [string]::IsNullOrWhiteSpace($value)) {
          $releaseContent.copyKeys[$key] = $value
        }
      }
    }

    if ($parsedReleaseContent.listing) {
      foreach ($key in @("storeShortDesc", "storeFullDesc", "playPromoText")) {
        $value = $parsedReleaseContent.listing.$key
        if ($value -is [string] -and -not [string]::IsNullOrWhiteSpace($value)) {
          $releaseContent.listing[$key] = $value
        }
      }
    }

    if ($parsedReleaseContent.screenshots -is [System.Array]) {
      $filteredScreenshots = @($parsedReleaseContent.screenshots | Where-Object { $_ -is [string] -and -not [string]::IsNullOrWhiteSpace($_) })
      if ($filteredScreenshots.Count -gt 0) {
        $releaseContent.screenshots = $filteredScreenshots
      }
    }

    if ($parsedReleaseContent.channels) {
      $channelList = @("apk", "pwa")
      if (-not $ApkOnly) {
        $channelList += "aab"
      }
      foreach ($channel in $channelList) {
        $entry = $parsedReleaseContent.channels.$channel
        if (-not $entry) {
          continue
        }

        $label = $entry.label
        if ($label -is [string] -and -not [string]::IsNullOrWhiteSpace($label)) {
          $releaseContent.channels[$channel].label = $label
        }

        $latestUrl = $entry.latestUrl
        if ($latestUrl -is [string] -and -not [string]::IsNullOrWhiteSpace($latestUrl)) {
          $releaseContent.channels[$channel].latestUrl = $latestUrl
        }
      }
    }
  }
  catch {
    Write-Warning "Unable to parse release-content.json, using defaults: $($_.Exception.Message)"
  }
}

$apkFileEntry = [ordered]@{
  latestUrl = "/apps/$latestApkName"
  bytes     = $apkInfo.Length
  size      = (File-SizeLabel $apkInfo.Length)
  sha256    = $apkSha256
  name      = $latestApkName
}

if (-not $ApkOnly) {
  $apkFileEntry.archiveUrl = "/apps/archive/$versionedApkName"
}

$metadataFiles = [ordered]@{
  apk = $apkFileEntry
}

if (-not $ApkOnly) {
  $metadataFiles.aab = @{
    latestUrl  = "/apps/$latestAabName"
    archiveUrl = "/apps/archive/$versionedAabName"
    bytes      = $aabInfo.Length
    size       = (File-SizeLabel $aabInfo.Length)
    sha256     = $aabSha256
    name       = $latestAabName
  }
}

$metadata = [ordered]@{
  releaseTag  = $releaseTag
  version     = $Version
  buildNumber = $BuildNumber
  versionCode = $VersionCode
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  apiBase     = $ApiBase
  provenance  = $provenance
  aso         = $releaseContent
  files       = $metadataFiles
}

$metadataJson = $metadata | ConvertTo-Json -Depth 10

$metadataTargets = @(
  (Join-Path $root "client/public/apps/latest-release.json"),
  (Join-Path $root "dist/public/apps/latest-release.json")
)

if (-not $ApkOnly) {
  $metadataTargets += @(
    (Join-Path $root "client/public/apps/archive/release-$releaseTag.json"),
    (Join-Path $root "dist/public/apps/archive/release-$releaseTag.json")
  )
}

$provenanceJson = ($provenance | ConvertTo-Json -Depth 10)
$provenanceTargets = @(
  (Join-Path $root "client/public/apps/latest-provenance.json"),
  (Join-Path $root "dist/public/apps/latest-provenance.json")
)

if (-not $ApkOnly) {
  $provenanceTargets += @(
    (Join-Path $root "client/public/apps/archive/provenance-$releaseTag.json"),
    (Join-Path $root "dist/public/apps/archive/provenance-$releaseTag.json")
  )
}

$checksumsLatestContent = if ($ApkOnly) {
  "$apkSha256  $latestApkName"
}
else {
  @(
    "$apkSha256  $latestApkName",
    "$aabSha256  $latestAabName"
  ) -join "`n"
}

$checksumsTargets = @(
  [pscustomobject]@{ Path = (Join-Path $root "client/public/apps/checksums-latest.txt"); Content = $checksumsLatestContent },
  [pscustomobject]@{ Path = (Join-Path $root "dist/public/apps/checksums-latest.txt"); Content = $checksumsLatestContent }
)

if (-not $ApkOnly) {
  $checksumsArchiveContent = @(
    "$apkSha256  $versionedApkName",
    "$aabSha256  $versionedAabName"
  ) -join "`n"

  $checksumsTargets += @(
    [pscustomobject]@{ Path = (Join-Path $root "client/public/apps/archive/checksums-$releaseTag.txt"); Content = $checksumsArchiveContent },
    [pscustomobject]@{ Path = (Join-Path $root "dist/public/apps/archive/checksums-$releaseTag.txt"); Content = $checksumsArchiveContent }
  )
}

foreach ($target in $metadataTargets) {
  Ensure-Directory (Split-Path -Parent $target)
  [System.IO.File]::WriteAllText($target, $metadataJson, [System.Text.UTF8Encoding]::new($false))
}

foreach ($target in $provenanceTargets) {
  Ensure-Directory (Split-Path -Parent $target)
  [System.IO.File]::WriteAllText($target, $provenanceJson, [System.Text.UTF8Encoding]::new($false))
}

foreach ($target in $checksumsTargets) {
  Ensure-Directory (Split-Path -Parent $target.Path)
  [System.IO.File]::WriteAllText($target.Path, ($target.Content + "`n"), [System.Text.UTF8Encoding]::new($false))
}

if (-not $SkipAdminUpload -and $env:CLASSIFY_ADMIN_TOKEN) {
  $adminApiBase = if ($env:CLASSIFY_API_BASE) { $env:CLASSIFY_API_BASE } else { $ApiBase }
  $registerEndpoint = "$($adminApiBase.TrimEnd('/'))/api/admin/mobile-apk-builds/register"
  $legacyUploadEndpoint = "$($adminApiBase.TrimEnd('/'))/api/admin/mobile-apk-builds/upload"
  if ($ApkOnly) {
    $adminNotes = "Automated publish ($releaseTag) | APK-only"
  }
  else {
    $aabLatestPath = "/apps/$latestAabName"
    $aabArchivePath = "/apps/archive/$versionedAabName"
    $adminNotes = "Automated publish ($releaseTag) | AAB: $aabLatestPath | AAB archive: $aabArchivePath"
  }

  Step "Registering latest APK in admin builds API: $registerEndpoint"
  try {
    $headers = @{ Authorization = "Bearer $($env:CLASSIFY_ADMIN_TOKEN)" }
    $registerBody = @{
      version       = $Version
      buildNumber   = $BuildNumber
      notes         = $adminNotes
      activateNow   = $true
      fileUrl       = "/apps/$latestApkName"
      fileName      = $latestApkName
      fileSizeBytes = [int64]$apkInfo.Length
      mimeType      = "application/vnd.android.package-archive"
    } | ConvertTo-Json -Depth 10

    $resp = Invoke-RestMethod -Uri $registerEndpoint -Method Post -Headers $headers -ContentType "application/json" -Body $registerBody
    Write-Host "  - Admin register success"
    if ($resp -and $resp.success -eq $false) {
      Write-Warning "Admin register API returned success=false"
    }
  }
  catch {
    Write-Warning "Admin register failed; trying legacy upload endpoint"
    try {
      $curlFormArgs = @(
        "-X", "POST",
        "-H", "Authorization: Bearer $($env:CLASSIFY_ADMIN_TOKEN)",
        "-F", "version=$Version",
        "-F", "buildNumber=$BuildNumber",
        "-F", "notes=$adminNotes",
        "-F", "activateNow=true",
        "-F", "apkFile=@$($root)\\client\\public\\apps\\$latestApkName",
        $legacyUploadEndpoint
      )

      & curl.exe @curlFormArgs | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "curl legacy upload failed with code $LASTEXITCODE"
      }
      Write-Host "  - Legacy admin upload success"
    }
    catch {
      Write-Warning "Admin registration/upload failed: $($_.Exception.Message)"
    }
  }
}
else {
  Step "Skipping admin API upload (set CLASSIFY_ADMIN_TOKEN to enable)"
}

Step "Done. Download links now point to:"
Write-Host "  - /apps/$latestApkName"
if (-not $ApkOnly) {
  Write-Host "  - /apps/$latestAabName"
  Write-Host "  - archive: /apps/archive/$versionedApkName"
  Write-Host "  - archive: /apps/archive/$versionedAabName"
}
