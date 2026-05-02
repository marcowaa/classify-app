import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Star, Sparkles, Gamepad2, Trophy, LogOut } from "lucide-react";
import { cacheAdultAccountSession } from "@/lib/adultAccountSessions";

interface PinEntryProps {
  familyCode: string;
  onSwitchAccount: () => void;
}

export function PinEntry({ familyCode, onSwitchAccount }: PinEntryProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ type: string; name: string } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Hidden parent access: 5 taps on logo
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      navigate("/parent-auth");
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1500);
  }, [navigate]);

  const pinLoginMutation = useMutation({
    mutationFn: async (pinCode: string) => {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCode, familyCode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Invalid PIN");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const payload = data?.data || data;
      setSuccess({ type: payload.type, name: payload.name });

      if (payload.type === "parent") {
        // Clear child session before setting parent session
        localStorage.removeItem("childToken");
        localStorage.removeItem("childId");
        localStorage.removeItem("childAccountClassification");
        localStorage.setItem("token", payload.token);
        localStorage.setItem("userId", payload.id);
        localStorage.setItem("parentAccountClassification", "FULL");
        cacheAdultAccountSession({
          role: "parent",
          token: payload.token,
          accountId: payload.id,
          displayName: payload.name,
        });
        setTimeout(() => navigate("/parent-dashboard"), 800);
      } else {
        // Clear parent session before setting child session
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("parentAccountClassification");
        localStorage.setItem("childToken", payload.token);
        localStorage.setItem("childId", payload.id);
        // Also save to savedChildren for profile picker compatibility
        const saved = localStorage.getItem("savedChildren");
        let savedArr: any[] = [];
        try { savedArr = saved ? JSON.parse(saved) : []; } catch {}
        const existing = savedArr.findIndex((c: any) => c.childId === payload.id);
        const childInfo = {
          childId: payload.id,
          displayName: payload.name,
          token: payload.token,
          savedAt: new Date().toISOString(),
          avatarColor: "from-purple-500 to-pink-500",
        };
        if (existing >= 0) {
          savedArr[existing] = { ...savedArr[existing], ...childInfo };
        } else {
          savedArr.push(childInfo);
        }
        localStorage.setItem("savedChildren", JSON.stringify(savedArr));
        setTimeout(() => navigate("/child-profile"), 800);
      }
    },
    onError: (err: any) => {
      setError(err.message || t("invalidPin") || "رمز PIN غير صحيح");
      setPin(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
  });

  // Auto-submit when all 4 digits entered
  useEffect(() => {
    const full = pin.join("");
    if (full.length === 4 && pin.every((d) => d !== "") && !pinLoginMutation.isPending) {
      pinLoginMutation.mutate(full);
    }
  }, [pin]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, "").slice(-1);
    setError("");

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);

    // Auto-advance to next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const newPin = [...pin];
      newPin[index - 1] = "";
      setPin(newPin);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length > 0) {
      const newPin = [...pin];
      for (let i = 0; i < 4; i++) {
        newPin[i] = pasted[i] || "";
      }
      setPin(newPin);
      const focusIdx = Math.min(pasted.length, 3);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400 via-pink-300 to-yellow-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Floating decorations */}
      <div className="absolute top-8 left-8 animate-bounce">
        <Star className="w-8 h-8 text-yellow-400 drop-shadow-lg" fill="currentColor" />
      </div>
      <div className="absolute top-20 right-12 animate-pulse">
        <Sparkles className="w-6 h-6 text-pink-400" />
      </div>
      <div className="absolute bottom-32 left-12 animate-bounce" style={{ animationDelay: "0.3s" }}>
        <Gamepad2 className="w-10 h-10 text-purple-500 drop-shadow-lg" />
      </div>
      <div className="absolute bottom-20 right-8 animate-pulse" style={{ animationDelay: "0.5s" }}>
        <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-lg" fill="currentColor" />
      </div>

      {/* Switch account button */}
      <button
        onClick={onSwitchAccount}
        className="absolute top-4 left-4 p-2 bg-white/60 hover:bg-white/80 rounded-full transition-all"
        title={t("switchAccount") || "تبديل الحساب"}
      >
        <LogOut className="w-5 h-5 text-gray-600" />
      </button>

      {/* Language/theme in top right */}
      <div className="absolute top-4 right-4 flex gap-2">
        {/* Minimal header */}
      </div>

      {/* Logo with hidden parent tap */}
      <button onClick={handleLogoTap} className="mb-6 focus:outline-none" type="button">
        <img
          src="/logo.jpg"
          alt="Classify"
          width={120}
          height={120}
          className="h-28 w-28 rounded-full shadow-2xl border-4 border-yellow-400 object-cover animate-bounce"
        />
      </button>

      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-2">
        Classify
      </h1>
      <p className="text-lg text-purple-700 font-bold mb-8">
        {t("enterPin") || "أدخل رمز PIN الخاص بك"}
      </p>

      {/* PIN Input Boxes */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm">
        {success ? (
          <div className="text-center">
            <div className="text-6xl mb-4">{success.type === "parent" ? "👨‍💼" : "🎮"}</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              {t("welcomeBack") || "أهلاً بعودتك!"}
            </h2>
            <p className="text-gray-600 text-lg">{success.name}</p>
            <Loader2 className="w-6 h-6 animate-spin text-green-500 mx-auto mt-4" />
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-4 mb-6" dir="ltr">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  className={`w-16 h-16 text-center text-3xl font-bold border-3 rounded-2xl focus:outline-none transition-all ${
                    error
                      ? "border-red-400 bg-red-50 text-red-600 animate-shake"
                      : digit
                        ? "border-purple-400 bg-purple-50 text-purple-700"
                        : "border-gray-200 bg-gray-50 text-gray-800"
                  } focus:border-purple-500 focus:ring-4 focus:ring-purple-200`}
                  style={{ borderWidth: "3px" }}
                  disabled={pinLoginMutation.isPending}
                  data-testid={`pin-input-${i}`}
                />
              ))}
            </div>

            {/* Loading */}
            {pinLoginMutation.isPending && (
              <div className="flex justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-center mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Numpad for mobile */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    const emptyIdx = pin.findIndex((d) => d === "");
                    if (emptyIdx >= 0) handleInputChange(emptyIdx, String(num));
                  }}
                  disabled={pinLoginMutation.isPending}
                  className="py-4 text-2xl font-bold bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-xl transition-all text-purple-800 disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <div /> {/* empty cell */}
              <button
                type="button"
                onClick={() => {
                  const emptyIdx = pin.findIndex((d) => d === "");
                  if (emptyIdx >= 0) handleInputChange(emptyIdx, "0");
                }}
                disabled={pinLoginMutation.isPending}
                className="py-4 text-2xl font-bold bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-xl transition-all text-purple-800 disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  // Backspace: clear last filled digit
                  const lastIdx = pin.map((d, i) => (d !== "" ? i : -1)).filter(i => i >= 0).pop();
                  if (lastIdx !== undefined && lastIdx >= 0) {
                    const newPin = [...pin];
                    newPin[lastIdx] = "";
                    setPin(newPin);
                    setError("");
                    inputRefs.current[lastIdx]?.focus();
                  }
                }}
                disabled={pinLoginMutation.isPending}
                className="py-4 text-2xl font-bold bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-xl transition-all text-red-600 disabled:opacity-50"
              >
                ⌫
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/forgot-password?mode=pin&familyCode=${encodeURIComponent(familyCode)}`)}
              disabled={pinLoginMutation.isPending}
              className="w-full mt-4 text-sm font-bold text-purple-700 hover:text-purple-800 disabled:opacity-50"
              data-testid="button-forgot-pin"
            >
              {`${t("parentAuth.forgotPassword")} / PIN`}
            </button>
          </>
        )}
      </div>

      {/* Footer hint */}
      {!success && (
        <p className="mt-6 text-purple-600/60 text-sm text-center">
          {t("pinHint") || "كل فرد في العائلة لديه رمز PIN خاص به"}
        </p>
      )}
    </div>
  );
}
