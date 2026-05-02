const IPV4_LITERAL_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function parsePort(rawPort: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(rawPort || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

function appendHttpOrigin(origins: Set<string>, raw: string): void {
  const value = String(raw || "").trim();
  if (!value) return;

  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return;
    origins.add(parsed.origin.toLowerCase());
  } catch {
    // Ignore malformed origin candidates.
  }
}

function buildUploadProxyAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const minioPort = parsePort(process.env["MINIO_PORT"], 9000);
  const minioScheme = String(process.env["MINIO_USE_SSL"] || "").trim().toLowerCase() === "true" ? "https" : "http";
  const minioEndpointRaw = String(process.env["MINIO_ENDPOINT"] || "").trim();

  if (minioEndpointRaw) {
    if (minioEndpointRaw.startsWith("http://") || minioEndpointRaw.startsWith("https://")) {
      appendHttpOrigin(origins, minioEndpointRaw);
    } else {
      const endpointHost = minioEndpointRaw.split("/")[0].trim();
      if (endpointHost) {
        const hasExplicitPort = endpointHost.includes(":") || endpointHost.startsWith("[");
        const hostWithPort = hasExplicitPort ? endpointHost : `${endpointHost}:${minioPort}`;
        appendHttpOrigin(origins, `${minioScheme}://${hostWithPort}`);
      }
    }
  }

  appendHttpOrigin(origins, `${minioScheme}://minio:${minioPort}`);

  if (process.env["NODE_ENV"] !== "production") {
    appendHttpOrigin(origins, `${minioScheme}://localhost:${minioPort}`);
    appendHttpOrigin(origins, `${minioScheme}://127.0.0.1:${minioPort}`);
    appendHttpOrigin(origins, `${minioScheme}://[::1]:${minioPort}`);
  }

  const extraOriginsRaw = String(process.env["UPLOAD_PROXY_ALLOWED_ORIGINS"] || "").trim();
  if (extraOriginsRaw) {
    for (const candidate of extraOriginsRaw.split(",")) {
      appendHttpOrigin(origins, candidate);
    }
  }

  return origins;
}

function isPrivateIpv4(hostname: string): boolean {
  if (!IPV4_LITERAL_REGEX.test(hostname)) return false;

  const octets = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!host.includes(":")) return false;
  if (host === "::1") return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80:")) return true;
  return false;
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;

  if (host === "localhost" || host === "::1" || host === "[::1]") return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isPrivateIpv4(host)) return true;
  if (isPrivateIpv6(host)) return true;

  return false;
}

export type UploadProxyTargetValidationResult =
  | { ok: true; targetUrl: string }
  | { ok: false; message: string };

export function resolveSafeUploadProxyTarget(rawUrl: unknown): UploadProxyTargetValidationResult {
  const uploadUrl = String(rawUrl || "").trim();
  if (!uploadUrl) {
    return { ok: false, message: "Upload URL required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(uploadUrl);
  } catch {
    return { ok: false, message: "Invalid upload URL" };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return { ok: false, message: "Upload URL protocol is not allowed" };
  }

  if (parsed.username || parsed.password || parsed.hash) {
    return { ok: false, message: "Upload URL is malformed" };
  }

  if (!parsed.pathname || parsed.pathname.includes("..")) {
    return { ok: false, message: "Upload URL path is invalid" };
  }

  const allowedOrigins = buildUploadProxyAllowedOrigins();
  const normalizedOrigin = parsed.origin.toLowerCase();
  if (!allowedOrigins.has(normalizedOrigin)) {
    return { ok: false, message: "Upload host is not allowed" };
  }

  return {
    ok: true,
    targetUrl: new URL(`${parsed.pathname}${parsed.search}`, normalizedOrigin).toString(),
  };
}
