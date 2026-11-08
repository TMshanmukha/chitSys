import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
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
  X,
} from 'lucide-react';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { user } = useAuth();
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (isOpen && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen, isMobile]);

  // Close when clicking outside (on desktop)
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (!isMobile && isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen, isMobile]);

  // Role and context-aware Notification Center routing
  const getNotificationCenterPath = () => {
    if (user?.role === 'COLLECTION_AGENT' || location.pathname.startsWith('/agent')) {
      return '/agent/notifications';
    }
    if (location.pathname.startsWith('/interest')) {
      return '/interest/notifications';
    }
    return '/admin/notifications';
  };

  const filteredList = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'AUCTION':
        return <Coins className="w-4 h-4 text-amber-500" />;
      case 'COLLECTION':
        return <Truck className="w-4 h-4 text-emerald-500" />;
      case 'DEFAULT':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationBadgeColor = (type) => {
    switch (type) {
      case 'AUCTION':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800/80';
      case 'COLLECTION':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80';
      case 'DEFAULT':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800/80';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800/80';
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return formatDate(date);
  };

  const handleItemClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      let targetLink = notification.link;
      const isAgent = user?.role === 'COLLECTION_AGENT' || location.pathname.startsWith('/agent');
      const isInterest = location.pathname.startsWith('/interest');

      if (isAgent) {
        if (targetLink.startsWith('/admin/collections')) targetLink = '/agent/history';
        else if (targetLink.startsWith('/admin/tracking')) targetLink = '/agent/routes';
        else if (targetLink.startsWith('/admin/chit-groups')) targetLink = '/agent/routes';
        else if (targetLink.startsWith('/admin/members')) targetLink = '/agent/pending-dues';
        else if (targetLink.startsWith('/admin/auctions')) targetLink = '/agent/tasks';
        else if (targetLink.startsWith('/admin')) targetLink = '/agent/tasks';
      } else if (isInterest) {
        if (targetLink.startsWith('/admin/collections')) targetLink = '/interest/collect';
        else if (targetLink.startsWith('/admin/members')) targetLink = '/interest/customers';
        else if (targetLink.startsWith('/admin')) targetLink = '/interest/home';
      }

      navigate(targetLink);
      setIsOpen(false);
    }
  };

  const renderNotificationList = (maxHeightClass = 'max-h-[360px]') => (
    <div className={`${maxHeightClass} overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900`}>
      {filteredList.length === 0 ? (
        <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-semibold">
            {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Live auctions, collections & payouts will alert here in real-time.
          </p>
        </div>
      ) : (
        filteredList.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800 ${
              !item.is_read
                ? 'bg-blue-50 dark:bg-blue-950/60'
                : 'bg-white dark:bg-slate-900'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${getNotificationBadgeColor(
                item.type
              )}`}
            >
              {getNotificationIcon(item.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(item.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                {item.message}
              </p>
              {item.link && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1 group-hover:underline">
                  <span>View Details</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              )}
            </div>

            {!item.is_read && (
              <span
                title="Unread notification"
                className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2 shadow-[0_0_8px_rgba(37,99,235,0.8)]"
              />
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Action Button with 3D Hover & Glowing Badge */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications"
        className={`relative p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(59,130,246,0.25)]'
        }`}
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-12" />

        {/* Live Pulsing Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-black text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-full shadow-[0_2px_8px_rgba(244,63,94,0.6)] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* MOBILE VIEW: Portal directly into document.body to prevent any container overflow */}
      {isOpen && isMobile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end pointer-events-auto">
          {/* Opaque Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet Drawer - Safe mobile bounds with zero overflow */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Live Notifications"
            className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-slideUp"
          >
            {/* Top Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Mark read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    title="Clear all notifications"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filter === 'UNREAD'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notifications List (Flex-1, bounded, internal scrolling) */}
            {renderNotificationList('flex-1 max-h-[50vh]')}

            {/* Footer with Notification Center Navigation and Dismiss */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(getNotificationCenterPath());
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <span>Open Notification Center</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DESKTOP VIEW: Anchored Popover Dropdown below Bell Button */}
      {isOpen && !isMobile && (
        <div className="absolute right-0 top-full mt-2.5 w-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Live Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  title="Clear all notifications"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-4 pt-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          {renderNotificationList('max-h-[360px]')}

          {/* Footer with Notification Center Navigation */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Live Instant Feed</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(getNotificationCenterPath());
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All in Center</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
