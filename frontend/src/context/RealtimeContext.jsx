import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext(null);

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    try {
      const u = new URL(apiBase);
      return u.origin;
    } catch (_) {
      // Fallback below
    }
  }
  if (typeof window !== 'undefined') {
    // If Vite dev server on port 5173, backend defaults to port 5000
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
}

export function RealtimeProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  
  // Registry of entity listeners: entityName -> Set of callback functions
  const subscribersRef = useRef(new Map());
  // Active debounce timers per callback to prevent multiple rapid executions
  const debounceTimersRef = useRef(new Map());

  // Subscribe an entity or list of entities to a callback
  const subscribe = useCallback((entities, callback) => {
    if (!entities || !callback) return () => {};

    const entityList = Array.isArray(entities) ? entities : [entities];
    entityList.forEach((entity) => {
      const key = String(entity).toLowerCase();
      if (!subscribersRef.current.has(key)) {
        subscribersRef.current.set(key, new Set());
      }
      subscribersRef.current.get(key).add(callback);
    });

    // Cleanup unsubscribe function
    return () => {
      entityList.forEach((entity) => {
        const key = String(entity).toLowerCase();
        const set = subscribersRef.current.get(key);
        if (set) {
          set.delete(callback);
          if (set.size === 0) {
            subscribersRef.current.delete(key);
          }
        }
      });
      // Clear debounce timer if scheduled
      if (debounceTimersRef.current.has(callback)) {
        clearTimeout(debounceTimersRef.current.get(callback));
        debounceTimersRef.current.delete(callback);
      }
    };
  }, []);

  // Dispatch event to matching subscribers with 120ms debounce
  const dispatchSync = useCallback((payload) => {
    if (!payload || !payload.entity) return;
    const entity = String(payload.entity).toLowerCase();
    const business = String(payload.business || '').toLowerCase();

    // Check entity matches directly (e.g. 'collections') and with business prefix (e.g. 'finlend:collections')
    const keysToCheck = [entity];
    if (business === 'interest') {
      keysToCheck.push(`finlend:${entity}`);
    } else if (business === 'chitfund') {
      keysToCheck.push(`chitfund:${entity}`);
    }

    const callbacksToNotify = new Set();
    keysToCheck.forEach((k) => {
      const cbs = subscribersRef.current.get(k);
      if (cbs) {
        cbs.forEach((cb) => callbacksToNotify.add(cb));
      }
    });

    callbacksToNotify.forEach((cb) => {
      if (debounceTimersRef.current.has(cb)) {
        clearTimeout(debounceTimersRef.current.get(cb));
      }
      const timer = setTimeout(() => {
        debounceTimersRef.current.delete(cb);
        try {
          cb(payload);
        } catch (err) {
          console.warn('[Realtime] Subscriber callback error:', err);
        }
      }, 120);
      debounceTimersRef.current.set(cb, timer);
    });
  }, []);

  // Broadcast catch-up to all registered subscribers on reconnect
  const triggerCatchUp = useCallback(() => {
    const allCallbacks = new Set();
    subscribersRef.current.forEach((cbSet) => {
      cbSet.forEach((cb) => allCallbacks.add(cb));
    });

    allCallbacks.forEach((cb) => {
      if (debounceTimersRef.current.has(cb)) {
        clearTimeout(debounceTimersRef.current.get(cb));
      }
      const timer = setTimeout(() => {
        debounceTimersRef.current.delete(cb);
        try {
          cb({ isReconnect: true });
        } catch (err) {
          console.warn('[Realtime] Catch-up callback error:', err);
        }
      }, 200);
      debounceTimersRef.current.set(cb, timer);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem('chit_token') || localStorage.getItem('token');
    const socketUrl = getSocketUrl();

    const socket = io(socketUrl, {
      withCredentials: true,
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // If reconnected after initial connection, trigger catch-up
      if (socket.recovered) {
        // Socket.IO connection state recovery succeeded
      } else {
        triggerCatchUp();
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Listen to generic sync event
    socket.on('sync:event', (payload) => {
      dispatchSync(payload);
    });

    // Listen to all specific sync:* events
    const syncEntities = [
      'collections',
      'groups',
      'members',
      'agents',
      'day_closing',
      'leaves',
      'collection_edits',
      'commissions',
      'tracking',
      'auctions',
      'loans',
      'schemes',
      'customers',
      'users',
    ];
    syncEntities.forEach((ent) => {
      socket.on(`sync:${ent}`, (payload) => {
        dispatchSync(payload || { entity: ent });
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.id, dispatchSync, triggerCatchUp]);

  const value = {
    isConnected,
    socket: socketRef.current,
    subscribe,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/**
 * Custom hook to subscribe a component to real-time entity updates.
 *
 * @param {string|string[]} entities - Entity name(s) to listen to (e.g. ['collections', 'groups'])
 * @param {Function} onUpdate - Function called when an update occurs or on reconnect catch-up
 * @param {Array} deps - Dependency list (like useEffect deps)
 */
export function useRealtimeSync(entities, onUpdate, deps = []) {
  const context = useContext(RealtimeContext);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!context || !context.subscribe || !entities) return;

    const handler = (payload) => {
      if (typeof onUpdateRef.current === 'function') {
        onUpdateRef.current(payload);
      }
    };

    const unsubscribe = context.subscribe(entities, handler);
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, JSON.stringify(entities), ...deps]);

  return { isConnected: context?.isConnected ?? false };
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

export default RealtimeContext;

