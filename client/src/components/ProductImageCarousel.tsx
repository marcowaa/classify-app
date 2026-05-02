import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProductImageCarouselProps {
  images: string[];
  mainImage?: string;
  alt: string;
  discountBadgeText?: string;
  className?: string;
  /** Compact mode for product cards (no dots, small arrows) */
  compact?: boolean;
  /** Whether to show arrows on hover only */
  hoverArrows?: boolean;
  onImageClick?: () => void;
  /** Auto-slide through images */
  autoSlide?: boolean;
  /** Auto-slide interval in ms (default: 2000) */
  autoSlideInterval?: number;
  /** Use object-contain instead of object-cover (shows full image without cropping) */
  contain?: boolean;
}

export function ProductImageCarousel({
  images,
  mainImage,
  alt,
  discountBadgeText,
  className = "",
  compact = false,
  hoverArrows = false,
  onImageClick,
  autoSlide = false,
  autoSlideInterval = 2000,
  contain = false,
}: ProductImageCarouselProps) {
  const { t } = useTranslation();
  // Build the final ordered list: mainImage first, then the rest
  const allImages = (() => {
    if (!images || images.length === 0) {
      return mainImage ? [mainImage] : [];
    }
    if (mainImage && !images.includes(mainImage)) {
      return [mainImage, ...images];
    }
    if (mainImage && images.includes(mainImage)) {
      return [mainImage, ...images.filter((img) => img !== mainImage)];
    }
    return images;
  })();

  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setCurrentIndex((prev) => (prev + 1) % allImages.length);
    },
    [allImages.length]
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    },
    [allImages.length]
  );

  const goToIndex = useCallback((idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setCurrentIndex(idx);
  }, []);

  // Auto-slide logic
  const pauseRef = useRef(false);
  useEffect(() => {
    if (!autoSlide || allImages.length <= 1) return;
    const timer = setInterval(() => {
      if (!pauseRef.current) {
        setCurrentIndex((prev) => (prev + 1) % allImages.length);
      }
    }, autoSlideInterval);
    return () => clearInterval(timer);
  }, [autoSlide, autoSlideInterval, allImages.length]);

  const handleMouseEnter = useCallback(() => { pauseRef.current = true; }, []);
  const handleMouseLeave = useCallback(() => { pauseRef.current = false; }, []);

  if (allImages.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`} onClick={onImageClick}>
        <Package className="w-12 h-12 text-gray-300" />
      </div>
    );
  }

  const objectFit = contain ? "object-contain" : "object-cover";

  if (allImages.length === 1) {
    return (
      <div className={`relative overflow-hidden ${className}`} onClick={onImageClick}>
        <img
          src={allImages[0]}
          alt={alt}
          className={`w-full h-full ${objectFit}`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {discountBadgeText && (
          <div className="absolute top-2 left-2 z-30 pointer-events-none px-2 py-0.5 rounded-md bg-red-500 text-white text-xs font-bold shadow-sm">
            {discountBadgeText}
          </div>
        )}
      </div>
    );
  }

  const arrowSize = compact ? "h-6 w-6" : "h-8 w-8";
  const arrowIconSize = compact ? "h-3 w-3" : "h-4 w-4";
  const arrowVisibility = hoverArrows ? "opacity-0 group-hover:opacity-100" : "opacity-80 hover:opacity-100";

  return (
    <div
      className={`relative overflow-hidden group ${className}`}
      onClick={onImageClick}
      onMouseEnter={autoSlide ? handleMouseEnter : undefined}
      onMouseLeave={autoSlide ? handleMouseLeave : undefined}
    >
      {/* Current Image with crossfade */}
      {allImages.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt={`${alt} (${idx + 1}/${allImages.length})`}
          className={`absolute inset-0 w-full h-full ${objectFit} will-change-[opacity,transform,filter] transition-[opacity,transform,filter] duration-[2800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            idx === currentIndex
              ? "opacity-100 z-10 scale-100 blur-0"
              : "opacity-0 z-0 scale-[1.003] blur-[1px]"
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ))}

      {discountBadgeText && (
        <div className="absolute top-2 left-2 z-30 pointer-events-none px-2 py-0.5 rounded-md bg-red-500 text-white text-xs font-bold shadow-sm">
          {discountBadgeText}
        </div>
      )}

      {/* Arrows */}
      <button
        onClick={goPrev}
        className={`absolute right-1 top-1/2 -translate-y-1/2 ${arrowSize} rounded-full bg-black/40 text-white flex items-center justify-center transition-all ${arrowVisibility} hover:bg-black/60 backdrop-blur-sm z-20`}
        aria-label={t("carousel.prevImage")}
      >
        <ChevronRight className={arrowIconSize} />
      </button>
      <button
        onClick={goNext}
        className={`absolute left-1 top-1/2 -translate-y-1/2 ${arrowSize} rounded-full bg-black/40 text-white flex items-center justify-center transition-all ${arrowVisibility} hover:bg-black/60 backdrop-blur-sm z-20`}
        aria-label={t("carousel.nextImage")}
      >
        <ChevronLeft className={arrowIconSize} />
      </button>

      {/* Image counter */}
      <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm ${arrowVisibility} z-20`}>
        {currentIndex + 1}/{allImages.length}
      </div>

      {/* Dots (only in non-compact mode and <= 8 images) */}
      {!compact && allImages.length <= 8 && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
          {allImages.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => goToIndex(idx, e)}
              className={`rounded-full transition-all ${
                idx === currentIndex
                  ? "w-4 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={t("carousel.imageN", { n: idx + 1 })}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip for detail view (non-compact, >1 image) */}
      {!compact && allImages.length > 1 && allImages.length <= 8 && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center gap-1 px-2">
          {/* Hidden on mobile, visible on larger screens */}
        </div>
      )}
    </div>
  );
}

/**
 * Thumbnail strip for detail dialogs — separate component for below the main image
 */
export function ProductImageThumbnails({
  images,
  mainImage,
  currentIndex,
  onSelect,
}: {
  images: string[];
  mainImage?: string;
  currentIndex: number;
  onSelect: (idx: number) => void;
}) {
  const allImages = (() => {
    if (!images || images.length === 0) return mainImage ? [mainImage] : [];
    if (mainImage && !images.includes(mainImage)) return [mainImage, ...images];
    if (mainImage && images.includes(mainImage)) return [mainImage, ...images.filter((img) => img !== mainImage)];
    return images;
  })();

  if (allImages.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
      {allImages.map((url, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden ring-2 transition-all ${
            idx === currentIndex
              ? "ring-blue-500 scale-105"
              : "ring-transparent hover:ring-blue-300 opacity-70 hover:opacity-100"
          }`}
        >
          <img src={url} alt={`${idx + 1}`} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}
