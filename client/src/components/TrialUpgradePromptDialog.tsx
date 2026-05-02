import { lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";

const QRCodeSVG = lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })));

interface TrialParentLinkInfo {
  shareCode?: string;
  trialChildLinkUrl?: string;
  trialChildQrCodeUrl?: string;
}

interface TrialUpgradePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  helperText?: string;
  closeLabel: string;
  registerLabel: string;
  copyLabel: string;
  linkCodeLabel: string;
  showSocialLoginButtons?: boolean;
  socialLoginReturnTo?: string;
  isDark?: boolean;
  parentLinkInfo?: TrialParentLinkInfo | null;
  onRegister: () => void;
  onCopyLink?: () => void;
}

export function TrialUpgradePromptDialog({
  open,
  onOpenChange,
  title,
  description,
  helperText,
  closeLabel,
  registerLabel,
  copyLabel,
  linkCodeLabel,
  showSocialLoginButtons = true,
  socialLoginReturnTo = "/parent-dashboard",
  isDark = false,
  parentLinkInfo,
  onRegister,
  onCopyLink,
}: TrialUpgradePromptDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${isDark ? "bg-gray-900 border-gray-700" : "bg-white"}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {helperText && <p className="text-xs text-emerald-700 font-semibold">{helperText}</p>}

        {parentLinkInfo?.trialChildLinkUrl && (
          <div className="rounded-lg border p-3 space-y-3 bg-gray-50 dark:bg-gray-900/40">
            {parentLinkInfo.shareCode && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{linkCodeLabel}</p>
                <p className="font-mono font-bold tracking-widest">{parentLinkInfo.shareCode}</p>
              </div>
            )}

            <div className="flex justify-center">
              <div className="rounded-lg bg-white p-2 border">
                {parentLinkInfo.trialChildQrCodeUrl ? (
                  <img
                    src={parentLinkInfo.trialChildQrCodeUrl}
                    alt="Trial child link QR"
                    className="w-[132px] h-[132px]"
                  />
                ) : (
                  <Suspense fallback={<div className="w-[132px] h-[132px]" />}>
                    <QRCodeSVG
                      value={parentLinkInfo.trialChildLinkUrl}
                      size={132}
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#111827"
                    />
                  </Suspense>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Input value={parentLinkInfo.trialChildLinkUrl} readOnly dir="ltr" className="text-xs" />
              <Button type="button" variant="outline" onClick={onCopyLink}>
                {copyLabel}
              </Button>
            </div>
          </div>
        )}

        {showSocialLoginButtons && (
          <SocialLoginButtons
            className="pt-1"
            oauthMode="login"
            returnTo={socialLoginReturnTo}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
          <Button type="button" className="bg-orange-500 hover:bg-orange-600" onClick={onRegister}>
            {registerLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}