import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import BusinessSelectorPage from './pages/BusinessSelectorPage';

// ChitFund Pro Components & Pages
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
import LeaveManagementPage from './pages/LeaveManagementPage';
import AgentDayClosingPage from './pages/AgentDayClosingPage';
import AdminDaySubmissionsPage from './pages/AdminDaySubmissionsPage';
import CollectionEditRequestsPage from './pages/CollectionEditRequestsPage';
import AgentLayout from './components/AgentLayout';

// FinLend Pro Components & Pages (VeeCredit-style Simplified UI)
import InterestAppLayout from './components/interest-ui/InterestAppLayout';
import FinLendHomePage from './pages/interest/FinLendHomePage';
import FinLendCollectPage from './pages/interest/FinLendCollectPage';
import FinLendCustomersPage from './pages/interest/FinLendCustomersPage';
import FinLendPassbookPage from './pages/interest/FinLendPassbookPage';
import FinLendReportsPage from './pages/interest/FinLendReportsPage';
import FinLendMorePage from './pages/interest/FinLendMorePage';
import FinLendLoanTypesPage from './pages/interest/FinLendLoanTypesPage';
import FinLendAgentsPage from './pages/interest/FinLendAgentsPage';
import FinLendUsersPage from './pages/interest/FinLendUsersPage';
import InterestAgentPortalPage from './pages/interest/InterestAgentPortalPage';

import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  React.useEffect(() => {
    try {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/svg+xml';
      link.rel = 'icon';
      link.href = '/favicon.svg?v=finlend_pro_20261106';
      document.getElementsByTagName('head')[0].appendChild(link);
    } catch (_) {}
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <BrowserRouter>
              {/* Automatic smooth window move to top on every page transition */}
              <ScrollToTop />
              <Routes>
                {/* Dual-Business Enterprise Landing Portal */}
                <Route path="/" element={<BusinessSelectorPage />} />

                {/* Authentication Screen (Supports ?business=chitfund and ?business=interest) */}
                <Route path="/login" element={<LoginPage />} />

                {/* ========================================================================= */}
                {/* BUSINESS A: CHITFUND PRO PROTECTED ADMIN ROUTES                           */}
                {/* ========================================================================= */}
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
                  <Route path="leaves" element={<LeaveManagementPage />} />
                  <Route path="day-reviews" element={<AdminDaySubmissionsPage />} />
                  <Route path="collection-edits" element={<CollectionEditRequestsPage />} />
                  <Route path="edit-requests" element={<CollectionEditRequestsPage />} />
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

                {/* ========================================================================= */}
                {/* BUSINESS A: CHITFUND PRO PROTECTED AGENT ROUTES                           */}
                {/* ========================================================================= */}
                <Route
                  path="/agent"
                  element={
                    <ProtectedRoute allowedRoles={['COLLECTION_AGENT']} businessScope="chitfund">
                      <AgentLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/agent/tasks" replace />} />
                  <Route path="dashboard" element={<Navigate to="/agent/tasks" replace />} />
                  <Route path="tasks" element={<AgentDashboard key="tasks" defaultTab="tasks" />} />
                  <Route path="routes" element={<AgentDashboard key="routes" defaultTab="routes" />} />
                  <Route path="pending-dues" element={<AgentDashboard key="pending-dues" defaultTab="pending-dues" />} />
                  <Route path="leaves" element={<LeaveManagementPage />} />
                  <Route path="day-closing" element={<AgentDayClosingPage />} />
                  <Route path="history" element={<AgentDashboard key="history" defaultTab="history" />} />
                  <Route path="profile" element={<AgentDashboard key="profile" defaultTab="profile" />} />
                </Route>

                {/* ========================================================================= */}
                {/* BUSINESS B: FINLEND PRO PROTECTED ADMIN ROUTES (SIMPLIFIED VEECREDIT UI) */}
                {/* ========================================================================= */}
                <Route
                  path="/interest"
                  element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                      <InterestAppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/interest/home" replace />} />
                  <Route path="home" element={<FinLendHomePage />} />
                  <Route path="collect" element={<FinLendCollectPage />} />
                  <Route path="customers" element={<FinLendCustomersPage />} />
                  <Route path="customers/:id" element={<FinLendPassbookPage />} />
                  <Route path="users" element={<Navigate to="/interest/more/users" replace />} />
                  <Route path="agents" element={<Navigate to="/interest/more/users" replace />} />
                  <Route path="reports" element={<FinLendReportsPage />} />
                  <Route path="more" element={<FinLendMorePage />} />
                  <Route path="more/loan-types" element={<FinLendLoanTypesPage />} />
                  <Route path="more/users" element={<FinLendUsersPage />} />
                  <Route path="more/users/:id" element={<FinLendUsersPage />} />
                  <Route path="more/agents" element={<FinLendUsersPage />} />

                  {/* Backward-compatibility redirects for any bookmarked / saved URLs */}
                  <Route path="admin" element={<Navigate to="/interest/home" replace />} />
                  <Route path="admin/dashboard" element={<Navigate to="/interest/home" replace />} />
                  <Route path="admin/collections" element={<Navigate to="/interest/collect" replace />} />
                  <Route path="admin/customers" element={<Navigate to="/interest/customers" replace />} />
                  <Route path="admin/loans" element={<Navigate to="/interest/home" replace />} />
                  <Route path="admin/schemes" element={<Navigate to="/interest/more/loan-types" replace />} />
                  <Route path="admin/users" element={<Navigate to="/interest/more/users" replace />} />
                  <Route path="admin/agents" element={<Navigate to="/interest/more/users" replace />} />
                  <Route path="admin/reports" element={<Navigate to="/interest/reports" replace />} />
                </Route>

                {/* ========================================================================= */}
                {/* BUSINESS B: FINLEND PRO PROTECTED AGENT ROUTES                            */}
                {/* ========================================================================= */}
                <Route
                  path="/interest/agent"
                  element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'COLLECTION_AGENT']} businessScope="interest">
                      <InterestAgentPortalPage />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/interest/agent/collections" replace />} />
                  <Route path="collections" element={<InterestAgentPortalPage />} />
                  <Route path="tasks" element={<InterestAgentPortalPage />} />
                  <Route path="dashboard" element={<InterestAgentPortalPage />} />
                  <Route path="borrowers" element={<InterestAgentPortalPage />} />
                  <Route path="history" element={<InterestAgentPortalPage />} />
                  <Route path="profile" element={<InterestAgentPortalPage />} />
                </Route>

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
