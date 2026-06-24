import React, { useState } from "react";
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
  Info,
  CornerDownLeft,
  FileText,
  Server
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
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
  { id: 0, label: "Validating email structure" },
  { id: 1, label: "Checking sender reputation" },
  { id: 2, label: "Running NLP feature extraction" },
  { id: 3, label: "Evaluating spam probability" },
  { id: 4, label: "Generating security report" },
];

export const ScannerScreen: React.FC = () => {
  const { isBackendOnline } = useSettings();
  const [history, setHistory] = useLocalStorage<ScanHistoryItem[]>("email_security_history", getSeedHistory());
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [currentStage, setCurrentStage] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm<ScanFormData>({
    resolver: zodResolver(scanSchema),
    mode: "onChange",
  });

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
    }, 4500 / scanStages.length); // complete stages in ~4.5 seconds

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
      const delayTime = Math.max(0, 4500 - elapsedTime);

      // Wait for stages to complete visually
      await new Promise((resolve) => setTimeout(resolve, delayTime));
      clearInterval(stageInterval);

      // Save scan to history
      const historyItem: ScanHistoryItem = {
        id: `scan-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sender: data.sender,
        subject: data.subject,
        body: data.body,
        prediction: result.prediction,
        confidence: result.confidence,
        spam_score: result.spam_score,
        risk_level: result.risk_level,
        processing_time_ms: result.processing_time_ms,
        suspicious_keywords: result.suspicious_keywords,
        reasons: result.reasons,
      };

      setHistory((prev) => [historyItem, ...prev]);
      setScanResult(result);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: Input Form */}
      <div className="lg:col-span-6 space-y-6">
        <div className="p-6 rounded-2xl glass-panel border space-y-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Security Scan Console</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Analyze SMTP payload details through Aegis AI vector boundaries.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Sender Email Input */}
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

            {/* Subject Input */}
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
                    <span>Analyze Email</span>
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
      <div className="lg:col-span-6">
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
              className="p-8 rounded-2xl glass-panel border flex flex-col justify-between h-[440px] relative overflow-hidden"
            >
              {/* Pulsing Scanner Radar */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <div className="w-96 h-96 rounded-full border-4 border-primary animate-ping" />
                <div className="w-64 h-64 rounded-full border-2 border-primary animate-pulse absolute" />
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm tracking-wide text-primary uppercase">Active Auditing Engine</h4>
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
                  <span className="text-muted-foreground">Audit Progress</span>
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
              {/* Header Gradient Card */}
              <div
                className={`p-6 rounded-2xl shadow-xl border text-white relative overflow-hidden ${
                  scanResult.prediction === "Spam" ? "bg-gradient-spam border-spam/10" : "bg-gradient-safe border-safe/10"
                }`}
              >
                {/* Glow ring overlay */}
                <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none -translate-y-12 translate-x-12" />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded border border-white/10">
                      Audit Classification
                    </span>
                    <h3 className="text-2xl font-extrabold tracking-tight">
                      EMAIL FLAGGED AS {scanResult.prediction.toUpperCase()}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 shadow-lg">
                    {scanResult.prediction === "Spam" ? (
                      <ShieldAlert className="w-7 h-7" />
                    ) : (
                      <ShieldCheck className="w-7 h-7" />
                    )}
                  </div>
                </div>

                {/* Score & Meter */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between items-end text-xs font-semibold">
                    <span className="text-white/80">Classifier Spam Probability</span>
                    <span className="text-sm font-bold">{(scanResult.spam_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-white shadow-glow"
                      initial={{ width: 0 }}
                      animate={{ width: `${scanResult.spam_score * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Security Metrics Dashboard Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Risk Level</span>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        scanResult.risk_level === "High"
                          ? "bg-destructive animate-pulse"
                          : scanResult.risk_level === "Medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span
                      className={
                        scanResult.risk_level === "High"
                          ? "text-destructive"
                          : scanResult.risk_level === "Medium"
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }
                    >
                      {scanResult.risk_level} Risk
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Confidence</span>
                  <div className="font-bold text-sm">{(scanResult.confidence * 100).toFixed(1)}% Match</div>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Processing Time</span>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{scanResult.processing_time_ms} ms</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Gateway Port</span>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-500" />
                    <span>127.0.0.1:8000</span>
                  </div>
                </div>
              </div>

              {/* Reasons & Keywords */}
              <div className="p-5 rounded-2xl glass-panel border space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                  Threat Explanation details
                </h4>

                {/* Detected Keywords */}
                {scanResult.suspicious_keywords.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground">Suspicious Vocabulary Flags:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.suspicious_keywords.map((word, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-[10px] font-bold rounded bg-destructive/10 text-destructive border border-destructive/20">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Suspicious Vocabulary Flags:</span>
                    <p className="text-[10px] text-muted-foreground">None detected</p>
                  </div>
                )}

                {/* Bullet Reasons */}
                {scanResult.reasons.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/5">
                    <span className="text-[10px] font-bold text-muted-foreground">Classification Justifications:</span>
                    <ul className="space-y-1.5 text-xs">
                      {scanResult.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="text-muted-foreground">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
