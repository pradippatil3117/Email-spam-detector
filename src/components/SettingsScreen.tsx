import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSettings } from "../context/SettingsContext";
import {
  Sun,
  Moon,
  Laptop,
  Palette,
  Sliders,
  Trash2,
  Download,
  Upload,
  ShieldAlert,
  Activity,
  Terminal,
  Info,
  Keyboard,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Cpu,
  Server,
  Clock,
  Database,
  Link as LinkIcon,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { checkHealth } from "../services/api";

type ActiveTab = "general" | "scanner" | "developer" | "system";

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, isBackendOnline, triggerHealthCheck } = useSettings();
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [uptime, setUptime] = useState(0);
  const [storageUsage, setStorageUsage] = useState({ sizeKb: 0, percent: 0 });
  const [copiedDiag, setCopiedDiag] = useState(false);
  
  // Custom dialog state for resets and clears
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Accordion state inside categories
  const [expandedSection, setExpandedSection] = useState<string | null>("appearance");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Uptime Counter (persists inside SessionStorage)
  useEffect(() => {
    let sessionStart = sessionStorage.getItem("aegis_session_start");
    if (!sessionStart) {
      sessionStart = String(Date.now());
      sessionStorage.setItem("aegis_session_start", sessionStart);
    }
    const startTime = Number(sessionStart);

    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 2. LocalStorage Storage usage calculator
  const calculateStorage = () => {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += (localStorage[key]?.length || 0 + key.length) * 2; // 2 bytes per character
      }
    }
    const sizeKb = parseFloat((total / 1024).toFixed(2));
    const percent = parseFloat(((total / (5 * 1024 * 1024)) * 100).toFixed(2));
    setStorageUsage({ sizeKb, percent });
  };

  useEffect(() => {
    calculateStorage();
  }, []);

  // 3. Roundtrip Latency check
  const measurePing = async () => {
    setIsRefreshingHealth(true);
    const start = performance.now();
    try {
      await checkHealth();
      setLatency(Math.round(performance.now() - start));
      await triggerHealthCheck();
    } catch {
      setLatency(null);
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  useEffect(() => {
    measurePing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Format uptime to readable string
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // 5. Settings export
  const handleExportSettings = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "aegis_security_settings.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      if (settings.toastNotifications && settings.exportSuccessNotification) {
        showTriggerToast("Configuration settings exported successfully");
      }
    } catch {
      // Failed silently
    }
  };

  // 6. Settings import
  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === "object") {
          updateSettings(parsed);
          calculateStorage();
          showTriggerToast("Configuration settings imported successfully");
        }
      } catch {
        alert("Invalid settings JSON configuration format.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Clear file target
  };

  // 7. Clipboard Copy Diagnostics
  const handleCopyDiagnostics = () => {
    const info = `### AEGIS SECURITY DIAGNOSTIC REPORT
- Timestamp: ${new Date().toISOString()}
- API Gateway Host: ${settings.apiBaseUrl}
- Gateway Connection: ${isBackendOnline ? "Connected" : "Offline"}
- Latency (Roundtrip): ${latency ? `${latency} ms` : "Offline/Timed Out"}
- Local DB Quota: ${storageUsage.sizeKb} KB (${storageUsage.percent}%)
- App Uptime Session: ${formatUptime(uptime)}
- Selected Theme Color: ${settings.themeColor.toUpperCase()}
- Interface Theme Mode: ${settings.themeMode.toUpperCase()}
- Compact Spacing: ${settings.compactMode ? "Enabled" : "Disabled"}
- Reduced Motion: ${settings.reducedMotion ? "Enabled" : "Disabled"}
- Client Environment: CPython 3.13 / React 19 / Vite 6 / Tailwind v4`;

    navigator.clipboard.writeText(info).then(() => {
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 2000);
      showTriggerToast("Diagnostic logs copied to clipboard");
    });
  };

  // Toast trigger placeholder helper
  const [currentToast, setCurrentToast] = useState<string | null>(null);
  const showTriggerToast = (msg: string) => {
    if (!settings.toastNotifications) return;
    setCurrentToast(msg);
    setTimeout(() => setCurrentToast(null), 3000);
  };

  // 8. Reset operations
  const executeResetSettings = () => {
    localStorage.removeItem("email_security_settings");
    window.location.reload();
  };

  const executeClearHistory = () => {
    localStorage.removeItem("email_security_history");
    calculateStorage();
    showTriggerToast("Scan history logs successfully cleared");
  };

  const executeResetEntireApp = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const toggleAccordion = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const activeTabItems = useMemo(() => {
    return [
      { id: "general", label: "General", icon: Sliders },
      { id: "scanner", label: "Scanner & Alerts", icon: ShieldAlert },
      { id: "developer", label: "Developer Tools", icon: Terminal },
      { id: "system", label: "System & About", icon: Info },
    ] as const;
  }, []);

  return (
    <div className="space-y-8 relative">
      {/* Toast popup */}
      <AnimatePresence>
        {currentToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-20 left-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-white/10"
          >
            <Check className="w-4.5 h-4.5 shrink-0" />
            <span>{currentToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Aegis Operations Panel</p>
          <h3 className="text-xl font-bold tracking-tight">Settings & System Admin</h3>
        </div>
      </div>

      {/* Main Setting Sections Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 pb-2 lg:pb-0 border-b lg:border-b-0 border-border/10">
          {activeTabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "general") setExpandedSection("appearance");
                  if (tab.id === "scanner") setExpandedSection("scanner-view");
                  if (tab.id === "developer") setExpandedSection("dev-config");
                  if (tab.id === "system") setExpandedSection("system-status");
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  isActive
                    ? "bg-primary/5 text-primary border-primary/20 shadow-[0_0_12px_rgba(var(--primary),0.05)]"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
                aria-label={`Open settings category ${tab.label}`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Detail Pane */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: General Preferences */}
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Accordion 1: Appearance */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("appearance")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "appearance"}
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4.5 h-4.5 text-primary" />
                    <span>Appearance & Themes</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "appearance" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "appearance" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 space-y-6 text-xs">
                        {/* Theme Selectors */}
                        <div className="space-y-3">
                          <label className="font-bold text-muted-foreground block uppercase tracking-wider text-[10px]">Select Application Theme</label>
                          <div className="grid grid-cols-3 gap-3">
                            {(["light", "dark", "system"] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => updateSettings({ themeMode: mode })}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center font-bold transition-all relative ${
                                  settings.themeMode === mode
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border/5 bg-muted/10 hover:bg-muted/20 text-muted-foreground hover:text-foreground"
                                }`}
                                aria-label={`Set theme to ${mode}`}
                              >
                                {mode === "light" && <Sun className="w-5 h-5 mb-2" />}
                                {mode === "dark" && <Moon className="w-5 h-5 mb-2" />}
                                {mode === "system" && <Laptop className="w-5 h-5 mb-2" />}
                                <span className="capitalize">{mode}</span>
                                {settings.themeMode === mode && (
                                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Accent Colors Selectors */}
                        <div className="space-y-3">
                          <label className="font-bold text-muted-foreground block uppercase tracking-wider text-[10px]">Accent Highlights Preset</label>
                          <div className="flex flex-wrap gap-4">
                            {[
                              { id: "blue", hex: "#3b82f6", label: "Blue" },
                              { id: "emerald", hex: "#10b981", label: "Emerald" },
                              { id: "violet", hex: "#8b5cf6", label: "Violet" },
                              { id: "amber", hex: "#f59e0b", label: "Amber" },
                            ].map((color) => (
                              <button
                                key={color.id}
                                onClick={() => updateSettings({ themeColor: color.id as any })}
                                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border hover:bg-muted/20 transition-all font-bold"
                                aria-label={`Select accent color ${color.label}`}
                              >
                                <span
                                  className="w-5 h-5 rounded-full border shadow-inner flex items-center justify-center text-white"
                                  style={{ backgroundColor: color.hex }}
                                >
                                  {settings.themeColor === color.id && <Check className="w-3 h-3" />}
                                </span>
                                <span className={settings.themeColor === color.id ? "text-primary" : "text-muted-foreground"}>
                                  {color.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 2: App Preferences */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("preferences")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "preferences"}
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-primary" />
                    <span>Application Workspace Preferences</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "preferences" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "preferences" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        {/* Landing Page */}
                        <div className="space-y-1.5">
                          <label htmlFor="landingPageSelect" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Default Landing Page</label>
                          <select
                            id="landingPageSelect"
                            value={settings.landingPage}
                            onChange={(e) => updateSettings({ landingPage: e.target.value as any })}
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-muted/10 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="dashboard">Dashboard Home</option>
                            <option value="scanner">AI Email Scanner</option>
                            <option value="history">Scan Audit Log</option>
                            <option value="analytics">Threat Analytics</option>
                            <option value="model">Model Diagnostics</option>
                            <option value="settings">Settings Panel</option>
                          </select>
                        </div>

                        {/* Animation Speed */}
                        <div className="space-y-1.5">
                          <label htmlFor="animSpeedSelect" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Animation Speed (Global)</label>
                          <select
                            id="animSpeedSelect"
                            value={settings.animationSpeed}
                            onChange={(e) => updateSettings({ animationSpeed: e.target.value as any })}
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-muted/10 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="instant">Instant (No Animations)</option>
                            <option value="fast">Fast Transitions</option>
                            <option value="normal">Normal Speed</option>
                            <option value="slow">Slow & Animated</option>
                          </select>
                        </div>

                        {/* Date Format */}
                        <div className="space-y-1.5">
                          <label htmlFor="dateFormatSelect" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Calendar Date Format</label>
                          <select
                            id="dateFormatSelect"
                            value={settings.dateFormat}
                            onChange={(e) => updateSettings({ dateFormat: e.target.value as any })}
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-muted/10 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="YYYY-MM-DD">YYYY-MM-DD (International)</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY (US style)</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY (EU style)</option>
                          </select>
                        </div>

                        {/* Time Format */}
                        <div className="space-y-1.5">
                          <label htmlFor="timeFormatSelect" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Clock Time Format</label>
                          <select
                            id="timeFormatSelect"
                            value={settings.timeFormat}
                            onChange={(e) => updateSettings({ timeFormat: e.target.value as any })}
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-muted/10 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="12h">12-hour (AM/PM)</option>
                            <option value="24h">24-hour (Military / Standard)</option>
                          </select>
                        </div>

                        {/* Toggles */}
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/5">
                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Compact Interface Mode</span>
                              <p className="text-[10px] text-muted-foreground leading-normal">Reduce paddings and fonts for data density.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.compactMode}
                              onChange={(e) => updateSettings({ compactMode: e.target.checked })}
                              aria-label="Toggle compact interface mode"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Reduced Motion Controls</span>
                              <p className="text-[10px] text-muted-foreground leading-normal">Disable fluid transitions to help prevent motion issues.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.reducedMotion}
                              onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                              aria-label="Toggle reduced motion accessibility"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Restore Last Profile on Refresh</span>
                              <p className="text-[10px] text-muted-foreground leading-normal">Automatically restore your saved profile when the page reloads. When disabled, every session starts as Demo User.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.autoRestoreProfile}
                              onChange={(e) => updateSettings({ autoRestoreProfile: e.target.checked })}
                              aria-label="Toggle automatic profile restore on refresh"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* TAB 2: Scanner & Alerts */}
          {activeTab === "scanner" && (
            <div className="space-y-4">
              {/* Accordion 1: Scanner */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("scanner-view")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "scanner-view"}
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-primary" />
                    <span>Inference Scanner Preferences</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "scanner-view" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "scanner-view" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 space-y-6 text-xs">
                        {/* Default Spam Threshold Override */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label htmlFor="thresholdSlider" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                              Client Spam Threshold Override (Optional)
                            </label>
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs">
                              {settings.spamThresholdOverride.toFixed(4)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-normal mb-3">
                            Fine-tune the sensitivity score client-side. Setting a higher threshold lowers spam detection rates but minimizes false positives.
                          </p>
                          <input
                            id="thresholdSlider"
                            type="range"
                            min="0.10"
                            max="0.95"
                            step="0.01"
                            value={settings.spamThresholdOverride}
                            onChange={(e) => updateSettings({ spamThresholdOverride: parseFloat(e.target.value) })}
                            aria-label="Spam threshold override slider"
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>

                        {/* Default Scan Layout */}
                        <div className="space-y-3">
                          <label htmlFor="scanViewSelect" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] block">Default Console View</label>
                          <select
                            id="scanViewSelect"
                            value={settings.defaultScanView}
                            onChange={(e) => updateSettings({ defaultScanView: e.target.value as any })}
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-muted/10 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="split">Split Pane (Forms & Results Side-By-Side)</option>
                            <option value="full">Full Width (Stacked layout for deep scanning)</option>
                            <option value="simple">Simple Mode (Body text only, hides header forms)</option>
                          </select>
                        </div>

                        {/* Preferences Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/5">
                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Auto-Save Scan History</span>
                              <p className="text-[10px] text-muted-foreground leading-normal">Save scan records automatically inside Local Storage database.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.autoSaveHistory}
                              onChange={(e) => updateSettings({ autoSaveHistory: e.target.checked })}
                              aria-label="Toggle autosave scan logs"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Deletion Confirmation dialogs</span>
                              <p className="text-[10px] text-muted-foreground leading-normal">Prompt for confirmation before clearing audit logs or individual records.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.confirmDeleteScan}
                              onChange={(e) => updateSettings({ confirmDeleteScan: e.target.checked })}
                              aria-label="Toggle deletion confirmation prompt"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 2: Notifications */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("notifications")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "notifications"}
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-primary" />
                    <span>Notification Settings</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "notifications" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "notifications" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                          <div className="space-y-0.5">
                            <span className="font-bold">Global Toast Notifications</span>
                            <p className="text-[10px] text-muted-foreground leading-normal">Show floating notifications for console events.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.toastNotifications}
                            onChange={(e) => updateSettings({ toastNotifications: e.target.checked })}
                            aria-label="Toggle global toast alerts"
                            className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                          <div className="space-y-0.5">
                            <span className="font-bold">Scan Complete Notifications</span>
                            <p className="text-[10px] text-muted-foreground leading-normal">Alert when security audits finish compiling.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.scanCompleteNotification}
                            onChange={(e) => updateSettings({ scanCompleteNotification: e.target.checked })}
                            aria-label="Toggle scan completed alert"
                            className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                          <div className="space-y-0.5">
                            <span className="font-bold">API Connection Error Alerts</span>
                            <p className="text-[10px] text-muted-foreground leading-normal">Prompt toasts when gateway connection errors occur.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.errorNotifications}
                            onChange={(e) => updateSettings({ errorNotifications: e.target.checked })}
                            aria-label="Toggle connection error warnings"
                            className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                          <div className="space-y-0.5">
                            <span className="font-bold">Export Success Notifications</span>
                            <p className="text-[10px] text-muted-foreground leading-normal">Confirm logs exported to CSV files successfully.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.exportSuccessNotification}
                            onChange={(e) => updateSettings({ exportSuccessNotification: e.target.checked })}
                            aria-label="Toggle export logs success alerts"
                            className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                          />
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* TAB 3: Developer Tools */}
          {activeTab === "developer" && (
            <div className="space-y-4">
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("dev-config")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "dev-config"}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4.5 h-4.5 text-primary animate-pulse" />
                    <span>Developer Options</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "dev-config" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "dev-config" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 space-y-6 text-xs">
                        {/* Gateway URL Field */}
                        <div className="space-y-2">
                          <label htmlFor="apiUrlInput" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">API Gateway Base URL</label>
                          <div className="flex gap-2">
                            <input
                              id="apiUrlInput"
                              type="text"
                              value={settings.apiBaseUrl}
                              onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
                              placeholder="e.g. http://127.0.0.1:8000/api"
                              aria-label="API Base URL Endpoint"
                              className="flex-1 px-3.5 py-2.5 rounded-xl border bg-muted/10 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                              onClick={measurePing}
                              disabled={isRefreshingHealth}
                              className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-opacity-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                              title="Test API latency connection"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHealth ? "animate-spin" : ""}`} />
                              <span>Test Link</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Directs Axios client calls. By default points to the relative route proxy <code className="px-1 py-0.5 rounded bg-muted text-[9px]">/api</code> which Vite tunnels to localhost:8000.
                          </p>
                        </div>

                        {/* Developer Toggle options */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/5">
                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Developer Mode</span>
                              <p className="text-[9px] text-muted-foreground">Show diagnostic widgets.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.developerMode}
                              onChange={(e) => updateSettings({ developerMode: e.target.checked })}
                              aria-label="Toggle developer mode diagnostic panels"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Debug Info</span>
                              <p className="text-[9px] text-muted-foreground">Enable verbose console metrics.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.enableDebugInfo}
                              onChange={(e) => updateSettings({ enableDebugInfo: e.target.checked })}
                              aria-label="Toggle verbose debug output"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>

                          <label className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/10 transition-all font-semibold cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="font-bold">Response Inspector</span>
                              <p className="text-[9px] text-muted-foreground">Show API payloads inspector.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.showResponseInspector}
                              onChange={(e) => updateSettings({ showResponseInspector: e.target.checked })}
                              aria-label="Toggle API JSON response logs"
                              className="w-4 h-4 rounded border-border/20 text-primary focus:ring-0 cursor-pointer"
                            />
                          </label>
                        </div>

                        {/* Developer stats display */}
                        {settings.developerMode && (
                          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                            <h4 className="font-bold text-primary flex items-center gap-1.5">
                              <Terminal className="w-4 h-4" />
                              <span>Diagnostic Parameters</span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 leading-relaxed font-mono text-[10px]">
                              <div>
                                <span className="text-muted-foreground block font-sans">API Endpoint:</span>
                                <span className="font-semibold">{settings.apiBaseUrl}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block font-sans">API Version:</span>
                                <span className="font-semibold">v1.0.0</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block font-sans">Model Version:</span>
                                <span className="font-semibold">v1.0.0 Core</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block font-sans">Gateway Latency:</span>
                                <span className="font-semibold">{latency ? `${latency} ms` : "Offline"}</span>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-primary/10 flex justify-end">
                              <button
                                onClick={handleCopyDiagnostics}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-opacity-95 transition-all"
                              >
                                {copiedDiag ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedDiag ? "Copied!" : "Copy Diagnostics logs"}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* TAB 4: System Status & Data Management */}
          {activeTab === "system" && (
            <div className="space-y-4">
              {/* System status details */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("system-status")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "system-status"}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-primary" />
                    <span>Real-time System Status</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "system-status" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "system-status" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold leading-relaxed">
                        <div className="p-4.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                          <div className="flex items-center justify-between text-muted-foreground font-bold text-[9px] uppercase tracking-wider">
                            <span>Backend Engine</span>
                            <Server className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-sm font-extrabold flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isBackendOnline ? "bg-emerald-500 animate-ping" : "bg-destructive animate-pulse"}`} />
                            <span>{isBackendOnline ? "Connected" : "Offline"}</span>
                          </div>
                        </div>

                        <div className="p-4.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                          <div className="flex items-center justify-between text-muted-foreground font-bold text-[9px] uppercase tracking-wider">
                            <span>Model Loaded</span>
                            <Cpu className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-sm font-extrabold flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isBackendOnline ? "bg-emerald-500" : "bg-destructive/50"}`} />
                            <span>{isBackendOnline ? "Yes (v1.0.0)" : "No"}</span>
                          </div>
                        </div>

                        <div className="p-4.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                          <div className="flex items-center justify-between text-muted-foreground font-bold text-[9px] uppercase tracking-wider">
                            <span>App Uptime</span>
                            <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />
                          </div>
                          <div className="text-sm font-extrabold mt-1 font-mono">{formatUptime(uptime)}</div>
                        </div>

                        <div className="p-4.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                          <div className="flex items-center justify-between text-muted-foreground font-bold text-[9px] uppercase tracking-wider">
                            <span>Storage Quota</span>
                            <Database className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-sm font-extrabold mt-1 truncate">{storageUsage.sizeKb} KB ({storageUsage.percent}%)</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 2: Keyboard Shortcuts */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("shortcuts")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "shortcuts"}
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4.5 h-4.5 text-primary" />
                    <span>Keyboard Hotkeys</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "shortcuts" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "shortcuts" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold leading-relaxed">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-muted/10 border">
                          <span className="text-muted-foreground">Global Search</span>
                          <span className="px-2 py-1 rounded bg-muted border text-[10px] font-mono shadow-sm">Ctrl + K</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-muted/10 border">
                          <span className="text-muted-foreground">Scan Payload Form</span>
                          <span className="px-2 py-1 rounded bg-muted border text-[10px] font-mono shadow-sm">Ctrl + Enter</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-muted/10 border">
                          <span className="text-muted-foreground">Open Settings Console</span>
                          <span className="px-2 py-1 rounded bg-muted border text-[10px] font-mono shadow-sm">Ctrl + ,</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 3: Data Management */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("data")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "data"}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4.5 h-4.5 text-primary" />
                    <span>Data & Configuration Administration</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "data" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "data" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 space-y-6 text-xs font-semibold">
                        {/* Config Import/Export */}
                        <div className="space-y-3">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] block">Aegis Configuration Profile</span>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={handleExportSettings}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted transition-all font-bold"
                            >
                              <Download className="w-4 h-4 text-primary" />
                              <span>Export Settings</span>
                            </button>
                            <input
                              type="file"
                              accept=".json"
                              ref={fileInputRef}
                              onChange={handleImportSettings}
                              className="hidden"
                              aria-label="Upload configuration settings file"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted transition-all font-bold"
                            >
                              <Upload className="w-4 h-4 text-primary" />
                              <span>Import Settings</span>
                            </button>
                          </div>
                        </div>

                        {/* Destructive Actions */}
                        <div className="space-y-3 pt-4 border-t border-border/5">
                          <span className="font-bold text-destructive uppercase tracking-wider text-[10px] block">Quarantine & Destructive Actions</span>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Warning: Reset operations are irreversible. Ensure you have exported configs or diagnostic backups first.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  title: "Reset Configuration Settings?",
                                  message: "This will restore all appearances, preferences, and scanner settings to default system parameters.",
                                  actionLabel: "Reset Settings",
                                  onConfirm: executeResetSettings,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/25 transition-all font-bold"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                              <span>Reset Settings to Defaults</span>
                            </button>

                            <button
                              onClick={() =>
                                setConfirmModal({
                                  title: "Clear All Scan Logs?",
                                  message: "This will permanently delete all scan history items from your local security database cache.",
                                  actionLabel: "Clear History",
                                  onConfirm: executeClearHistory,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/25 transition-all font-bold"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                              <span>Clear Scan History</span>
                            </button>

                            <button
                              onClick={() =>
                                setConfirmModal({
                                  title: "Hard Reset entire Console?",
                                  message: "This will wipe all preferences, configurations, and scan logs databases, restoring Aegis back to its fresh out-of-the-box state.",
                                  actionLabel: "Wipe Console",
                                  onConfirm: executeResetEntireApp,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive text-white hover:bg-opacity-90 shadow-md shadow-destructive/15 transition-all font-bold"
                            >
                              <AlertTriangle className="w-4.5 h-4.5" />
                              <span>Reset Entire Application</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 4: About Aegis */}
              <div className="glass-panel border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion("about")}
                  className="w-full flex items-center justify-between p-5 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all"
                  aria-expanded={expandedSection === "about"}
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4.5 h-4.5 text-primary" />
                    <span>System Specifications & About</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-250 ${expandedSection === "about" ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSection === "about" && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t"
                    >
                      <div className="p-5 space-y-6 text-xs leading-relaxed">
                        {/* Summary details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-semibold">
                          <div className="space-y-1">
                            <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">Application Name</span>
                            <span className="text-sm font-extrabold">Aegis AI Security Console</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">Build Version</span>
                            <span className="text-sm font-extrabold">v1.0.0 (#2026.06.24.01)</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">Frontend Engine Stack</span>
                            <span className="font-bold text-foreground">React 19 / TypeScript 5.8 / Tailwind CSS v4 / Framer Motion</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">Backend Inference Stack</span>
                            <span className="font-bold text-foreground">Python 3.13 / FastAPI / Scikit-Learn v1.6 / SQLite</span>
                          </div>
                        </div>

                        {/* Extra developer/source placements */}
                        <div className="pt-4 border-t border-border/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1 font-semibold">
                            <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">Source Repository</span>
                            <a
                              href="https://github.com/Pavan-Khairnar-Og/Email-spam-detector.git"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-bold inline-flex items-center gap-1.5"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span>Pavan-Khairnar-Og/Email-spam-detector</span>
                            </a>
                          </div>
                          <div className="space-y-1 font-semibold">
                            <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">Copyright & License</span>
                            <span className="font-bold text-foreground">MIT License &copy; 2026 Enterprise Security Group</span>
                          </div>
                        </div>

                        {/* Future Roadmap section */}
                        <div className="pt-4 border-t border-border/5 space-y-2">
                          <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">Console Roadmap</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-muted/10 border">
                              <span className="text-[9px] font-extrabold text-primary block">v2.0 (Q1 2027)</span>
                              <span className="font-bold mt-0.5 block">DistilBERT / RoBERTa Core</span>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/10 border">
                              <span className="text-[9px] font-extrabold text-primary block">v2.1 (Q2 2027)</span>
                              <span className="font-bold mt-0.5 block">DKIM & SPF Verification</span>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/10 border">
                              <span className="text-[9px] font-extrabold text-primary block">v2.2 (Q3 2027)</span>
                              <span className="font-bold mt-0.5 block">Attachments Sandboxing</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOM CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {confirmModal && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)} />
            {/* Dialog Panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full glass-panel border p-6 rounded-2xl space-y-5 shadow-2xl relative"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
              >
                <div className="flex items-center gap-3 border-b border-border/5 pb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
                  <h4 id="confirm-dialog-title" className="font-bold text-sm text-foreground">
                    {confirmModal.title}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed select-text">
                  {confirmModal.message}
                </p>
                <div className="flex justify-end gap-3 pt-1 text-xs font-bold">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 rounded-xl border border-border/20 bg-muted/10 hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-destructive text-white hover:bg-opacity-95 transition-all shadow-md shadow-destructive/10"
                  >
                    {confirmModal.actionLabel}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
