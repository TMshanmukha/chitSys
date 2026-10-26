import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const TITLE_MAP = {
  '/admin/dashboard': 'Operations Overview',
  '/admin/chit-groups': 'Chit Groups',
  '/admin/agents': 'Collection Agents',
  '/admin/members': 'Members Directory',
  '/admin/collections': 'Daily & Monthly Collections',
  '/admin/reports': 'Collection Reports',
  '/admin/users': 'User Management',
  '/admin/settings': 'System Settings',
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = TITLE_MAP[location.pathname] || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Body */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          pageTitle={currentTitle}
        />

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
