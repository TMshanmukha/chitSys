import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import RouteTrackingPage from './pages/RouteTrackingPage';
import AuctionsPage from './pages/AuctionsPage';
import UsersPage from './pages/UsersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import AdminCommissionsPage from './pages/AdminCommissionsPage';
import {
  ChitGroupsPage,
  MembersPage,
  CollectionsPage,
  ReportsPage,
  SettingsPage,
} from './pages/ModulePages';
import NotificationsPage from './pages/NotificationsPage';
import NotFound from './pages/NotFound';

import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <BrowserRouter>
              {/* Automatic smooth window move to top on every page transition */}
              <ScrollToTop />
              <Routes>
            {/* Default entry redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Authentication Screen */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="tracking" element={<RouteTrackingPage />} />
              <Route path="chit-groups" element={<ChitGroupsPage />} />
              <Route path="auctions" element={<AuctionsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="agents" element={<UsersPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="profile" element={<AdminCommissionsPage />} />
              <Route path="commissions" element={<AdminCommissionsPage />} />
              <Route path="earnings" element={<AdminCommissionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="audit" element={<AuditLogsPage />} />
              <Route path="logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Protected Agent Routes */}
            <Route
              path="/agent/dashboard"
              element={
                <ProtectedRoute allowedRoles={['COLLECTION_AGENT']}>
                  <ErrorBoundary>
                    <AgentDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </ErrorBoundary>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
