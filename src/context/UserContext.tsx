import React, { createContext, useContext, useCallback, useEffect } from "react";
import { UserProfile } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

export const DEMO_USER: UserProfile = {
  name: "Demo User",
  email: "demo@aegis-security.dev",
  isDemo: true,
};

const STORAGE_KEY = "aegis_user_profile";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type AvatarColor = "slate" | "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan" | "orange";

export function getAvatarColor(name: string): AvatarColor {
  if (!name || name === DEMO_USER.name) return "slate";
  const palette: AvatarColor[] = ["blue", "emerald", "violet", "amber", "rose", "cyan", "orange"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

export const avatarColorMap: Record<AvatarColor, { bg: string; text: string; border: string }> = {
  slate:   { bg: "bg-slate-500/20",   text: "text-slate-400",   border: "border-slate-500/30" },
  blue:    { bg: "bg-blue-500/20",    text: "text-blue-400",    border: "border-blue-500/30" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  violet:  { bg: "bg-violet-500/20",  text: "text-violet-400",  border: "border-violet-500/30" },
  amber:   { bg: "bg-amber-500/20",   text: "text-amber-400",   border: "border-amber-500/30" },
  rose:    { bg: "bg-rose-500/20",    text: "text-rose-400",    border: "border-rose-500/30" },
  cyan:    { bg: "bg-cyan-500/20",    text: "text-cyan-400",    border: "border-cyan-500/30" },
  orange:  { bg: "bg-orange-500/20",  text: "text-orange-400",  border: "border-orange-500/30" },
};

// ─────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────

interface UserContextType {
  profile: UserProfile;
  login: (name: string, email: string) => void;
  logout: () => void;
  switchToDemo: () => void;
  updateProfile: (name: string, email: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useLocalStorage<UserProfile>(STORAGE_KEY, DEMO_USER);

  // On mount: if autoRestoreProfile is disabled in settings, reset to Demo User
  useEffect(() => {
    try {
      const raw = localStorage.getItem("email_security_settings");
      if (raw) {
        const parsed = JSON.parse(raw) as { autoRestoreProfile?: boolean };
        if (parsed.autoRestoreProfile === false) {
          setProfile(DEMO_USER);
        }
      }
    } catch {
      // Silently ignore any parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((name: string, email: string) => {
    setProfile({ name: name.trim(), email: email.trim().toLowerCase(), isDemo: false });
  }, [setProfile]);

  const logout = useCallback(() => {
    setProfile(DEMO_USER);
  }, [setProfile]);

  const switchToDemo = useCallback(() => {
    setProfile(DEMO_USER);
  }, [setProfile]);

  const updateProfile = useCallback((name: string, email: string) => {
    setProfile((prev) => ({
      ...prev,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      isDemo: false,
    }));
  }, [setProfile]);

  return (
    <UserContext.Provider value={{ profile, login, logout, switchToDemo, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (ctx === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
};
