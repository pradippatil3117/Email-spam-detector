import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import { motion } from "framer-motion";

export const NotFoundScreen: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="max-w-md w-full glass-panel border p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative background glows */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shadow-lg relative">
          <AlertCircle className="w-10 h-10 animate-bounce" />
          <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 text-[9px] font-extrabold bg-destructive text-white rounded-full border border-background">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight uppercase">Route Not Calibrated</h2>
          <p className="text-muted-foreground text-xs leading-relaxed px-2">
            The requested security endpoint does not exist. It may have been relocated or is outside the configured sandbox topology.
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-opacity-95 transition-all shadow-md shadow-primary/20"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard Home</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/80 text-foreground border border-border/10 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
