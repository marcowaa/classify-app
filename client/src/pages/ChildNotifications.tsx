import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { getDateLocale } from "@/i18n/config";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Gift, Star, Trophy, Target, CheckCircle, Clock, ArrowLeft, ArrowRight, Loader2, HelpCircle } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string | null;
  message: string;
  style: string;
  priority: string;
  soundAlert: boolean;
  vibration: boolean;
  relatedId: string | null;
  ctaAction: string | null;
  ctaTarget: string | null;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

const getNotificationConfig = (type: string, priority: string) => {
  const configs: Record<string, { icon: JSX.Element; bgColor: string; iconBg: string }> = {
    points_earned: { 
      icon: <Star className="w-6 h-6 text-white" />, 
      bgColor: "from-yellow-500 to-amber-500", 
      iconBg: "bg-yellow-500" 
    },
    reward_unlocked: { 
      icon: <Trophy className="w-6 h-6 text-white" />, 
      bgColor: "from-purple-500 to-pink-500", 
      iconBg: "bg-purple-500" 
    },
    product_assigned: { 
      icon: <Gift className="w-6 h-6 text-white" />, 
      bgColor: "from-pink-500 to-rose-500", 
      iconBg: "bg-pink-500" 
    },
    task_reminder: { 
      icon: <Clock className="w-6 h-6 text-white" />, 
      bgColor: "from-blue-500 to-cyan-500", 
      iconBg: "bg-blue-500" 
    },
    achievement: { 
      icon: <Trophy className="w-6 h-6 text-white" />, 
      bgColor: "from-green-500 to-emerald-500", 
      iconBg: "bg-green-500" 
    },
    daily_challenge: { 
      icon: <Target className="w-6 h-6 text-white" />, 
      bgColor: "from-orange-500 to-red-500", 
      iconBg: "bg-orange-500" 
    },
    goal_progress: { 
      icon: <Target className="w-6 h-6 text-white" />, 
      bgColor: "from-indigo-500 to-blue-500", 
      iconBg: "bg-indigo-500" 
    },
    gift_assigned: { 
      icon: <Gift className="w-6 h-6 text-white" />, 
      bgColor: "from-pink-500 to-rose-500", 
      iconBg: "bg-pink-500" 
    },
  };
  
  return configs[type] || { 
    icon: <Bell className="w-6 h-6 text-white" />, 
    bgColor: "from-gray-500 to-gray-600", 
    iconBg: "bg-gray-500" 
  };
};

export const ChildNotifications = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const token = localStorage.getItem("childToken");
  const queryClient = useQueryClient();

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["child-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/child/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
    refetchInterval: token ? 10000 : false,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/child/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
    } catch (err) {
      console.error("Mark read error", err);
    }
  };

  const markManyAsRead = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/child/notifications/${id}/read`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
    } catch (err) {
      console.error("Mark many read error", err);
    }
  };

  const resolveNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/child/notifications/${id}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.success) {
        queryClient.invalidateQueries({ queryKey: ["child-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["child-tasks"] });
      }
    } catch (err) {
      console.error("Resolve notification error", err);
    }
  };

  const handleCTA = (notification: Notification) => {
    if (notification.ctaTarget) {
      navigate(notification.ctaTarget);
    } else {
      switch (notification.type) {
        case "product_assigned":
        case "gift_assigned":
        case "gift_unlocked":
        case "gift_activated":
          navigate("/child-gifts");
          break;
        case "task_reminder":
        case "task_assigned":
        case "task_completed":
        case "task":
        case "scheduled_task_unlocked":
        case "scheduled_session_activated":
        case "task_notification_escalation":
          navigate("/child-tasks");
          break;
        case "daily_challenge":
        case "game_shared":
          navigate("/child-games");
          break;
        case "points_earned":
        case "points_adjustment":
        case "reward_unlocked":
        case "achievement":
        case "reward":
          navigate("/child-rewards");
          break;
        case "goal_progress":
          navigate("/child-progress");
          break;
        case "child_pin_changed":
          navigate("/child-settings");
          break;
        default:
          break;
      }
    }
    markAsRead(notification.id);
  };

  const isTaskNotification = (notification: Notification) => {
    return [
      "task",
      "task_assigned",
      "task_reminder",
      "task_notification_escalation",
      "scheduled_task_unlocked",
      "scheduled_session_activated",
    ].includes(notification.type);
  };

  const openHelpFromNotification = (event: React.MouseEvent<HTMLButtonElement>, notification: Notification) => {
    event.stopPropagation();
    const taskId = String(notification.metadata?.taskId || notification.relatedId || "").trim();
    const target = taskId
      ? `/child-tasks?helpTaskId=${encodeURIComponent(taskId)}`
      : "/child-tasks";
    navigate(target);
    markAsRead(notification.id);
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const currentPoints = childInfo?.totalPoints || 0;
  const groupedNotifications = useMemo(() => {
    const list = Array.isArray(notifications) ? notifications : [];
    return list.reduce<Record<string, Notification[]>>((acc, notification) => {
      const dayKey = new Date(notification.createdAt).toLocaleDateString(getDateLocale(), {
        month: "short",
        day: "numeric",
      });
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(notification);
      return acc;
    }, {});
  }, [notifications]);

  const unreadNotifications = notifications?.filter((n) => !n.isRead) || [];
  const readNotifications = notifications?.filter((n) => n.isRead) || [];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-orange-300 to-orange-500"} pb-24`} dir={isRTL ? "rtl" : "ltr"}>
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate("/child-games")}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all"
              >
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, -15, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                >
                  <Bell className="w-7 h-7 text-white" />
                </motion.div>
                <h1 className="text-xl font-bold text-white">{t("childNotifications.title")}</h1>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-lg"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.div
                className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-xl"
                whileHover={{ scale: 1.05 }}
              >
                <Star className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                <span className="text-xs font-bold text-white">{currentPoints}</span>
              </motion.div>
            </div>
          </div>
        </div>
        <div className="w-full overflow-hidden leading-[0] -mb-[1px]">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="w-full h-3">
            <path d="M0,20 C200,35 400,5 600,20 C800,35 1000,5 1200,20 L1200,40 L0,40 Z" fill={isDark ? "rgb(30, 30, 40)" : "rgb(210, 150, 80)"} fillOpacity="0.3" />
          </svg>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { icon: "🔔", value: unreadCount },
              { icon: "✅", value: readNotifications.length },
              { icon: "⭐", value: currentPoints },
            ].map((item, idx) => (
              <div
                key={`${item.icon}-${idx}`}
                className={`${isDark ? "bg-gray-800/80 border border-gray-700/50" : "bg-white/85 border border-white/60"} rounded-xl p-2.5 text-center shadow-md backdrop-blur-sm`}
              >
                <p className="text-base leading-none mb-1">{item.icon}</p>
                <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {notificationsLoading ? (
            <div className="flex flex-col justify-center items-center h-48 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="w-10 h-10 text-white/70" />
              </motion.div>
              <p className="text-white/60 text-sm animate-pulse">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-4">
              {[
                { key: "unread", icon: "🔔", items: unreadNotifications },
                { key: "read", icon: "✅", items: readNotifications },
              ].filter((section) => section.items.length > 0).map((section) => (
                <div key={section.key} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{section.icon}</span>
                      <span className={`text-xs font-bold ${isDark ? "text-white/80" : "text-white"}`}>{section.items.length}</span>
                    </div>
                    {section.key === "unread" && section.items.length > 0 && (
                      <button
                        onClick={() => markManyAsRead(section.items.map((item) => item.id))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isDark ? "bg-gray-800/80 text-gray-200 hover:bg-gray-700" : "bg-white/80 text-gray-700 hover:bg-white"} transition-colors`}
                      >
                        {t("childNotifications.markRead")}
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {section.items.map((notification, index) => {
                      const config = getNotificationConfig(notification.type, notification.priority);
                      const isUrgent = notification.priority === "urgent" || notification.priority === "blocking";
                      const isUnread = !notification.isRead;
                      const dayKey = new Date(notification.createdAt).toLocaleDateString(getDateLocale(), {
                        month: "short",
                        day: "numeric",
                      });
                      const isFirstInDay = groupedNotifications[dayKey]?.[0]?.id === notification.id;

                      return (
                        <div key={notification.id} className="space-y-2">
                          {isFirstInDay && (
                            <p className={`text-[11px] font-semibold px-1 ${isDark ? "text-gray-400" : "text-white/85"}`}>
                              {dayKey}
                            </p>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                            whileTap={{ scale: 0.98 }}
                            className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl overflow-hidden shadow-xl cursor-pointer backdrop-blur-sm ${isUnread ? "ring-2 ring-yellow-400/50" : ""}`}
                            data-testid={`notification-${notification.id}`}
                            onClick={() => handleCTA(notification)}
                          >
                            <div className={`h-1.5 bg-gradient-to-r ${config.bgColor}`} />
                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                <motion.div
                                  whileHover={{ scale: 1.1, rotate: 5 }}
                                  className={`w-11 h-11 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0 shadow-lg`}
                                >
                                  {config.icon}
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"} truncate`}>
                                      {notification.title || notification.type.replace(/_/g, " ")}
                                    </h4>
                                    {isUnread && (
                                      <motion.span
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"
                                      />
                                    )}
                                    {isUrgent && <span className="text-xs">🔔</span>}
                                  </div>
                                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"} mb-2 line-clamp-2`}>
                                    {notification.message}
                                  </p>

                                  {notification.metadata && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {notification.metadata.pointsEarned && (
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isDark ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-100 text-yellow-700"}`}>
                                          ⭐ +{notification.metadata.pointsEarned}
                                        </span>
                                      )}
                                      {notification.metadata.requiredPoints && (
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                                          🎯 {notification.metadata.requiredPoints}
                                        </span>
                                      )}
                                      {notification.metadata.percentage && (
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                                          📊 {notification.metadata.percentage}%
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                      {new Date(notification.createdAt).toLocaleDateString(getDateLocale(), {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      {isTaskNotification(notification) && (
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(event) => openHelpFromNotification(event, notification)}
                                          className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 bg-orange-500 text-white hover:bg-orange-600 transition-all"
                                          data-testid={`button-request-help-from-notification-${notification.id}`}
                                        >
                                          <HelpCircle className="w-3 h-3" />
                                          {t("childTasks.requestHelp")}
                                        </motion.button>
                                      )}
                                      {!notification.isRead && (
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} transition-all`}
                                          data-testid={`button-mark-read-${notification.id}`}
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          {t("childNotifications.markRead")}
                                        </motion.button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="mb-6"
              >
                <span className="text-7xl">🔔</span>
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {t("childNotifications.noNotifications")}
              </h3>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                {t("childNotifications.emptyMessage")}
              </p>
            </motion.div>
          )}

          {/* Encouragement Card */}
          {childInfo?.name && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`${isDark ? "bg-gray-800/90 border border-gray-700/50" : "bg-white/90 border border-white/50"} rounded-2xl p-4 shadow-xl backdrop-blur-sm`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-800"}`}>
                    {t("childNotifications.hello", { name: childInfo.name })} 🌟
                  </h3>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {t("childNotifications.encouragement", { count: currentPoints })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <ChildBottomNav activeTab="profile" />
    </div>
  );
};
