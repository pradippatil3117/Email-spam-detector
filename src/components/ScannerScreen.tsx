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
  Cpu,
  Clock,
  Activity,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Code
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { predictSpam, getModelConfig } from "../services/api";
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
  const [, setHistory] = useLocalStorage<ScanHistoryItem[]>("email_security_history", getSeedHistory());
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [currentStage, setCurrentStage] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [devMode, setDevMode] = useState(false);
  const [modelThreshold, setModelThreshold] = useState<number>(0.72);

  // Fetch model threshold from backend on mount
  useEffect(() => {
    let active = true;
    const fetchConfig = async () => {
      try {
        const config = await getModelConfig();
        if (active && config && config.threshold) {
          setModelThreshold(config.threshold);
        }
      } catch {
        // Fallback silently without logging to console
      }
    };
    fetchConfig();
    return () => {
      active = false;
    };
  }, []);

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

  // Determine confidence-aware messaging properties
  const getConfidenceMessaging = (score: number) => {
    const threshold = settings.spamThresholdOverride;
    const isSpam = score >= threshold;

    if (!isSpam) {
      return {
        status: "SAFE",
        recommendation: "Safe to open.",
        riskLevel: "Low",
        description: "The classifier found no spam indicators above the configured threshold.",
        badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        barColor: "bg-emerald-500",
        gradientClass: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        glowColor: "shadow-emerald-500/10",
        icon: ShieldCheck,
        recoCard: {
          title: "Safe to Open",
          desc: "This email has passed all security checks. No threat patterns or suspicious keywords were detected above the threshold.",
          style: "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          icon: CheckCircle2
        }
      };
    } else if (score >= threshold && score < 0.7) {
      return {
        status: "BORDERLINE",
        recommendation: "Manual review recommended.",
        riskLevel: "Medium",
        description: "This email contains moderate indicators near the decision boundary.",
        badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        barColor: "bg-amber-500",
        gradientClass: "from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400",
        glowColor: "shadow-amber-500/10",
        icon: AlertTriangle,
        recoCard: {
          title: "Review Before Opening",
          desc: "Moderate probability of promotional or phishing patterns. Inspect links and attachments carefully before opening.",
          style: "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400",
          icon: AlertTriangle
        }
      };
    } else {
      return {
        status: "SPAM",
        recommendation: "Delete or quarantine immediately.",
        riskLevel: "High",
        description: "High spam probability detected. Contains active threat markers or phishing indicators.",
        badgeColor: "text-destructive bg-destructive/10 border-destructive/20",
        barColor: "bg-destructive",
        gradientClass: "from-destructive/15 to-destructive/20 border-destructive/20 text-destructive dark:text-destructive-foreground",
        glowColor: "shadow-destructive/10",
        icon: ShieldAlert,
        recoCard: {
          title: "Delete Immediately",
          desc: "Critical spam signature matched. Recommended action is immediate quarantine or deletion to prevent security breach.",
          style: "bg-destructive/5 border-destructive/20 text-destructive dark:text-destructive-foreground",
          icon: XCircle
        }
      };
    }
  };

  const currentResultMeta = scanResult ? getConfidenceMessaging(scanResult.spam_score) : null;

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
          {scanStatus === "success" && scanResult && currentResultMeta && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Header Gradient Card with custom status */}
              <div
                className={`p-6 rounded-2xl shadow-xl border relative overflow-hidden flex flex-col justify-between ${currentResultMeta.gradientClass} ${currentResultMeta.glowColor}`}
              >
                {/* Glow ring overlay */}
                <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none -translate-y-12 translate-x-12" />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/10 dark:bg-white/10 px-2.5 py-0.5 rounded border border-border/5">
                      Audit Classification
                    </span>
                    <h3 className="text-3xl font-extrabold tracking-tight mt-1">
                      {currentResultMeta.status}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl border shadow-lg ${currentResultMeta.badgeColor}`}>
                    <currentResultMeta.icon className="w-7 h-7" />
                  </div>
                </div>

                {/* Score & Meter */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between items-end text-xs font-semibold">
                    <span className="opacity-80">Spam Probability</span>
                    <span className="text-sm font-bold">{(scanResult.spam_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      className={`h-full shadow-glow ${currentResultMeta.barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${scanResult.spam_score * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Recommendation Card */}
              <div className={`p-4 rounded-xl border flex gap-3.5 items-start ${currentResultMeta.recoCard.style}`}>
                <div className="p-2.5 rounded-lg border border-current bg-white/10 shrink-0">
                  <currentResultMeta.recoCard.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm leading-none flex items-center gap-1.5">
                    {currentResultMeta.recoCard.title}
                  </h4>
                  <p className="text-xs opacity-85 leading-normal">
                    {currentResultMeta.recoCard.desc}
                  </p>
                </div>
              </div>

              {/* Security Metrics Dashboard Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Threat Level</span>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        currentResultMeta.riskLevel === "High"
                          ? "bg-destructive animate-pulse"
                          : currentResultMeta.riskLevel === "Medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span
                      className={
                        currentResultMeta.riskLevel === "High"
                          ? "text-destructive"
                          : currentResultMeta.riskLevel === "Medium"
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }
                    >
                      {currentResultMeta.riskLevel} Risk
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Model Confidence</span>
                  <div className="font-bold text-sm">{(scanResult.confidence * 100).toFixed(1)}%</div>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Processing Time</span>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{scanResult.processing_time_ms} ms</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Backend Status</span>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span className="truncate">
                      {devMode ? "127.0.0.1:8000" : "FastAPI Healthy"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Three Independent Metrics Grid Card */}
              <div className="p-5 rounded-2xl glass-panel border space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                  Security Diagnostics summary
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1 p-2 bg-muted/10 rounded-xl border border-border/5">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">Spam Score</span>
                    <span className="text-base font-extrabold">{scanResult.spam_score.toFixed(3)}</span>
                  </div>
                  <div className="space-y-1 p-2 bg-muted/10 rounded-xl border border-border/5">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">Spam Prob.</span>
                    <span className="text-base font-extrabold">{(scanResult.spam_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1 p-2 bg-muted/10 rounded-xl border border-border/5">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">Confidence</span>
                    <span className="text-base font-extrabold">{(scanResult.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Threat Explanation details */}
              <div className="p-5 rounded-2xl glass-panel border space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                  Threat Explanation details
                </h4>

                {/* Detected Keywords */}
                {scanResult.suspicious_keywords.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground">Detected suspicious keywords:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.suspicious_keywords.map((word, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-[10px] font-bold rounded bg-destructive/10 text-destructive border border-destructive/20">
                          {word}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      These suspicious keywords were identified in the email copy. Terms like {scanResult.suspicious_keywords.slice(0, 3).map(w => `"${w}"`).join(", ")} frequently appear in promotional or phishing scripts, which highly contributed to this classification.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground">Suspicious Vocabulary Flags:</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      No suspicious keywords were detected. The classifier found no statistically significant spam indicators.
                    </p>
                  </div>
                )}

                {/* Bullet Reasons */}
                {scanResult.reasons.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/5">
                    <span className="text-[10px] font-bold text-muted-foreground">Classification Justifications:</span>
                    <ul className="space-y-1.5 text-xs">
                      {scanResult.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="text-muted-foreground">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Model Information Card */}
              <div className="p-4 rounded-xl glass-panel border flex items-start gap-3 text-xs">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Cpu className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">Model Parameters</span>
                    <span className="text-primary font-bold">Inference active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-muted-foreground text-[11px] pt-1">
                    <div>Classifier:</div>
                    <div className="text-foreground font-semibold text-right">TF-IDF + Logistic Regression</div>
                    <div>Version:</div>
                    <div className="text-foreground font-semibold text-right">1.0.0</div>
                    <div>Decision Threshold:</div>
                    <div className="text-foreground font-semibold text-right">{modelThreshold.toFixed(2)}</div>
                  </div>
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
