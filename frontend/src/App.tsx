import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SystemProvider } from './context/SystemContext';

import { TrainerLayout } from './components/layout/TrainerLayout';
import { TraineeLayout } from './components/layout/TraineeLayout';

import { PortalSelectionPage } from './pages/PortalSelectionPage';
import { TraineePortalPage } from './pages/TraineePortalPage';

import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { TraineesPage } from './pages/TraineesPage';
import { DevicesPage } from './pages/DevicesPage';
import { ZonesPage } from './pages/ZonesPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const LegacySessionRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/trainer/sessions/${id}` : '/trainer/sessions'} replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SystemProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Root Route — Portal Selection */}
            <Route path="/" element={<PortalSelectionPage />} />

            {/* 2. Trainee Portal Namespace */}
            <Route path="/trainee" element={<TraineeLayout />}>
              <Route index element={<TraineePortalPage />} />
            </Route>

            {/* 3. Trainer Console Namespace */}
            <Route path="/trainer" element={<TrainerLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="sessions/:id" element={<SessionDetailPage />} />
              <Route path="trainees" element={<TraineesPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="zones" element={<ZonesPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="terms" element={<TermsPage />} />
            </Route>

            {/* 4. Legacy Compatibility Redirects */}
            <Route path="/sessions" element={<Navigate to="/trainer/sessions" replace />} />
            <Route path="/sessions/:id" element={<LegacySessionRedirect />} />
            <Route path="/trainees" element={<Navigate to="/trainer/trainees" replace />} />
            <Route path="/devices" element={<Navigate to="/trainer/devices" replace />} />
            <Route path="/zones" element={<Navigate to="/trainer/zones" replace />} />
            <Route path="/alerts" element={<Navigate to="/trainer/alerts" replace />} />
            <Route path="/settings" element={<Navigate to="/trainer/settings" replace />} />
            <Route path="/privacy" element={<Navigate to="/trainer/privacy" replace />} />
            <Route path="/terms" element={<Navigate to="/trainer/terms" replace />} />

            {/* 5. 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </SystemProvider>
    </ThemeProvider>
  );
};

export default App;
