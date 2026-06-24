export interface EmailInput {
  sender: string;
  subject: string;
  body: string;
}

export interface UserProfile {
  name: string;
  email: string;
  isDemo: boolean;
}

export interface ScanResult {
  prediction: "Spam" | "Safe";
  confidence: number;
  spam_score: number;
  risk_level: "Low" | "Medium" | "High";
  processing_time_ms: number;
  model_version: string;
  algorithm: string;
  suspicious_keywords: string[];
  reasons: string[];
  threat_summary?: {
    attack_type: string;
    severity: string;
    brand_impersonated: string;
    primary_target: string;
    confidence_level: string;
    executive_summary?: string;
  };
  threat_score?: number;
  threat_categories?: Record<string, string[]>;
  ioc_summary?: Record<string, number>;
  domain_analysis?: Record<string, { brand: string; status: string; reason: string }>;
  brand_detection?: {
    brand: string;
    confidence: number;
    detected_in: string[];
    impersonation: string;
  };
  social_engineering?: string[];
  social_engineering_evidence?: Record<string, string>;
  confidence_explanation?: string;
  recommended_actions?: string[];
  risk_breakdown?: Array<{ name: string; value: number; reason?: string }>;
  safe_email_explanation?: string[];
  feature_attribution?: {
    positive_tfidf: Array<{ feature: string; value: number; contribution: number; explanation: string }>;
    positive_engineered: Array<{ feature: string; value: number; contribution: number; explanation: string }>;
    negative_attribution: Array<{ feature: string; contribution: number; explanation: string }>;
  };
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
  threat_summary?: {
    attack_type: string;
    severity: string;
    brand_impersonated: string;
    primary_target: string;
    confidence_level: string;
    executive_summary?: string;
  };
  threat_score?: number;
  threat_categories?: Record<string, string[]>;
  ioc_summary?: Record<string, number>;
  domain_analysis?: Record<string, { brand: string; status: string; reason: string }>;
  brand_detection?: {
    brand: string;
    confidence: number;
    detected_in: string[];
    impersonation: string;
  };
  social_engineering?: string[];
  social_engineering_evidence?: Record<string, string>;
  confidence_explanation?: string;
  recommended_actions?: string[];
  risk_breakdown?: Array<{ name: string; value: number; reason?: string }>;
  safe_email_explanation?: string[];
  feature_attribution?: {
    positive_tfidf: Array<{ feature: string; value: number; contribution: number; explanation: string }>;
    positive_engineered: Array<{ feature: string; value: number; contribution: number; explanation: string }>;
    negative_attribution: Array<{ feature: string; contribution: number; explanation: string }>;
  };
  userName?: string;
  userEmail?: string;
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

  // SECTION 6: User Preferences
  autoRestoreProfile: boolean;
}
