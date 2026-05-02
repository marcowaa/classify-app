
import { and, desc, eq } from "drizzle-orm";
import { shippingAddresses } from "../../shared/schema";

const COUNTRY_HEADER_KEYS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country",
] as const;

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function resolveRequestCountryCode(req: any): string | null {
  const queryCountry = normalizeCountryCode(req?.query?.country);
  if (queryCountry) return queryCountry;

  for (const headerKey of COUNTRY_HEADER_KEYS) {
    const headerValue = req?.headers?.[headerKey];
    const normalized = normalizeCountryCode(
      Array.isArray(headerValue) ? headerValue[0] : headerValue
    );
    if (normalized) return normalized;
  }

  return null;
}

export async function resolveParentCountryCode(db: any, parentId?: string): Promise<string | null> {
  if (!parentId) return null;

  const rows = await db
    .select({ country: shippingAddresses.country })
    .from(shippingAddresses)
    .where(
      and(
        eq(shippingAddresses.parentId, parentId),
        eq(shippingAddresses.status, "active")
      )
    )
    .orderBy(desc(shippingAddresses.isDefault), desc(shippingAddresses.updatedAt))
    .limit(1);

  return normalizeCountryCode(rows[0]?.country) || null;
}

function normalizeSupportedCountries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .map((v) => normalizeCountryCode(v))
    .filter((v): v is string => Boolean(v));
  return Array.from(new Set(normalized));
}

export function filterPaymentMethodsByCountry<T extends { supportedCountries?: unknown }>(
  methods: T[],
  countryCode: string | null
): T[] {
  if (!countryCode) return methods;

  return methods.filter((method) => {
    const countries = normalizeSupportedCountries(method.supportedCountries);
    if (countries.length === 0) return true;
    return countries.includes(countryCode);
  });
}
