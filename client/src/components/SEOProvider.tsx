import { useSEO } from "@/hooks/useSEO";

export function SEOProvider({ children }: { children: React.ReactNode }) {
  useSEO();
  return <>{children}</>;
}
