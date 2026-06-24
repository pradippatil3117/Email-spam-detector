import React from "react";
import { Link } from "react-router-dom";
import { Shield, ShieldAlert, Cpu, History, ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export const DashboardScreen: React.FC = () => {
  const { isBackendOnline } = useSettings();

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-primary text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">System Status: Active & Secured</h2>
          <p className="text-primary-foreground/80 text-sm max-w-2xl">
            Aegis AI Spam & Phishing Detection Engine is continuously analyzing incoming SMTP streams. Ensure your detection models are trained and calibrated.
          </p>
        </div>
        <Link
          to="/scanner"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary font-semibold hover:bg-opacity-90 transition-all shadow-md self-start md:self-auto"
        >
          <span>Scan New Email</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="p-6 rounded-2xl glass-panel border flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/10">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">Real-time Scanner</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Submit email copy, headers, or body text to analyze for potential spam or phishing signals.
            </p>
            <Link to="/scanner" className="text-primary font-semibold text-sm inline-flex items-center gap-1 mt-3 hover:underline">
              Open Scanner <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-6 rounded-2xl glass-panel border flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/10">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">Model Architecture</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Review hyperparameter grids, confusion matrices, and decision boundary thresholds.
            </p>
            <Link to="/model" className="text-primary font-semibold text-sm inline-flex items-center gap-1 mt-3 hover:underline">
              Model Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-6 rounded-2xl glass-panel border flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/10">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">Security Auditing</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Audit previously evaluated emails, flag classification logs, and export security datasets.
            </p>
            <Link to="/history" className="text-primary font-semibold text-sm inline-flex items-center gap-1 mt-3 hover:underline">
              Review History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl glass-panel border space-y-4">
        <h3 className="font-bold text-lg">Gateway Diagnostic Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/5 space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Gateway Protocol</span>
            <div className="font-bold">HTTP / REST Proxy</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/5 space-y-1">
            <span className="text-muted-foreground text-xs font-medium">FastAPI Server</span>
            <div className={`font-bold ${isBackendOnline ? "text-emerald-500" : "text-destructive animate-pulse"}`}>
              {isBackendOnline ? "Online (127.0.0.1:8000)" : "Offline (Unreachable)"}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/5 space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Active Classifier</span>
            <div className="font-bold">Logistic Regression</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/5 space-y-1">
            <span className="text-muted-foreground text-xs font-medium">Model Pipeline</span>
            <div className="font-bold">TF-IDF Vectorizer</div>
          </div>
        </div>
      </div>
    </div>
  );
};
