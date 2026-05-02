import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Users, KeyRound, Smartphone, ShieldCheck, ChevronLeft, ChevronRight, X } from "lucide-react";

const ONBOARDING_KEY = "classify_onboarding_completed";

interface OnboardingStep {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Users className="h-16 w-16" />,
    titleKey: "onboarding.step1Title",
    descriptionKey: "onboarding.step1Description",
    color: "from-blue-600 to-indigo-700",
  },
  {
    icon: <KeyRound className="h-16 w-16" />,
    titleKey: "onboarding.step2Title",
    descriptionKey: "onboarding.step2Description",
    color: "from-cyan-600 to-sky-700",
  },
  {
    icon: <Smartphone className="h-16 w-16" />,
    titleKey: "onboarding.step3Title",
    descriptionKey: "onboarding.step3Description",
    color: "from-emerald-600 to-teal-700",
  },
  {
    icon: <ShieldCheck className="h-16 w-16" />,
    titleKey: "onboarding.step4Title",
    descriptionKey: "onboarding.step4Description",
    color: "from-violet-600 to-fuchsia-700",
  },
];

export function OnboardingWizard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!open) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl" dir={isRTL ? "rtl" : "ltr"}>
        <button
          onClick={handleSkip}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          aria-label="Skip"
        >
          <X className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`bg-gradient-to-br ${step.color} p-8 text-center text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 45%)" }} />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-bold mb-4">
                  <span>{currentStep + 1}</span>
                  <span>/</span>
                  <span>{steps.length}</span>
                </div>
              </div>
              <div className="flex justify-center mb-4 opacity-95 relative z-10">
                <div className="p-3 rounded-2xl bg-white/15 border border-white/30 shadow-xl">
                  {step.icon}
                </div>
              </div>
              <h2 className="text-xl font-extrabold mb-2 relative z-10">
                {t(step.titleKey)}
              </h2>
              <p className="text-sm opacity-95 leading-relaxed relative z-10 max-w-sm mx-auto">
                {t(step.descriptionKey)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="p-5 space-y-4">
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${step.color}`}
            />
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep ? "w-6 bg-blue-500" : "w-2 bg-gray-300 dark:bg-gray-600"
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {t("onboarding.previous")}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-500"
            >
              {t("onboarding.skip")}
            </Button>

            <Button
              onClick={handleNext}
              size="sm"
              className={`gap-1 bg-gradient-to-r ${step.color} text-white hover:opacity-90`}
            >
              {isLast ? t("onboarding.startNow") : t("onboarding.next")}
              {!isLast && (isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingWizard;
