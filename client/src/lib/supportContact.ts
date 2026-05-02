type SupportSettingsPayload = {
  supportPhone?: string | null;
  whatsappNumber?: string | null;
};

const normalizeText = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export async function fetchSupportSettingsPublic(): Promise<SupportSettingsPayload | null> {
  try {
    const response = await fetch("/api/support-settings");
    if (!response.ok) return null;

    const json = await response.json();
    const source = (json && typeof json === "object" && "data" in json)
      ? (json as { data?: Record<string, unknown> }).data
      : (json as Record<string, unknown> | null);

    if (!source || typeof source !== "object") {
      return null;
    }

    return {
      supportPhone: normalizeText(source.supportPhone) || null,
      whatsappNumber: normalizeText(source.whatsappNumber) || null,
    };
  } catch {
    return null;
  }
}

export function buildWhatsAppSupportUrl(whatsappNumber: string | null | undefined, message: string): string | null {
  const digits = String(whatsappNumber || "").replace(/[^0-9]/g, "");
  if (!digits) return null;

  const text = String(message || "").trim();
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
