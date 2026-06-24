import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { useUser, getInitials, getAvatarColor, avatarColorMap } from "../context/UserContext";
import {
  LayoutDashboard,
  ShieldAlert,
  History,
  BarChart3,
  Cpu,
  Settings as SettingsIcon,
  Menu,
  Sun,
  Moon,
  Laptop,
  Shield,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Palette,
  AlertTriangle,
  LogIn,
  LogOut,
  UserCog,
  IdCard,
  Users,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ProfileModal } from "./ProfileModal";
import { ProfileCard } from "./ProfileCard";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Email Scanner", path: "/scanner", icon: ShieldAlert },
  { name: "Scan History", path: "/history", icon: History },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "Model Information", path: "/model", icon: Cpu },
  { name: "Settings", path: "/settings", icon: SettingsIcon },
];

const accentColors = [
  { id: "blue", name: "Blue", class: "bg-blue-500 border-blue-400" },
  { id: "emerald", name: "Emerald", class: "bg-emerald-500 border-emerald-400" },
  { id: "violet", name: "Violet", class: "bg-violet-500 border-violet-400" },
  { id: "amber", name: "Amber", class: "bg-amber-500 border-amber-400" },
] as const;

// ─────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings, isBackendOnline, triggerHealthCheck } = useSettings();
  const { profile, switchToDemo } = useUser();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [accentDropdownOpen, setAccentDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref for returning focus to profile button after modal close
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        navigate("/settings");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const handleRefreshHealth = async () => {
    setIsRefreshingHealth(true);
    await triggerHealthCheck();
    setIsRefreshingHealth(false);
  };

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleProfileSuccess = useCallback(
    (name: string) => {
      setShowLoginModal(false);
      setShowEditModal(false);
      showToast(`Welcome back, ${name.split(" ")[0]}!`);
      setTimeout(() => profileButtonRef.current?.focus(), 80);
    },
    [showToast]
  );

  const handleLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(false);
    switchToDemo();
    showToast("Switched to Demo User.");
    setTimeout(() => profileButtonRef.current?.focus(), 80);
  }, [switchToDemo, showToast]);

  const handleSwitchToDemo = useCallback(() => {
    setProfileDropdownOpen(false);
    switchToDemo();
    showToast("Switched to Demo User.");
  }, [switchToDemo, showToast]);

  const color = getAvatarColor(profile.name);
  const colorCls = avatarColorMap[color];
  const initials = getInitials(profile.name);

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Component */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen glass-panel border-r shrink-0 transition-all duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="h-full flex flex-col justify-between py-6 px-4">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 px-2 mb-8 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-primary text-white shadow-lg shadow-primary/20 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <h1 className="font-bold text-base leading-tight tracking-tight">
                      AEGIS <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">AI</span>
                    </h1>
                    <p className="text-[10px] text-muted-foreground">Security Console</p>
                  </motion.div>
                )}
              </div>

              {/* Collapse toggle (Desktop only) */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-border/5 transition-all"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? "text-primary bg-primary/5 border border-primary/10 shadow-[0_0_12px_rgba(var(--primary),0.05)] font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute left-0 w-1 h-5 rounded-r bg-primary"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={`w-5 h-5 transition-transform shrink-0 group-hover:scale-105 ${
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer of Sidebar */}
          <div className="space-y-4 pt-4 border-t border-border/10">
            {/* Connection Status */}
            <div className={`rounded-xl border border-border/5 transition-all ${isCollapsed ? "p-2 bg-transparent" : "p-3 bg-muted/40"}`}>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                {!isCollapsed && <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Gateway</span>}
                <button
                  onClick={handleRefreshHealth}
                  disabled={isRefreshingHealth}
                  aria-label="Refresh status"
                  className={`p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all ${
                    isRefreshingHealth ? "animate-spin" : ""
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isBackendOnline ? "bg-emerald-400" : "bg-destructive"
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isBackendOnline ? "bg-emerald-500" : "bg-destructive"
                    }`}
                  ></span>
                </span>
                {!isCollapsed && (
                  <span className="text-xs font-semibold truncate">
                    {isBackendOnline === null ? "Diagnosing..." : isBackendOnline ? "Engine Online" : "Engine Offline"}
                  </span>
                )}
              </div>
            </div>

            {/* ── Profile Widget ── */}
            <div className="relative">
              <button
                ref={profileButtonRef}
                onClick={() => {
                  setProfileDropdownOpen((v) => !v);
                  setThemeDropdownOpen(false);
                  setAccentDropdownOpen(false);
                }}
                aria-label="Open user profile menu"
                aria-expanded={profileDropdownOpen}
                className={`w-full flex items-center gap-3 border border-border/5 rounded-xl transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  isCollapsed ? "p-1.5 justify-center" : "p-3 bg-muted/20"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 transition-colors duration-300 ${colorCls.bg} ${colorCls.text} ${colorCls.border}`}
                >
                  {initials}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-semibold truncate">{profile.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
                  </div>
                )}
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute z-20 glass-panel border rounded-xl shadow-xl overflow-hidden ${
                        isCollapsed ? "left-full ml-2 bottom-0 w-48" : "bottom-full mb-2 left-0 right-0"
                      }`}
                    >
                      {/* Dropdown Header */}
                      <div className="px-3 py-2.5 border-b border-border/10">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {profile.isDemo ? "Demo Mode" : "Personal Profile"}
                        </p>
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        {/* View Profile */}
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            setShowProfileCard(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                        >
                          <IdCard className="w-3.5 h-3.5 shrink-0" />
                          <span>View Profile</span>
                        </button>

                        {/* Demo User: show Login button */}
                        {profile.isDemo && (
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              setShowLoginModal(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-all"
                          >
                            <LogIn className="w-3.5 h-3.5 shrink-0" />
                            <span>Personalize Dashboard</span>
                          </button>
                        )}

                        {/* Logged-in User: Edit, Switch, Logout */}
                        {!profile.isDemo && (
                          <>
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                setShowEditModal(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                            >
                              <UserCog className="w-3.5 h-3.5 shrink-0" />
                              <span>Edit Profile</span>
                            </button>

                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                handleSwitchToDemo();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                            >
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>Switch to Demo User</span>
                            </button>

                            <div className="border-t border-border/10 my-1" />

                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                setShowLogoutConfirm(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                            >
                              <LogOut className="w-3.5 h-3.5 shrink-0" />
                              <span>Logout</span>
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b glass-panel">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar drawer"
              className="p-2 rounded-lg md:hidden hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Search Input */}
            <div className="relative max-w-xs w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="global-search-input"
                type="text"
                placeholder="Search threats, emails... (Ctrl + K)"
                aria-label="Search inputs"
                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border/10 bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Quick Header Indicators */}
          <div className="flex items-center gap-3">
            {/* Dynamic Accent Color Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setAccentDropdownOpen(!accentDropdownOpen);
                  setThemeDropdownOpen(false);
                }}
                aria-label="Select accent color"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border/5 transition-all"
              >
                <Palette className="w-4.5 h-4.5" />
              </button>

              <AnimatePresence>
                {accentDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAccentDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-36 glass-panel border rounded-xl p-2.5 shadow-xl z-20 space-y-1.5"
                    >
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Accent</h4>
                      <div className="grid grid-cols-4 gap-1.5">
                        {accentColors.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => {
                              updateSettings({ themeColor: color.id });
                              setAccentDropdownOpen(false);
                            }}
                            title={color.name}
                            aria-label={`Switch to ${color.name} accent`}
                            className={`w-6 h-6 rounded-full border-2 ${color.class} transition-all hover:scale-110 ${
                              settings.themeColor === color.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                            }`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Theme Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setThemeDropdownOpen(!themeDropdownOpen);
                  setAccentDropdownOpen(false);
                }}
                aria-label="Select theme mode"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border/5 transition-all"
              >
                {settings.themeMode === "dark" ? (
                  <Moon className="w-4.5 h-4.5" />
                ) : settings.themeMode === "light" ? (
                  <Sun className="w-4.5 h-4.5" />
                ) : (
                  <Laptop className="w-4.5 h-4.5" />
                )}
              </button>

              <AnimatePresence>
                {themeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setThemeDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-32 glass-panel border rounded-xl p-1.5 shadow-xl z-20 space-y-0.5"
                    >
                      <button
                        onClick={() => {
                          updateSettings({ themeMode: "light" });
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted ${
                          settings.themeMode === "light" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                      <button
                        onClick={() => {
                          updateSettings({ themeMode: "dark" });
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted ${
                          settings.themeMode === "dark" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => {
                          updateSettings({ themeMode: "system" });
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-muted ${
                          settings.themeMode === "system" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5" />
                        <span>System</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Gateway indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border bg-muted/30">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isBackendOnline ? "bg-emerald-400" : "bg-destructive"
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    isBackendOnline ? "bg-emerald-500" : "bg-destructive"
                  }`}
                ></span>
              </span>
              <span className="text-muted-foreground">Gateway:</span>
              <span>{isBackendOnline ? "Connected" : "Offline"}</span>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto">
          <MotionConfig transition={
            settings.reducedMotion || settings.animationSpeed === "instant"
              ? { duration: 0 }
              : settings.animationSpeed === "fast"
              ? { type: "tween", duration: 0.15 }
              : settings.animationSpeed === "slow"
              ? { type: "spring", stiffness: 45, damping: 12 }
              : undefined
          }>
            <AnimatePresence mode="wait">
              {isBackendOnline === false && location.pathname !== "/settings" ? (
                // Offline Error Panel
                <motion.div
                  key="offline-panel"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full flex items-center justify-center p-4 md:p-8"
                >
                  <div className="max-w-md w-full glass-panel border p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
                    {/* Decorative error glow background */}
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-destructive/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-warning/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shadow-lg">
                      <AlertTriangle className="w-8 h-8 animate-bounce" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight">Security Gateway Offline</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Aegis cannot communicate with the classification server at <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-semibold">{settings.apiBaseUrl}</code>. Please check your network connection or verify settings.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={handleRefreshHealth}
                        disabled={isRefreshingHealth}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-opacity-95 transition-all shadow-md shadow-primary/20 disabled:opacity-60"
                      >
                        {isRefreshingHealth ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Retry Gateway</span>
                          </>
                        )}
                      </button>
                      <Link
                        to="/settings"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted text-foreground font-semibold transition-all"
                      >
                        <span>Configure API URL</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // Normal Screen Content
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {children}
                </motion.div>
              )}
            </AnimatePresence>
          </MotionConfig>
        </main>
      </div>

      {/* ── Global Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="layout-toast"
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-20 left-1/2 z-[60] px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-white/10"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      {showLoginModal && (
        <ProfileModal
          mode="login"
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleProfileSuccess}
        />
      )}
      {showEditModal && (
        <ProfileModal
          mode="edit"
          onClose={() => setShowEditModal(false)}
          onSuccess={handleProfileSuccess}
        />
      )}
      {showProfileCard && (
        <ProfileCard
          onClose={() => setShowProfileCard(false)}
          onEditProfile={() => setShowEditModal(true)}
        />
      )}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogoutConfirm}
        />
      )}
    </div>
  );
};
