export const LEGAL_PAGE_CONFIG = {
  "privacy": {
    key: "legal_privacy",
    labelAr: "سياسة الخصوصية",
    responseKey: "privacy",
  },
  "terms": {
    key: "legal_terms",
    labelAr: "شروط الاستخدام",
    responseKey: "terms",
  },
  "child-safety": {
    key: "legal_child_safety",
    labelAr: "سلامة الأطفال",
    responseKey: "childSafety",
  },
  "refund": {
    key: "legal_refund",
    labelAr: "سياسة الاسترداد",
    responseKey: "refund",
  },
  "legal-center": {
    key: "legal_center",
    labelAr: "المركز القانوني",
    responseKey: "legalCenter",
  },
} as const;

export type LegalPageType = keyof typeof LEGAL_PAGE_CONFIG;

type LegalPageConfig = (typeof LEGAL_PAGE_CONFIG)[LegalPageType];

export function isLegalPageType(value: string): value is LegalPageType {
  return value in LEGAL_PAGE_CONFIG;
}

export function getLegalConfig(type: string): LegalPageConfig | null {
  if (!isLegalPageType(type)) return null;
  return LEGAL_PAGE_CONFIG[type];
}

export function getAllLegalSettingKeys(): string[] {
  return (Object.values(LEGAL_PAGE_CONFIG) as LegalPageConfig[]).flatMap((config) => [
    config.key,
    `${config.key}_updated_at`,
  ]);
}

export function buildAdminLegalPayload(getValue: (key: string) => string) {
  const payload: Record<string, string> = {};
  for (const config of Object.values(LEGAL_PAGE_CONFIG) as LegalPageConfig[]) {
    payload[config.responseKey] = getValue(config.key);
    payload[`${config.responseKey}UpdatedAt`] = getValue(`${config.key}_updated_at`);
  }
  return payload as {
    privacy: string;
    terms: string;
    childSafety: string;
    refund: string;
    legalCenter: string;
    privacyUpdatedAt: string;
    termsUpdatedAt: string;
    childSafetyUpdatedAt: string;
    refundUpdatedAt: string;
    legalCenterUpdatedAt: string;
  };
}
