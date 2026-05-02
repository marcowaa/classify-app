import { GoogleAuth } from "google-auth-library";
import fs from "node:fs";
import path from "node:path";

type MobilePushPayload = {
  title: string;
  body: string;
  priority?: "normal" | "high" | "max";
  channelId?: string;
  sound?: string;
  badge?: number;
  data?: Record<string, string>;
};

function getFcmServerKey(): string | null {
  return process.env["FCM_SERVER_KEY"] || null;
}

function getFcmProjectId(): string | null {
  return process.env["FCM_PROJECT_ID"] || process.env["FIREBASE_PROJECT_ID"] || null;
}

function getFcmServiceAccountJson(): string | null {
  return process.env["FCM_SERVICE_ACCOUNT_JSON"] || null;
}

function hasGoogleCredentialsFile(): boolean {
  const rawPath = String(process.env["GOOGLE_APPLICATION_CREDENTIALS"] || "").trim();
  if (!rawPath) return false;
  const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  return fs.existsSync(resolvedPath);
}

function hasFcmV1Config(): boolean {
  const projectId = getFcmProjectId();
  const json = getFcmServiceAccountJson();
  const hasInlineJson = Boolean(json && String(json).trim().length > 0);
  return Boolean(projectId && (hasInlineJson || hasGoogleCredentialsFile()));
}

export function isMobilePushReady(): boolean {
  return hasFcmV1Config() || Boolean(getFcmServerKey());
}

async function sendFcmV1Notification(token: string, payload: MobilePushPayload) {
  const projectId = getFcmProjectId();
  if (!projectId) {
    throw new Error("MOBILE_PUSH_FCM_PROJECT_ID_MISSING");
  }

  let credentials: Record<string, unknown> | undefined;
  const serviceAccountJson = getFcmServiceAccountJson();
  if (serviceAccountJson) {
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch {
      throw new Error("MOBILE_PUSH_FCM_SERVICE_ACCOUNT_INVALID_JSON");
    }
  } else if (!hasGoogleCredentialsFile()) {
    throw new Error("MOBILE_PUSH_FCM_SERVICE_ACCOUNT_MISSING");
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!accessToken) {
    throw new Error("MOBILE_PUSH_FCM_ACCESS_TOKEN_UNAVAILABLE");
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        android: {
          priority: payload.priority === "normal" ? "NORMAL" : "HIGH",
          notification: {
            channel_id: payload.channelId || undefined,
            sound: payload.sound || undefined,
            default_sound: true,
          },
        },
        apns: {
          headers: {
            "apns-priority": payload.priority === "normal" ? "5" : "10",
          },
          payload: {
            aps: {
              sound: payload.sound || "default",
              badge: payload.badge,
            },
          },
        },
        data: payload.data || {},
      },
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MOBILE_PUSH_FCM_V1_HTTP_${response.status}`);
  }

  return json;
}

async function sendFcmLegacyNotification(token: string, payload: MobilePushPayload) {
  const serverKey = getFcmServerKey();
  if (!serverKey) {
    throw new Error("MOBILE_PUSH_FCM_NOT_CONFIGURED");
  }

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify({
      to: token,
      priority: payload.priority === "normal" ? "normal" : "high",
      notification: {
        title: payload.title,
        body: payload.body,
        sound: payload.sound || "default",
        android_channel_id: payload.channelId,
      },
      data: payload.data || {},
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MOBILE_PUSH_HTTP_${response.status}`);
  }

  const result = json?.results?.[0];
  if (result?.error) {
    throw new Error(`MOBILE_PUSH_FCM_${result.error}`);
  }

  return json;
}

export async function sendMobilePushNotification(token: string, payload: MobilePushPayload) {
  if (hasFcmV1Config()) {
    return sendFcmV1Notification(token, payload);
  }

  return sendFcmLegacyNotification(token, payload);
}
