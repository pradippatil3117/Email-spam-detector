import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Code,
  Award,
  Gift,
  UserCheck,
  Clipboard,
  HelpCircle,
  Globe,
  Link as LinkIcon,
  FileText,
  Flame,
  ShieldX,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useUser } from "../context/UserContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { predictSpam } from "../services/api";
import { ScanResult, ScanHistoryItem } from "../types";
import { getSeedHistory } from "../utils/seedData";

// Zod Validation Schema
const scanSchema = z.object({
  sender: z.string().min(1, "Sender is required").email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required").max(150, "Subject must be under 150 characters"),
  body: z.string().min(1, "Email body is required").max(50000, "Email body must be under 50,000 characters"),
});

type ScanFormData = z.infer<typeof scanSchema>;

const scanStages = [
  { id: 0, label: "Validating email structure..." },
  { id: 1, label: "Checking sender reputation..." },
  { id: 2, label: "Running NLP feature extraction..." },
  { id: 3, label: "Evaluating spam probability..." },
  { id: 4, label: "Generating security report..." },
];

export const ScannerScreen: React.FC = () => {
  const { settings } = useSettings();
  const { profile } = useUser();
  const [, setHistory] = useLocalStorage<ScanHistoryItem[]>("email_security_history", getSeedHistory());
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [currentStage, setCurrentStage] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [devMode, setDevMode] = useState(false);
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm<ScanFormData>({
    resolver: zodResolver(scanSchema),
    mode: "onChange",
  });

  // Populate hidden inputs in simple view
  useEffect(() => {
    if (settings.defaultScanView === "simple") {
      reset({
        sender: "simple-scanner@aegis-ai.local",
        subject: "Simple Payload Security Audit",
        body: ""
      });
    }
  }, [settings.defaultScanView, reset]);

  // Global keyboard shortcut: Ctrl + Enter to submit form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const submitBtn = document.getElementById("scanner-submit-btn") as HTMLButtonElement | null;
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = () => {
    reset();
    setScanStatus("idle");
    setScanResult(null);
    setErrorMessage("");
  };

  const onSubmit = async (data: ScanFormData) => {
    setScanStatus("scanning");
    setCurrentStage(0);
    setErrorMessage("");
    setScanResult(null);

    // Setup an interval to advance the scanning stage animation
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < scanStages.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stageInterval);
          return prev;
        }
      });
    }, 4000 / scanStages.length); // complete stages in ~4 seconds

    const startTime = Date.now();

    try {
      // Execute the request to FastAPI backend
      const result = await predictSpam({
        sender: data.sender,
        subject: data.subject,
        body: data.body,
      });

      // Calculate time remaining to let the visual stages finish
      const elapsedTime = Date.now() - startTime;
      const delayTime = Math.max(0, 4000 - elapsedTime);

      // Wait for stages to complete visually
      await new Promise((resolve) => setTimeout(resolve, delayTime));
      clearInterval(stageInterval);

      // Respect spamThresholdOverride for prediction and risk level
      const activeThreshold = settings.spamThresholdOverride;
      const isSpam = result.spam_score >= activeThreshold;
      let finalRiskLevel: "Low" | "Medium" | "High" = "Low";
      if (result.spam_score >= 0.7) {
        finalRiskLevel = "High";
      } else if (result.spam_score >= activeThreshold) {
        finalRiskLevel = "Medium";
      }

      // Save scan to history
      const historyItem: ScanHistoryItem = {
        id: `scan-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sender: data.sender,
        subject: data.subject,
        body: data.body,
        prediction: isSpam ? "Spam" : "Safe",
        confidence: result.confidence,
        spam_score: result.spam_score,
        risk_level: finalRiskLevel,
        processing_time_ms: result.processing_time_ms,
        suspicious_keywords: result.suspicious_keywords,
        reasons: result.reasons,
        userName: profile.name,
        userEmail: profile.email,
      };

      if (settings.autoSaveHistory) {
        setHistory((prev) => [historyItem, ...prev]);
      }
      
      setScanResult({
        ...result,
        prediction: isSpam ? "Spam" : "Safe",
        risk_level: finalRiskLevel,
      });
      setScanStatus("success");
    } catch (error: any) {
      clearInterval(stageInterval);
      setScanStatus("error");

      if (error.code === "ECONNABORTED") {
        setErrorMessage("Request timed out. The security classification server took too long to respond.");
      } else if (!navigator.onLine) {
        setErrorMessage("Network connection offline. Please check your internet connectivity.");
      } else if (error.response?.status === 404) {
        setErrorMessage("Model configuration or prediction endpoint not found on the backend gateway.");
      } else if (error.response?.data?.detail) {
        setErrorMessage(`Backend Error: ${error.response.data.detail}`);
      } else {
        setErrorMessage("Inference Gateway Unreachable. Verify that the FastAPI backend server is running.");
      }
    }
  };



  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${settings.defaultScanView === "full" ? "max-w-4xl mx-auto" : ""}`}>
      {/* LEFT COLUMN: Input Form */}
      <div className={`${
        settings.defaultScanView === "split" ? "lg:col-span-6" : "lg:col-span-12"
      } space-y-6`}>
        <div className="p-6 rounded-2xl glass-panel border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold tracking-tight">Security Scan Console</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Analyze SMTP payload details through Aegis AI vector boundaries.
              </p>
            </div>
            <button
              onClick={() => setDevMode(!devMode)}
              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                devMode ? "bg-primary/10 text-primary border-primary/25" : "bg-muted text-muted-foreground border-border/10"
              }`}
              aria-label="Toggle developer mode"
            >
              <Code className="w-3 h-3" />
              <span>Dev Mode</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Sender Email Input */}
            {settings.defaultScanView !== "simple" && (
              <div className="space-y-1.5">
                <label htmlFor="sender" className="text-xs font-semibold text-muted-foreground">
                  Sender Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="sender"
                    type="text"
                    placeholder="e.g. support@paypal-security.com"
                    aria-label="Sender email address"
                    {...register("sender")}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-muted/10 text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.sender
                        ? "border-destructive/40 focus:ring-destructive/20 focus:border-destructive"
                        : "border-border/10 focus:ring-primary/20 focus:border-primary"
                    }`}
                    disabled={scanStatus === "scanning"}
                  />
                </div>
                {errors.sender && (
                  <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.sender.message}</span>
                  </p>
                )}
              </div>
            )}

            {/* Subject Input */}
            {settings.defaultScanView !== "simple" && (
              <div className="space-y-1.5">
                <label htmlFor="subject" className="text-xs font-semibold text-muted-foreground">
                  Email Subject Line
                </label>
                <input
                  id="subject"
                  type="text"
                  placeholder="e.g. Urgent: Verify your password immediately"
                  aria-label="Email subject line"
                  {...register("subject")}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-muted/10 text-sm focus:outline-none focus:ring-2 transition-all ${
                    errors.subject
                      ? "border-destructive/40 focus:ring-destructive/20 focus:border-destructive"
                      : "border-border/10 focus:ring-primary/20 focus:border-primary"
                  }`}
                  disabled={scanStatus === "scanning"}
                />
                {errors.subject && (
                  <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.subject.message}</span>
                  </p>
                )}
              </div>
            )}

            {/* Body Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="body" className="text-xs font-semibold text-muted-foreground">
                Email Raw Body / Content
              </label>
              <textarea
                id="body"
                rows={8}
                placeholder="Paste the full body copy of the email here..."
                aria-label="Email raw body"
                {...register("body")}
                className={`w-full px-4 py-3 rounded-xl border bg-muted/10 text-sm focus:outline-none focus:ring-2 transition-all resize-none ${
                  errors.body
                    ? "border-destructive/40 focus:ring-destructive/20 focus:border-destructive"
                    : "border-border/10 focus:ring-primary/20 focus:border-primary"
                }`}
                disabled={scanStatus === "scanning"}
              />
              {errors.body && (
                <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.body.message}</span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                id="scanner-submit-btn"
                type="submit"
                disabled={scanStatus === "scanning" || !isValid}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold hover:bg-opacity-95 shadow-md shadow-primary/10 transition-all disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {scanStatus === "scanning" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Analyze Email (Ctrl + Enter)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={scanStatus === "scanning"}
                className="px-4 py-3 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground font-semibold transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Scenarios & Results */}
      <div className={settings.defaultScanView === "split" ? "lg:col-span-6" : "lg:col-span-12"}>
        <AnimatePresence mode="wait">
          {/* SCENARIO 1: Idle Screen */}
          {scanStatus === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 rounded-2xl glass-panel border border-dashed flex flex-col items-center justify-center text-center space-y-4 h-[440px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center shadow-inner">
                <Activity className="w-7 h-7" />
              </div>
              <div className="max-w-sm space-y-1">
                <h4 className="font-bold text-base">Inference Engine Ready</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter email headers and body text on the left panel to execute spam and phishing audit protocols.
                </p>
              </div>
            </motion.div>
          )}

          {/* SCENARIO 2: Scanning Loading Animation */}
          {scanStatus === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 rounded-2xl glass-panel border flex flex-col justify-between h-[450px] relative overflow-hidden"
            >
              {/* Pulsing Radar sweep */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                <div className="w-80 h-80 rounded-full border-4 border-primary animate-ping" />
                <div className="w-56 h-56 rounded-full border-2 border-primary animate-pulse absolute" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm tracking-wide text-primary uppercase">Active Auditing Engine</h4>
                  <span className="text-xs font-bold text-muted-foreground">Step {currentStage + 1} of 5</span>
                </div>
                <div className="space-y-2.5">
                  {scanStages.map((stage) => {
                    const isCompleted = currentStage > stage.id;
                    const isActive = currentStage === stage.id;

                    return (
                      <div
                        key={stage.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isActive
                            ? "bg-primary/5 border-primary/20 shadow-sm"
                            : isCompleted
                            ? "bg-emerald-500/5 border-emerald-500/10 opacity-75"
                            : "bg-transparent border-transparent opacity-40"
                        }`}
                      >
                        <div className="shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : isActive ? (
                            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                          )}
                        </div>
                        <span className={`text-xs font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="space-y-2 mt-4 pt-4 border-t border-border/5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Analyzing vector signatures</span>
                  <span className="text-primary">{Math.round(((currentStage + 1) / scanStages.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStage + 1) / scanStages.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* SCENARIO 3: Scan Results Display */}
          {scanStatus === "success" && scanResult && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Circular Gauge and Threat Summary Card */}
              <div className="p-6 rounded-2xl glass-panel border shadow-lg flex flex-col md:flex-row items-center gap-6">
                {/* Circular Gauge */}
                <div className="relative shrink-0 flex items-center justify-center">
                  {(() => {
                    const radius = 38;
                    const circumference = 2 * Math.PI * radius;
                    const score = scanResult.threat_score ?? Math.round(scanResult.spam_score * 100);
                    const strokeDashoffset = circumference - (score / 100) * circumference;
                    
                    let strokeColor = "stroke-emerald-500";
                    let textColor = "text-emerald-500";
                    if (score > 90) {
                      strokeColor = "stroke-red-600 dark:stroke-destructive";
                      textColor = "text-red-600 dark:text-destructive";
                    } else if (score > 70) {
                      strokeColor = "stroke-orange-500";
                      textColor = "text-orange-500";
                    } else if (score > 45) {
                      strokeColor = "stroke-amber-500";
                      textColor = "text-amber-500";
                    } else if (score > 20) {
                      strokeColor = "stroke-yellow-500";
                      textColor = "text-yellow-500";
                    }
                    
                    return (
                      <>
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r={radius} className="stroke-muted/30 fill-none" strokeWidth="7" />
                          <circle cx="48" cy="48" r={radius} className={`${strokeColor} fill-none transition-all duration-1000`} strokeWidth="7" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-2xl font-extrabold ${textColor}`}>{score}</span>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground leading-none">Score</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Threat Summary Content */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div>
                      <h4 className="text-base font-extrabold tracking-tight">Executive Threat Summary</h4>
                      <p className="text-xs text-muted-foreground">Dynamic vulnerability assessment and risk telemetry.</p>
                    </div>
                    {scanResult.threat_summary && (
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                        scanResult.threat_summary.severity === "Critical"
                          ? "bg-red-600/10 text-red-600 border-red-600/25 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/25"
                          : scanResult.threat_summary.severity === "High"
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/25"
                          : scanResult.threat_summary.severity === "Medium"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/25"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                      }`}>
                        {scanResult.threat_summary.severity} Severity
                      </span>
                    )}
                  </div>
                  {scanResult.threat_summary && (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-border/5">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Attack Type</span>
                          <span className="font-bold text-foreground">{scanResult.threat_summary.attack_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Impersonated Brand</span>
                          <span className="font-bold text-foreground">{scanResult.threat_summary.brand_impersonated}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Primary Target</span>
                          <span className="font-bold text-foreground">{scanResult.threat_summary.primary_target}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Confidence Level</span>
                          <span className="font-bold text-foreground">{scanResult.threat_summary.confidence_level}</span>
                        </div>
                      </div>
                      {scanResult.threat_summary.executive_summary && (
                        <div className="text-xs border-t border-border/5 pt-3 text-muted-foreground leading-relaxed whitespace-pre-line">
                          {scanResult.threat_summary.executive_summary}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Recommended Actions Card */}
              {scanResult.recommended_actions && (
                <div className={`p-4 rounded-xl border flex gap-3.5 items-start ${
                  scanResult.prediction === "Spam"
                    ? "bg-red-600/5 border-red-600/20 text-red-600 dark:bg-destructive/5 dark:border-destructive/20 dark:text-destructive-foreground"
                    : scanResult.spam_score >= 0.35
                    ? "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <div className="p-2.5 rounded-lg border border-current bg-white/10 shrink-0">
                    {scanResult.prediction === "Spam" ? (
                      <ShieldX className="w-5 h-5" />
                    ) : scanResult.spam_score >= 0.35 ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm leading-none flex items-center gap-1.5">
                      Recommended Action: {scanResult.recommended_actions[0]}
                    </h4>
                    <ul className="text-xs opacity-90 list-disc pl-4 pt-1 space-y-0.5 leading-normal">
                      {scanResult.recommended_actions.slice(1).map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Brand Intelligence Card */}
              {scanResult.brand_detection && scanResult.brand_detection.brand !== "None" && (
                <div className={`p-4 rounded-xl border flex gap-3.5 items-start ${
                  scanResult.brand_detection.impersonation === "Likely"
                    ? "bg-red-600/5 border-red-600/20 text-red-600 dark:bg-destructive/5 dark:border-destructive/20 dark:text-destructive-foreground"
                    : "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <div className="p-2.5 rounded-lg border border-current bg-white/10 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm leading-none flex items-center gap-1.5">
                      Brand Intelligence Analysis
                    </h4>
                    <p className="text-xs mt-1">
                      Detected reference to <span className="font-bold uppercase text-foreground">{scanResult.brand_detection.brand}</span> in:{" "}
                      <span className="font-semibold text-foreground/80">{scanResult.brand_detection.detected_in.join(", ")}</span>.
                    </p>
                    <p className="text-xs font-semibold mt-1">
                      Verification Status:{" "}
                      <span className={scanResult.brand_detection.impersonation === "Official" ? "text-emerald-500" : "text-destructive font-extrabold"}>
                        {scanResult.brand_detection.impersonation === "Official" ? "Official Verified Domain" : "SUSPICIOUS IMPERSONATION ALERT"}
                      </span>{" "}
                      ({scanResult.brand_detection.confidence}% Match confidence)
                    </p>
                  </div>
                </div>
              )}

              {/* Indicators of Compromise (IOC) Summary Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Indicators of Compromise (IOCs)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(() => {
                    const iocs = scanResult.ioc_summary ?? {
                      "URLs Found": 0,
                      "Domains": 0,
                      "Email Addresses": 0,
                      "Phone Numbers": 0,
                      "Attachments": 0,
                      "IP Addresses": 0,
                      "Shortened URLs": 0,
                      "Cloud Links": 0,
                      "Forms Detected": 0
                    };
                    const iocConfig = [
                      { label: "URLs Found", value: iocs["URLs Found"] ?? 0, icon: LinkIcon },
                      { label: "Domains", value: iocs["Domains"] ?? 0, icon: Globe },
                      { label: "Email Addresses", value: iocs["Email Addresses"] ?? 0, icon: Mail },
                      { label: "Phone Numbers", value: iocs["Phone Numbers"] ?? 0, icon: UserCheck },
                      { label: "Attachments", value: iocs["Attachments"] ?? 0, icon: FileText },
                      { label: "IP Addresses", value: iocs["IP Addresses"] ?? 0, icon: Activity },
                      { label: "Shortened URLs", value: iocs["Shortened URLs"] ?? 0, icon: LinkIcon },
                      { label: "Cloud Links", value: iocs["Cloud Links"] ?? 0, icon: Globe },
                      { label: "Forms Detected", value: iocs["Forms Detected"] ?? 0, icon: Clipboard }
                    ];
                    return iocConfig.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl glass-panel border flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50 border border-border/5 text-muted-foreground shrink-0">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block leading-none mb-1">{item.label}</span>
                          <span className="text-sm font-extrabold">{item.value}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Threat Categories Badges */}
              {scanResult.prediction === "Spam" && scanResult.threat_categories && Object.keys(scanResult.threat_categories).length > 0 && (
                <div className="p-5 rounded-2xl glass-panel border space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 pb-2">
                    Threat Indicators & Signatures
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(scanResult.threat_categories).map(([cat, keywords], idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                        <span className="font-bold text-muted-foreground w-36 shrink-0">{cat}:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(keywords as string[]).map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-600/10 text-red-600 border border-red-600/20 dark:bg-destructive/10 dark:text-destructive dark:border-destructive/20">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Psychological Techniques */}
              {scanResult.prediction === "Spam" && scanResult.social_engineering && scanResult.social_engineering.length > 0 && (
                <div className="p-5 rounded-2xl glass-panel border space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 pb-2">
                    Psychological Social Engineering Tactics
                  </h4>
                  <div className="space-y-3">
                    {scanResult.social_engineering.map((tech, idx) => {
                      let TechIcon = HelpCircle;
                      if (tech === "Urgency") TechIcon = Flame;
                      else if (tech === "Fear") TechIcon = ShieldAlert;
                      else if (tech === "Authority") TechIcon = Award;
                      else if (tech === "Reward") TechIcon = Gift;
                      else if (tech === "Trust") TechIcon = UserCheck;
                      else if (tech === "Compliance") TechIcon = Clipboard;
                      
                      const evidence = scanResult.social_engineering_evidence?.[tech];
                      
                      return (
                        <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-muted/10 border border-border/5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                            <TechIcon className="w-4 h-4 text-primary" />
                            <span>{tech} Tactic Detected</span>
                          </div>
                          {evidence ? (
                            <blockquote className="pl-3 border-l-2 border-primary/40 text-xs italic text-muted-foreground leading-relaxed">
                              "{evidence}"
                            </blockquote>
                          ) : (
                            <p className="text-xs text-muted-foreground">Contextual presence identified in the payload.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Risk Score Breakdown */}
              {scanResult.prediction === "Spam" && scanResult.risk_breakdown && scanResult.risk_breakdown.length > 0 && (
                <div className="p-5 rounded-2xl glass-panel border space-y-3.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 pb-2">
                    Risk Assessment Factor Breakdown
                  </h4>
                  <div className="space-y-2.5">
                    {scanResult.risk_breakdown.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="font-bold">+{item.value}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <motion.div
                            className="h-full bg-red-600 dark:bg-destructive"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe Email Analysis Details */}
              {scanResult.prediction === "Safe" && scanResult.safe_email_explanation && scanResult.safe_email_explanation.length > 0 && (
                <div className="p-5 rounded-2xl glass-panel border space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 pb-2">
                    Passive Security Checks & Safe Diagnostics
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {scanResult.safe_email_explanation.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Threat Narrative & Confidence Explanation */}
              <div className="p-5 rounded-2xl glass-panel border space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 pb-2">
                  Threat Logic Narrative
                </h4>
                <div className="space-y-3 text-xs leading-relaxed">
                  {scanResult.reasons.map((reason, idx) => (
                    <p key={idx} className="text-muted-foreground">
                      {reason}
                    </p>
                  ))}
                  {scanResult.confidence_explanation && (
                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/5 mt-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Confidence Explanation
                      </span>
                      <p className="text-muted-foreground leading-normal">{scanResult.confidence_explanation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Technical Details */}
              {scanResult.feature_attribution && (
                <div className="p-5 rounded-2xl glass-panel border space-y-3">
                  <button
                    type="button"
                    onClick={() => setTechDetailsOpen(!techDetailsOpen)}
                    className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 pb-2 hover:text-foreground transition-all"
                  >
                    <span>Feature Attribution & Technical Details</span>
                    {techDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {techDetailsOpen && (
                    <div className="space-y-4 pt-2 text-xs">
                      {/* Positive TF-IDF Vocabularies */}
                      {scanResult.feature_attribution.positive_tfidf && scanResult.feature_attribution.positive_tfidf.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-bold text-[11px] text-destructive uppercase tracking-wide">Top Word Contributions (TF-IDF)</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-border/10 text-muted-foreground text-[10px]">
                                  <th className="py-1.5 font-semibold">Word</th>
                                  <th className="py-1.5 font-semibold text-right">Weight Contribution</th>
                                  <th className="py-1.5 font-semibold pl-4">Explanation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scanResult.feature_attribution.positive_tfidf.map((item, i) => (
                                  <tr key={i} className="border-b border-border/5">
                                    <td className="py-1.5 font-mono text-foreground font-semibold">{item.feature}</td>
                                    <td className="py-1.5 text-right text-destructive font-bold">+{item.contribution.toFixed(4)}</td>
                                    <td className="py-1.5 pl-4 text-muted-foreground">{item.explanation}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Positive Engineered Features */}
                      {scanResult.feature_attribution.positive_engineered && scanResult.feature_attribution.positive_engineered.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-bold text-[11px] text-destructive uppercase tracking-wide">Top Engineered Feature Contributions</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-border/10 text-muted-foreground text-[10px]">
                                  <th className="py-1.5 font-semibold">Feature</th>
                                  <th className="py-1.5 font-semibold text-right">Value</th>
                                  <th className="py-1.5 font-semibold text-right pl-4">Contribution</th>
                                  <th className="py-1.5 font-semibold pl-4">Explanation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scanResult.feature_attribution.positive_engineered.map((item, i) => (
                                  <tr key={i} className="border-b border-border/5">
                                    <td className="py-1.5 font-semibold text-foreground">{item.feature}</td>
                                    <td className="py-1.5 text-right font-mono">{item.value}</td>
                                    <td className="py-1.5 text-right text-destructive font-bold pl-4">+{item.contribution.toFixed(4)}</td>
                                    <td className="py-1.5 pl-4 text-muted-foreground">{item.explanation}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Negative Attribution (Safety indicators) */}
                      {scanResult.feature_attribution.negative_attribution && scanResult.feature_attribution.negative_attribution.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-bold text-[11px] text-emerald-500 uppercase tracking-wide">Safety Signals (Negative Attributions)</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-border/10 text-muted-foreground text-[10px]">
                                  <th className="py-1.5 font-semibold">Feature / Word</th>
                                  <th className="py-1.5 font-semibold text-right">Contribution</th>
                                  <th className="py-1.5 font-semibold pl-4">Explanation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scanResult.feature_attribution.negative_attribution.map((item, i) => (
                                  <tr key={i} className="border-b border-border/5">
                                    <td className="py-1.5 font-mono text-emerald-500 font-semibold">{item.feature}</td>
                                    <td className="py-1.5 text-right text-emerald-500 font-bold">{item.contribution.toFixed(4)}</td>
                                    <td className="py-1.5 pl-4 text-muted-foreground">{item.explanation}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Threat Processing Timeline */}
              <div className="p-5 rounded-2xl glass-panel border space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/5 pb-2">
                  Threat Detection Processing Pipeline
                </h4>
                <div className="relative pl-6 border-l border-border/10 space-y-4 ml-3 pt-1">
                  {(() => {
                    const isBrand = scanResult.brand_detection && scanResult.brand_detection.brand !== "None";
                    const isCred = scanResult.threat_categories && !!scanResult.threat_categories["Credential Theft"];
                    const isUrgent = scanResult.threat_categories && !!scanResult.threat_categories["Urgency Language"];
                    
                    const pipelineSteps = [
                      { label: "SMTP Payload Received", active: true },
                      { label: "Brand Impersonation Analyzed", active: true, highlight: isBrand },
                      { label: "Credential Theft Scanning", active: true, highlight: isCred },
                      { label: "Urgency Context Evaluation", active: true, highlight: isUrgent },
                      { label: "Audit Classification Finalized", active: true }
                    ];
                    
                    return pipelineSteps.map((step, idx) => (
                      <div key={idx} className="relative flex items-center gap-3">
                        <span className={`absolute -left-9 w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                          step.highlight
                            ? "bg-red-600/10 border-red-600/50 text-red-600 dark:bg-destructive/10 dark:border-destructive/50 dark:text-destructive"
                            : step.active
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-muted border-border/10 text-muted-foreground opacity-55"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className={`text-xs font-semibold ${step.active ? "text-foreground" : "text-muted-foreground opacity-55"}`}>
                          {step.label}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {/* SCENARIO 4: Error Handling Screen */}
          {scanStatus === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 rounded-2xl glass-panel border border-destructive/30 bg-destructive/5 flex flex-col justify-center items-center text-center space-y-6 h-[440px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-2">
                <h4 className="font-bold text-lg text-destructive">Auditing Pipeline Exception</h4>
                <p className="text-xs text-muted-foreground leading-relaxed px-4">
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={() => setScanStatus("idle")}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted text-xs font-semibold transition-all"
              >
                <span>Return to Diagnostic Mode</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
