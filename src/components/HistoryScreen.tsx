import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useSettings } from "../context/SettingsContext";
import { ScanHistoryItem } from "../types";
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Trash2,
  Eye,
  Copy,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Activity,
  Clock,
  Server,
  Cpu,
  X,
  XCircle,
  Check,
  Calendar,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const HistoryScreen: React.FC = () => {
  const { settings, isBackendOnline } = useSettings();
  const [history, setHistory] = useLocalStorage<ScanHistoryItem[]>("email_security_history", []);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [predictionFilter, setPredictionFilter] = useState<"All" | "Spam" | "Borderline" | "Safe">("All");
  const [riskFilter, setRiskFilter] = useState<"All" | "Low" | "Medium" | "High">("All");
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "7days" | "30days" | "Custom">("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Sorting State
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highSpam" | "lowSpam" | "highConf" | "lowConf">("newest");

  // Selection & Action States
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [activeItem, setActiveItem] = useState<ScanHistoryItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"all" | "selected" | string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Toast Notification State
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle pagination reset on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows(new Set());
  }, [searchTerm, predictionFilter, riskFilter, dateFilter, customStartDate, customEndDate, sortBy]);

  // Helper for confidence-aware risk & prediction levels
  const getExtendedMeta = (score: number) => {
    if (score < 0.3) {
      return {
        status: "Safe",
        risk: "Low",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
        badge: "bg-emerald-500",
        recommendation: "Safe to open. No threats detected."
      };
    } else if (score >= 0.3 && score <= 0.6) {
      return {
        status: "Borderline",
        risk: "Medium",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/25",
        badge: "bg-amber-500",
        recommendation: "Review before opening. Exercise caution."
      };
    } else {
      return {
        status: "Spam",
        risk: "High",
        color: "text-destructive bg-destructive/10 border-destructive/25",
        badge: "bg-destructive",
        recommendation: "Delete or quarantine immediately. High risk threat."
      };
    }
  };

  const formatDate = (timestamp: string): string => {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    
    // Format Date
    let dateStr = "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    
    if (settings.dateFormat === "YYYY-MM-DD") {
      dateStr = `${yyyy}-${mm}-${dd}`;
    } else if (settings.dateFormat === "MM/DD/YYYY") {
      dateStr = `${mm}/${dd}/${yyyy}`;
    } else {
      dateStr = `${dd}/${mm}/${yyyy}`;
    }
    
    // Format Time
    let timeStr = "";
    if (settings.timeFormat === "24h") {
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      timeStr = `${hh}:${min}`;
    } else {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      timeStr = `${hours}:${minutes} ${ampm}`;
    }
    
    return `${dateStr} ${timeStr}`;
  };

  // Safe parsing helper for date objects
  const parseItemDate = (timestamp: string): Date => {
    try {
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  };

  // 1. Filter Logic
  const filteredHistory = useMemo(() => {
    let result = [...history];

    // Search query match
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.sender.toLowerCase().includes(query) ||
          item.subject.toLowerCase().includes(query) ||
          item.body.toLowerCase().includes(query) ||
          item.suspicious_keywords.some((k) => k.toLowerCase().includes(query)) ||
          item.prediction.toLowerCase().includes(query)
      );
    }

    // Prediction match (Safe/Spam/Borderline)
    if (predictionFilter !== "All") {
      result = result.filter((item) => {
        const meta = getExtendedMeta(item.spam_score);
        return meta.status.toLowerCase() === predictionFilter.toLowerCase();
      });
    }

    // Risk level match (Low/Medium/High)
    if (riskFilter !== "All") {
      result = result.filter((item) => {
        const meta = getExtendedMeta(item.spam_score);
        return meta.risk.toLowerCase() === riskFilter.toLowerCase();
      });
    }

    // Date match
    if (dateFilter !== "All") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (dateFilter === "Today") {
        result = result.filter((item) => parseItemDate(item.timestamp).getTime() >= todayStart);
      } else if (dateFilter === "7days") {
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        result = result.filter((item) => parseItemDate(item.timestamp).getTime() >= sevenDaysAgo);
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        result = result.filter((item) => parseItemDate(item.timestamp).getTime() >= thirtyDaysAgo);
      } else if (dateFilter === "Custom" && (customStartDate || customEndDate)) {
        if (customStartDate) {
          const start = new Date(customStartDate).getTime();
          result = result.filter((item) => parseItemDate(item.timestamp).getTime() >= start);
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999); // include entire end day
          const endTime = end.getTime();
          result = result.filter((item) => parseItemDate(item.timestamp).getTime() <= endTime);
        }
      }
    }

    // 2. Sorting Logic
    return result.sort((a, b) => {
      const dateA = parseItemDate(a.timestamp).getTime();
      const dateB = parseItemDate(b.timestamp).getTime();

      switch (sortBy) {
        case "newest":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "highSpam":
          return b.spam_score - a.spam_score;
        case "lowSpam":
          return a.spam_score - b.spam_score;
        case "highConf":
          return b.confidence - a.confidence;
        case "lowConf":
          return a.confidence - b.confidence;
        default:
          return dateB - dateA;
      }
    });
  }, [history, searchTerm, predictionFilter, riskFilter, dateFilter, customStartDate, customEndDate, sortBy]);

  // 3. Summary metrics computations
  const metrics = useMemo(() => {
    const total = history.length;
    if (total === 0) {
      return { total: 0, spam: 0, safe: 0, borderline: 0, avgSpam: 0, avgConf: 0, avgLatency: 0, lastTime: null };
    }

    let spam = 0;
    let safe = 0;
    let borderline = 0;
    let sumSpam = 0;
    let sumConf = 0;
    let sumLatency = 0;
    let maxDate = 0;

    history.forEach((item) => {
      const meta = getExtendedMeta(item.spam_score);
      if (meta.status === "Spam") spam++;
      else if (meta.status === "Safe") safe++;
      else borderline++;

      sumSpam += item.spam_score;
      sumConf += item.confidence;
      sumLatency += item.processing_time_ms;

      const dateMs = parseItemDate(item.timestamp).getTime();
      if (dateMs > maxDate) maxDate = dateMs;
    });

    return {
      total,
      spam,
      safe,
      borderline,
      avgSpam: sumSpam / total,
      avgConf: sumConf / total,
      avgLatency: sumLatency / total,
      lastTime: maxDate > 0 ? new Date(maxDate).toISOString() : null,
    };
  }, [history]);

  // 4. Pagination slicing
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  // Checkbox functions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedHistory.map((item) => item.id);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    } else {
      const pageIds = paginatedHistory.map((item) => item.id);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllPageSelected = paginatedHistory.length > 0 && paginatedHistory.every((item) => selectedRows.has(item.id));

  // Copy JSON details to clipboard
  const handleCopyJSON = async (item: ScanHistoryItem) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      setToast("JSON record copied to clipboard");
    } catch {
      setToast("Failed to copy JSON");
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;

    const headers = [
      "Timestamp",
      "Sender",
      "Subject",
      "Inferred Status",
      "Risk Level",
      "Spam Score",
      "Confidence",
      "Latency (ms)"
    ];

    const rows = filteredHistory.map((item) => {
      const meta = getExtendedMeta(item.spam_score);
      return [
        item.timestamp,
        `"${item.sender.replace(/"/g, '""')}"`,
        `"${item.subject.replace(/"/g, '""')}"`,
        meta.status,
        meta.risk,
        item.spam_score,
        item.confidence,
        item.processing_time_ms
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aegis_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Audit log CSV exported");
  };

  // Delete Action implementations
  const triggerDelete = (target: "all" | "selected" | string) => {
    if (settings.confirmDeleteScan) {
      setDeleteTarget(target);
      setDeleteConfirmOpen(true);
    } else {
      if (target === "all") {
        setHistory([]);
        setToast("Clear audit history complete");
      } else if (target === "selected") {
        setHistory((prev) => prev.filter((item) => !selectedRows.has(item.id)));
        setSelectedRows(new Set());
        setToast(`Deleted ${selectedRows.size} selected audit logs`);
      } else if (typeof target === "string") {
        setHistory((prev) => prev.filter((item) => item.id !== target));
        setSelectedRows((prev) => {
          const next = new Set(prev);
          next.delete(target);
          return next;
        });
        setToast("Audit record deleted");
      }
    }
  };

  const confirmDelete = () => {
    if (deleteTarget === "all") {
      setHistory([]);
      setToast("Clear audit history complete");
    } else if (deleteTarget === "selected") {
      setHistory((prev) => prev.filter((item) => !selectedRows.has(item.id)));
      setSelectedRows(new Set());
      setToast(`Deleted ${selectedRows.size} selected audit logs`);
    } else if (typeof deleteTarget === "string") {
      setHistory((prev) => prev.filter((item) => item.id !== deleteTarget));
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget);
        return next;
      });
      setToast("Audit record deleted");
    }

    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast Alert popup overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-20 left-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-white/10"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {history.length === 0 ? (
          /* SCENARIO: Empty State view */
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex items-center justify-center p-8 md:p-12"
          >
            <div className="max-w-md w-full glass-panel border p-8 rounded-3xl text-center space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 text-primary flex items-center justify-center shadow-lg">
                <Trash2 className="w-8 h-8 opacity-60" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">No Scan History</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Run an Email Scan to begin building your audit log. Your security evaluation results will automatically appear in this view.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/scanner"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-opacity-95 transition-all shadow-md shadow-primary/10"
                >
                  <span>Go to Scanner</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          /* SCENARIO: Active History log dashboard */
          <motion.div
            key="history-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Audits</span>
                <div className="text-xl font-extrabold tracking-tight">{metrics.total}</div>
              </div>

              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Spam Detected</span>
                <div className="text-xl font-extrabold tracking-tight text-destructive">{metrics.spam}</div>
              </div>

              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Safe Emails</span>
                <div className="text-xl font-extrabold tracking-tight text-emerald-500">{metrics.safe}</div>
              </div>

              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Borderline Cases</span>
                <div className="text-xl font-extrabold tracking-tight text-amber-500">{metrics.borderline}</div>
              </div>

              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Avg Spam Score</span>
                <div className="text-xl font-extrabold tracking-tight">{(metrics.avgSpam * 100).toFixed(1)}%</div>
              </div>

              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Avg Confidence</span>
                <div className="text-xl font-extrabold tracking-tight">{(metrics.avgConf * 100).toFixed(1)}%</div>
              </div>

              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Avg Latency</span>
                <div className="text-xl font-extrabold tracking-tight">{metrics.avgLatency.toFixed(1)} ms</div>
              </div>

              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Last Audit Log</span>
                <div className="text-sm font-bold tracking-tight truncate pt-1">
                  {metrics.lastTime ? new Date(metrics.lastTime).toLocaleDateString() : "Never"}
                </div>
              </div>
            </div>

            {/* Filter & Operations Console */}
            <div className="p-5 rounded-2xl glass-panel border space-y-4 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search logs by sender, subject, keywords..."
                    aria-label="Search logs"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/10 bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Global Actions */}
                <div className="flex flex-wrap gap-2.5 justify-end w-full md:w-auto">
                  <button
                    onClick={handleExportCSV}
                    disabled={filteredHistory.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>

                  {selectedRows.size > 0 && (
                    <button
                      onClick={() => triggerDelete("selected")}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 transition-all text-xs font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Selected ({selectedRows.size})</span>
                    </button>
                  )}

                  <button
                    onClick={() => triggerDelete("all")}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Filters Controls Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/5 text-xs">
                {/* Prediction Filter */}
                <div className="space-y-1">
                  <label htmlFor="predFilter" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Prediction</label>
                  <select
                    id="predFilter"
                    value={predictionFilter}
                    onChange={(e) => setPredictionFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border/10 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Classifications</option>
                    <option value="Safe">Safe</option>
                    <option value="Borderline">Borderline</option>
                    <option value="Spam">Spam</option>
                  </select>
                </div>

                {/* Risk Filter */}
                <div className="space-y-1">
                  <label htmlFor="riskFilter" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Risk Level</label>
                  <select
                    id="riskFilter"
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border/10 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Risk Levels</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>

                {/* Date Filter Selection */}
                <div className="space-y-1">
                  <label htmlFor="dateFilter" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timeline</label>
                  <select
                    id="dateFilter"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border/10 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Timelines</option>
                    <option value="Today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="Custom">Custom Range</option>
                  </select>
                </div>

                {/* Sorting Select */}
                <div className="space-y-1">
                  <label htmlFor="sortingSelect" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sort Logs By</label>
                  <select
                    id="sortingSelect"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border/10 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="newest">Date: Newest First</option>
                    <option value="oldest">Date: Oldest First</option>
                    <option value="highSpam">Spam Score: Highest</option>
                    <option value="lowSpam">Spam Score: Lowest</option>
                    <option value="highConf">Confidence: Highest</option>
                    <option value="lowConf">Confidence: Lowest</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Inputs (Conditional) */}
              {dateFilter === "Custom" && (
                <div className="grid grid-cols-2 gap-4 max-w-md pt-2 border-t border-border/5 text-xs">
                  <div className="space-y-1">
                    <label htmlFor="customStart" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Start Date</span>
                    </label>
                    <input
                      id="customStart"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-border/10 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="customEnd" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>End Date</span>
                    </label>
                    <input
                      id="customEnd"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-border/10 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Audit Logs Table Layout */}
            <div className="glass-panel border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/5 text-muted-foreground font-semibold">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={handleSelectAll}
                          aria-label="Select all rows on this page"
                          className="w-3.5 h-3.5 rounded border-border/20 text-primary focus:ring-0"
                        />
                      </th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Sender</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Prediction</th>
                      <th className="p-3">Risk</th>
                      <th className="p-3 text-right">Spam Score</th>
                      <th className="p-3 text-right">Confidence</th>
                      <th className="p-3 text-right">Latency</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted-foreground">
                          No audit records found matching the active search filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map((item) => {
                        const meta = getExtendedMeta(item.spam_score);
                        const isSelected = selectedRows.has(item.id);

                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-border/5 hover:bg-muted/30 transition-colors ${
                              isSelected ? "bg-primary/5" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectRow(item.id)}
                                aria-label={`Select row for ${item.sender}`}
                                className="w-3.5 h-3.5 rounded border-border/20 text-primary focus:ring-0"
                              />
                            </td>
                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                              {formatDate(item.timestamp)}
                            </td>
                            <td className="p-3 font-semibold truncate max-w-[140px]" title={item.sender}>
                              {item.sender}
                            </td>
                            <td className="p-3 truncate max-w-[180px]" title={item.subject}>
                              {item.subject}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.color}`}
                              >
                                {meta.status}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <span className={`w-2 h-2 rounded-full ${meta.badge}`} />
                                <span>{meta.risk}</span>
                              </span>
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {(item.spam_score * 100).toFixed(1)}%
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {(item.confidence * 100).toFixed(1)}%
                            </td>
                            <td className="p-3 text-right text-muted-foreground whitespace-nowrap">
                              {item.processing_time_ms} ms
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setActiveItem(item)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                  title="View audit details"
                                  aria-label="View audit details"
                                >
                                  <Eye className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  onClick={() => handleCopyJSON(item)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                  title="Copy raw JSON"
                                  aria-label="Copy raw JSON"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => triggerDelete(item.id)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-all"
                                  title="Delete audit log"
                                  aria-label="Delete audit log"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border/5 bg-muted/10 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>
                    Showing {Math.min(filteredHistory.length, (currentPage - 1) * itemsPerPage + 1)}-
                    {Math.min(filteredHistory.length, currentPage * itemsPerPage)} of {filteredHistory.length} results
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-border/20 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-border/20 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {activeItem && (
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
              onClick={() => setActiveItem(null)}
            />
            {/* Drawer container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-2xl p-6 overflow-y-auto space-y-6"
            >
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-border/5 pb-4">
                <div>
                  <h3 className="text-base font-bold tracking-tight">Security Audit Log Detail</h3>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mt-1">
                    ID: {activeItem.id}
                  </span>
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent transition-all"
                  aria-label="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Header Badge Card */}
              {(() => {
                const meta = getExtendedMeta(activeItem.spam_score);
                const isSpam = meta.status === "Spam";
                const isBorderline = meta.status === "Borderline";
                const badgeColor = isSpam
                  ? "from-destructive/15 to-destructive/20 border-destructive/20 text-destructive"
                  : isBorderline
                  ? "from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-500"
                  : "from-emerald-500/15 to-emerald-600/5 border-emerald-500/20 text-emerald-500";

                return (
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${badgeColor}`}>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75">Classification</span>
                      <span className="text-xl font-extrabold leading-none">{meta.status.toUpperCase()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75">Risk Rating</span>
                      <span className="font-bold text-sm">{meta.risk} Risk</span>
                    </div>
                  </div>
                );
              })()}

              {/* Email Content Panel */}
              <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border/5 text-xs">
                <div className="grid grid-cols-6 gap-x-2 gap-y-1 pb-3 border-b border-border/5 font-medium">
                  <div className="col-span-1 text-muted-foreground">Sender:</div>
                  <div className="col-span-5 font-bold truncate">{activeItem.sender}</div>
                  <div className="col-span-1 text-muted-foreground">Subject:</div>
                  <div className="col-span-5 font-bold truncate">{activeItem.subject}</div>
                  <div className="col-span-1 text-muted-foreground">Logged:</div>
                  <div className="col-span-5 text-muted-foreground">
                    {formatDate(activeItem.timestamp)}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Raw Body</span>
                  <div className="p-3 rounded-lg bg-background border border-border/10 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed text-[11px] font-mono select-text">
                    {activeItem.body}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Spam Probability</span>
                  <div className="font-extrabold text-sm">{(activeItem.spam_score * 100).toFixed(1)}%</div>
                </div>
                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Model Confidence</span>
                  <div className="font-extrabold text-sm">{(activeItem.confidence * 100).toFixed(1)}%</div>
                </div>
                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Inference Speed</span>
                  <div className="font-extrabold text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{activeItem.processing_time_ms} ms</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl glass-panel border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Gateway Status</span>
                  <div className="font-bold text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{isBackendOnline ? "Online (Healthy)" : "Offline (Offline)"}</span>
                  </div>
                </div>
              </div>

              {/* Explanations Details */}
              <div className="p-4 rounded-xl glass-panel border space-y-3.5 text-xs">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-1">
                  Diagnostics Assessment
                </h4>

                {/* Keywords */}
                {activeItem.suspicious_keywords.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Keyword Flags:</span>
                    <div className="flex flex-wrap gap-1">
                      {activeItem.suspicious_keywords.map((word, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-[9px] font-bold rounded bg-destructive/10 text-destructive border border-destructive/20">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground">Keyword Flags:</span>
                    <p className="text-[10px] text-muted-foreground">No suspicious keywords were detected.</p>
                  </div>
                )}

                {/* Recommendation */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground">Security Action Advice:</span>
                  <p className="text-xs font-semibold leading-relaxed">
                    {getExtendedMeta(activeItem.spam_score).recommendation}
                  </p>
                </div>

                {/* Reasoning justify list */}
                {activeItem.reasons.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Audit Justifications:</span>
                    <ul className="space-y-1 text-xs">
                      {activeItem.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="text-muted-foreground text-[11px]">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground">Audit Justifications:</span>
                    <p className="text-[10px] text-muted-foreground">The classifier found no statistically significant spam indicators.</p>
                  </div>
                )}
              </div>

              {/* Model config info */}
              <div className="p-4 rounded-xl glass-panel border flex items-start gap-3 text-xs">
                <Cpu className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[9px]">Model Parameters</span>
                  <div className="grid grid-cols-2 gap-y-0.5 text-muted-foreground text-[10px] pt-1">
                    <div>Classifier:</div>
                    <div className="text-foreground font-semibold text-right">TF-IDF + Logistic Regression</div>
                    <div>Version:</div>
                    <div className="text-foreground font-semibold text-right">1.0.0</div>
                    <div>Default Decision Boundary:</div>
                    <div className="text-foreground font-semibold text-right">0.72</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CONFIRMATION WARNING MODAL (DELETE ALL / SELECTED) */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full glass-panel border border-destructive/25 p-6 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold tracking-tight">Delete Security Audit Records?</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {deleteTarget === "all"
                        ? "This operation will completely clear all local security audit logs. This cannot be undone."
                        : deleteTarget === "selected"
                        ? `This operation will permanently delete the ${selectedRows.size} selected audit logs.`
                        : "This operation will permanently delete this specific scan result log."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end text-xs font-semibold">
                  <button
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      setDeleteTarget(null);
                    }}
                    className="px-4 py-2.5 rounded-lg border border-border/20 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2.5 rounded-lg bg-destructive hover:bg-opacity-90 text-white shadow-md shadow-destructive/10 transition-all"
                  >
                    Permanently Delete
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
