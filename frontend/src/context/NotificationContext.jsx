import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useRealtime } from './RealtimeContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { socket, isConnected } = useRealtime();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef(0);

  const getCurrentBusiness = () => {
    if (typeof window === 'undefined') return 'chitfund';
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/interest')) return 'interest';
    if (path.startsWith('/admin') || path.startsWith('/agent')) return 'chitfund';
    const stored = localStorage.getItem('active_business');
    return stored === 'interest' ? 'interest' : 'chitfund';
  };

  // Gentle modern harmonic audio chime for new live notifications
  const playNotificationPing = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.18); // D6

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay browser restriction fallback
    }
  }, []);

  const fetchNotifications = useCallback(async (isPolling = false) => {
    const token = localStorage.getItem('chit_token') || localStorage.getItem('token');
    if (!isAuthenticated || !token) return;
    try {
      if (!isPolling) setLoading(true);
      const currentBusiness = getCurrentBusiness();
      const res = await api.get('/notifications', { params: { business: currentBusiness } });
      if (res.data?.success) {
        const list = res.data.notifications || [];
        const unread = res.data.unreadCount || 0;

        // If unread count increased while polling, play chime
        if (isPolling && unread > prevUnreadRef.current && prevUnreadRef.current > 0) {
          playNotificationPing();
        }

        prevUnreadRef.current = unread;
        setNotifications(list);
        setUnreadCount(unread);
      }
    } catch (err) {
      // Silently catch background polling errors (e.g. session expired or offline)
      if (err?.response?.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [isAuthenticated, playNotificationPing]);

  // Real-time socket instant notification listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif) => {
      const currentBusiness = getCurrentBusiness();
      if (notif?.business && notif.business !== 'all' && notif.business !== currentBusiness) {
        // Strict segregation: do not show notifications from other business
        return;
      }
      playNotificationPing();
      setNotifications((prev) => {
        // Prevent duplicates
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      // Fetch full sync quietly in background
      fetchNotifications(true);
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, playNotificationPing, fetchNotifications]);

  // Initial fetch on login & fallback polling (adaptive: 20s if socket connected, 6s fallback if offline)
  useEffect(() => {
    const token = localStorage.getItem('chit_token') || localStorage.getItem('token');
    if (isAuthenticated && token) {
      fetchNotifications(false);
      const pollDelay = isConnected ? 20000 : 6000;
      const interval = setInterval(() => {
        fetchNotifications(true);
      }, pollDelay);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    }
  }, [isAuthenticated, fetchNotifications, user?.id, isConnected]);

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await api.patch(`/notifications/${id}/read`);
    } catch {
      fetchNotifications(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      const currentBusiness = getCurrentBusiness();
      await api.patch('/notifications/mark-all-read', { business: currentBusiness });
    } catch {
      fetchNotifications(false);
    }
  };

  const toggleRead = async (id, shouldBeRead = true) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: shouldBeRead ? 1 : 0 } : n))
      );
      setUnreadCount((prev) => Math.max(0, shouldBeRead ? prev - 1 : prev + 1));
      await api.patch(`/notifications/${id}/read`, { is_read: shouldBeRead });
    } catch {
      fetchNotifications(false);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const target = notifications.find((n) => n.id === id);
      const wasUnread = target && !target.is_read;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      await api.delete(`/notifications/${id}`);
    } catch {
      fetchNotifications(false);
    }
  };

  const clearAll = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      const currentBusiness = getCurrentBusiness();
      await api.delete('/notifications/clear-all', { params: { business: currentBusiness } });
    } catch {
      fetchNotifications(false);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        toggleRead,
        deleteNotification,
        markAllAsRead,
        clearAll,
        refresh: () => fetchNotifications(false),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
