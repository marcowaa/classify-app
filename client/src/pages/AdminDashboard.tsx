import React, { Suspense, lazy, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";

import { AdminNotificationBell, type NotificationItem } from "@/components/AccountNotificationBell";

const AdminDashboardTab = lazy(() => import("@/components/admin/DashboardTab").then((m) => ({ default: m.AdminDashboardTab })));
const ProductsTab = lazy(() => import("@/components/admin/ProductsTab").then((m) => ({ default: m.ProductsTab })));
const CategoriesTab = lazy(() => import("@/components/admin/CategoriesTab").then((m) => ({ default: m.CategoriesTab })));
const SymbolsTab = lazy(() => import("@/components/admin/SymbolsTab").then((m) => ({ default: m.SymbolsTab })));
const UsersTab = lazy(() => import("@/components/admin/UsersTab").then((m) => ({ default: m.UsersTab })));
const SettingsTab = lazy(() => import("@/components/admin/SettingsTab").then((m) => ({ default: m.SettingsTab })));
const WalletsTab = lazy(() => import("@/components/admin/WalletsTab").then((m) => ({ default: m.WalletsTab })));
const OrdersTab = lazy(() => import("@/components/admin/OrdersTab").then((m) => ({ default: m.OrdersTab })));
const DepositsTab = lazy(() => import("@/components/admin/DepositsTab").then((m) => ({ default: m.DepositsTab })));
const ActivityLogTab = lazy(() => import("@/components/admin/ActivityLogTab").then((m) => ({ default: m.ActivityLogTab })));
const WalletAnalytics = lazy(() => import("@/components/admin/WalletAnalytics").then((m) => ({ default: m.WalletAnalytics })));
const RiskMonitorTab = lazy(() => import("@/components/admin/RiskMonitorTab").then((m) => ({ default: m.RiskMonitorTab })));
const PaymentMethodsTab = lazy(() => import("@/components/admin/PaymentMethodsTab").then((m) => ({ default: m.PaymentMethodsTab })));
const SubjectsTab = lazy(() => import("@/components/admin/SubjectsTab").then((m) => ({ default: m.SubjectsTab })));
const NotificationsTab = lazy(() => import("@/components/admin/NotificationsTab").then((m) => ({ default: m.NotificationsTab })));
const ReferralsTab = lazy(() => import("@/components/admin/ReferralsTab").then((m) => ({ default: m.ReferralsTab })));
const AdsTab = lazy(() => import("@/components/admin/AdsTab").then((m) => ({ default: m.AdsTab })));
const ParentsTab = lazy(() => import("@/components/admin/ParentsTab").then((m) => ({ default: m.ParentsTab })));
const ProfitSystemTab = lazy(() => import("@/components/admin/ProfitSystemTab").then((m) => ({ default: m.ProfitSystemTab })));
const LibrariesTab = lazy(() => import("@/components/admin/LibrariesTab"));
const SchoolsTab = lazy(() => import("@/components/admin/SchoolsTab"));
const SeoSettingsTab = lazy(() => import("@/components/admin/SeoSettingsTab").then((m) => ({ default: m.SeoSettingsTab })));
const SupportSettingsTab = lazy(() => import("@/components/admin/SupportSettingsTab").then((m) => ({ default: m.SupportSettingsTab })));
const GiftsTab = lazy(() => import("@/components/admin/GiftsTab").then((m) => ({ default: m.GiftsTab })));
const NotificationSettingsTab = lazy(() => import("@/components/admin/NotificationSettingsTab").then((m) => ({ default: m.NotificationSettingsTab })));
const GamesTab = lazy(() => import("@/components/admin/GamesTab").then((m) => ({ default: m.GamesTab })));
const TasksTab = lazy(() => import("@/components/admin/TasksTab").then((m) => ({ default: m.TasksTab })));
const TaskNotificationLevelsTab = lazy(() => import("@/components/admin/TaskNotificationLevelsTab").then((m) => ({ default: m.TaskNotificationLevelsTab })));
const LegalTab = lazy(() => import("@/components/admin/LegalTab").then((m) => ({ default: m.LegalTab })));
const MobileAppSettingsTab = lazy(() => import("@/components/admin/MobileAppSettingsTab").then((m) => ({ default: m.MobileAppSettingsTab })));
const GrowthTreeSettingsTab = lazy(() => import("@/components/admin/GrowthTreeSettingsTab").then((m) => ({ default: m.GrowthTreeSettingsTab })));
const StoreAnalyticsTab = lazy(() => import("@/components/admin/StoreAnalyticsTab").then((m) => ({ default: m.StoreAnalyticsTab })));
const RewardOffersTab = lazy(() => import("@/components/admin/RewardOffersTab").then((m) => ({ default: m.RewardOffersTab })));
const MerchantProductsReviewTab = lazy(() => import("@/components/admin/MerchantProductsReviewTab").then((m) => ({ default: m.MerchantProductsReviewTab })));

type TabType = "dashboard" | "products" | "categories" | "symbols" | "users" | "settings" | "wallets" | "orders" | "deposits" | "activity" | "analytics" | "payment-methods" | "subjects" | "notifications" | "notification-settings" | "task-notification-levels" | "gifts" | "reward-offers" | "referrals" | "ads" | "parents" | "profits" | "libraries" | "schools" | "games" | "tasks" | "seo" | "support" | "legal" | "mobile-app" | "growth-tree" | "store-analytics" | "risk-monitor" | "merchant-products-review";
type SectionType = "general" | "users-education" | "store-shipping" | "finance-performance" | "platform-integrations";

class AdminTabErrorBoundary extends React.Component<
    {
        tabId: string;
        onBackToDashboard: () => void;
        children: React.ReactNode;
    },
    { hasError: boolean; message: string }
> {
    constructor(props: { tabId: string; onBackToDashboard: () => void; children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, message: "" };
    }

    static getDerivedStateFromError(error: unknown) {
        return {
            hasError: true,
            message: error instanceof Error ? error.message : "Unknown error",
        };
    }

    componentDidUpdate(prevProps: { tabId: string }) {
        if (prevProps.tabId !== this.props.tabId && this.state.hasError) {
            this.setState({ hasError: false, message: "" });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
                    <h3 className="font-semibold mb-2">This admin tab failed to load.</h3>
                    <p className="text-sm mb-3 break-all">{this.state.message}</p>
                    <button
                        type="button"
                        className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        onClick={this.props.onBackToDashboard}
                    >
                        Back to dashboard
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export const AdminDashboard = (): JSX.Element => {
    const { t, i18n } = useTranslation();
    const [, navigate] = useLocation();
    const { isDark, toggleTheme } = useTheme();
    const token = localStorage.getItem("adminToken");

    const [activeTab, setActiveTab] = useState<TabType>("dashboard");
    const [activeSection, setActiveSection] = useState<SectionType>("general");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { data: pendingMerchantProducts } = useQuery({
        queryKey: ["admin-merchant-products-review-count", "pending_review"],
        queryFn: async () => {
            const res = await fetch("/api/admin/merchant-products/review?status=pending_review", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) return [] as any[];
            const data = await res.json();
            return Array.isArray(data?.data) ? data.data : [];
        },
        enabled: !!token,
        refetchInterval: 30000,
    });

    const pendingMerchantCount = Array.isArray(pendingMerchantProducts) ? pendingMerchantProducts.length : 0;
    const merchantReviewLabel = pendingMerchantCount > 0
        ? `مراجعة منتجات التجار (${pendingMerchantCount})`
        : "مراجعة منتجات التجار";

    const isRTL = i18n.language === "ar";

    const shellClass = isDark
        ? "bg-gradient-to-b from-slate-950 via-slate-900 to-gray-950 text-white"
        : "bg-gradient-to-b from-sky-50 via-cyan-50 to-gray-100 text-gray-900";
    const sidebarClass = isDark
        ? "border-white/10 bg-slate-900/95 text-gray-100"
        : "border-white/70 bg-white/95 text-gray-800";
    const surfaceClass = isDark
        ? "border border-white/10 bg-slate-900/72 shadow-[0_18px_28px_-20px_rgba(0,0,0,0.9)]"
        : "border border-white/70 bg-white/90 shadow-[0_18px_28px_-20px_rgba(15,23,42,0.45)]";
    const closedMobileMenuClass = isRTL ? "translate-x-full" : "-translate-x-full";

    const ADMIN_NAV_MAP: Record<string, TabType> = {
        deposit_request: "deposits", deposit_approved: "deposits", deposit_rejected: "deposits",
        withdrawal_approved: "wallets", withdrawal_rejected: "wallets",
        purchase_request: "orders", purchase_approved: "orders", purchase_rejected: "orders",
        purchase_paid: "orders", order_placed: "orders", order_confirmed: "orders",
        order_shipped: "orders", order_delivered: "orders", order_rejected: "orders",
        shipment_requested: "orders", shipping_update: "orders",
        new_registration: "parents", new_user: "parents",
        task_completed: "tasks", task: "tasks", task_assigned: "tasks",
        task_reminder: "tasks", task_notification_escalation: "tasks",
        points_earned: "wallets", points_adjustment: "wallets",
        referral_reward: "referrals", new_referral: "referrals",
        security_alert: "risk-monitor", login_rejected: "risk-monitor", login_code_request: "risk-monitor",
        gift_unlocked: "reward-offers", reward_offer_updated: "reward-offers", gift_activated: "gifts", product_assigned: "products",
        broadcast: "notifications", system_alert: "notifications", info: "notifications",
        game_shared: "games",
    };

    const handleAdminNotificationClick = (notification: NotificationItem) => {
        const tab = ADMIN_NAV_MAP[notification.type];
        if (tab) setActiveTab(tab);
    };

    if (!token) {
        navigate("/admin");
        return <div>Redirecting...</div>;
    }

    const handleLogout = () => {
        setMobileMenuOpen(false);
        localStorage.removeItem("adminToken");
        navigate("/admin");
    };

    const sections: { id: SectionType; label: string; icon: string }[] = [
        { id: "general", label: "الإدارة العامة", icon: "🧭" },
        { id: "users-education", label: "المستخدمون والتعليم", icon: "🎓" },
        { id: "store-shipping", label: "المتجر والشحن", icon: "🛒" },
        { id: "finance-performance", label: "المالية والأداء", icon: "💼" },
        { id: "platform-integrations", label: "المنصة والتكامل", icon: "🔌" },
    ];

    const tabs: { id: TabType; labelKey?: string; label?: string; icon: string; section: SectionType }[] = [
        { id: "dashboard", labelKey: "admin.dashboard", icon: "📊", section: "general" },
        { id: "activity", labelKey: "admin.activityLog", icon: "📋", section: "general" },
        { id: "support", label: "إعدادات الدعم", icon: "📞", section: "general" },
        { id: "legal", labelKey: "admin.legalPages", icon: "📜", section: "general" },

        { id: "parents", labelKey: "admin.parentsManagement", icon: "👨‍👩‍👧‍👦", section: "users-education" },
        { id: "users", labelKey: "admin.children", icon: "👥", section: "users-education" },
        { id: "subjects", labelKey: "admin.subjects.title", icon: "📚", section: "users-education" },
        { id: "tasks", labelKey: "admin.tasks", icon: "📝", section: "users-education" },
        { id: "games", labelKey: "admin.games.title", icon: "🎮", section: "users-education" },
        { id: "growth-tree", labelKey: "garden", icon: "🪴", section: "users-education" },
        { id: "schools", labelKey: "admin.schools.title", icon: "🏫", section: "users-education" },
        { id: "libraries", labelKey: "admin.libraries.title", icon: "📖", section: "users-education" },
        { id: "symbols", labelKey: "admin.symbolsLibrary", icon: "⭐", section: "users-education" },

        { id: "products", labelKey: "admin.products.title", icon: "🛍️", section: "store-shipping" },
        { id: "merchant-products-review", label: merchantReviewLabel, icon: "🧾", section: "store-shipping" },
        { id: "categories", labelKey: "admin.storeCategories", icon: "📁", section: "store-shipping" },
        { id: "orders", labelKey: "admin.orders", icon: "📦", section: "store-shipping" },
        { id: "payment-methods", labelKey: "admin.paymentMethods.title", icon: "💳", section: "store-shipping" },
        { id: "gifts", labelKey: "admin.gifts.title", icon: "🎁", section: "store-shipping" },
        { id: "reward-offers", label: "عروض الهدايا", icon: "🎯", section: "store-shipping" },
        { id: "store-analytics", labelKey: "admin.storeAnalytics", icon: "📊", section: "store-shipping" },
        { id: "settings", label: "in-home", icon: "🏠", section: "store-shipping" },

        { id: "wallets", labelKey: "admin.wallets", icon: "💰", section: "finance-performance" },
        { id: "deposits", labelKey: "admin.deposits.title", icon: "💳", section: "finance-performance" },
        { id: "profits", labelKey: "admin.profitSystem.title", icon: "💹", section: "finance-performance" },
        { id: "referrals", labelKey: "admin.referrals.title", icon: "🤝", section: "finance-performance" },
        { id: "analytics", labelKey: "admin.walletAnalytics", icon: "📈", section: "finance-performance" },
        { id: "risk-monitor", labelKey: "admin.riskMonitor.title", icon: "🛡️", section: "finance-performance" },

        { id: "notifications", labelKey: "admin.notifications.title", icon: "🔔", section: "platform-integrations" },
        { id: "notification-settings", labelKey: "admin.notificationSettings.title", icon: "🧩", section: "platform-integrations" },
        { id: "task-notification-levels", labelKey: "admin.taskNotificationLevels.title", icon: "🚨", section: "platform-integrations" },
        { id: "ads", labelKey: "admin.ads.title", icon: "📢", section: "platform-integrations" },
        { id: "mobile-app", labelKey: "admin.mobileApp.title", icon: "📲", section: "platform-integrations" },
        { id: "seo", labelKey: "admin.seoSettings.title", icon: "🔍", section: "platform-integrations" },
    ];

    const getSectionForTab = (tabId: TabType): SectionType => {
        return tabs.find((item) => item.id === tabId)?.section || "general";
    };

    useEffect(() => {
        setActiveSection(getSectionForTab(activeTab));
    }, [activeTab]);

    const handleSectionClick = (sectionId: SectionType) => {
        setActiveSection(sectionId);
        const sectionTabs = tabs.filter((item) => item.section === sectionId);
        const hasActive = sectionTabs.some((item) => item.id === activeTab);
        if (!hasActive && sectionTabs[0]) {
            setActiveTab(sectionTabs[0].id);
        }
        setMobileMenuOpen(false);
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case "dashboard":
                return <AdminDashboardTab token={token} />;
            case "subjects":
                return <SubjectsTab token={token} />;
            case "categories":
                return <CategoriesTab token={token} />;
            case "symbols":
                return <SymbolsTab token={token} />;
            case "products":
                return <ProductsTab token={token} />;
            case "merchant-products-review":
                return <MerchantProductsReviewTab token={token} />;
            case "store-analytics":
                return <StoreAnalyticsTab token={token} />;
            case "users":
                return <UsersTab token={token} />;
            case "wallets":
                return <WalletsTab token={token} />;
            case "orders":
                return <OrdersTab token={token} />;
            case "deposits":
                return <DepositsTab token={token} />;
            case "payment-methods":
                return <PaymentMethodsTab token={token} />;
            case "analytics":
                return <WalletAnalytics token={token} />;
            case "risk-monitor":
                return <RiskMonitorTab token={token} />;
            case "activity":
                return <ActivityLogTab token={token} />;
            case "notifications":
                return (
                    <NotificationsTab
                        token={token}
                        onNotificationClick={handleAdminNotificationClick}
                    />
                );
            case "notification-settings":
                return <NotificationSettingsTab token={token} />;
            case "task-notification-levels":
                return <TaskNotificationLevelsTab token={token} />;
            case "gifts":
                return <GiftsTab token={token} />;
            case "reward-offers":
                return <RewardOffersTab token={token} />;
            case "referrals":
                return <ReferralsTab token={token} />;
            case "ads":
                return <AdsTab token={token} />;
            case "parents":
                return <ParentsTab token={token} />;
            case "profits":
                return <ProfitSystemTab token={token} />;
            case "libraries":
                return <LibrariesTab />;
            case "schools":
                return <SchoolsTab />;
            case "games":
                return <GamesTab token={token} />;
            case "tasks":
                return <TasksTab token={token} />;
            case "growth-tree":
                return <GrowthTreeSettingsTab token={token} />;
            case "seo":
                return <SeoSettingsTab />;
            case "support":
                return <SupportSettingsTab />;
            case "legal":
                return <LegalTab token={token} />;
            case "mobile-app":
                return <MobileAppSettingsTab token={token} />;
            case "settings":
                return <SettingsTab token={token} />;
            default:
                return null;
        }
    };

    return (
        <div className={`relative min-h-screen lg:h-screen overflow-x-clip ${shellClass}`} dir={isRTL ? "rtl" : "ltr"}>
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={`absolute -top-24 ${isRTL ? "-left-24" : "-right-24"} h-72 w-72 rounded-full ${isDark ? "bg-cyan-500/20" : "bg-cyan-300/55"} blur-3xl`} />
                <div className={`absolute top-1/3 ${isRTL ? "-right-24" : "-left-24"} h-80 w-80 rounded-full ${isDark ? "bg-emerald-500/12" : "bg-emerald-200/55"} blur-3xl`} />
            </div>

            <div className="relative z-20 flex min-h-screen lg:h-screen">
                <div
                    className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
                        }`}
                    onClick={() => setMobileMenuOpen(false)}
                />

                <aside
                    className={`fixed ${isRTL ? "right-0" : "left-0"} top-0 z-40 h-full w-72 border ${sidebarClass} transform transition-transform duration-300 lg:static lg:h-screen ${mobileMenuOpen ? "translate-x-0" : closedMobileMenuClass
                        } ${sidebarOpen ? "lg:w-72" : "lg:w-24"} lg:translate-x-0 flex flex-col`}
                >
                    <div className="p-4 flex items-center justify-between shrink-0">
                        {sidebarOpen && <h1 className="text-xl font-bold truncate">{t("admin.title")}</h1>}

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`hidden lg:inline-flex p-2 rounded-xl ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-100"}`}
                            >
                                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>

                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className={`lg:hidden p-2 rounded-xl ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-100"}`}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <nav className="space-y-2 p-4 flex-1 overflow-y-auto">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => handleSectionClick(section.id)}
                                className={`w-full min-h-11 flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === section.id
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_12px_20px_-16px_rgba(37,99,235,0.95)]"
                                        : isDark
                                            ? "bg-slate-900 hover:bg-slate-800"
                                            : "bg-white/70 hover:bg-white"
                                    }`}
                            >
                                <span className="text-xl">{section.icon}</span>
                                {sidebarOpen && <span className="font-medium">{section.label}</span>}
                            </button>
                        ))}

                        <button
                            onClick={handleLogout}
                            className="w-full min-h-11 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 transition-all shadow-[0_12px_20px_-16px_rgba(225,29,72,0.95)] mt-4"
                            data-testid="button-logout"
                        >
                            <LogOut size={20} />
                            {sidebarOpen && <span>{t("admin.logout")}</span>}
                        </button>
                    </nav>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className={`flex items-center justify-between gap-2 p-3 border-b ${isDark ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-white/80"}`}>
                        <button
                            className={`lg:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-white hover:bg-gray-100"}`}
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <Menu size={20} />
                        </button>

                        <div className="flex items-center gap-2 ms-auto">
                            <AdminNotificationBell onNotificationClick={handleAdminNotificationClick} />
                            <LanguageSelector />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={toggleTheme}
                                data-testid="button-theme-toggle"
                                className={`rounded-xl ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-100"}`}
                            >
                                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
                        <div className={`mb-5 rounded-2xl p-2 ${surfaceClass}`}>
                            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {tabs
                                    .filter((item) => item.section === activeSection)
                                    .map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`whitespace-nowrap min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_12px_20px_-16px_rgba(37,99,235,0.95)]"
                                                    : isDark
                                                        ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
                                                        : "bg-white text-gray-700 hover:bg-gray-100"
                                                }`}
                                        >
                                            <span className="me-1">{tab.icon}</span>
                                            {tab.label || (tab.labelKey ? t(tab.labelKey) : "")}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        <AdminTabErrorBoundary tabId={activeTab} onBackToDashboard={() => setActiveTab("dashboard")}>
                            <Suspense fallback={<div className="py-10"><p className="text-sm opacity-70">Loading tab...</p></div>}>
                                {renderActiveTab()}
                            </Suspense>
                        </AdminTabErrorBoundary>
                    </div>
                </div>
            </div>
        </div>
    );
};
