import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { FetchEmailsPage } from './pages/FetchEmailsPage';
import { IssuesPage } from './pages/IssuesPage';
import { SavedReportsPage } from './pages/SavedReportsPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="fetch-emails" element={<FetchEmailsPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="saved-reports" element={<SavedReportsPage />} />
            <Route path="saved-reports/:reportId" element={<ReportDetailPage />} />
            <Route path="review-queue" element={<ReviewQueuePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

