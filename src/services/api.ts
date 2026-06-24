import axios from "axios";
import { EmailInput, ScanResult, ModelConfig } from "../types";

// Get base API URL from settings or default to relative /api
const getApiBaseUrl = (): string => {
  try {
    const settingsStr = localStorage.getItem("email_security_settings");
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings.apiBaseUrl) {
        return settings.apiBaseUrl;
      }
    }
  } catch {
    // Fallback silently to relative /api
  }
  return "/api";
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Timeout after 10 seconds
});

// Interceptor to dynamically update baseURL if it changes in localstorage
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export const checkHealth = async (): Promise<{ status: string }> => {
  const response = await api.get<{ status: string }>("/health");
  return response.data;
};

export const predictSpam = async (input: EmailInput): Promise<ScanResult> => {
  const startTime = Date.now();
  const response = await api.post<Omit<ScanResult, "risk_level" | "processing_time_ms" | "model_version" | "algorithm">>("/predict", input);
  const latency = Date.now() - startTime;
  
  const rawData = response.data;
  
  // Calculate client-side fields that match standard SaaS requirements
  const spamScore = rawData.spam_score;
  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (spamScore >= 0.7) {
    riskLevel = "High";
  } else if (spamScore >= 0.35) {
    riskLevel = "Medium";
  }

  return {
    ...rawData,
    risk_level: riskLevel,
    processing_time_ms: latency,
    model_version: "1.0.0",
    algorithm: "TF-IDF + Logistic Regression",
  };
};

export const getModelConfig = async (): Promise<ModelConfig> => {
  const response = await api.get<ModelConfig>("/model/config");
  return response.data;
};

export const getModelPlotUrl = (filename: string): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/model/files/${filename}`;
};
