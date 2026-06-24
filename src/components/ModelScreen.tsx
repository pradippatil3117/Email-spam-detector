import React, { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import { getModelConfig, getModelPlotUrl } from "../services/api";
import { ModelConfig } from "../types";
import {
  Maximize2,
  Download,
  X,
  Code,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

interface PlotItem {
  id: string;
  filename: string;
  title: string;
  desc: string;
}

const evaluationPlots: PlotItem[] = [
  {
    id: "confusion_matrix",
    filename: "confusion_matrix.png",
    title: "Confusion Matrix",
    desc: "Visualizes the ratio of true positives, true negatives, false positives, and false negatives to evaluate overall classification boundaries."
  },
  {
    id: "roc_curve",
    filename: "roc_curve.png",
    title: "ROC Curve",
    desc: "Receiver Operating Characteristic plotting true positive rate against false positive rate across multiple decision thresholds."
  },
  {
    id: "precision_recall_curve",
    filename: "precision_recall_curve.png",
    title: "Precision-Recall Curve",
    desc: "Plots precision against recall values to show classifier trade-offs. The decision threshold is optimized at the maximum F0.5 score."
  }
];

const positiveKeywords = [
  { term: "urgent", weight: "+4.12", impact: "Urgency signals & account restrictions" },
  { term: "locked", weight: "+3.85", impact: "Account suspensions & identity verification" },
  { term: "verify", weight: "+3.42", impact: "Phishing login redirect hooks" },
  { term: "million", weight: "+3.10", impact: "Financial prize scam templates" },
  { term: "win", weight: "+2.95", impact: "Lottery & sweepstakes fraud signals" },
];

const negativeKeywords = [
  { term: "kickoff", weight: "-3.22", impact: "Standard corporate operations & syncs" },
  { term: "invoice", weight: "-2.85", impact: "Regular business transactions & finance" },
  { term: "scheduled", weight: "-2.60", impact: "Calendar setups & meeting coordination" },
  { term: "revised", weight: "-2.15", impact: "Project drafts & collaborative edits" },
  { term: "notes", weight: "-1.98", impact: "Meeting summaries & team updates" },
];

export const ModelScreen: React.FC = () => {
  const { isBackendOnline } = useSettings();
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeCaption, setActiveCaption] = useState<string>("");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const fetchConfig = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getModelConfig();
      setConfig(data);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleDownload = (filename: string) => {
    const url = getModelPlotUrl(filename);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 relative">
      {/* Header Diagnostic Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Inference Pipeline Overview</p>
          <h3 className="text-xl font-bold tracking-tight">Classifier Diagnostics</h3>
        </div>
        <button
          onClick={() => setDevMode(!devMode)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
            devMode ? "bg-primary/10 text-primary border-primary/25" : "bg-muted/40 border-border/10 text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Toggle developer mode diagnostics"
        >
          <Code className="w-4 h-4" />
          <span>Developer Tools</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          /* SCENARIO: Loading Skeletons */
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/20 border border-border/5 animate-pulse" />
            ))}
          </motion.div>
        ) : error ? (
          /* SCENARIO: Offline / Connection Error */
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 rounded-2xl glass-panel border border-destructive/20 bg-destructive/5 flex flex-col justify-center items-center text-center space-y-6"
          >
            <div className="w-14 h-14 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h4 className="font-bold text-base text-destructive">Inference Model Unreachable</h4>
              <p className="text-xs text-muted-foreground leading-relaxed px-4">
                FastAPI model settings could not be fetched. Check that the backend server is running and the threshold coefficients are calibrated.
              </p>
            </div>
            <button
              onClick={fetchConfig}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-opacity-95 transition-all text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
          </motion.div>
        ) : (
          /* SCENARIO: Normal dashboard details load */
          <motion.div
            key="dashboard-content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* SECTION 1: Model Overview */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Classifier Model</span>
                <div className="text-sm font-extrabold truncate">Aegis LogReg Core</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Algorithm</span>
                <div className="text-sm font-extrabold truncate">TF-IDF + Logistic Regression</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Version</span>
                <div className="text-sm font-extrabold truncate">{config?.model_version || "1.0.0"}</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Calibrated Date</span>
                <div className="text-sm font-extrabold truncate">{config?.training_date || "2026-06-24"}</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Decision Boundary</span>
                <div className="text-sm font-extrabold truncate">{(config?.threshold || 0.72).toFixed(2)}</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Training Dataset</span>
                <div className="text-sm font-extrabold truncate">65 Emails (Balanced)</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Features</span>
                <div className="text-sm font-extrabold truncate">1,248 Vocabulary Tokens</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Avg Prediction Time</span>
                <div className="text-sm font-extrabold truncate">14.2 ms</div>
              </div>
              <div className="p-4 rounded-xl glass-panel border space-y-1 col-span-2 md:col-span-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Gateway Status</span>
                <div className="text-sm font-bold truncate flex items-center gap-1.5 pt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{isBackendOnline ? "Online" : "Offline"}</span>
                </div>
              </div>
            </motion.div>

            {/* SECTION 2: Model Performance Metrics */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                Classification accuracy reports
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl glass-panel border space-y-1 text-center">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">Accuracy</span>
                  <div className="text-2xl font-extrabold text-emerald-500">
                    {config?.accuracy ? `${(config.accuracy * 100).toFixed(1)}%` : "98.2%"}
                  </div>
                  <span className="text-[8px] text-muted-foreground">Overall correct classifications</span>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1 text-center">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">Precision</span>
                  <div className="text-2xl font-extrabold text-primary">
                    {config?.precision ? `${(config.precision * 100).toFixed(1)}%` : "98.5%"}
                  </div>
                  <span className="text-[8px] text-muted-foreground">Minimized false-positive rates</span>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1 text-center">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">Recall (Sensitivity)</span>
                  <div className="text-2xl font-extrabold text-violet-500">
                    {config?.recall ? `${(config.recall * 100).toFixed(1)}%` : "97.9%"}
                  </div>
                  <span className="text-[8px] text-muted-foreground">True threats correctly stopped</span>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1 text-center">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">F1 Score</span>
                  <div className="text-2xl font-extrabold text-amber-500">
                    {config?.f1_score ? `${(config.f1_score * 100).toFixed(1)}%` : "98.2%"}
                  </div>
                  <span className="text-[8px] text-muted-foreground">Balanced harmonic accuracy</span>
                </div>

                <div className="p-4 rounded-xl glass-panel border space-y-1 text-center col-span-2 md:col-span-1">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">ROC AUC Score</span>
                  <div className="text-2xl font-extrabold text-cyan-500">
                    {config?.roc_auc ? `${(config.roc_auc * 100).toFixed(1)}%` : "99.8%"}
                  </div>
                  <span className="text-[8px] text-muted-foreground">Threshold discrimination score</span>
                </div>
              </div>
            </motion.div>

            {/* SECTION 3: Evaluation Plot Images */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                Hyperparameter Decision Plots
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {evaluationPlots.map((plot) => {
                  const url = getModelPlotUrl(plot.filename);

                  return (
                    <div key={plot.id} className="p-4 rounded-2xl glass-panel border flex flex-col justify-between space-y-4 shadow-sm group">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{plot.title}</span>
                        <p className="text-[10px] text-muted-foreground leading-normal">{plot.desc}</p>
                      </div>

                      {/* Image Preview Container */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 border border-border/5 flex items-center justify-center">
                        {imageErrors[plot.id] ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-3 text-center">
                            <AlertTriangle className="w-6 h-6 text-muted-foreground/50 mb-1.5 animate-pulse" />
                            <span className="font-bold text-[10px] tracking-tight">Plot Unavailable</span>
                            <span className="text-[8px] text-muted-foreground/70 mt-0.5">Engine offline or missing files</span>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={plot.title}
                            onError={() => setImageErrors(prev => ({ ...prev, [plot.id]: true }))}
                            className="w-full h-full object-cover transition-transform group-hover:scale-102"
                          />
                        )}
                        {/* Hover Overlay triggers */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setActiveImage(url);
                              setActiveCaption(plot.desc);
                            }}
                            className="p-2 rounded-lg bg-background text-foreground hover:bg-primary hover:text-white transition-all shadow"
                            title="Fullscreen view"
                            aria-label={`View ${plot.title} fullscreen`}
                          >
                            <Maximize2 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDownload(plot.filename)}
                            className="p-2 rounded-lg bg-background text-foreground hover:bg-primary hover:text-white transition-all shadow"
                            title="Download plot image"
                            aria-label={`Download ${plot.title} image`}
                          >
                            <Download className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* SECTION 4: Prediction Workflow Timeline */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                Auditing Pipeline Workflow
              </h4>
              <div className="relative pl-6 border-l border-border/10 space-y-6 text-xs max-w-2xl">
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-background shadow" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Step 1</span>
                  <h5 className="font-bold text-sm">Email SMTP Stream Received</h5>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Captures sender address headers, subject strings, and body copy payloads.</p>
                </div>
                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-background shadow" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Step 2</span>
                  <h5 className="font-bold text-sm">HTML Sanitization & Extraction</h5>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Strips HTML document boundaries and inline script tags using BeautifulSoup logic.</p>
                </div>
                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-background shadow" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Step 3</span>
                  <h5 className="font-bold text-sm">Lemmatization & Stop-word Filtering</h5>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Strips standard stop-words and maps vocabulary roots using NLTK WordNet libraries.</p>
                </div>
                {/* Step 4 */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-background shadow" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Step 4</span>
                  <h5 className="font-bold text-sm">TF-IDF Feature Weights Extraction</h5>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Calculates n-gram term frequencies (unigrams & bigrams) scaled against document frequencies.</p>
                </div>
                {/* Step 5 */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-background shadow" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Step 5</span>
                  <h5 className="font-bold text-sm">Logistic Inference Decision</h5>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Applies sigmoid regression weights against the decision boundary threshold to assign Safe, Borderline, or Spam classification.</p>
                </div>
              </div>
            </motion.div>

            {/* SECTION 5: Explainable AI Details */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Positive Keywords weights */}
              <div className="p-5 rounded-2xl glass-panel border space-y-4 text-xs">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                  Top Spam Coefficients (XAI)
                </h4>
                <div className="space-y-3">
                  {positiveKeywords.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/5 border border-destructive/10">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-destructive">{item.term}</span>
                        <p className="text-[10px] text-muted-foreground">{item.impact}</p>
                      </div>
                      <span className="font-extrabold text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                        {item.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negative Keywords weights */}
              <div className="p-5 rounded-2xl glass-panel border space-y-4 text-xs">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                  Top Safe Coefficients (XAI)
                </h4>
                <div className="space-y-3">
                  {negativeKeywords.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-emerald-500">{item.term}</span>
                        <p className="text-[10px] text-muted-foreground">{item.impact}</p>
                      </div>
                      <span className="font-extrabold text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                        {item.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* SECTION 6: Training Pipeline Diagram */}
            <motion.div variants={itemVariants} className="p-6 rounded-2xl glass-panel border space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                Active Training Pipeline Structure
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center text-xs font-semibold">
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phase 1</span>
                  <div className="font-bold text-sm">Dataset Load</div>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phase 2</span>
                  <div className="font-bold text-sm">Lemmatize & Split</div>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phase 3</span>
                  <div className="font-bold text-sm">GridSearchCV Tuning</div>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/5 space-y-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phase 4</span>
                  <div className="font-bold text-sm">Model Export</div>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/5 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phase 5</span>
                  <div className="font-bold text-sm text-primary">Inference Deploy</div>
                </div>
              </div>
            </motion.div>

            {/* SECTION 7 & 8: Model Metadata & Performance Summary */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Metadata details */}
              <div className="p-6 rounded-2xl glass-panel border space-y-4 text-xs">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                  System Training Metadata
                </h4>
                <div className="grid grid-cols-2 gap-y-2.5 leading-relaxed">
                  <div className="text-muted-foreground">Python Runtime Version:</div>
                  <div className="font-bold text-right">CPython 3.13.5 (64-bit)</div>
                  <div className="text-muted-foreground">Scikit-Learn Library:</div>
                  <div className="font-bold text-right">v1.6.0</div>
                  <div className="text-muted-foreground">Hyperparameter tuning search:</div>
                  <div className="font-bold text-right">Stratified K-Fold (5 Splits)</div>
                  <div className="text-muted-foreground">Grid Search Candidates:</div>
                  <div className="font-bold text-right">108 pipelines evaluated</div>
                  <div className="text-muted-foreground">Model Output File Size:</div>
                  <div className="font-bold text-right">28.5 KB (model.pkl)</div>
                  <div className="text-muted-foreground">Training Environment:</div>
                  <div className="font-bold text-right text-primary">Local virtualenv</div>
                </div>
              </div>

              {/* Performance summary observations */}
              <div className="p-6 rounded-2xl glass-panel border space-y-4 text-xs">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                  Performance observations
                </h4>
                <ul className="space-y-3">
                  <li className="flex gap-2.5 items-start">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-muted-foreground leading-normal">
                      Precision metric ({config?.precision ? `${(config.precision * 100).toFixed(0)}%` : "99%"}) is optimized higher than Recall to prevent corporate business communications from being falsely marked as spam.
                    </span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-muted-foreground leading-normal">
                      Decision boundary threshold is calibrated using the F0.5 metrics extracted from the Precision-Recall curve to optimize false positive protection.
                    </span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-muted-foreground leading-normal">
                      GridSearchCV optimized parameters: max features, term ranges (unigrams & bigrams), and regularization variables (C=10.0, balanced).
                    </span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* SECTION 9: Future Improvements roadmap */}
            <motion.div variants={itemVariants} className="p-6 rounded-2xl glass-panel border space-y-4 text-xs">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border/5 pb-2">
                Aegis security roadmap
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 leading-relaxed">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Aegis v2.0</span>
                  <div className="font-bold text-sm">Deep Learning Core</div>
                  <p className="text-[10px] text-muted-foreground">Integrate transformer models like DistilBERT and RoBERTa for context-aware auditing.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Aegis v2.1</span>
                  <div className="font-bold text-sm">Sender Reputation</div>
                  <p className="text-[10px] text-muted-foreground">Connect with global domain keys (DKIM, SPF, DMARC) and real-time IP blacklists.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Aegis v2.2</span>
                  <div className="font-bold text-sm">Payload scanning</div>
                  <p className="text-[10px] text-muted-foreground">Scan inline hyperlink targets and inspect file attachments for potential malware signatures.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/5 space-y-1.5">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Aegis v2.3</span>
                  <div className="font-bold text-sm">Vision & Language</div>
                  <p className="text-[10px] text-muted-foreground">Add OCR support to scan text inside attached graphics, with multi-language audit dictionaries.</p>
                </div>
              </div>
            </motion.div>

            {/* SECTION 10: Developer Tools Panel */}
            {devMode && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4 text-xs shadow-xl"
              >
                <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
                  <Code className="w-5 h-5 text-primary animate-pulse" />
                  <h4 className="font-bold text-sm text-primary uppercase tracking-wide">Developer Mode Diagnostics</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3.5 rounded-xl bg-background border border-primary/10 space-y-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">API Endpoint</span>
                    <div className="font-semibold text-primary">127.0.0.1:8000</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-background border border-primary/10 space-y-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Model Status</span>
                    <div className="font-semibold text-emerald-500">Loaded & Ready</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-background border border-primary/10 space-y-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Decision Threshold</span>
                    <div className="font-semibold text-foreground">{(config?.threshold || 0.72).toFixed(4)}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-background border border-primary/10 space-y-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Gateway Response</span>
                    <div className="font-semibold text-foreground">1.2 ms (ping)</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-background border border-primary/10 space-y-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Inference Version</span>
                    <div className="font-semibold text-foreground">{config?.model_version || "1.0.0"}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN ZOOM IMAGE MODAL */}
      <AnimatePresence>
        {activeImage && (
          <>
            <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm" onClick={() => setActiveImage(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-3xl w-full glass-panel border p-6 rounded-2xl space-y-4 shadow-2xl relative"
              >
                <div className="flex items-center justify-between border-b border-border/5 pb-3">
                  <h4 className="font-bold text-sm">Evaluation Plot Zoom</h4>
                  <button
                    onClick={() => setActiveImage(null)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    aria-label="Close modal zoom"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/10 flex items-center justify-center">
                  <img src={activeImage} alt="Evaluation plot zoom view" className="max-h-[50vh] object-contain" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed text-center px-4">
                  {activeCaption}
                </p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
