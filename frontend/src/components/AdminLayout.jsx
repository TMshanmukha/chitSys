import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AnimatedChitBackground from './AnimatedChitBackground';
import WelcomeCelebrationModal from './WelcomeCelebrationModal';

const TITLE_MAP = {
  '/admin/dashboard': 'Operations Overview',
  '/admin/tracking': 'Route & Agent Tracking',
  '/admin/chit-groups': 'Chit Schemes & Routes',
  '/admin/auctions': 'Auctions & Dividends',
  '/admin/users': 'User Management (Agents)',
  '/admin/agents': 'Collection Agents',
  '/admin/members': 'Members & Passbook',
  '/admin/collections': 'Daily & Monthly Collections',
  '/admin/profile': 'Admin Profile',
  '/admin/commissions': 'Admin Profile',
  '/admin/earnings': 'Admin Profile',
  '/admin/reports': 'ChitBase Reports & Analytics',
  '/admin/audit': 'Logs & Audit History',
  '/admin/logs': 'Logs & Audit History',
  '/admin/settings': 'System Settings',
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = TITLE_MAP[location.pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors relative overflow-x-hidden">
      {/* Lightly Animated Floating Chit Fund Motifs Background */}
      <AnimatedChitBackground />

      {/* Login Welcome Celebration with Ribbon & Smile Emoji 😊 */}
      <WelcomeCelebrationModal />

      {/* Sidebar with Translucent Glass */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Body with Distinct Separation */}
      <div className="lg:pl-72 flex flex-col flex-1 relative z-10 transition-all">
        {/* Floating Top Navbar Island */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          pageTitle={currentTitle}
        />

        {/* Page Content Outlet - Distinct Body Page Container */}
        <main className="flex-1 px-3 sm:px-6 lg:px-6 pb-8 max-w-7xl w-full mx-auto relative z-10 animate-pageSlideIn">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
