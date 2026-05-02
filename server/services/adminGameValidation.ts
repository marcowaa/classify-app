export type NormalizedGamePayload = {
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  category: string;
  minAge: number | null;
  maxAge: number | null;
  pointsPerPlay: number;
  maxPlaysPerDay: number;
};

export const normalizeGameEmbedUrl = (raw: unknown): string => {
  const value = String(raw || "").trim();
  if (!value) return "";

  if (value.startsWith("/")) return value;

  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

export const normalizeGamePayload = (body: any): NormalizedGamePayload => {
  const title = String(body?.title || "").trim();
  const description = body?.description ? String(body.description).trim() : null;
  const embedUrl = normalizeGameEmbedUrl(body?.embedUrl);
  const thumbnailUrlRaw = String(body?.thumbnailUrl || "").trim();
  const thumbnailUrl = thumbnailUrlRaw || null;
  const category = String(body?.category || "general").trim() || "general";

  const minAgeVal = body?.minAge;
  const maxAgeVal = body?.maxAge;
  const pointsVal = body?.pointsPerPlay;
  const maxPlaysVal = body?.maxPlaysPerDay;

  const minAge = minAgeVal === null || minAgeVal === undefined || minAgeVal === "" ? null : Number(minAgeVal);
  const maxAge = maxAgeVal === null || maxAgeVal === undefined || maxAgeVal === "" ? null : Number(maxAgeVal);
  const pointsPerPlay = pointsVal === null || pointsVal === undefined || pointsVal === "" ? 5 : Number(pointsVal);
  const maxPlaysPerDay = maxPlaysVal === null || maxPlaysVal === undefined || maxPlaysVal === "" ? 0 : Number(maxPlaysVal);

  return {
    title,
    description,
    embedUrl,
    thumbnailUrl,
    category,
    minAge,
    maxAge,
    pointsPerPlay,
    maxPlaysPerDay,
  };
};

export const validateGamePayload = (payload: NormalizedGamePayload): string | null => {
  if (!payload.title || payload.title.length < 2) {
    return "Title must be at least 2 characters";
  }

  if (!payload.embedUrl) {
    return "Embed URL must be a valid internal path or http/https URL";
  }

  if (!Number.isFinite(payload.pointsPerPlay) || payload.pointsPerPlay < 0 || payload.pointsPerPlay > 1000) {
    return "Points per play must be between 0 and 1000";
  }

  if (!Number.isFinite(payload.maxPlaysPerDay) || payload.maxPlaysPerDay < 0 || payload.maxPlaysPerDay > 500) {
    return "Max plays per day must be between 0 and 500";
  }

  if (payload.minAge !== null && (!Number.isInteger(payload.minAge) || payload.minAge < 0 || payload.minAge > 18)) {
    return "minAge must be an integer between 0 and 18";
  }

  if (payload.maxAge !== null && (!Number.isInteger(payload.maxAge) || payload.maxAge < 0 || payload.maxAge > 18)) {
    return "maxAge must be an integer between 0 and 18";
  }

  if (payload.minAge !== null && payload.maxAge !== null && payload.minAge > payload.maxAge) {
    return "minAge cannot be greater than maxAge";
  }

  return null;
};
