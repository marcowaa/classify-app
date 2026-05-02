export type GameIframePolicy = {
  allowedDomains: string[];
  allowExternalDomains: boolean;
  handshakeRequired: boolean;
  sandboxProfile: "strict-game";
};

function parseAllowedDomains(raw: string | undefined): string[] {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseGameUrl(embedUrl: string): URL | null {
  const value = String(embedUrl || "").trim();
  if (!value) return null;
  try {
    return new URL(value, "http://localhost");
  } catch {
    return null;
  }
}

export function getGameIframePolicy(): GameIframePolicy {
  const allowedDomains = parseAllowedDomains(process.env.GAME_IFRAME_ALLOWED_DOMAINS);
  const allowExternalDomains = process.env.GAME_IFRAME_EXTERNAL_ENABLED !== "0";
  const handshakeRequired = process.env.GAME_IFRAME_REQUIRE_READY_HANDSHAKE !== "0";

  return {
    allowedDomains,
    allowExternalDomains,
    handshakeRequired,
    sandboxProfile: "strict-game",
  };
}

export function isGameUrlAllowed(embedUrl: string, policy: GameIframePolicy): boolean {
  const parsed = parseGameUrl(embedUrl);
  if (!parsed) return false;

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") return false;

  // Relative URLs (resolved to localhost in parser) are always allowed.
  const isRelativeLike = String(embedUrl || "").startsWith("/");
  if (isRelativeLike) return true;

  if (!policy.allowExternalDomains) return false;

  if (policy.allowedDomains.length === 0) {
    // No explicit allow-list configured: allow external domain when policy permits.
    return true;
  }

  const host = parsed.hostname.toLowerCase();
  return policy.allowedDomains.includes(host);
}
