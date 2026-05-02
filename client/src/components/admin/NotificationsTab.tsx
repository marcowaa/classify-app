import React, { useState } from "react";
// سيتم تمرير هذا من AdminDashboard
// type NotificationItem مطابق لتعريف Notification في هذا الملف تقريباً
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Send, Users, User, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaidServicesConfigSection } from "@/components/admin/PaidServicesConfigSection";

interface Notification {
  id: string;
  parentId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
  parentName?: string;
}

export function NotificationsTab({
  token,
  onNotificationClick
}: { token: string, onNotificationClick?: (notification: Notification) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showSendModal, setShowSendModal] = useState(false);
  const [activeSubSection, setActiveSubSection] = useState<"notification-management" | "paid-services">("notification-management");
  const [activeNotificationsFilter, setActiveNotificationsFilter] = useState<"all" | "lockouts">("all");
  const [sendError, setSendError] = useState("");
  const [sendForm, setSendForm] = useState({
    type: "announcement",
    title: "",
    message: "",
    targetType: "all" as "all" | "specific",
    parentId: "",
    sendWebPush: true,
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const raw = data?.data ?? data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.items)) return raw.items;
      return [];
    },
  });

  const { data: parents } = useQuery({
    queryKey: ["admin-parents-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const raw = data?.data ?? data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.items)) return raw.items;
      return [];
    },
    enabled: showSendModal,
  });

  const notificationList: Notification[] = Array.isArray(notifications) ? notifications : [];
  const parentsList: Array<{ id: string; name?: string; email?: string }> = Array.isArray(parents) ? parents : [];

  const isLockoutNotification = (notification: Notification) => {
    const source = String(notification?.metadata?.source || "");
    return notification.type === "security_alert" && source === "auth_login_lockout";
  };

  const lockoutNotifications = notificationList.filter(isLockoutNotification);
  const visibleNotifications =
    activeNotificationsFilter === "lockouts" ? lockoutNotifications : notificationList;

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: typeof sendForm) => {
      const res = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "فشل إرسال الإشعار");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setShowSendModal(false);
      setSendError("");
      setSendForm({
        type: "announcement",
        title: "",
        message: "",
        targetType: "all",
        parentId: "",
        sendWebPush: true,
      });
    },
    onError: (error: any) => {
      setSendError(error?.message || "فشل إرسال الإشعار");
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "announcement": return <Bell className="h-4 w-4 text-blue-500" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "security_alert": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "announcement": return t("admin.notifications.announcement");
      case "warning": return t("admin.notifications.alert");
      case "success": return t("admin.notifications.success");
      case "task_assigned": return t("admin.notifications.task");
      case "task_completed": return t("admin.notifications.taskCompleted");
      case "points_received": return "نقاط";
      case "gift_received": return "هدية";
      case "security_alert": return "أمان";
      default: return type;
    }
  };

  if (isLoading) {
    return <div className="p-4">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          الإشعارات
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeSubSection === "notification-management" ? "default" : "outline"}
            onClick={() => setActiveSubSection("notification-management")}
            data-testid="button-subsection-notification-management"
          >
            إدارة الإشعارات
          </Button>
          <Button
            variant={activeSubSection === "paid-services" ? "default" : "outline"}
            onClick={() => setActiveSubSection("paid-services")}
            data-testid="button-subsection-paid-services"
          >
            توحيد الخدمات المدفوعة (قيد التعليق)
          </Button>
        </div>
      </div>

      {activeSubSection === "paid-services" ? (
        <PaidServicesConfigSection token={token} />
      ) : (
        <>
          <div className="flex items-center justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={activeNotificationsFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveNotificationsFilter("all")}
                data-testid="button-filter-all-notifications"
              >
                الكل ({notificationList.length})
              </Button>
              <Button
                variant={activeNotificationsFilter === "lockouts" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setActiveNotificationsFilter("lockouts")}
                data-testid="button-filter-lockout-notifications"
              >
                تنبيهات الحظر ({lockoutNotifications.length})
              </Button>
              <Button onClick={() => setShowSendModal(true)} data-testid="button-send-notification">
                <Send className="h-4 w-4 ml-2" />
                إرسال إشعار
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">إجمالي الإشعارات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{visibleNotifications.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">غير مقروءة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">
                  {visibleNotifications.filter((n: Notification) => !n.isRead).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">مقروءة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {visibleNotifications.filter((n: Notification) => n.isRead).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>آخر الإشعارات المرسلة</CardTitle>
            </CardHeader>
            <CardContent>
              {visibleNotifications.length > 0 ? (
                <div className="space-y-3">
                  {visibleNotifications.slice(0, 50).map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg flex items-start justify-between gap-4 cursor-pointer transition ${isLockoutNotification(notification)
                          ? "border-red-300 bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "hover:bg-blue-50 dark:hover:bg-gray-700"
                        }`}
                      data-testid={`notification-${notification.id}`}
                      onClick={() => {
                        if (onNotificationClick) onNotificationClick(notification);
                      }}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {getTypeIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {isLockoutNotification(notification) && (
                              <Badge className="text-xs bg-red-600">حظر حساب</Badge>
                            )}
                            {notification.isRead ? (
                              <Badge variant="secondary" className="text-xs">مقروء</Badge>
                            ) : (
                              <Badge className="text-xs">جديد</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{notification.message}</p>
                          {notification.metadata?.category === "account_role_request" && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                              <div>
                                نوع الطلب: {notification.metadata?.roleLabelAr || notification.metadata?.roleType || "-"}
                              </div>
                              <div>
                                اسم المرسل: {notification.metadata?.parentName || "-"}
                              </div>
                              <div>
                                البريد الإلكتروني: {notification.metadata?.parentEmail || "-"}
                              </div>
                              <div>
                                هاتف المرسل: {notification.metadata?.requestedPhone || "-"}
                              </div>
                              <div>
                                هاتف الحساب: {notification.metadata?.parentPhone || "-"}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {new Date(notification.createdAt).toLocaleString("ar-EG")}
                            {notification.parentName && (
                              <>
                                <span className="mx-1">•</span>
                                <User className="h-3 w-3" />
                                {notification.parentName}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm("هل أنت متأكد من حذف هذا الإشعار؟")) {
                            deleteNotificationMutation.mutate(notification.id);
                          }
                        }}
                        data-testid={`button-delete-notification-${notification.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">لا توجد إشعارات</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">إرسال إشعار جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">نوع الإشعار</label>
                <select
                  value={sendForm.type}
                  onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  data-testid="select-notification-type"
                >
                  <option value="announcement">إعلان</option>
                  <option value="warning">تنبيه</option>
                  <option value="success">نجاح</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">العنوان</label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="عنوان الإشعار"
                  data-testid="input-notification-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الرسالة</label>
                <textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                  placeholder="محتوى الرسالة"
                  data-testid="input-notification-message"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">إرسال إلى</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={sendForm.targetType === "all" ? "default" : "outline"}
                    onClick={() => setSendForm({ ...sendForm, targetType: "all", parentId: "" })}
                    className="flex-1"
                    data-testid="button-target-all"
                  >
                    <Users className="h-4 w-4 ml-1" />
                    جميع الآباء
                  </Button>
                  <Button
                    type="button"
                    variant={sendForm.targetType === "specific" ? "default" : "outline"}
                    onClick={() => setSendForm({ ...sendForm, targetType: "specific" })}
                    className="flex-1"
                    data-testid="button-target-specific"
                  >
                    <User className="h-4 w-4 ml-1" />
                    والد محدد
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border p-3 dark:border-gray-600">
                <input
                  id="send-web-push"
                  type="checkbox"
                  checked={sendForm.sendWebPush}
                  onChange={(e) => setSendForm({ ...sendForm, sendWebPush: e.target.checked })}
                  className="rounded"
                  data-testid="checkbox-send-web-push"
                />
                <label htmlFor="send-web-push" className="text-sm font-medium cursor-pointer">
                  إرسال Web Push أيضًا (باستخدام VAPID)
                </label>
              </div>

              {sendForm.targetType === "specific" && (
                <div>
                  <label className="block text-sm font-medium mb-1">اختر الوالد</label>
                  <select
                    value={sendForm.parentId}
                    onChange={(e) => setSendForm({ ...sendForm, parentId: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    data-testid="select-parent"
                  >
                    <option value="">-- اختر والد --</option>
                    {parentsList.map((parent: any) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name} ({parent.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sendError && (
                <p className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {sendError}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={() => sendNotificationMutation.mutate(sendForm)}
                disabled={
                  sendNotificationMutation.isPending ||
                  !sendForm.title ||
                  !sendForm.message ||
                  (sendForm.targetType === "specific" && !sendForm.parentId)
                }
                className="flex-1"
                data-testid="button-confirm-send"
              >
                {sendNotificationMutation.isPending ? "جاري الإرسال..." : "إرسال"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSendModal(false);
                  setSendError("");
                }}
                className="flex-1"
                data-testid="button-cancel-send"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
