import { createHash } from "crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { errorResponse, ErrorCode } from "./apiResponse";
import { trackOtpEvent } from "./otpMonitoring";

const WINDOW_MS = 60 * 1000;
const GLOBAL_API_WINDOW_MS = Math.max(
  10 * 1000,
  Number.parseInt(String(process.env["GLOBAL_API_RATE_LIMIT_WINDOW_MS"] || "60000"), 10) || 60000,
);
const GLOBAL_API_MAX = Math.max(
  60,
  Number.parseInt(String(process.env["GLOBAL_API_RATE_LIMIT_MAX"] || "240"), 10) || 240,
);

function createCustomLimiter(windowMs: number, max: number, keyGenerator: (req: any) => string, eventType?: "rate_limited") {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    // SEC: Disable IP-related validation — we already use ipKeyGenerator() in all key generators
    validate: { xForwardedForHeader: false, ip: false },
    handler: (req, res) => {
      if (eventType) {
        trackOtpEvent(eventType, {
          path: req.path,
          ip: ipKeyGenerator(req.ip || ""),
          destination: req.body?.email || req.body?.phoneNumber,
        });
      }
      res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Too many requests. Please try again later."));
    },
  });
}

function createLimiter(max: number, keyGenerator: (req: any) => string, eventType?: "rate_limited") {
  return createCustomLimiter(WINDOW_MS, max, keyGenerator, eventType);
}

function compositeKey(req: any) {
  const ip = ipKeyGenerator(req.ip || "");
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  return email ? `${ip}:${email}` : ip;
}

function tokenHashFromRequest(req: any): string {
  const rawAuthorization = String(req.headers?.authorization || "");
  if (!rawAuthorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  const token = rawAuthorization.slice(7).trim();
  if (!token) {
    return "";
  }

  return createHash("sha256").update(token).digest("hex").slice(0, 24);
}

export const globalApiLimiter = rateLimit({
  windowMs: GLOBAL_API_WINDOW_MS,
  max: GLOBAL_API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false },
  skip: (req) => {
    if (req.method === "OPTIONS") return true;
    const requestPath = String(req.path || "");
    return (
      requestPath === "/health"
      || requestPath === "/metrics"
      || requestPath === "/payments/stripe/webhook"
    );
  },
  keyGenerator: (req) => {
    const tokenHash = tokenHashFromRequest(req);
    if (tokenHash) {
      return `api:token:${tokenHash}`;
    }

    return `api:ip:${ipKeyGenerator(req.ip || "")}`;
  },
  handler: (_req, res) => {
    res.set("Retry-After", String(Math.ceil(GLOBAL_API_WINDOW_MS / 1000)));
    res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Too many API requests. Please try again later."));
  },
});

export const registerLimiter = createLimiter(5, (req) => ipKeyGenerator(req.ip || ""));
export const loginLimiter = createLimiter(5, compositeKey);
export const otpRequestLimiter = createLimiter(3, compositeKey, "rate_limited");
export const otpVerifyLimiter = createLimiter(5, compositeKey, "rate_limited");
export const childLinkLimiter = createCustomLimiter(15 * 60 * 1000, 5, (req) => ipKeyGenerator(req.ip || ""));
export const childLoginRequestLimiter = createCustomLimiter(15 * 60 * 1000, 10, (req) => ipKeyGenerator(req.ip || ""));
export const childLoginStatusLimiter = createCustomLimiter(60 * 1000, 30, (req) => `${ipKeyGenerator(req.ip || "")}:${req.params?.id || "unknown"}`);

// Financial endpoints rate limiter: 10 requests per minute per user
export const checkoutLimiter = createCustomLimiter(60 * 1000, 10, (req) => {
  const userId = req.user?.userId || req.user?.parentId || ipKeyGenerator(req.ip || "");
  return `checkout:${userId}`;
});

// Parent-child linking rate limiter: 5 requests per 15 minutes per authenticated user
export const parentLinkingLimiter = createCustomLimiter(15 * 60 * 1000, 5, (req) => {
  const userId = req.user?.userId || req.user?.parentId || ipKeyGenerator(req.ip || "");
  return `linking:${userId}`;
});

// Refresh token rate limiter: 5 requests per minute per user
export const refreshTokenLimiter = createCustomLimiter(60 * 1000, 5, (req) => {
  const userId = req.user?.userId || req.user?.childId || ipKeyGenerator(req.ip || "");
  return `refresh:${userId}`;
});

// Public API rate limiter: 30 requests per minute per IP (for unauthenticated data endpoints)
export const publicApiLimiter = createCustomLimiter(60 * 1000, 30, (req) => {
  return `public:${ipKeyGenerator(req.ip || "")}`;
});

// Public SPA/document requests can spike during bot traffic; keep a moderate ceiling per IP.
export const publicPageLimiter = createCustomLimiter(60 * 1000, 240, (req) => {
  return `public-page:${ipKeyGenerator(req.ip || "")}`;
});

// ===== Sensitive Parent Operation Rate Limiters =====

// Deposit rate limiter: 5 requests per 15 minutes per user
export const depositLimiter = createCustomLimiter(15 * 60 * 1000, 5, (req) => {
  const userId = req.user?.userId || ipKeyGenerator(req.ip || "");
  return `deposit:${userId}`;
});

// Wallet operations: 10 per minute per user
export const walletLimiter = createCustomLimiter(60 * 1000, 10, (req) => {
  const userId = req.user?.userId || ipKeyGenerator(req.ip || "");
  return `wallet:${userId}`;
});

// Sensitive parent operations (password change, delete account, gift send): 3 per 15 minutes
export const sensitiveParentLimiter = createCustomLimiter(15 * 60 * 1000, 3, (req) => {
  const userId = req.user?.userId || ipKeyGenerator(req.ip || "");
  return `sensitive:${userId}`;
});

// Screen time settings: 10 per minute per user
export const screenTimeLimiter = createCustomLimiter(60 * 1000, 10, (req) => {
  const userId = req.user?.userId || ipKeyGenerator(req.ip || "");
  return `screentime:${userId}`;
});

// Teacher assignment: 5 per 15 minutes per user
export const teacherAssignmentLimiter = createCustomLimiter(15 * 60 * 1000, 5, (req) => {
  const userId = req.user?.userId || ipKeyGenerator(req.ip || "");
  return `teacher-assign:${userId}`;
});

// Upload proxy operations: 20 per minute per authenticated actor + IP
export const uploadProxyLimiter = createCustomLimiter(60 * 1000, 20, (req) => {
  const actorId =
    req.user?.userId ||
    req.user?.parentId ||
    req.teacher?.teacherId ||
    req.school?.schoolId ||
    req.library?.libraryId ||
    req.admin?.adminId ||
    "anonymous";

  return `upload-proxy:${actorId}:${ipKeyGenerator(req.ip || "")}`;
});

// Child SSE connections: protect against repeated connect/disconnect storms.
export const sseConnectLimiter = createCustomLimiter(60 * 1000, 20, (req) => {
  const tokenHash = tokenHashFromRequest(req);
  const identity = tokenHash || ipKeyGenerator(req.ip || "");
  return `sse:${identity}`;
});

// Direct/object upload endpoints are public-facing by design and need strict IP throttling.
export const directUploadLimiter = createCustomLimiter(60 * 1000, 20, (req) => {
  return `direct-upload:${ipKeyGenerator(req.ip || "")}`;
});

// Object reads are higher-volume than mutation endpoints, so keep a higher ceiling.
export const objectReadLimiter = createCustomLimiter(60 * 1000, 300, (req) => {
  return `object-read:${ipKeyGenerator(req.ip || "")}`;
});

// Game completion is authenticated but still needs abuse protection.
export const gameCompletionLimiter = createCustomLimiter(60 * 1000, 30, (req) => {
  const childId = req.user?.childId || "anonymous";
  return `game-complete:${childId}:${ipKeyGenerator(req.ip || "")}`;
});