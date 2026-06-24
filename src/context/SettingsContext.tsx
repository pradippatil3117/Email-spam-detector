import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserSettings } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { checkHealth } from "../services/api";

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  isBackendOnline: boolean | null;
  triggerHealthCheck: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  darkMode: true, // Default to dark mode for modern enterprise feel
  themeColor: "blue",
  apiBaseUrl: "/api",
  defaultThreshold: 0.5,
  notificationsEnabled: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    "email_security_settings",
    defaultSettings
  );
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  const triggerHealthCheck = useCallback(async () => {
    try {
      const response = await checkHealth();
      setIsBackendOnline(response.status === "ok");
    } catch (error) {
      console.error("Health check failed:", error);
      setIsBackendOnline(false);
    }
  }, []);

  // Run health check periodically
  useEffect(() => {
    triggerHealthCheck();
    const interval = setInterval(triggerHealthCheck, 15000); // check every 15 seconds
    return () => clearInterval(interval);
  }, [triggerHealthCheck]);

  // Apply Theme effects
  useEffect(() => {
    const root = document.documentElement;
    const isDark = settings.darkMode;

    // Toggle .dark class
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Dynamic HSL values for theme color selection
    const colors = {
      blue: {
        light: "221.2 83.2% 53.3%",
        dark: "217.2 91.2% 59.8%",
      },
      emerald: {
        light: "142.1 76.2% 36.3%",
        dark: "142.1 70.6% 45.3%",
      },
      violet: {
        light: "262.1 83.3% 57.8%",
        dark: "262.1 83.3% 67.8%",
      },
      amber: {
        light: "37.9 92.1% 50.2%",
        dark: "37.9 92.1% 60.2%",
      },
    };

    const selected = colors[settings.themeColor] || colors.blue;
    const primaryVal = isDark ? selected.dark : selected.light;
    root.style.setProperty("--primary", primaryVal);
    root.style.setProperty("--ring", primaryVal);
  }, [settings.darkMode, settings.themeColor]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isBackendOnline,
        triggerHealthCheck,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
