import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const TITLE_MAP = {
  '/admin/dashboard': 'Operations Overview',
  '/admin/chit-groups': 'Chit Groups Management',
  '/admin/agents': 'Collection Agents & Route Assignments',
  '/admin/members': 'Chit Members Directory',
  '/admin/collections': 'Daily & Monthly Collections',
  '/admin/reports': 'Financial & Reconciliation Reports',
  '/admin/users': 'Administrative User Management',
  '/admin/settings': 'System Configuration & Security Settings',
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = TITLE_MAP[location.pathname] || 'Admin Dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-950 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
