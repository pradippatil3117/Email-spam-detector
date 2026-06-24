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
  themeColor: "blue" | "emerald" | "violet" | "amber";
  apiBaseUrl: string;
  defaultThreshold: number;
  notificationsEnabled: boolean;
}
