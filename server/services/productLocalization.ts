const PRODUCT_LOCALES = ["ar", "en", "pt", "es", "fr", "de", "tr", "ru", "zh", "hi"] as const;

type ProductLocale = (typeof PRODUCT_LOCALES)[number];

type BuildLocalizationInput = {
  primaryText?: string | null;
  arabicText?: string | null;
};

export type ProductLocalizationResult = {
  map: Record<string, string>;
  defaultText: string | null;
  arabicText: string | null;
};

const ARABIC_REGEX = /[\u0600-\u06FF]/;

function cleanText(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function detectSourceLanguage(text: string): ProductLocale {
  return ARABIC_REGEX.test(text) ? "ar" : "en";
}

async function translateViaGoogle(text: string, source: ProductLocale, target: ProductLocale): Promise<string | null> {
  if (!text || source === target) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const parts = Array.isArray(data?.[0]) ? data[0] : [];
    const translated = parts
      .map((part: any) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("")
      .trim();

    return translated || null;
  } catch {
    return null;
  }
}

export async function buildLocalizedMap(input: BuildLocalizationInput): Promise<ProductLocalizationResult> {
  const primaryText = cleanText(input.primaryText);
  const providedArabic = cleanText(input.arabicText);

  const seedText = primaryText || providedArabic;
  if (!seedText) {
    return { map: {}, defaultText: null, arabicText: null };
  }

  const seedLang = primaryText ? detectSourceLanguage(primaryText) : "ar";
  const map: Record<string, string> = {};

  if (primaryText) {
    map[seedLang] = primaryText;
  }
  if (providedArabic) {
    map.ar = providedArabic;
  }

  const translationTasks = PRODUCT_LOCALES.filter((lang) => !map[lang]).map(async (lang) => {
    const sourceLang: ProductLocale = map.en ? "en" : map.ar ? "ar" : seedLang;
    const sourceText = map[sourceLang] || seedText;
    const translated = await translateViaGoogle(sourceText, sourceLang, lang);
    map[lang] = translated || sourceText;
  });

  await Promise.all(translationTasks);

  const fallbackDefault = map.en || map[seedLang] || seedText;
  const fallbackArabic = map.ar || providedArabic || fallbackDefault;

  for (const lang of PRODUCT_LOCALES) {
    if (!map[lang]) {
      map[lang] = fallbackDefault;
    }
  }

  return {
    map,
    defaultText: fallbackDefault,
    arabicText: fallbackArabic,
  };
}

export function resolveLocaleCode(value?: string | null): ProductLocale {
  const normalized = (value || "").toLowerCase().split("-")[0] as ProductLocale;
  return PRODUCT_LOCALES.includes(normalized) ? normalized : "en";
}

export function getLocalizedValue(
  map: Record<string, string> | null | undefined,
  language: string,
  defaultValue?: string | null,
  arabicValue?: string | null,
): string {
  const locale = resolveLocaleCode(language);
  const safeMap = map || {};

  return (
    safeMap[locale] ||
    (locale === "ar" ? arabicValue : null) ||
    safeMap.en ||
    defaultValue ||
    arabicValue ||
    ""
  );
}

export const PRODUCT_SUPPORTED_LOCALES: readonly ProductLocale[] = PRODUCT_LOCALES;
