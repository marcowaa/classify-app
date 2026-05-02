/**
 * Arabic relative time formatter (Facebook-style)
 * Returns human-readable time like "الآن", "منذ 3 دقائق", "منذ ساعة", etc.
 */
export function getRelativeTimeAr(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "الآن";
  if (diffMin === 1) return "منذ دقيقة";
  if (diffMin < 60) return `منذ ${diffMin} ${diffMin <= 10 ? "دقائق" : "دقيقة"}`;
  if (diffHr === 1) return "منذ ساعة";
  if (diffHr < 24) return `منذ ${diffHr} ${diffHr <= 10 ? "ساعات" : "ساعة"}`;
  if (diffDay === 1) return "أمس";
  if (diffDay < 7) return `منذ ${diffDay} ${diffDay <= 10 ? "أيام" : "يوم"}`;
  if (diffWeek === 1) return "منذ أسبوع";
  if (diffWeek < 4) return `منذ ${diffWeek} أسابيع`;

  // For older dates, show actual date
  return new Date(dateStr).toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get the login request status display info
 */
export function getLoginRequestStatusInfo(status: string): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (status) {
    case "approved":
      return {
        label: "تمت الموافقة",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        icon: "✅",
      };
    case "rejected":
      return {
        label: "تم الرفض",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        icon: "❌",
      };
    case "expired":
      return {
        label: "انتهت المهلة - لم يتم الرد",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        icon: "⏰",
      };
    case "pending":
    default:
      return {
        label: "في انتظار الرد",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        icon: "⏳",
      };
  }
}
