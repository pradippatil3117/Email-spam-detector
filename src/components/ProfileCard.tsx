import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Shield, Database } from "lucide-react";
import { useUser, getInitials, getAvatarColor, avatarColorMap } from "../context/UserContext";
import { useSettings } from "../context/SettingsContext";

interface ProfileCardProps {
  onClose: () => void;
  onEditProfile: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ onClose, onEditProfile }) => {
  const { profile } = useUser();
  const { settings } = useSettings();

  const color = getAvatarColor(profile.name);
  const colorCls = avatarColorMap[color];
  const initials = getInitials(profile.name);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="profile-card-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        aria-hidden="true"
      />

      {/* Card Panel */}
      <motion.div
        key="profile-card-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-card-title"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="w-full max-w-sm glass-panel border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto relative">
          {/* Decorative glow */}
          <div className={`absolute -top-12 -right-12 w-28 h-28 ${colorCls.bg} rounded-full blur-3xl pointer-events-none opacity-60`} />

          {/* Header */}
          <div className="relative flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/10">
            <h2 id="profile-card-title" className="text-sm font-bold tracking-tight">User Profile</h2>
            <button
              onClick={onClose}
              aria-label="Close profile card"
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-6 space-y-5">
            {/* Avatar + Name */}
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl border-2 ${colorCls.bg} ${colorCls.text} ${colorCls.border} shadow-lg`}
              >
                {initials}
              </div>
              <div>
                <p className="font-bold text-base tracking-tight">{profile.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
              </div>
            </div>

            {/* User Type Badge */}
            <div className="flex items-center justify-center">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                profile.isDemo
                  ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}>
                <Shield className="w-3 h-3" />
                <span>{profile.isDemo ? "Demo User" : "Personal Profile"}</span>
              </div>
            </div>

            {/* Developer Mode: Profile Source */}
            {settings.developerMode && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/10 bg-muted/10">
                <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Profile Source</p>
                  <p className="text-xs font-semibold">LocalStorage</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted text-sm font-semibold transition-all"
            >
              Close
            </button>
            {!profile.isDemo && (
              <button
                onClick={() => {
                  onClose();
                  onEditProfile();
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
