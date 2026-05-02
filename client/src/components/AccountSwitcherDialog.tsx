import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Repeat, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AdultAccountRole,
  clearCachedAdultAccounts,
  getCachedAdultAccounts,
  getRoleConfig,
  switchToCachedAdultAccount,
} from "@/lib/adultAccountSessions";

type AccountSwitcherDialogProps = {
  currentRole: AdultAccountRole;
  className?: string;
  triggerId?: string;
};

export function AccountSwitcherDialog({ currentRole, className, triggerId }: AccountSwitcherDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const accounts = useMemo(() => {
    const all = getCachedAdultAccounts();
    const currentTokenKey = getRoleConfig(currentRole).tokenKey;
    const currentToken = localStorage.getItem(currentTokenKey) || "";

    return all.map((entry) => ({
      ...entry,
      isCurrent: entry.role === currentRole && entry.token === currentToken,
    }));
  }, [currentRole, refreshToken]);

  const switchableCount = accounts.filter((entry) => !entry.isCurrent).length;
  if (switchableCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        id={triggerId}
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        onClick={() => {
          setRefreshToken((v) => v + 1);
          setOpen(true);
        }}
        aria-label={t("switchAccount")}
        title={t("switchAccount")}
      >
        <Repeat className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t("selectAccount")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {accounts.map((entry) => (
              <button
                key={entry.id}
                type="button"
                disabled={entry.isCurrent}
                onClick={() => {
                  const target = switchToCachedAdultAccount(entry.id);
                  if (!target) return;
                  setOpen(false);
                  window.location.assign(target);
                }}
                className={`w-full text-start rounded-lg border px-3 py-2 transition-all ${
                  entry.isCurrent
                    ? "opacity-60 cursor-not-allowed bg-muted"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{entry.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.dashboardPath}</p>
                  </div>
                  <User className="h-4 w-4 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearCachedAdultAccounts();
                setRefreshToken((v) => v + 1);
              }}
            >
              {t("clearAllSavedAccounts")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
