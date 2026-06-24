import React from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Percent,
  Clock,
  Server,
  Cpu,
  ArrowRight,
  TrendingUp,
  Lock,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export const DashboardScreen: React.FC = () => {
  const { isBackendOnline } = useSettings();

  const mockKpis = [
    {
      name: "Total Emails Scanned",
      value: "1,280",
      change: "+12.5%",
      changeType: "neutral",
      icon: Activity,
      desc: "Total SMTP streams audited",
      colorClass: "text-primary bg-primary/10 border-primary/25"
    },
    {
      name: "Spam Detected",
      value: "384",
      change: "+4.2%",
      changeType: "danger",
      icon: ShieldAlert,
      desc: "Phishing or promotional logs",
      colorClass: "text-destructive bg-destructive/10 border-destructive/25"
    },
    {
      name: "Safe Emails",
      value: "896",
      change: "+16.8%",
      changeType: "success",
      icon: ShieldCheck,
      desc: "Legitimate communications passed",
      colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25"
    },
    {
      name: "Overall Spam Rate",
      value: "30.0%",
      change: "-2.1%",
      changeType: "success",
      icon: Percent,
      desc: "Ratio of flagged messages",
      colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/25"
    },
    {
      name: "Avg Processing Time",
      value: "14.2 ms",
      change: "-1.5 ms",
      changeType: "success",
      icon: Clock,
      desc: "ML inference execution speed",
      colorClass: "text-violet-500 bg-violet-500/10 border-violet-500/25"
    },
    {
      name: "Backend Status",
      value: isBackendOnline ? "Active" : "Offline",
      change: isBackendOnline ? "Healthy" : "Critical",
      changeType: isBackendOnline ? "success" : "danger",
      icon: Server,
      desc: "FastAPI inference gateway connection",
      colorClass: isBackendOnline
        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25"
        : "text-destructive bg-destructive/10 border-destructive/25"
    },
    {
      name: "Model Version",
      value: "v1.0.0",
      change: "Active",
      changeType: "neutral",
      icon: Cpu,
      desc: "TF-IDF + Logistic Regression pipeline",
      colorClass: "text-cyan-500 bg-cyan-500/10 border-cyan-500/25"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-8 rounded-3xl bg-gradient-primary text-white shadow-xl relative overflow-hidden"
      >
        {/* Animated backdrop grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold border border-white/10">
              <Lock className="w-3.5 h-3.5" />
              <span>Aegis Security Sandbox Mode</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Email Spam & Phishing Audit Console</h2>
            <p className="text-primary-foreground/80 text-sm max-w-2xl">
              Inspect incoming communications for active threats. Aegis uses high-precision natural language vectorization and logistic decision boundaries to secure your system.
            </p>
          </div>
          <Link
            to="/scanner"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-primary font-bold hover:bg-opacity-95 transition-all shadow-md self-start md:self-auto hover:translate-x-1 focus:ring-2 focus:ring-white/40 focus:outline-none"
          >
            <span>Scan Email</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {mockKpis.map((kpi, idx) => (
          <motion.div
            key={idx}
            variants={cardVariants}
            className="p-6 rounded-2xl glass-panel border flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20"
            tabIndex={0}
            aria-label={`${kpi.name}: ${kpi.value}`}
          >
            {/* Top Row: Icon & Category */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {kpi.name}
                </span>
                <span className="text-2xl font-extrabold tracking-tight block">
                  {kpi.value}
                </span>
              </div>
              <div className={`p-3 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${kpi.colorClass}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>

            {/* Bottom Row: Metadata Trend & Description */}
            <div className="mt-4 pt-3 border-t border-border/5 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground truncate">{kpi.desc}</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full ${
                  kpi.changeType === "success"
                    ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20"
                    : kpi.changeType === "danger"
                    ? "text-destructive bg-destructive/10 border border-destructive/20"
                    : "text-muted-foreground bg-muted border border-border/10"
                }`}
              >
                {kpi.change}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Overview Diagnostics Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Architecture */}
        <div className="p-6 rounded-2xl glass-panel border space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base tracking-tight">Active Engine Pipeline Diagnostics</h3>
            <span className="text-xs text-muted-foreground font-semibold inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Model calibrated: 100% active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
              <span className="text-muted-foreground font-semibold">Vectorizer Method</span>
              <div className="font-bold text-sm">TF-IDF Vectorizer (TfidfVectorizer)</div>
              <p className="text-[10px] text-muted-foreground">Extracts unigram & bigram term weights matching vocabulary configurations.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
              <span className="text-muted-foreground font-semibold">Classification Algorithm</span>
              <div className="font-bold text-sm">Logistic Regression (C=10.0, balanced)</div>
              <p className="text-[10px] text-muted-foreground">Decides boundary limits with optimized weights tuned via GridSearchCV.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
              <span className="text-muted-foreground font-semibold">Inference Host Port</span>
              <div className="font-bold text-sm">127.0.0.1:8000</div>
              <p className="text-[10px] text-muted-foreground">FastAPI REST interface endpoints bound to local system network interfaces.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
              <span className="text-muted-foreground font-semibold">Decision Boundary Threshold</span>
              <div className="font-bold text-sm">0.72 (Optimized F0.5 Metric)</div>
              <p className="text-[10px] text-muted-foreground">Prioritizes high precision metrics to minimize false-positive notifications.</p>
            </div>
          </div>
        </div>

        {/* Quick Operations Guide */}
        <div className="p-6 rounded-2xl glass-panel border space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-base tracking-tight">Operation Sandbox Guide</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AEGIS AI is running in a local auditing loop. Scanned records are immediately cataloged in browser-secured Storage logs. Follow these audit actions:
            </p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Analyze raw email layouts using the <Link to="/scanner" className="text-primary hover:underline">Scanner</Link>.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Review classification curves in the <Link to="/model" className="text-primary hover:underline">Model Panel</Link>.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Verify threat levels and logs inside <Link to="/history" className="text-primary hover:underline">History Logs</Link>.</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-border/5">
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border/20 hover:bg-muted text-xs font-semibold transition-all group"
            >
              <span>Swagger API Docs</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
