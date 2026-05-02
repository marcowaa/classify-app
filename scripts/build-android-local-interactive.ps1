param(
  [switch]$SkipDependencyInstall,
  [switch]$SkipWebBuild,
  [string]$ApiBase = "https://classi-fy.com"
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function To-PlainText([Security.SecureString]$SecureValue) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Require-FilePath([string]$Prompt) {
  while ($true) {
    $value = (Read-Host $Prompt).Trim()
    if (-not $value) {
      Write-Host "Value cannot be empty." -ForegroundColor Yellow
      continue
    }

    if (-not (Test-Path -LiteralPath $value -PathType Leaf)) {
      Write-Host "File not found: $value" -ForegroundColor Yellow
      continue
    }

    return (Resolve-Path -LiteralPath $value).Path
  }
}

function Require-Text([string]$Prompt) {
  while ($true) {
    $value = (Read-Host $Prompt).Trim()
    if ($value) { return $value }
    Write-Host "Value cannot be empty." -ForegroundColor Yellow
  }
}

Step "Local Android Professional Build (APK + AAB)"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

$publishScript = Join-Path $root "scripts/publish-android-release.ps1"
if (-not (Test-Path -LiteralPath $publishScript)) {
  throw "Missing publish script: $publishScript"
}

$keystorePath = Require-FilePath "Keystore path (.jks/.keystore/.p12)"
$keyAlias = Require-Text "Key alias"

$storePassSecure = Read-Host "Keystore password" -AsSecureString
$useSamePass = (Read-Host "Use same password for key password? (Y/n)").Trim().ToLowerInvariant()
if (-not $useSamePass -or $useSamePass -eq "y" -or $useSamePass -eq "yes") {
  $keyPassSecure = $storePassSecure
}
else {
  $keyPassSecure = Read-Host "Key password" -AsSecureString
}

$storePassPlain = To-PlainText $storePassSecure
$keyPassPlain = To-PlainText $keyPassSecure

$oldEnv = @{}
$envNames = @(
  "ANDROID_KEYSTORE_PATH",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD"
)

foreach ($name in $envNames) {
  $oldEnv[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

try {
  Step "Exporting signing env vars for this terminal session"
  $env:ANDROID_KEYSTORE_PATH = $keystorePath
  $env:ANDROID_KEYSTORE_PASSWORD = $storePassPlain
  $env:ANDROID_KEY_ALIAS = $keyAlias
  $env:ANDROID_KEY_PASSWORD = $keyPassPlain

  Step "Running publish script"
  $args = @("-ApiBase", $ApiBase)
  if ($SkipDependencyInstall) { $args += "-SkipDependencyInstall" }
  if ($SkipWebBuild) { $args += "-SkipWebBuild" }

  & $publishScript @args

  Step "Verifying output artifacts"
  $expected = @(
    "client/public/apps/classify-app-latest.apk",
    "client/public/apps/classify-googleplay-latest.aab",
    "dist/public/apps/classify-app-latest.apk",
    "dist/public/apps/classify-googleplay-latest.aab"
  )

  $missing = @()
  foreach ($relativePath in $expected) {
    $fullPath = Join-Path $root $relativePath
    if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
      $item = Get-Item -LiteralPath $fullPath
      Write-Host ("OK  {0}  ({1} bytes)" -f $relativePath, $item.Length) -ForegroundColor Green
    }
    else {
      $missing += $relativePath
      Write-Host "MISS $relativePath" -ForegroundColor Red
    }
  }

  if ($missing.Count -gt 0) {
    throw "Build completed but expected artifacts are missing."
  }

  Step "Done"
  Write-Host "Professional signed APK + AAB were created successfully." -ForegroundColor Green
}
finally {
  foreach ($name in $envNames) {
    $previous = $oldEnv[$name]
    if ($null -eq $previous) {
      Remove-Item ("Env:{0}" -f $name) -ErrorAction SilentlyContinue
    }
    else {
      [Environment]::SetEnvironmentVariable($name, $previous, "Process")
    }
  }

  # Reduce the chance of password values lingering in process variables.
  $storePassPlain = $null
  $keyPassPlain = $null
  [System.GC]::Collect()
}