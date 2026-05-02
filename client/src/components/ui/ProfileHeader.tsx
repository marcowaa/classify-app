import { MapPin, Globe, Phone, Mail, Facebook, Instagram, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { FollowButton } from "@/components/ui/FollowButton";
import { ShareMenu } from "@/components/ui/ShareMenu";

interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

interface ProfileHeaderProps {
  name: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  governorate?: string;
  city?: string;
  phoneNumber?: string;
  email?: string;
  socialLinks?: SocialLinks;
  isVerified?: boolean;
  avgRating?: string;
  totalReviews?: number;
  entityType?: "school" | "teacher" | "library";
  entityId?: string;
  showFollow?: boolean;
  extraBadges?: React.ReactNode;
  children?: React.ReactNode;
  shareTitle?: string;
  shareDescription?: string;
}

export function ProfileHeader({
  name,
  bio,
  avatarUrl,
  coverImageUrl,
  governorate,
  city,
  phoneNumber,
  email,
  socialLinks,
  isVerified,
  avgRating,
  totalReviews,
  entityType,
  entityId,
  showFollow = true,
  extraBadges,
  children,
  shareTitle,
  shareDescription,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-lg mb-6">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600">
        {coverImageUrl && (
          <img
            key={coverImageUrl}
            src={coverImageUrl}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        {/* Avatar overlay */}
        <div className="absolute -bottom-16 right-6 rtl:left-6 rtl:right-auto">
          <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 overflow-hidden shadow-lg">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-4xl font-bold">
              {name.charAt(0)}
            </div>
            {avatarUrl && (
              <img key={avatarUrl} src={avatarUrl} alt={name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-20 px-6 pb-6" dir="rtl">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
              {isVerified && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  ✓ موثّق
                </Badge>
              )}
              {extraBadges}
            </div>

            {/* Location */}
            {(governorate || city) && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{[city, governorate].filter(Boolean).join("، ")}</span>
              </div>
            )}

            {/* Rating */}
            {avgRating && parseFloat(avgRating) > 0 && (
              <div className="flex items-center gap-1 mt-1 text-sm">
                <span className="text-yellow-500">{"★".repeat(Math.round(parseFloat(avgRating)))}</span>
                <span className="text-muted-foreground">
                  {avgRating} ({totalReviews} تقييم)
                </span>
              </div>
            )}

            {/* Bio */}
            {bio && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
                {bio}
              </p>
            )}

            {/* Contact & Social */}
            <div className="flex items-center flex-wrap gap-3 mt-3">
              {phoneNumber && (
                <a href={`tel:${phoneNumber}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-600">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{phoneNumber}</span>
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-600">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{email}</span>
                </a>
              )}
              {socialLinks?.website && (
                <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-600">
                  <Globe className="h-3.5 w-3.5" />
                  <span>الموقع</span>
                </a>
              )}
              {socialLinks?.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {socialLinks?.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {socialLinks?.youtube && (
                <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Follow & Share Buttons */}
          <div className="flex items-center gap-2">
            {showFollow && entityType && entityId && (
              <FollowButton entityType={entityType} entityId={entityId} />
            )}
            <ShareMenu
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={shareTitle || `${name} — Classify`}
              description={shareDescription || `تعرّف على ${name} على منصة Classify`}
            />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
