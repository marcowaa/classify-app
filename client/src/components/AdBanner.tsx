import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Ad {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  targetAudience: string;
  priority: number;
}

interface AdBannerProps {
  audience: "parents" | "children";
  className?: string;
}

export function AdBanner({ audience, className = "" }: AdBannerProps) {
  const { data: ads } = useQuery<Ad[]>({
    queryKey: ["/api/ads", audience],
    queryFn: async () => {
      const res = await fetch(`/api/ads?audience=${audience}`);
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const adsList = Array.isArray(ads) ? ads : [];
  const topAd = adsList[0];

  useEffect(() => {
    if (topAd) {
      fetch(`/api/ads/${topAd.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [topAd?.id]);

  const handleClick = () => {
    if (topAd) {
      fetch(`/api/ads/${topAd.id}/click`, { method: "POST" }).catch(() => {});
      if (topAd.linkUrl) {
        window.open(topAd.linkUrl, "_blank");
      }
    }
  };

  if (!topAd) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={className}
      >
        <Card 
          className="bg-gradient-to-l from-primary/10 to-primary/5 border-primary/20 cursor-pointer overflow-hidden"
          onClick={handleClick}
          data-testid={`ad-banner-${topAd.id}`}
        >
          <CardContent className="p-3 flex items-center gap-3">
            {topAd.imageUrl && (
              <img 
                src={topAd.imageUrl} 
                alt={topAd.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">{topAd.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{topAd.content}</p>
            </div>
            {topAd.linkUrl && (
              <ExternalLink className="h-4 w-4 text-primary shrink-0" />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
