import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({
  onComplete, duration = 1500 }: SplashScreenProps) {
  const { t } = useTranslation();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration + 400);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"
      data-testid="splash-screen"
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-400/10 rounded-full blur-2xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: [0.5, 1.05, 1],
            opacity: 1,
          }}
          transition={{
            duration: 0.6,
            times: [0, 0.7, 1],
            ease: "easeOut"
          }}
          className="relative"
        >
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl"
          >
            <img
              src="/icons/icon-192.png"
              alt="Classify"
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.div
            className="absolute -inset-2 rounded-3xl border-2 border-white/20"
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-white tracking-wide">
            Classify
          </h1>
          <p className="text-white/60 text-sm mt-1">
            الدعم العائلي الذكي
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-white/70 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
