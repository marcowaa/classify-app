import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";

type SupportSettingsResponse = {
  success?: boolean;
  data?: {
    whatsappNumber?: string | null;
  };
};

export function WhatsAppSupportButton() {
  const [whatsAppNumber, setWhatsAppNumber] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    const loadSupportSettings = async () => {
      try {
        const response = await fetch("/api/support-settings");
        if (!response.ok) return;
        const json = (await response.json()) as SupportSettingsResponse;
        if (!mounted) return;
        const normalized = String(json?.data?.whatsappNumber || "").trim();
        setWhatsAppNumber(normalized);
      } catch {
      }
    };

    const startPolling = () => {
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(() => {
        loadSupportSettings().catch(() => undefined);
      }, 60 * 1000);
    };

    const onFocus = () => {
      loadSupportSettings().catch(() => undefined);
    };

    loadSupportSettings();
    startPolling();
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const normalizedDigits = useMemo(
    () => whatsAppNumber.replace(/[^0-9]/g, ""),
    [whatsAppNumber]
  );

  if (!normalizedDigits) {
    return null;
  }

  return (
    <a
      href={`https://wa.me/${normalizedDigits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل عبر واتساب"
      title="تواصل عبر واتساب"
      className="fixed bottom-24 md:bottom-6 right-4 z-[70] w-14 h-14 rounded-full bg-green-500/80 hover:bg-green-600 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 flex items-center justify-center backdrop-blur-sm"
      data-testid="whatsapp-support-fab"
    >
      <MessageCircle className="w-7 h-7" />
      <span className="sr-only">تواصل عبر واتساب</span>
    </a>
  );
}
