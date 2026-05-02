import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Smartphone, Shield, CheckCircle, XCircle, ChevronRight, Download } from "lucide-react";

interface ChildPermissionsSetupProps {
  onComplete: () => void;
}

export function ChildPermissionsSetup({ onComplete }: ChildPermissionsSetupProps) {
  const { t } = useTranslation();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsPWAInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setCurrentStep(1);
      }
    }
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsPWAInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleComplete = () => {
    if ("Notification" in window && notificationPermission !== "granted") {
      return;
    }
    localStorage.setItem("child_permissions_setup_complete", "true");
    onComplete();
  };

  const canContinue = !("Notification" in window) || notificationPermission === "granted";

  const steps = [
    {
      icon: Bell,
      title: t("permissions.notifications", "الإشعارات"),
      description: t("permissions.notificationsDesc", "لتلقي إشعارات المهام والتنبيهات من الوالدين"),
      action: requestNotificationPermission,
      actionLabel: t("permissions.allow", "السماح"),
      status: notificationPermission === "granted" ? "granted" : notificationPermission === "denied" ? "denied" : "pending",
    },
    {
      icon: Download,
      title: t("permissions.install", "تثبيت التطبيق"),
      description: t("permissions.installDesc", "أضف التطبيق للشاشة الرئيسية للوصول السريع"),
      action: installPWA,
      actionLabel: t("permissions.installApp", "تثبيت"),
      status: isPWAInstalled ? "granted" : deferredPrompt ? "pending" : "unavailable",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle className="text-2xl">{t("permissions.title", "إعداد التطبيق")}</CardTitle>
          <CardDescription>
            {t("permissions.subtitle", "نحتاج بعض الصلاحيات لتعمل جميع المميزات بشكل صحيح")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isGranted = step.status === "granted";
            const isDenied = step.status === "denied";
            const isUnavailable = step.status === "unavailable";

            return (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  isGranted ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" :
                  isDenied ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" :
                  "bg-muted/50 border-border"
                }`}
                data-testid={`permission-step-${index}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isGranted ? "bg-green-100 dark:bg-green-900" :
                  isDenied ? "bg-red-100 dark:bg-red-900" :
                  "bg-purple-100 dark:bg-purple-900"
                }`}>
                  <Icon className={`w-6 h-6 ${
                    isGranted ? "text-green-600 dark:text-green-400" :
                    isDenied ? "text-red-600 dark:text-red-400" :
                    "text-purple-600 dark:text-purple-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    {isGranted && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t("permissions.granted", "مفعّل")}
                      </Badge>
                    )}
                    {isDenied && (
                      <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        {t("permissions.denied", "مرفوض")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
                {!isGranted && !isDenied && !isUnavailable && (
                  <Button
                    size="sm"
                    onClick={step.action}
                    data-testid={`button-permission-${index}`}
                  >
                    {step.actionLabel}
                  </Button>
                )}
              </div>
            );
          })}

          <div className="pt-4 space-y-3">
            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    {t("permissions.manualInstall", "التثبيت اليدوي")}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t("permissions.manualInstallDesc", "إذا لم يظهر زر التثبيت، استخدم قائمة المتصفح واختر 'إضافة للشاشة الرئيسية'")}
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleComplete}
              disabled={!canContinue}
              data-testid="button-complete-setup"
            >
              {t("permissions.continue", "متابعة للتطبيق")}
              <ChevronRight className="w-4 h-4 mr-2" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {canContinue
                ? t("permissions.skipNote", "يمكنك تغيير هذه الإعدادات لاحقاً من إعدادات المتصفح")
                : t("permissions.notificationsRequired", "يجب السماح بالإشعارات للمتابعة لأن تنبيهات المهام إلزامية")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
