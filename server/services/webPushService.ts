import webpush from "web-push";

type StoredWebSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function hasVapidConfig(): boolean {
  return Boolean(
    process.env["VAPID_PUBLIC_KEY"] &&
      process.env["VAPID_PRIVATE_KEY"] &&
      process.env["VAPID_SUBJECT"]
  );
}

function ensureConfigured() {
  if (!hasVapidConfig()) {
    throw new Error("WEB_PUSH_VAPID_NOT_CONFIGURED");
  }

  webpush.setVapidDetails(
    process.env["VAPID_SUBJECT"] as string,
    process.env["VAPID_PUBLIC_KEY"] as string,
    process.env["VAPID_PRIVATE_KEY"] as string
  );
}

export function getVapidPublicKey(): string | null {
  return process.env["VAPID_PUBLIC_KEY"] || null;
}

export function isWebPushReady(): boolean {
  return hasVapidConfig();
}

export async function sendWebPushNotification(
  subscription: StoredWebSubscription,
  payload: Record<string, any>
) {
  ensureConfigured();

  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const result = await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
    TTL: 60,
    urgency: "high",
  });

  return result;
}
