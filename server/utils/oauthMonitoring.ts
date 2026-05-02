type OAuthMetricName =
  | "oauth_start_total"
  | "oauth_callback_success_total"
  | "oauth_invalid_state_total"
  | "oauth_pkce_missing_total"
  | "oauth_lock_conflict_total";

type OAuthMetricMeta = {
  provider?: string;
  reason?: string;
};

const counters: Record<OAuthMetricName, number> = {
  oauth_start_total: 0,
  oauth_callback_success_total: 0,
  oauth_invalid_state_total: 0,
  oauth_pkce_missing_total: 0,
  oauth_lock_conflict_total: 0,
};

const ALERT_WINDOW_MS = 60 * 1000;
const ALERT_THRESHOLD_INVALID_STATE = Math.max(1, Number.parseInt(String(process.env["OAUTH_ALERT_THRESHOLD_INVALID_STATE"] || "20"), 10) || 20);
const ALERT_THRESHOLD_LOCK_CONFLICT = Math.max(1, Number.parseInt(String(process.env["OAUTH_ALERT_THRESHOLD_LOCK_CONFLICT"] || "20"), 10) || 20);
const alertBuckets: Partial<Record<OAuthMetricName, number[]>> = {};
const lastAlertAt: Partial<Record<OAuthMetricName, number>> = {};

function getAlertThreshold(metric: OAuthMetricName): number {
  if (metric === "oauth_invalid_state_total") return ALERT_THRESHOLD_INVALID_STATE;
  if (metric === "oauth_lock_conflict_total") return ALERT_THRESHOLD_LOCK_CONFLICT;
  return Number.MAX_SAFE_INTEGER;
}

function shouldTrackAlert(metric: OAuthMetricName): boolean {
  return metric === "oauth_invalid_state_total" || metric === "oauth_lock_conflict_total";
}

function pruneBucket(timestamps: number[], cutoff: number): void {
  while (timestamps.length > 0 && (timestamps[0] ?? Number.MAX_SAFE_INTEGER) < cutoff) {
    timestamps.shift();
  }
}

export function trackOAuthMetric(metric: OAuthMetricName, meta: OAuthMetricMeta = {}): void {
  counters[metric] += 1;
  const now = Date.now();

  console.log(`[OAUTH_METRIC] ${JSON.stringify({
    metric,
    value: counters[metric],
    ...meta,
    timestamp: new Date(now).toISOString(),
  })}`);

  if (!shouldTrackAlert(metric)) {
    return;
  }

  const bucket = alertBuckets[metric] || (alertBuckets[metric] = []);
  const cutoff = now - ALERT_WINDOW_MS;
  bucket.push(now);
  pruneBucket(bucket, cutoff);

  const threshold = getAlertThreshold(metric);
  if (bucket.length < threshold) {
    return;
  }

  const last = lastAlertAt[metric] || 0;
  if (now - last < ALERT_WINDOW_MS) {
    return;
  }

  lastAlertAt[metric] = now;
  console.warn(`[OAUTH_ALERT] ${JSON.stringify({
    metric,
    count: bucket.length,
    threshold,
    windowSeconds: ALERT_WINDOW_MS / 1000,
    ...meta,
    timestamp: new Date(now).toISOString(),
  })}`);
}

export function getOAuthMetricSnapshot(): Record<OAuthMetricName, number> {
  return { ...counters };
}
