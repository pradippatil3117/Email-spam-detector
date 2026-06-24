import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { PageLoader } from "./components/PageLoader";
import { useSettings } from "./context/SettingsContext";

// Lazy-loaded screen components for code splitting & performance
const DashboardScreen = lazy(() =>
  import("./components/DashboardScreen").then((m) => ({ default: m.DashboardScreen }))
);
const ScannerScreen = lazy(() =>
  import("./components/ScannerScreen").then((m) => ({ default: m.ScannerScreen }))
);
const HistoryScreen = lazy(() =>
  import("./components/HistoryScreen").then((m) => ({ default: m.HistoryScreen }))
);
const AnalyticsScreen = lazy(() =>
  import("./components/AnalyticsScreen").then((m) => ({ default: m.AnalyticsScreen }))
);
const ModelScreen = lazy(() =>
  import("./components/ModelScreen").then((m) => ({ default: m.ModelScreen }))
);
const SettingsScreen = lazy(() =>
  import("./components/SettingsScreen").then((m) => ({ default: m.SettingsScreen }))
);
const NotFoundScreen = lazy(() =>
  import("./components/NotFoundScreen").then((m) => ({ default: m.NotFoundScreen }))
);

const LandingRedirect: React.FC = () => {
  const { settings } = useSettings();
  if (settings.landingPage && settings.landingPage !== "dashboard") {
    return <Navigate to={`/${settings.landingPage}`} replace />;
  }
  return <DashboardScreen />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingRedirect />} />
            <Route path="/scanner" element={<ScannerScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/analytics" element={<AnalyticsScreen />} />
            <Route path="/model" element={<ModelScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
