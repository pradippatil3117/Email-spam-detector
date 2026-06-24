export interface EmailInput {
  sender: string;
  subject: string;
  body: string;
}

export interface ScanResult {
  prediction: "Spam" | "Safe";
  confidence: number; // probability between 0 and 1 (or 0 and 100)
  spam_score: number; // spam probability (0.0 to 1.0)
  risk_level: "Low" | "Medium" | "High";
  processing_time_ms: number;
  model_version: string;
  algorithm: string;
  suspicious_keywords: string[];
  reasons: string[];
}

export interface ModelConfig {
  model_version: string;
  threshold: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  training_date: string;
}

export interface ScanHistoryItem extends EmailInput {
  id: string;
  timestamp: string;
  prediction: "Spam" | "Safe";
  confidence: number;
  spam_score: number;
  risk_level: "Low" | "Medium" | "High";
  processing_time_ms: number;
  suspicious_keywords: string[];
  reasons: string[];
}

export interface UserSettings {
  darkMode: boolean;
  themeMode: "light" | "dark" | "system";
  themeColor: "blue" | "emerald" | "violet" | "amber";
  apiBaseUrl: string;
  defaultThreshold: number;
  notificationsEnabled: boolean;
  
  // SECTION 2: Application Preferences
  landingPage: "dashboard" | "scanner" | "history" | "analytics" | "model" | "settings";
  animationSpeed: "instant" | "fast" | "normal" | "slow";
  compactMode: boolean;
  reducedMotion: boolean;
  dateFormat: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";
  timeFormat: "12h" | "24h";

  // SECTION 3: Scanner Preferences
  spamThresholdOverride: number;
  defaultScanView: "split" | "full" | "simple";
  autoSaveHistory: boolean;
  confirmDeleteScan: boolean;

  // SECTION 4: Notifications
  toastNotifications: boolean;
  scanCompleteNotification: boolean;
  errorNotifications: boolean;
  exportSuccessNotification: boolean;

  // SECTION 5: Developer Options
  developerMode: boolean;
  enableDebugInfo: boolean;
  showResponseInspector: boolean;
}
