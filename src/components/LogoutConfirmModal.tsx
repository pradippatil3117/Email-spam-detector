import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserX, ArrowLeft } from "lucide-react";

interface LogoutConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ onCancel, onConfirm }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onConfirm]);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="logout-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <motion.div
        key="logout-modal-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-desc"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="w-full max-w-sm glass-panel border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto relative">
          {/* Decorative */}
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-muted/20 rounded-full blur-2xl pointer-events-none" />

          <div className="px-6 pt-6 pb-5 space-y-5">
            {/* Icon */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/30 border border-border/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <h2 id="logout-modal-title" className="text-sm font-bold tracking-tight">
                Return to Demo User?
              </h2>
              <p id="logout-modal-desc" className="text-xs text-muted-foreground leading-relaxed">
                Your scan history and settings will remain unchanged. You can log back in at any time.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onCancel}
                autoFocus
                className="flex-1 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl border border-border/20 bg-muted/10 hover:bg-muted text-sm font-semibold transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
