import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Globe, Loader2 } from "lucide-react";
import { FaApple, FaDiscord, FaFacebookF, FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { getNativeGoogleOAuthCallbackPath, isNativeGoogleSignInAvailable } from "@/lib/nativeGoogleAuth";

const OAUTH_REDIRECT_LOCK_KEY = "classify-oauth-redirect-lock-at";
const OAUTH_REDIRECT_LOCK_MS = 20_000;

interface SocialProvider {
  id: string;
  provider: string;
  displayName: string;
  displayNameAr: string | null;
  iconUrl: string | null;
  iconName: string | null;
  sortOrder: number;
  webEnabled?: boolean;
  nativeEnabled?: boolean;
}

type SocialProvidersQueryPayload = {
  providers: SocialProvider[];
  message: string;
};

const FALLBACK_SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: "fallback-google",
    provider: "google",
    displayName: "Google",
    displayNameAr: "Google",
    iconUrl: null,
    iconName: "chrome",
    sortOrder: 1,
    webEnabled: true,
    nativeEnabled: false,
  },
];

async function fetchSocialProviders(): Promise<SocialProvidersQueryPayload> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("/api/auth/social-providers", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    const json = (await res.json().catch(() => null)) as
      | { data?: unknown; message?: unknown }
      | null;

    const providers = Array.isArray(json?.data) ? (json?.data as SocialProvider[]) : [];
    const message = typeof json?.message === "string" ? json.message : "";

    if (!res.ok) {
      throw new Error(message || `Failed to load social providers (${res.status})`);
    }

    return { providers, message };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const GoogleBrandIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 6.9 2 2.8 6.3 2.8 11.6S6.9 21.2 12 21.2c6.9 0 9.2-4.9 9.2-7.3 0-.5 0-.8-.1-1.2H12z" />
    <path fill="#34A853" d="M3.8 7.2l3.2 2.4C7.9 7.8 9.8 6.4 12 6.4c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3 14.6 2 12 2 8.4 2 5.2 4.1 3.8 7.2z" />
    <path fill="#FBBC05" d="M12 21.2c2.5 0 4.7-.8 6.2-2.2l-2.9-2.4c-.8.6-1.9 1-3.3 1-3.9 0-5.2-2.7-5.5-3.9l-3.1 2.4C4.8 19.1 8.1 21.2 12 21.2z" />
    <path fill="#4285F4" d="M21.2 13.9c0-.5 0-.8-.1-1.2H12v3.9h5.5c-.3 1.6-1.2 2.9-2.2 3.7l2.9 2.4c1.7-1.6 3-4 3-7.8z" />
  </svg>
);

const MicrosoftBrandIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
    <rect x="2" y="2" width="9" height="9" fill="#F25022" />
    <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
    <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
    <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
  </svg>
);

const providerIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  google: GoogleBrandIcon,
  facebook: FaFacebookF,
  apple: FaApple,
  twitter: FaXTwitter,
  github: FaGithub,
  microsoft: MicrosoftBrandIcon,
  linkedin: FaLinkedinIn,
  discord: FaDiscord,
};

const providerIconAliases: Record<string, string> = {
  chrome: "google",
  google: "google",
  x: "twitter",
  twitter: "twitter",
  github: "github",
  monitor: "microsoft",
  microsoft: "microsoft",
  linkedin: "linkedin",
  discord: "discord",
  messagecircle: "discord",
  apple: "apple",
  facebook: "facebook",
};

const normalizeProviderKey = (value: string | null | undefined) => String(value || "").trim().toLowerCase();

function resolveProviderKey(provider: SocialProvider): string {
  const providerKey = normalizeProviderKey(provider.provider);
  if (providerIcons[providerKey]) return providerKey;

  const iconAlias = providerIconAliases[normalizeProviderKey(provider.iconName)];
  if (iconAlias && providerIcons[iconAlias]) {
    return iconAlias;
  }

  return providerKey;
}

const providerBrandStyles: Record<string, {
  buttonBg: string;
  buttonHover: string;
  buttonText: string;
  buttonBorder?: string;
  compactBg: string;
  compactHover: string;
  compactText: string;
  compactBorder?: string;
  badgeBg: string;
  iconColor?: string;
}> = {
  google: {
    buttonBg: "bg-white",
    buttonHover: "hover:bg-gray-50",
    buttonText: "text-gray-800",
    buttonBorder: "border border-gray-300",
    compactBg: "bg-white",
    compactHover: "hover:bg-gray-50",
    compactText: "text-gray-700",
    compactBorder: "border border-gray-300",
    badgeBg: "bg-white",
  },
  facebook: {
    buttonBg: "bg-[#1877F2]",
    buttonHover: "hover:bg-[#166FE5]",
    buttonText: "text-white",
    compactBg: "bg-[#1877F2]",
    compactHover: "hover:bg-[#166FE5]",
    compactText: "text-white",
    badgeBg: "bg-[#1668d8]",
  },
  apple: {
    buttonBg: "bg-black",
    buttonHover: "hover:bg-[#1f1f1f]",
    buttonText: "text-white",
    compactBg: "bg-black",
    compactHover: "hover:bg-[#1f1f1f]",
    compactText: "text-white",
    badgeBg: "bg-[#1f1f1f]",
  },
  twitter: {
    buttonBg: "bg-black",
    buttonHover: "hover:bg-[#1f1f1f]",
    buttonText: "text-white",
    compactBg: "bg-black",
    compactHover: "hover:bg-[#1f1f1f]",
    compactText: "text-white",
    badgeBg: "bg-[#1f1f1f]",
  },
  github: {
    buttonBg: "bg-[#24292F]",
    buttonHover: "hover:bg-[#1B1F23]",
    buttonText: "text-white",
    compactBg: "bg-[#24292F]",
    compactHover: "hover:bg-[#1B1F23]",
    compactText: "text-white",
    badgeBg: "bg-[#1B1F23]",
  },
  microsoft: {
    buttonBg: "bg-white",
    buttonHover: "hover:bg-[#f7f7f7]",
    buttonText: "text-[#1f1f1f]",
    buttonBorder: "border border-gray-300",
    compactBg: "bg-white",
    compactHover: "hover:bg-[#f7f7f7]",
    compactText: "text-[#1f1f1f]",
    compactBorder: "border border-gray-300",
    badgeBg: "bg-white",
  },
  linkedin: {
    buttonBg: "bg-[#0A66C2]",
    buttonHover: "hover:bg-[#004182]",
    buttonText: "text-white",
    compactBg: "bg-[#0A66C2]",
    compactHover: "hover:bg-[#004182]",
    compactText: "text-white",
    badgeBg: "bg-[#0858a5]",
  },
  discord: {
    buttonBg: "bg-[#5865F2]",
    buttonHover: "hover:bg-[#4752C4]",
    buttonText: "text-white",
    compactBg: "bg-[#5865F2]",
    compactHover: "hover:bg-[#4752C4]",
    compactText: "text-white",
    badgeBg: "bg-[#4752C4]",
  },
};

interface SocialLoginButtonsProps {
  onProviderClick?: (provider: string) => void;
  className?: string;
  variant?: "default" | "compact";
  oauthMode?: "login" | "link";
  returnTo?: string;
  disabled?: boolean;
  connectedProviders?: string[];
}

export function SocialLoginButtons({
  onProviderClick,
  className = "",
  variant = "default",
  oauthMode = "login",
  returnTo,
  disabled = false,
  connectedProviders = [],
}: SocialLoginButtonsProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(OAUTH_REDIRECT_LOCK_KEY);
    const lockAt = Number(raw || 0);
    if (!Number.isFinite(lockAt)) {
      window.sessionStorage.removeItem(OAUTH_REDIRECT_LOCK_KEY);
      return;
    }
    if (Date.now() - lockAt > OAUTH_REDIRECT_LOCK_MS) {
      window.sessionStorage.removeItem(OAUTH_REDIRECT_LOCK_KEY);
      return;
    }
    setIsRedirecting(true);
  }, []);

  const { data: payload, isLoading, isError } = useQuery<SocialProvidersQueryPayload>({
    queryKey: ["/api/auth/social-providers"],
    queryFn: fetchSocialProviders,
  });

  const providers = payload?.providers || [];
  const socialDisabledByPolicy = String(payload?.message || "").toLowerCase().includes("disabled");
  const normalizedConnectedProviders = new Set(
    (connectedProviders || [])
      .map((provider) => normalizeProviderKey(provider))
      .filter(Boolean),
  );

  const [nativeGoogleError, setNativeGoogleError] = useState<string>("");

  const isNativeRuntime = isNativeGoogleSignInAvailable();
  const visibleProviders = providers.filter((provider) => {
    const providerKey = normalizeProviderKey(provider.provider);
    const webEnabled = provider.webEnabled !== false;
    const nativeEnabled = provider.nativeEnabled === true;

    if (providerKey === "google") {
      return isNativeRuntime ? (nativeEnabled || webEnabled) : webEnabled;
    }

    return webEnabled;
  });

  const shouldUseFallbackProviders = !isLoading && !socialDisabledByPolicy && isError;
  const providersToRender = shouldUseFallbackProviders ? FALLBACK_SOCIAL_PROVIDERS : visibleProviders;

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (providersToRender.length === 0) {
    return null;
  }

  const handleClick = async (provider: string) => {
    const providerKey = normalizeProviderKey(provider);
    const selectedProvider = providers.find((item) => normalizeProviderKey(item.provider) === providerKey);
    const webEnabled = selectedProvider?.webEnabled !== false;
    const nativeEnabled = selectedProvider?.nativeEnabled === true;

    if (onProviderClick) {
      onProviderClick(providerKey);
      return;
    }

    const normalizedReturnTo = typeof returnTo === "string" && returnTo.startsWith("/")
      ? returnTo
      : "/parent-dashboard";
    const mode = oauthMode === "link" ? "link" : "login";

    if (typeof window !== "undefined") {
      const raw = window.sessionStorage.getItem(OAUTH_REDIRECT_LOCK_KEY);
      const lockAt = Number(raw || 0);
      if (Number.isFinite(lockAt) && Date.now() - lockAt <= OAUTH_REDIRECT_LOCK_MS) {
        return;
      }
      window.sessionStorage.setItem(OAUTH_REDIRECT_LOCK_KEY, String(Date.now()));
    }
    setIsRedirecting(true);

    if (providerKey === "google" && isNativeGoogleSignInAvailable() && nativeEnabled) {
      try {
        const callbackPath = await getNativeGoogleOAuthCallbackPath({
          mode,
          returnTo: normalizedReturnTo,
        });
        window.location.href = callbackPath;
        return;
      } catch (error) {
        console.error("Native Google sign-in failed. NOT falling back to web OAuth.", error);
        setIsRedirecting(false);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(OAUTH_REDIRECT_LOCK_KEY);
        return;
      }
    }

    if (!webEnabled) {
      setIsRedirecting(false);
      return;
    }

    const params = new URLSearchParams({ mode });
    params.set("returnTo", normalizedReturnTo);
    const safeProvider = encodeURIComponent(providerKey);
    window.location.href = `/api/auth/oauth/${safeProvider}?${params.toString()}`;
  };

  const isCompact = variant === "compact";
  const buttonLabel = (displayName: string) => (isArabic ? `المتابعة عبر ${displayName}` : `Continue with ${displayName}`);

  return (
    <div className={`space-y-4 ${className}`}>
      {!isCompact && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {isArabic ? t("socialLogin.or") : "OR"}
            </span>
          </div>
        </div>
      )}

      <div className={isCompact ? "flex items-center gap-3 overflow-x-auto pb-1" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
        {providersToRender.map((provider) => {
          const providerKey = resolveProviderKey(provider);
          const isConnected = normalizedConnectedProviders.has(normalizeProviderKey(provider.provider))
            || normalizedConnectedProviders.has(providerKey);
          const hasMappedIcon = Boolean(providerIcons[providerKey]);
          const IconComponent = providerIcons[providerKey] || Globe;
          const colors = providerBrandStyles[providerKey] || {
            buttonBg: "bg-gray-600",
            buttonHover: "hover:bg-gray-700",
            buttonText: "text-white",
            compactBg: "bg-gray-600",
            compactHover: "hover:bg-gray-700",
            compactText: "text-white",
            badgeBg: "bg-gray-700",
            iconColor: "#ffffff",
          };
          const displayName = isArabic && provider.displayNameAr ? provider.displayNameAr : provider.displayName;

          if (!isCompact) {
            return (
              <button
                key={provider.id}
                type="button"
                className={`w-full h-12 flex items-center gap-3 px-4 rounded-xl font-semibold shadow-sm transition-all duration-200 ${colors.buttonBg} ${colors.buttonHover} ${colors.buttonText} ${colors.buttonBorder || "border border-transparent"} ${isConnected ? "ring-2 ring-emerald-500/60" : ""} disabled:opacity-60 disabled:cursor-not-allowed`}
                onClick={() => handleClick(providerKey)}
                disabled={isRedirecting || disabled}
                title={displayName}
                aria-label={buttonLabel(displayName)}
                data-testid={`button-social-${providerKey}`}
              >
                <span className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full ${colors.badgeBg}`}>
                  {provider.iconUrl && !hasMappedIcon ? (
                    <img src={provider.iconUrl} alt={displayName} className="w-4 h-4" />
                  ) : (
                    <IconComponent
                      className="w-4 h-4"
                      style={colors.iconColor ? { color: colors.iconColor } : undefined}
                    />
                  )}
                  {isConnected && (
                    <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-emerald-500 bg-white rounded-full" />
                  )}
                </span>
                <span className="truncate">{buttonLabel(displayName)}</span>
              </button>
            );
          }

          return (
            <button
              key={provider.id}
              type="button"
              className={`${isCompact ? "w-11 h-11 shrink-0" : "w-12 h-12"} relative rounded-full flex items-center justify-center ${colors.compactBg} ${colors.compactHover} ${colors.compactText} ${colors.compactBorder || ""} ${isConnected ? "ring-2 ring-emerald-500/70" : ""} transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed`}
              onClick={() => handleClick(providerKey)}
              disabled={isRedirecting || disabled}
              title={displayName}
              aria-label={buttonLabel(displayName)}
              data-testid={`button-social-${providerKey}`}
            >
              {provider.iconUrl && !hasMappedIcon ? (
                <img src={provider.iconUrl} alt={displayName} className="w-5 h-5" />
              ) : (
                <IconComponent
                  className="w-5 h-5"
                  style={colors.iconColor ? { color: colors.iconColor } : undefined}
                />
              )}
              {isConnected && (
                <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
