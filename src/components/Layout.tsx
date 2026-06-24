import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import {
  LayoutDashboard,
  ShieldAlert,
  History,
  BarChart3,
  Cpu,
  Settings as SettingsIcon,
  Menu,
  X,
  Sun,
  Moon,
  Shield,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings, isBackendOnline, triggerHealthCheck } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const location = useLocation();

  const handleRefreshHealth = async () => {
    setIsRefreshingHealth(true);
    await triggerHealthCheck();
    setIsRefreshingHealth(false);
  };

  const activeNavItem = navItems.find((item) => item.path === location.pathname) || navItems[0];

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
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 glass-panel border-r shrink-0 transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col justify-between py-6 px-4">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 px-2 mb-8">
              <div className="p-2 rounded-lg bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight">
                  AEGIS <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">AI</span>
                </h1>
                <p className="text-xs text-muted-foreground">Email Security Console</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      isActive
                        ? "text-primary bg-primary/5 border border-primary/10 shadow-[0_0_12px_rgba(var(--primary),0.05)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute left-0 w-1 h-5 rounded-r bg-primary"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={`w-5 h-5 transition-transform group-hover:scale-105 ${
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer of Sidebar */}
          <div className="space-y-4 pt-4 border-t border-border/10">
            {/* Connection Status */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">System Engine</span>
                <button
                  onClick={handleRefreshHealth}
                  disabled={isRefreshingHealth}
                  aria-label="Refresh status"
                  className={`p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all ${
                    isRefreshingHealth ? "animate-spin" : ""
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isBackendOnline ? "bg-emerald-400" : "bg-destructive"
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isBackendOnline ? "bg-emerald-500" : "bg-destructive"
                    }`}
                  ></span>
                </span>
                <span className="text-xs font-semibold">
                  {isBackendOnline === null ? "Connecting..." : isBackendOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Quick Dark Mode & Version */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>v1.0.0</span>
              <button
                onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                aria-label="Toggle theme mode"
                className="p-1.5 rounded-lg border border-border/5 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                {settings.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b glass-panel">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="p-2 rounded-lg md:hidden hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-lg md:text-xl tracking-tight">{activeNavItem.name}</h2>
            </div>
          </div>

          {/* Quick Header Indicators */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full border bg-muted/30">
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
              <span>{isBackendOnline ? "Secure" : "Interrupted"}</span>
            </div>

            {/* Quick Status Icon */}
            {isBackendOnline ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-destructive animate-pulse" />
            )}
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
