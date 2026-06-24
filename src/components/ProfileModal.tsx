import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, User, CheckCircle2, Loader2 } from "lucide-react";
import { useUser, getInitials, getAvatarColor, avatarColorMap } from "../context/UserContext";

// ─────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Name is required.";
  if (v.length > 60) return "Name must be 60 characters or fewer.";
  return null;
}

function validateEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return "Email is required.";
  if (v.length > 254) return "Email must be 254 characters or fewer.";
  if (!EMAIL_REGEX.test(v)) return "Please enter a valid email address.";
  return null;
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

interface ProfileModalProps {
  mode: "login" | "edit";
  onClose: () => void;
  onSuccess: (name: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ mode, onClose, onSuccess }) => {
  const { profile, login, updateProfile } = useUser();

  const [name, setName] = useState(mode === "edit" ? profile.name : "");
  const [email, setEmail] = useState(mode === "edit" ? profile.email : "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  // Focus name field on open
  useEffect(() => {
    const t = setTimeout(() => firstFocusRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Escape key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const nErr = validateName(name);
      const eErr = validateEmail(email);
      setNameError(nErr);
      setEmailError(eErr);
      if (nErr || eErr) return;

      setIsSaving(true);
      // Simulate a tiny async save (keeps button disabled during state flush)
      await new Promise((r) => setTimeout(r, 120));

      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      if (mode === "login") {
        login(trimmedName, trimmedEmail);
      } else {
        updateProfile(trimmedName, trimmedEmail);
      }
      setIsSaving(false);
      onSuccess(trimmedName);
    },
    [name, email, mode, login, updateProfile, onSuccess]
  );

  const color = getAvatarColor(name.trim() || (mode === "edit" ? profile.name : ""));
  const colorCls = avatarColorMap[color];
  const initials = getInitials(name.trim() || (mode === "edit" ? profile.name : "?"));

  const title = mode === "login" ? "Personalize Dashboard" : "Edit Profile";
  const subtitle =
    mode === "login"
      ? "Enter your name and email to personalize your security dashboard experience."
      : "Update your profile information below.";
  const submitLabel = mode === "login" ? "Continue with Email" : "Save Changes";

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="profile-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <motion.div
        key="profile-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="w-full max-w-md glass-panel border rounded-3xl shadow-2xl overflow-hidden pointer-events-auto relative">
          {/* Decorative glow */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/10">
            <div className="flex items-center gap-3">
              {/* Live avatar preview */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 transition-colors duration-300 ${colorCls.bg} ${colorCls.text} ${colorCls.border}`}
              >
                {initials}
              </div>
              <div>
                <h2 id="profile-modal-title" className="text-sm font-bold tracking-tight">
                  {title}
                </h2>
                <p className="text-[10px] text-muted-foreground">Aegis Security Dashboard</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-5">
            <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>

            {/* Name field */}
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="profile-name"
                  ref={(el) => {
                    (nameInputRef.current as unknown) = el;
                    (firstFocusRef.current as unknown) = el;
                  }}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(validateName(e.target.value));
                  }}
                  placeholder="e.g. John Doe"
                  autoComplete="name"
                  maxLength={61}
                  aria-describedby={nameError ? "profile-name-error" : undefined}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-muted/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                    nameError ? "border-destructive/50 focus:ring-destructive/20" : "border-border/10 focus:border-primary/20"
                  }`}
                />
              </div>
              <AnimatePresence>
                {nameError && (
                  <motion.p
                    id="profile-name-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    role="alert"
                    className="text-[10px] text-destructive font-semibold"
                  >
                    {nameError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <label htmlFor="profile-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(validateEmail(e.target.value));
                  }}
                  placeholder="e.g. john@gmail.com"
                  autoComplete="email"
                  maxLength={255}
                  aria-describedby={emailError ? "profile-email-error" : undefined}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-muted/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                    emailError ? "border-destructive/50 focus:ring-destructive/20" : "border-border/10 focus:border-primary/20"
                  }`}
                />
              </div>
              <AnimatePresence>
                {emailError && (
                  <motion.p
                    id="profile-email-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    role="alert"
                    className="text-[10px] text-destructive font-semibold"
                  >
                    {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Privacy note */}
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Your information is stored locally in your browser only. No account is created and no data is sent to any server.
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border/20 bg-muted/20 hover:bg-muted text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitLabel}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
