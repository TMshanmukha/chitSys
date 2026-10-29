import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Coins,
  Truck,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Filter,
  Search,
  Compass,
  Layers,
  Users,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Receipt,
  ShieldCheck,
  Eye,
  EyeOff,
  Calendar,
  Zap,
} from 'lucide-react';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    toggleRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
    refresh,
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' | 'UNREAD' | 'AUCTION' | 'COLLECTION' | 'ROUTE' | 'SCHEME'

  // Format timestamps
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Helper to categorize and provide detailed explanation for any notification
  const getNotificationDetails = (item) => {
    const title = (item.title || '').toLowerCase();
    const message = (item.message || '').toLowerCase();
    const type = (item.type || '').toUpperCase();
    const link = item.link || '';

    // Auction event
    if (type === 'AUCTION' || title.includes('auction') || message.includes('auction') || link.includes('auctions')) {
      return {
        category: 'AUCTION',
        categoryLabel: 'Auction & Dividend',
        icon: Coins,
        accentBg: 'bg-amber-500/10 dark:bg-amber-500/20',
        accentBorder: 'border-amber-400/40 dark:border-amber-500/30',
        accentText: 'text-amber-600 dark:text-amber-400',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300',
        navigationLabel: 'View Auction Breakdown',
        navigationPath: link || '/admin/auctions',
        explanation:
          'A reverse auction was successfully conducted for this Chit Scheme. The subscriber won the prize pool with the highest bid discount. Foreman commission has been credited, and surplus dividends are automatically calculated and distributed across all active member passbooks.',
      };
    }

    // Collection event
    if (type === 'COLLECTION' || title.includes('payment') || title.includes('collection') || link.includes('collections')) {
      return {
        category: 'COLLECTION',
        categoryLabel: 'Payment & Collection',
        icon: Receipt,
        accentBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        accentBorder: 'border-emerald-400/40 dark:border-emerald-500/30',
        accentText: 'text-emerald-600 dark:text-emerald-400',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300',
        navigationLabel: 'View Collections Ledger',
        navigationPath: link || '/admin/collections',
        explanation:
          'An installment collection payment was recorded and verified. The member passbook has been updated with the official receipt number, reconciling cash or digital balances with daily and monthly ledger statements.',
      };
    }

    // Route / Tracking event
    if (type === 'ROUTE' || title.includes('route') || title.includes('stop') || link.includes('tracking')) {
      return {
        category: 'ROUTE',
        categoryLabel: 'Route & Field Tracking',
        icon: Compass,
        accentBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        accentBorder: 'border-cyan-400/40 dark:border-cyan-500/30',
        accentText: 'text-cyan-600 dark:text-cyan-400',
        badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300',
        navigationLabel: 'Open Route Tracking',
        navigationPath: link || '/admin/tracking',
        explanation:
          'Live field tracking activity logged by collection agent during customer visits. Route sequence nodes, GPS collection logs, and customer status remarks were recorded in real-time.',
      };
    }

    // Chit Scheme / Group event
    if (title.includes('scheme') || title.includes('group') || link.includes('chit-groups')) {
      return {
        category: 'SCHEME',
        categoryLabel: 'Chit Scheme & Route',
        icon: Layers,
        accentBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        accentBorder: 'border-indigo-400/40 dark:border-indigo-500/30',
        accentText: 'text-indigo-600 dark:text-indigo-400',
        badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300',
        navigationLabel: 'View Chit Schemes',
        navigationPath: link || '/admin/chit-groups',
        explanation:
          'A chit scheme was created or updated with designated installment amounts, membership allocations, and route categories. Member enrollments and ticket rosters have been provisioned.',
      };
    }

    // Member event
    if (title.includes('member') || link.includes('members')) {
      return {
        category: 'MEMBER',
        categoryLabel: 'Subscriber Passbook',
        icon: Users,
        accentBg: 'bg-teal-500/10 dark:bg-teal-500/20',
        accentBorder: 'border-teal-400/40 dark:border-teal-500/30',
        accentText: 'text-teal-600 dark:text-teal-400',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300',
        navigationLabel: 'View Enrolled Members',
        navigationPath: link || '/admin/members',
        explanation:
          'Member profile and KYC documentation activity. Enrolled subscribers have been linked with respective group tickets and digital passbooks.',
      };
    }

    // Default / System event
    return {
      category: 'SYSTEM',
      categoryLabel: 'System Alert',
      icon: Info,
      accentBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      accentBorder: 'border-blue-400/40 dark:border-blue-500/30',
      accentText: 'text-blue-600 dark:text-blue-400',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300',
      navigationLabel: link ? 'Open Target Module' : 'Go to Operations Dashboard',
      navigationPath: link || '/admin/dashboard',
      explanation:
        'System-wide operational alert or administrative audit trigger recorded by the platform engine.',
    };
  };

  // Filter and search logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const details = getNotificationDetails(item);

      // Category filter
      if (activeCategory === 'UNREAD' && item.is_read) return false;
      if (activeCategory === 'AUCTION' && details.category !== 'AUCTION') return false;
      if (activeCategory === 'COLLECTION' && details.category !== 'COLLECTION') return false;
      if (activeCategory === 'ROUTE' && details.category !== 'ROUTE') return false;
      if (activeCategory === 'SCHEME' && details.category !== 'SCHEME') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (item.title || '').toLowerCase().includes(q);
        const matchesMsg = (item.message || '').toLowerCase().includes(q);
        const matchesExpl = details.explanation.toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesExpl;
      }

      return true;
    });
  }, [notifications, activeCategory, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    let auctionCount = 0;
    let collectionCount = 0;
    let routeCount = 0;
    let schemeCount = 0;

    notifications.forEach((item) => {
      const det = getNotificationDetails(item);
      if (det.category === 'AUCTION') auctionCount++;
      else if (det.category === 'COLLECTION') collectionCount++;
      else if (det.category === 'ROUTE') routeCount++;
      else if (det.category === 'SCHEME') schemeCount++;
    });

    return {
      total: notifications.length,
      unread: unreadCount,
      auctionCount,
      collectionCount,
      routeCount,
      schemeCount,
    };
  }, [notifications, unreadCount]);

  const handleNavigate = (notification, path) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    navigate(path);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_8px_16px_-4px_rgba(59,130,246,0.4)]">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-xs">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live operational alerts, financial milestones, auction outcomes & route collections with full context breakdowns
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All as Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all notifications?')) {
                  clearAll();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Feed</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Feed</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
          <span className="text-[10px] text-slate-400">All alerts recorded</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs">
          <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Unread Alerts</span>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.unread}
          </div>
          <span className="text-[10px] text-slate-400">Requires attention</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Auctions</span>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.auctionCount}
          </div>
          <span className="text-[10px] text-slate-400">Prize & dividends</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Collections</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.collectionCount}
          </div>
          <span className="text-[10px] text-slate-400">Payment receipts</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs">
          <span className="text-[11px] font-bold text-cyan-500 uppercase tracking-wider block">Route Pings</span>
          <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
            {stats.routeCount}
          </div>
          <span className="text-[10px] text-slate-400">Agent route logs</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider block">Chit Schemes</span>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.schemeCount}
          </div>
          <span className="text-[10px] text-slate-400">Groups initialized</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Alerts ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('UNREAD')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'UNREAD'
                  ? 'bg-rose-600 text-white shadow-[0_4px_12px_rgba(225,29,72,0.3)]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Unread ({stats.unread})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('AUCTION')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'AUCTION'
                  ? 'bg-amber-600 text-white shadow-[0_4px_12px_rgba(217,119,6,0.3)]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Auctions ({stats.auctionCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('COLLECTION')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'COLLECTION'
                  ? 'bg-emerald-600 text-white shadow-[0_4px_12px_rgba(5,150,105,0.3)]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Collections ({stats.collectionCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('ROUTE')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'ROUTE'
                  ? 'bg-cyan-600 text-white shadow-[0_4px_12px_rgba(8,145,178,0.3)]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Route Pings ({stats.routeCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('SCHEME')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCategory === 'SCHEME'
                  ? 'bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Chit Schemes ({stats.schemeCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts, groups, receipts..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Notifications Feed List */}
      <div className="space-y-3.5">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {searchQuery ? 'No matching notifications found' : 'All caught up!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery
                ? 'Try broadening your search keyword or clearing the filter.'
                : 'No unread or pending notifications. When auctions conclude, collections arrive, or routes update, they will appear here with instant navigation buttons.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const details = getNotificationDetails(item);
            const Icon = details.icon;
            const isUnread = !item.is_read;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-3xl backdrop-blur-xl border transition-all duration-200 group hover:shadow-[0_12px_35px_-10px_rgba(0,0,0,0.08)] ${
                  isUnread
                    ? 'bg-blue-50/40 dark:bg-slate-900/80 border-blue-300 dark:border-blue-900/60 shadow-[0_0_20px_rgba(59,130,246,0.06)]'
                    : 'bg-white/75 dark:bg-slate-900/65 border-white/60 dark:border-slate-800/80'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Icon & Title & Timestamps */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${details.accentBg} ${details.accentBorder} ${details.accentText}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Top Badges & Timestamps */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${details.badgeColor}`}
                        >
                          {details.categoryLabel}
                        </span>

                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white flex items-center gap-1 shadow-xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            Unread
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto md:ml-0">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(item.created_at)}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="hidden sm:inline">{formatDateTime(item.created_at)}</span>
                        </span>
                      </div>

                      {/* Main Title */}
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                        {item.title}
                      </h3>

                      {/* Notification Message */}
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Respective Navigation Button & Quick Actions */}
                  <div className="flex items-center gap-2 self-stretch md:self-center justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    {/* Respective Target Navigation Button */}
                    <button
                      type="button"
                      onClick={() => handleNavigate(item, details.navigationPath)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{details.navigationLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* Toggle Read/Unread */}
                    <button
                      type="button"
                      onClick={() => toggleRead(item.id, !item.is_read)}
                      title={isUnread ? 'Mark as read' : 'Mark as unread'}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      {isUnread ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Delete Single Notification */}
                    <button
                      type="button"
                      onClick={() => deleteNotification(item.id)}
                      title="Delete notification"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detailed Explanation Context Box */}
                <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>Event Context & Details Explanation</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {details.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
