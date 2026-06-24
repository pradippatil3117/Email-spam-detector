import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardScreen } from "./components/DashboardScreen";
import { ScannerScreen } from "./components/ScannerScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { AnalyticsScreen } from "./components/AnalyticsScreen";
import { ModelScreen } from "./components/ModelScreen";
import { SettingsScreen } from "./components/SettingsScreen";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/scanner" element={<ScannerScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/analytics" element={<AnalyticsScreen />} />
          <Route path="/model" element={<ModelScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
