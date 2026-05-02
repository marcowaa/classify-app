import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { QrCode, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LinkChildCardProps {
  uniqueCode: string;
  onShowQR: () => void;
}

export function LinkChildCard({ uniqueCode, onShowQR }: LinkChildCardProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [showCode, setShowCode] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(uniqueCode);
      toast({
        title: t("success") || "نجاح",
        description: t("parentDashboard.codeCopied") || "تم نسخ الكود",
      });
    } catch {
      toast({
        title: t("error") || "خطأ",
        description: t("parentDashboard.copyFailed") || "فشل النسخ",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
        <QrCode className="w-5 h-5 text-purple-500" />
        {t("parentDashboard.linkChild") || "ربط الأطفال"}
      </h3>
      
      <div className={`p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"} mb-4`}>
        <p className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {t("parentDashboard.yourCode") || "كود الربط الخاص بك"}
        </p>
        <div className="flex items-center gap-2">
          <code className={`flex-1 text-xl font-mono font-bold tracking-wider ${isDark ? "text-white" : "text-gray-800"}`}>
            {showCode ? uniqueCode : "••••••"}
          </code>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCode(!showCode)}
            data-testid="button-toggle-code"
          >
            {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            data-testid="button-copy-code"
          >
            <Copy className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <Button
        onClick={onShowQR}
        className="w-full bg-purple-500 hover:bg-purple-600"
        data-testid="button-show-qr"
      >
        <QrCode className="w-4 h-4 mr-2" />
        {t("parentDashboard.showQR") || "عرض رمز QR"}
      </Button>
    </div>
  );
}
