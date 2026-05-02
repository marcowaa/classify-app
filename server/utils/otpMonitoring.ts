type OtpEvent = "send" | "verify_success" | "verify_failed" | "blocked" | "rate_limited";

type OtpEventMeta = {
  purpose?: string | undefined;
  method?: string | undefined;
  destination?: string | undefined;
  parentId?: string | undefined;
  ip?: string | undefined;
  path?: string | undefined;
  reason?: string | undefined;
  otpId?: string | undefined;
  action?: string | undefined;
};

const WINDOW_MS = 60 * 1000;
const ALERT_THRESHOLD = Number(process.env["OTP_ALERT_THRESHOLD"] || "50");
const ALERT_EVENTS = new Set<OtpEvent>(["verify_failed", "blocked", "rate_limited"]);
const eventBuckets: Record<string, number[]> = {};
const lastAlertAt: Record<string, number> = {};

function pruneOldTimestamps(timestamps: number[], cutoff: number) {
  while (timestamps.length > 0 && (timestamps[0] ?? Number.MAX_SAFE_INTEGER) < cutoff) {
    timestamps.shift();
  }
}

export function trackOtpEvent(event: OtpEvent, meta: OtpEventMeta = {}) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const bucket = eventBuckets[event] || (eventBuckets[event] = []);
  bucket.push(now);
  pruneOldTimestamps(bucket, cutoff);

  const payload = {
    event,
    ...meta,
    timestamp: new Date(now).toISOString(),
  };

  console.log(`[OTP_EVENT] ${JSON.stringify(payload)}`);

  if (!ALERT_EVENTS.has(event)) {
    return;
  }

  if (bucket.length >= ALERT_THRESHOLD) {
    const lastAlert = lastAlertAt[event] || 0;
    if (now - lastAlert >= WINDOW_MS) {
      lastAlertAt[event] = now;
      console.warn(`[OTP_ALERT] ${JSON.stringify({
        event,
        count: bucket.length,
        windowSeconds: WINDOW_MS / 1000,
        threshold: ALERT_THRESHOLD,
        timestamp: new Date(now).toISOString(),
      })}`);
    }
  }
}
