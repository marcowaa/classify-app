import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  targetAudience: string;
  priority: number;
}

interface SlidingAdsCarouselProps {
  audience: "all" | "parents" | "children";
  variant: "home" | "page";
  isDark: boolean;
  className?: string;
}

export function SlidingAdsCarousel({ audience, variant, isDark, className = "" }: SlidingAdsCarouselProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const { data: adsData } = useQuery<Ad[]>({
    queryKey: ["/api/ads", audience],
    queryFn: async () => {
      const res = await fetch(`/api/ads?audience=${audience}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const adsList = Array.isArray(adsData) ? adsData : [];

  // Auto-slide right-to-left every 4s
  useEffect(() => {
    if (adsList.length <= 1) return;
    const timer = setInterval(() => {
      slideTo((currentIndex + 1) % adsList.length, "left");
    }, 4000);
    return () => clearInterval(timer);
  }, [adsList.length, currentIndex]);

  // Track view
  useEffect(() => {
    const ad = adsList[currentIndex];
    if (ad) {
      fetch(`/api/ads/${ad.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [currentIndex, adsList]);

  const slideTo = useCallback((newIndex: number, direction: "left" | "right") => {
    if (isAnimating) return;
    setSlideDirection(direction);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setIsAnimating(false);
    }, 400);
  }, [isAnimating]);

  const goNext = useCallback(() => {
    slideTo((currentIndex + 1) % adsList.length, "left");
  }, [currentIndex, adsList.length, slideTo]);

  const goPrev = useCallback(() => {
    slideTo((currentIndex - 1 + adsList.length) % adsList.length, "right");
  }, [currentIndex, adsList.length, slideTo]);

  const handleClick = useCallback((ad: Ad) => {
    fetch(`/api/ads/${ad.id}/click`, { method: "POST" }).catch(() => {});
    if (ad.linkUrl) {
      const url = /^https?:\/\//i.test(ad.linkUrl) ? ad.linkUrl : `https://${ad.linkUrl}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  if (adsList.length === 0) return null;

  const currentAd = adsList[currentIndex];
  if (!currentAd) return null;
  const isHome = variant === "home";

  // Animation classes for smooth RTL sliding
  const slideClasses = isAnimating
    ? slideDirection === "left"
      ? "translate-x-full opacity-0"
      : "-translate-x-full opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className={className}>
      {isHome ? (
        <section className={`px-4 py-10 ${isDark ? "bg-gray-800/50" : "bg-white/10"}`}>
          <div className="max-w-4xl mx-auto">
            <HomeHeader isDark={isDark} adsList={adsList} currentIndex={currentIndex} />
            <CarouselBody
              ad={currentAd}
              isDark={isDark}
              isHome={true}
              slideClasses={slideClasses}
              adsList={adsList}
              goNext={goNext}
              goPrev={goPrev}
              onClick={() => handleClick(currentAd)}
            />
            <DotsIndicator adsList={adsList} currentIndex={currentIndex} isDark={isDark} isHome={true} onDotClick={(i) => slideTo(i, i > currentIndex ? "left" : "right")} />
          </div>
        </section>
      ) : (
        <div className={`rounded-2xl overflow-hidden shadow-lg mb-8 ${isDark ? "bg-gray-800 ring-1 ring-gray-700" : "bg-white ring-1 ring-gray-100"}`}>
          <PageHeader isDark={isDark} adsList={adsList} currentIndex={currentIndex} />
          <CarouselBody
            ad={currentAd}
            isDark={isDark}
            isHome={false}
            slideClasses={slideClasses}
            adsList={adsList}
            goNext={goNext}
            goPrev={goPrev}
            onClick={() => handleClick(currentAd)}
          />
          <DotsIndicator adsList={adsList} currentIndex={currentIndex} isDark={isDark} isHome={false} onDotClick={(i) => slideTo(i, i > currentIndex ? "left" : "right")} />
        </div>
      )}
    </div>
  );
}

// ===== Sub-components =====

function HomeHeader({ isDark, adsList, currentIndex }: { isDark: boolean; adsList: Ad[]; currentIndex: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? "bg-amber-500/20" : "bg-white/20"}`}>
        <Megaphone className={`h-5 w-5 ${isDark ? "text-amber-400" : "text-yellow-300"}`} />
      </div>
      <h2 className="text-2xl font-bold text-white">{t("adsCarousel.ads")}</h2>
      {adsList.length > 1 && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/70 mr-2">
          {currentIndex + 1}/{adsList.length}
        </span>
      )}
    </div>
  );
}

function PageHeader({ isDark, adsList, currentIndex }: { isDark: boolean; adsList: Ad[]; currentIndex: number }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-2 px-5 py-3 border-b ${isDark ? "border-gray-700/50" : "border-gray-100"}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? "bg-amber-500/15" : "bg-amber-50"}`}>
        <Megaphone className={`h-4 w-4 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
      </div>
      <span className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>{t("adsCarousel.ads")}</span>
      {adsList.length > 1 && (
        <span className={`mr-auto text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
          {currentIndex + 1}/{adsList.length}
        </span>
      )}
    </div>
  );
}

function CarouselBody({
  ad,
  isDark,
  isHome,
  slideClasses,
  adsList,
  goNext,
  goPrev,
  onClick,
}: {
  ad: Ad;
  isDark: boolean;
  isHome: boolean;
  slideClasses: string;
  adsList: Ad[];
  goNext: () => void;
  goPrev: () => void;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const imgHeight = isHome ? "h-48 sm:h-60" : "h-44 sm:h-52";
  const padding = isHome ? "p-6" : "p-5";

  return (
    <div className="relative cursor-pointer group overflow-hidden" onClick={onClick} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
      <div className={`transition-all duration-400 ease-in-out transform ${slideClasses}`} style={{ transitionDuration: "400ms" }}>
        {ad.imageUrl ? (
          <div className="relative">
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className={`w-full ${imgHeight} object-cover transition-transform duration-500 group-hover:scale-[1.02]`}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className={`absolute bottom-0 inset-x-0 ${padding}`}>
              <h3 className={`text-white font-bold ${isHome ? "text-xl" : "text-lg"} leading-tight drop-shadow-md`}>{ad.title}</h3>
              <p className="text-white/80 text-sm mt-1.5 line-clamp-2">{ad.content}</p>
              {ad.linkUrl && (
                <div className="flex items-center gap-1.5 mt-2 text-white/60 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  <span>{t("adsCarousel.viewDetails")}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`${padding} ${isHome ? "" : isDark ? "bg-gradient-to-br from-gray-800 to-gray-900" : "bg-gradient-to-br from-gray-50 to-white"}`}>
            <h3 className={`font-bold ${isHome ? "text-xl" : "text-lg"} ${isDark ? "text-white" : isHome ? "text-white" : "text-gray-900"}`}>{ad.title}</h3>
            <p className={`text-sm mt-2 leading-relaxed line-clamp-3 ${isDark ? "text-gray-400" : isHome ? "text-white/70" : "text-gray-600"}`}>
              {ad.content}
            </p>
            {ad.linkUrl && (
              <div className={`flex items-center gap-1.5 mt-3 text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                <ExternalLink className="h-3 w-3" />
                <span>{t("adsCarousel.viewDetails")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {adsList.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

function DotsIndicator({
  adsList,
  currentIndex,
  isDark,
  isHome,
  onDotClick,
}: {
  adsList: Ad[];
  currentIndex: number;
  isDark: boolean;
  isHome: boolean;
  onDotClick: (i: number) => void;
}) {
  if (adsList.length <= 1) return null;

  if (isHome) {
    return (
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {adsList.map((_: any, i: number) => (
          <button
            key={i}
            onClick={() => onDotClick(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-7 bg-yellow-400"
                : "w-2 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-1.5 py-3 border-t ${isDark ? "border-gray-700/50" : "border-gray-100"}`}>
      {adsList.map((_: any, i: number) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === currentIndex
              ? `w-6 ${isDark ? "bg-amber-400" : "bg-amber-500"}`
              : `w-1.5 ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-300 hover:bg-gray-400"}`
          }`}
        />
      ))}
    </div>
  );
}
