import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Navigation,
  MapPin,
  Compass,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Receipt,
  User,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  XCircle,
  PhoneCall,
  Sparkles,
  Info,
  Calendar,
  MessageSquare,
  X,
  FileText,
  Printer,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  Wallet,
  Banknote,
  CreditCard,
  History,
  CalendarDays,
  CheckCheck,
  Users2,
  Eye,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '../utils/dateUtils';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import { smoothScrollTo } from '../utils/scrollHelper';

export default function RouteTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [trackingData, setTrackingData] = useState({ routes: [], summary: {} });
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [routeCategoryFilter, setRouteCategoryFilter] = useState('ALL'); // 'ALL' | 'DAILY_ROUTE' | 'MONTHLY_ROUTE'
  const [routeSearchTerm, setRouteSearchTerm] = useState('');
  const [showAllChits, setShowAllChits] = useState(false);
  const [stopSearchTerm, setStopSearchTerm] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [loggingStatus, setLoggingStatus] = useState('NOT_PAID');
  const [logNotes, setLogNotes] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);

  // Pagination for Waypoint Roster table
  const [stopsPage, setStopsPage] = useState(1);
  const [stopsPageSize, setStopsPageSize] = useState(10);

  // Member Information Form Modal (Triggered by pressing any node)
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Top-level Navigation: 'PERFORMANCE_LEDGER' | 'ROUTE_MAP'
  const [activeMainTab, setActiveMainTab] = useState('PERFORMANCE_LEDGER');

  // Daily Agent Collection Ledger States
  const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().slice(0, 10));
  const [ledgerMode, setLedgerMode] = useState('DAILY'); // 'DAILY' | 'ALL_TIME'
  const [ledgerAgentFilter, setLedgerAgentFilter] = useState('ALL');
  const [ledgerData, setLedgerData] = useState({
    summary: {
      totalAgentsCount: 0,
      activeFieldAgentsCount: 0,
      grandTarget: 0,
      grandCash: 0,
      grandOnline: 0,
      grandTotal: 0,
      grandPending: 0,
      grandReceipts: 0,
      averageCompletionPercent: 0,
    },
    agents: [],
    filter: {},
  });
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState(null);
  const [agentWorkSubTabs, setAgentWorkSubTabs] = useState({}); // { [agentId]: 'RECEIPTS' | 'LOGS' | 'ROUTES' }
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');

  const loadDailyLedger = async (isSilent = false) => {
    if (!isSilent) setLoadingLedger(true);
    try {
      const params = {};
      if (ledgerMode === 'ALL_TIME') {
        params.mode = 'ALL_TIME';
      } else {
        params.date = ledgerDate;
        params.mode = 'DAILY';
      }
      if (ledgerAgentFilter && ledgerAgentFilter !== 'ALL') {
        params.agentId = ledgerAgentFilter;
      }
      const res = await api.get('/admin/tracking/agents-daily', { params });
      if (res.data?.success) {
        setLedgerData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load daily agent performance ledger:', err);
    } finally {
      if (!isSilent) setLoadingLedger(false);
    }
  };

  const loadTracking = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await api.get('/admin/tracking/overview');
      if (res.data?.success) {
        const data = res.data.data;
        setTrackingData(data);
        setLastSyncTime(new Date());
        if (data.routes && data.routes.length > 0) {
          if (!selectedRouteId) {
            setSelectedRouteId(data.routes[0].id);
          } else {
            // Keep selected stop fresh if route is currently selected
            const currentRoute = data.routes.find((r) => r.id === selectedRouteId);
            if (currentRoute && selectedStop) {
              const updatedStop = currentRoute.stops.find((s) => s.id === selectedStop.id);
              if (updatedStop) setSelectedStop(updatedStop);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load route tracking:', err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and periodic 6-second synchronous polling
  useEffect(() => {
    loadTracking();
    loadDailyLedger();
    const interval = setInterval(() => {
      loadTracking(true);
      loadDailyLedger(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedRouteId, selectedStop?.id, ledgerDate, ledgerMode, ledgerAgentFilter]);

  const handleRefresh = () => {
    loadTracking(false);
    loadDailyLedger(false);
  };

  // Filter routes by category and instant search term
  const filteredRoutes = trackingData.routes.filter((r) => {
    if (routeCategoryFilter !== 'ALL' && r.routeCategory !== routeCategoryFilter) {
      return false;
    }
    if (!routeSearchTerm.trim()) return true;
    const term = routeSearchTerm.toLowerCase();
    const nameMatch = r.groupName?.toLowerCase().includes(term);
    const codeMatch = r.groupCode?.toLowerCase().includes(term);
    const locMatch = r.locationName?.toLowerCase().includes(term);
    const agentMatch = r.agent?.name?.toLowerCase().includes(term);
    return nameMatch || codeMatch || locMatch || agentMatch;
  });

  // Current active route for 2D diagram
  const activeRoute = filteredRoutes.find((r) => r.id === selectedRouteId) || filteredRoutes[0] || null;

  // Filter stops by stopSearchTerm
  const searchedStops = (activeRoute?.stops || []).filter((s) => {
    if (!stopSearchTerm.trim()) return true;
    const term = stopSearchTerm.toLowerCase();
    const nameMatch = s.memberName?.toLowerCase().includes(term);
    const ticketMatch = String(s.ticketNumber || '').includes(term);
    const stopMatch = String(s.stopOrder || '').includes(term);
    const phoneMatch = String(s.memberPhone || '').includes(term);
    const addressMatch = s.address?.toLowerCase().includes(term);
    const notesMatch = s.notes?.toLowerCase().includes(term);
    return nameMatch || ticketMatch || stopMatch || phoneMatch || addressMatch || notesMatch;
  });

  // Reset page when active route or search changes
  useEffect(() => {
    setStopsPage(1);
  }, [selectedRouteId, activeRoute?.id, stopSearchTerm]);

  const paginatedStops = searchedStops.slice(
    (stopsPage - 1) * stopsPageSize,
    stopsPage * stopsPageSize
  );

  // Set default selected stop when route changes
  useEffect(() => {
    if (activeRoute && activeRoute.stops.length > 0) {
      const match = activeRoute.stops.find((s) => selectedStop && s.id === selectedStop.id);
      setSelectedStop(match || activeRoute.stops[0]);
    } else {
      setSelectedStop(null);
    }
  }, [selectedRouteId, activeRoute?.id]);

  // Pressing any node opens the related Member Information Form
  const handleNodePress = (stop) => {
    setSelectedStop(stop);
    setShowMemberModal(true);
  };

  // Log activity on a stop (Admin note or status override)
  const handleLogStopActivity = async (e) => {
    e.preventDefault();
    if (!activeRoute || !selectedStop) return;
    setSubmittingLog(true);
    try {
      await api.post('/admin/tracking/log-activity', {
        groupId: activeRoute.id,
        memberId: selectedStop.memberId || selectedStop.id,
        stopId: selectedStop.stopOrder,
        status: loggingStatus,
        notes: logNotes || (loggingStatus === 'PAID' ? 'Collected by agent' : 'Awaiting payment'),
      });
      setShowLogModal(false);
      setLogNotes('');
      await loadTracking(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stop status');
    } finally {
      setSubmittingLog(false);
    }
  };

  // Generate SVG path string from sequential route stops
  const getRouteSvgPath = (stops) => {
    if (!stops || stops.length === 0) return '';
    if (stops.length === 1) return `M ${stops[0].coordX} ${stops[0].coordY}`;

    let path = `M ${stops[0].coordX} ${stops[0].coordY}`;
    for (let i = 0; i < stops.length - 1; i++) {
      const current = stops[i];
      const next = stops[i + 1];
      const midX = (current.coordX + next.coordX) / 2;
      const midY = (current.coordY + next.coordY) / 2;
      path += ` Q ${current.coordX} ${midY}, ${midX} ${midY} T ${next.coordX} ${next.coordY}`;
    }
    return path;
  };

  // Handle clicking a chit scheme: selects route and automatically scrolls to the 2D route map
  const handleSelectRoute = (routeId) => {
    setSelectedRouteId(routeId);
    smoothScrollTo('route-trajectory-map', { offset: 32, behavior: 'smooth', delay: 100 });
  };

  // Filter agents by search term and selected agent
  const filteredAgents = (ledgerData.agents || []).filter((agent) => {
    if (ledgerAgentFilter !== 'ALL' && agent.agentId !== Number(ledgerAgentFilter)) {
      return false;
    }
    if (!ledgerSearchTerm.trim()) return true;
    const term = ledgerSearchTerm.toLowerCase();
    const nameMatch = agent.fullName?.toLowerCase().includes(term);
    const usernameMatch = agent.username?.toLowerCase().includes(term);
    const phoneMatch = agent.phone?.toLowerCase().includes(term);
    const routeMatch = agent.assignedRoutes?.some((r) =>
      r.groupName?.toLowerCase().includes(term) || r.groupCode?.toLowerCase().includes(term)
    );
    const receiptMatch = agent.receipts?.some((rcp) =>
      rcp.receiptNumber?.toLowerCase().includes(term) ||
      rcp.memberName?.toLowerCase().includes(term) ||
      rcp.notes?.toLowerCase().includes(term)
    );
    const logMatch = agent.workLogs?.some((l) =>
      l.memberName?.toLowerCase().includes(term) ||
      l.notes?.toLowerCase().includes(term)
    );
    return nameMatch || usernameMatch || phoneMatch || routeMatch || receiptMatch || logMatch;
  });

  const toggleAgentExpand = (agentId) => {
    setExpandedAgentId((prev) => (prev === agentId ? null : agentId));
  };

  const getAgentSubTab = (agentId) => agentWorkSubTabs[agentId] || 'RECEIPTS';
  const setAgentSubTab = (agentId, tab) => {
    setAgentWorkSubTabs((prev) => ({ ...prev, [agentId]: tab }));
  };

  const handleJumpToAgentRoute = (groupId) => {
    setActiveMainTab('ROUTE_MAP');
    if (groupId) {
      setSelectedRouteId(groupId);
    }
    smoothScrollTo('route-trajectory-map', { offset: 32, behavior: 'smooth', delay: 100 });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Field Operations Center</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Route Operations & Agent Collections
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time agent collections, cash on hand, pending amounts, assigned routes, and live work dossiers
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Synchronous Live Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Auto-Syncing (6s)</span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loadingLedger}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Instant Refresh Now"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || loadingLedger ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMainTab('PERFORMANCE_LEDGER')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeMainTab === 'PERFORMANCE_LEDGER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Daily Agent Collection & Work Ledger</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                activeMainTab === 'PERFORMANCE_LEDGER'
                  ? 'bg-blue-500 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              Everyday Reset
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('ROUTE_MAP')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeMainTab === 'ROUTE_MAP'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>2D Visual Route Map</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                activeMainTab === 'ROUTE_MAP'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {trackingData.routes?.length || 0} Routes
            </span>
          </button>
        </div>

        {activeMainTab === 'ROUTE_MAP' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setRouteCategoryFilter('ALL');
                smoothScrollTo('route-scheme-switcher', { offset: 32, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                routeCategoryFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              All Routes
            </button>
            <button
              type="button"
              onClick={() => {
                setRouteCategoryFilter('DAILY_ROUTE');
                smoothScrollTo('route-scheme-switcher', { offset: 32, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                routeCategoryFilter === 'DAILY_ROUTE'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              🚚 Daily Routes
            </button>
            <button
              type="button"
              onClick={() => {
                setRouteCategoryFilter('MONTHLY_ROUTE');
                smoothScrollTo('route-scheme-switcher', { offset: 32, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                routeCategoryFilter === 'MONTHLY_ROUTE'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              🏛️ Monthly Routes
            </button>
          </div>
        )}
      </div>

      {activeMainTab === 'PERFORMANCE_LEDGER' ? (
        /* DAILY AGENT PERFORMANCE & WORK LEDGER */
        <div className="space-y-6">
          {/* Control Filter Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Date & Preset Pickers */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={ledgerDate}
                    onChange={(e) => {
                      setLedgerDate(e.target.value);
                      setLedgerMode('DAILY');
                    }}
                    className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Quick Today Preset */}
                <button
                  type="button"
                  onClick={() => {
                    setLedgerDate(new Date().toISOString().slice(0, 10));
                    setLedgerMode('DAILY');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    ledgerMode === 'DAILY' && ledgerDate === new Date().toISOString().slice(0, 10)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Today's Live Ledger</span>
                </button>

                {/* Global Lifetime History Preset */}
                <button
                  type="button"
                  onClick={() => setLedgerMode(ledgerMode === 'ALL_TIME' ? 'DAILY' : 'ALL_TIME')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    ledgerMode === 'ALL_TIME'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Global Lifetime History</span>
                </button>
              </div>

              {/* Agent Filter & Instant Search */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={ledgerAgentFilter}
                  onChange={(e) => setLedgerAgentFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Field Agents ({ledgerData.agents?.length || 0})</option>
                  {(ledgerData.agents || []).map((ag) => (
                    <option key={ag.agentId} value={ag.agentId}>
                      {ag.fullName} (@{ag.username})
                    </option>
                  ))}
                </select>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ledgerSearchTerm}
                    onChange={(e) => setLedgerSearchTerm(e.target.value)}
                    placeholder="Search agent, route, receipt #..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Daily Reset & Global History Explanation Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {ledgerMode === 'ALL_TIME' ? (
                  <span>
                    🌐 <strong>Global Lifetime Performance Ledger</strong>: Showing total all-time historical collections, receipts, and field visits across all days.
                  </span>
                ) : ledgerDate === new Date().toISOString().slice(0, 10) ? (
                  <span>
                    🟢 <strong>Today's Live Collection Roster (Resets Every Midnight)</strong>: Field collection targets and cash totals refresh fresh each day at 00:00 midnight IST. All historical day logs and issued receipts remain permanently archived in the global database.
                  </span>
                ) : (
                  <span>
                    📅 <strong>Archived Historical Record for {formatDate(ledgerDate)}</strong>: Viewing settled collection metrics, physical cash collected, and field notes for this specific past date.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grand Executive Summary KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Cash on Hand */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Cash on Hand</span>
                <Banknote className="w-4 h-4" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{Number(ledgerData.summary?.grandCash || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Physical currency with agents</span>
            </div>

            {/* Digital / UPI */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 shadow-xs">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Digital / Online</span>
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-purple-600 dark:text-purple-400">
                ₹{Number(ledgerData.summary?.grandOnline || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">UPI & direct bank transfers</span>
            </div>

            {/* Total Inflow */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/60 shadow-xs">
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Inflow</span>
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-blue-600 dark:text-blue-400">
                ₹{Number(ledgerData.summary?.grandTotal || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Gross collections achieved</span>
            </div>

            {/* Expected Target */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Target Expected</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                ₹{Number(ledgerData.summary?.grandTarget || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Daily routes + Monthly on 1st</span>
            </div>

            {/* Total Pending */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending Amount</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400">
                ₹{Number(ledgerData.summary?.grandPending || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">{ledgerData.summary?.averageCompletionPercent || 0}% overall efficiency</span>
            </div>

            {/* Receipts & Active Agents */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Work Volume</span>
                <Receipt className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {ledgerData.summary?.grandReceipts || 0} Receipts
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {ledgerData.summary?.activeFieldAgentsCount || 0} / {ledgerData.summary?.totalAgentsCount || 0} active agents
              </span>
            </div>
          </div>

          {/* Agent-by-Agent Detailed Performance Roster */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Field Collection Agents Performance ({filteredAgents.length})</span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing individual cash, pending, route assignments & work dossiers
              </span>
            </div>

            {filteredAgents.length === 0 ? (
              <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <Users2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200">No field agents match your search filter</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try clearing the search query or changing the date to inspect past collection records.
                </p>
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const isExpanded = expandedAgentId === agent.agentId;
                const subTab = getAgentSubTab(agent.agentId);

                return (
                  <div
                    key={agent.agentId}
                    className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    {/* Agent Header & Action Strip */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                          {agent.fullName?.slice(0, 2).toUpperCase() || 'AG'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                              {agent.fullName}
                            </h4>
                            <span className="text-xs text-slate-500 font-mono">@{agent.username}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                agent.isActive
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {agent.isActive ? 'Active Field Agent' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            {agent.phone ? (
                              <a
                                href={`tel:${agent.phone}`}
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>{agent.phone}</span>
                              </a>
                            ) : (
                              <span>No phone registered</span>
                            )}
                            <span>·</span>
                            <span>{agent.assignedRoutesCount} Assigned Routes</span>
                            <span>·</span>
                            <span>
                              Last active: {agent.lastLoginAt ? formatDateTime(agent.lastLoginAt) : 'Recent activity logged'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Jump to Map Button */}
                      {agent.assignedRoutes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleJumpToAgentRoute(agent.assignedRoutes[0]?.groupId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>View Route on 2D Map</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Financial Metrics Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Target Expected
                        </span>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                          ₹{agent.targetExpected.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                          Cash on Hand
                        </span>
                        <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ₹{agent.cashCollected.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50">
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
                          Online / Digital
                        </span>
                        <div className="text-sm sm:text-base font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                          ₹{agent.onlineCollected.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                          Total Collected
                        </span>
                        <div className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                          ₹{agent.totalCollected.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                          Pending Amount
                        </span>
                        <div className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                          ₹{agent.pendingAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Coverage */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-300">
                          {agent.completionPercent}% Target Achieved
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {agent.visitedSubscribersCount} of {agent.totalSubscribersCount} subscribers visited ({agent.receiptsCount} receipts)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, agent.completionPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Assigned Routes Section */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assigned Routes & Scheme Details ({agent.assignedRoutes.length})
                      </span>
                      {agent.assignedRoutes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No chit routes currently assigned to this agent.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {agent.assignedRoutes.map((r) => (
                            <div
                              key={r.groupId}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 text-xs"
                            >
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  r.frequency === 'DAILY'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {r.frequency === 'DAILY' ? '🚚 Daily' : '🏛️ Monthly'}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {r.groupName} ({r.groupCode})
                                </span>
                                <div className="text-[11px] text-slate-500">
                                  👥 {r.subscribersCount} subs · ₹{r.installmentAmount.toLocaleString('en-IN')} inst · Target: ₹{r.expectedTarget.toLocaleString('en-IN')}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleJumpToAgentRoute(r.groupId)}
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer ml-1"
                                title="Open this scheme on 2D route map"
                              >
                                <Compass className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Information of Work (Expandable Work Dossier) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleAgentExpand(agent.agentId)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>Information of Work & Audit Dossier</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                            {agent.receiptsCount} Receipts Issued
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                            {agent.workLogs.length} Field Remarks Logged
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <span>{isExpanded ? 'Hide Dossier' : 'Inspect Information'}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Expanded Work Dossier Content */}
                      {isExpanded && (
                        <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
                          {/* Dossier Tabs */}
                          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <button
                              type="button"
                              onClick={() => setAgentSubTab(agent.agentId, 'RECEIPTS')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                subTab === 'RECEIPTS'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              🧾 Receipts Breakdown ({agent.receipts.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAgentSubTab(agent.agentId, 'LOGS')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                subTab === 'LOGS'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              📝 Field Remarks & Notes ({agent.workLogs.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAgentSubTab(agent.agentId, 'ROUTES')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                subTab === 'ROUTES'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              🚚 Route Details ({agent.assignedRoutes.length})
                            </button>
                          </div>

                          {/* Sub-tab 1: Receipts Breakdown Table */}
                          {subTab === 'RECEIPTS' && (
                            <div className="overflow-x-auto">
                              {agent.receipts.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-3 text-center">
                                  No receipts registered for this agent on this date.
                                </p>
                              ) : (
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px]">
                                      <th className="py-2 px-2 font-bold">Receipt #</th>
                                      <th className="py-2 px-2 font-bold">Subscriber</th>
                                      <th className="py-2 px-2 font-bold">Chit Scheme</th>
                                      <th className="py-2 px-2 font-bold">Payment Method</th>
                                      <th className="py-2 px-2 font-bold text-right">Amount</th>
                                      <th className="py-2 px-2 font-bold">Time</th>
                                      <th className="py-2 px-2 font-bold">Notes / Remarks</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {agent.receipts.map((rcp) => (
                                      <tr key={rcp.id} className="hover:bg-white/50 dark:hover:bg-slate-700/50">
                                        <td className="py-2 px-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                                          {rcp.receiptNumber}
                                        </td>
                                        <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">
                                          {rcp.memberName}
                                          {rcp.memberPhone && (
                                            <span className="text-[10px] text-slate-400 block font-mono">
                                              {rcp.memberPhone}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2 text-slate-600 dark:text-slate-300">
                                          {rcp.groupName}
                                        </td>
                                        <td className="py-2 px-2">
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              rcp.paymentMethod === 'CASH'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                            }`}
                                          >
                                            {rcp.paymentMethod}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2 font-extrabold text-right text-slate-900 dark:text-white">
                                          ₹{rcp.amount.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">
                                          {rcp.collectionTime ? formatTime(rcp.collectionTime) : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-slate-500 dark:text-slate-400 text-[11px]">
                                          {rcp.notes || '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}

                          {/* Sub-tab 2: Field Remarks & Notes */}
                          {subTab === 'LOGS' && (
                            <div className="space-y-2">
                              {agent.workLogs.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-3 text-center">
                                  No field remarks logged for this agent on this date.
                                </p>
                              ) : (
                                agent.workLogs.map((log) => (
                                  <div
                                    key={log.id}
                                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                          {log.memberName || 'Subscriber Stop'}
                                        </span>
                                        <span className="text-[11px] text-slate-400">({log.groupName || log.groupCode})</span>
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            log.status === 'PAID'
                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                          }`}
                                        >
                                          {log.status}
                                        </span>
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                                        💬 "{log.notes || 'Status updated by field agent'}"
                                      </p>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono shrink-0">
                                      {log.time ? formatDateTime(log.time) : '-'}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {/* Sub-tab 3: Route Details */}
                          {subTab === 'ROUTES' && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px]">
                                    <th className="py-2 px-2 font-bold">Route Code</th>
                                    <th className="py-2 px-2 font-bold">Scheme Name</th>
                                    <th className="py-2 px-2 font-bold">Frequency</th>
                                    <th className="py-2 px-2 font-bold">Location</th>
                                    <th className="py-2 px-2 font-bold text-right">Installment</th>
                                    <th className="py-2 px-2 font-bold text-right">Subscribers</th>
                                    <th className="py-2 px-2 font-bold text-right">Route Target</th>
                                    <th className="py-2 px-2 text-center font-bold">Map</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {agent.assignedRoutes.map((r) => (
                                    <tr key={r.groupId} className="hover:bg-white/50 dark:hover:bg-slate-700/50">
                                      <td className="py-2 px-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                                        {r.groupCode}
                                      </td>
                                      <td className="py-2 px-2 font-semibold text-slate-800 dark:text-slate-200">
                                        {r.groupName}
                                      </td>
                                      <td className="py-2 px-2">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            r.frequency === 'DAILY'
                                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                          }`}
                                        >
                                          {r.frequency}
                                        </span>
                                      </td>
                                      <td className="py-2 px-2 text-slate-500">{r.locationName || '-'}</td>
                                      <td className="py-2 px-2 font-mono text-right text-slate-800 dark:text-slate-200">
                                        ₹{r.installmentAmount.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2 px-2 font-mono text-right text-slate-800 dark:text-slate-200">
                                        {r.subscribersCount}
                                      </td>
                                      <td className="py-2 px-2 font-bold text-right text-emerald-600 dark:text-emerald-400">
                                        ₹{r.expectedTarget.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2 px-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleJumpToAgentRoute(r.groupId)}
                                          className="p-1 rounded text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                                          title="View on Map"
                                        >
                                          <Compass className="w-3.5 h-3.5 inline" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* 2D VISUAL ROUTE MAP & WAYPOINTS */
        <>
          {/* Overview Stat Cards with Day-by-Day (Daily) vs Month-by-Month (Monthly) Separation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Active Routes
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {trackingData.summary?.activeRoutesCount || 0}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              📅 {trackingData.summary?.daily?.routesCount || 0} Daily
            </span>
            <span>·</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              🗓️ {trackingData.summary?.monthly?.routesCount || 0} Monthly
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Paid Member Nodes
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {trackingData.summary?.grandVisitedStops || 0} / {trackingData.summary?.grandTotalStops || 0}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <span>Daily: {trackingData.summary?.daily?.visitedStops || 0} paid</span>
            <span>·</span>
            <span>Monthly: {trackingData.summary?.monthly?.visitedStops || 0} paid</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Cash Collected on Routes
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{Number(trackingData.summary?.grandCashCollected || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Physically with field agents</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Digital / UPI on Routes
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            ₹{Number(trackingData.summary?.grandOnlineCollected || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Direct bank transfers verified</span>
        </div>
      </div>

      {/* Smart Chit Scheme Fast Finder & Grid (No more endless horizontal scrolling) */}
      <div id="route-scheme-switcher" className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Chit Scheme Quick Switcher ({filteredRoutes.length} Schemes Available)
            </h4>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Instant Search Bar */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={routeSearchTerm}
                onChange={(e) => setRouteSearchTerm(e.target.value)}
                placeholder="Search scheme name, code (e.g. DL-01), agent..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {routeSearchTerm && (
                <button
                  type="button"
                  onClick={() => setRouteSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Show All / Collapse Toggle Button (When not searching) */}
            {!routeSearchTerm && filteredRoutes.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAllChits(!showAllChits)}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 shrink-0"
                title={showAllChits ? 'Collapse scheme cards' : 'Display all schemes'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showAllChits ? 'Collapse' : `Show All (${filteredRoutes.length})`}</span>
                {showAllChits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Compact Responsive Scheme Grid */}
        {filteredRoutes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No chit schemes match "{routeSearchTerm}". Try another keyword or clear search.
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {(routeSearchTerm || showAllChits
                ? filteredRoutes
                : filteredRoutes.filter((r) => r.id === selectedRouteId || (activeRoute && r.id === activeRoute.id))
              ).map((route) => {
                const isSelected = route.id === selectedRouteId || (activeRoute && route.id === activeRoute.id);
                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => handleSelectRoute(route.id)}
                    className={`p-3 rounded-xl text-left transition-all cursor-pointer card-interactive-elevate border ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 text-blue-950 dark:text-blue-100 shadow-[0_8px_20px_-4px_rgba(37,99,235,0.25)] ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                        {route.groupCode}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                          route.chitType === 'DAILY_CHIT'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : route.chitType === 'DOUBLE_CHIT'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {route.chitType === 'DAILY_CHIT' ? 'Daily' : route.chitType === 'DOUBLE_CHIT' ? 'Double' : 'Monthly'}
                      </span>
                    </div>

                    <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                      {route.groupName}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="truncate">👤 {route.agent?.name || 'Unassigned'}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {route.stats.visitedStops}/{route.stats.totalStops} Paid
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expand helper button if not searching and showAllChits is false */}
            {!routeSearchTerm && !showAllChits && filteredRoutes.length > 1 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllChits(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer py-1 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <span>Click to view all {filteredRoutes.length} available schemes</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main 2D Route Representation Canvas & Details Card */}
      {loading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading 2D route map and agent telemetry...</p>
        </div>
      ) : !activeRoute ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <MapPin className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">No Routes Configured</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create a Chit Group under Daily Chit Routes or Monthly Chit Routes, assign an agent, and route tracking will immediately render here.
          </p>
        </div>
      ) : (
        <div id="route-trajectory-map" className="space-y-6">
          {/* Active Route Header & Metrics Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase border flex items-center gap-1.5 ${
                  activeRoute.frequency === 'DAILY'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                }`}>
                  {activeRoute.frequency === 'DAILY' ? '📅 Day-by-Day Route' : '🗓️ Month-by-Month Route'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                  {activeRoute.routeCategory.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono text-slate-400">{activeRoute.groupCode}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{activeRoute.groupName}</span>
                <span className="text-xs font-normal text-slate-500">· {activeRoute.locationName}</span>
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeRoute.frequency === 'DAILY' ? '📅 Cycle: Today (Day-by-Day Installment)' : '🗓️ Cycle: Current Month Draw'}
                </span>
                <span>·</span>
                <span>
                  Assigned Agent:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {activeRoute.agent?.name || 'Unassigned'}
                  </strong>
                </span>
                {activeRoute.agent?.phone && <span>· 📞 {activeRoute.agent.phone}</span>}
              </div>
            </div>

            {/* Route Progress Bar */}
            <div className="min-w-[240px] space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Payment Coverage</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{activeRoute.stats.progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${activeRoute.stats.progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {activeRoute.stats.visitedStops} Paid (Green)
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {activeRoute.stats.pendingStops} Not Paid (Red)
                </span>
              </div>
            </div>
          </div>

          {/* 2D Interactive Route Canvas / Diagram */}
          <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 text-xs gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  2D Route Trajectory & Member Node Representation
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Synchronous Live</span>
                </span>
              </div>

              {/* Exact Node Legend as Requested — Visible on Mobile, Tablet & Desktop */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border border-emerald-600 shrink-0" />
                  <strong className="text-emerald-600 dark:text-emerald-400">PAID</strong> (Collected)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500 border border-rose-600 shrink-0" />
                  <strong className="text-rose-600 dark:text-rose-400">NOT PAID</strong> (Pending)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 border border-blue-600 shrink-0" />
                  <span>Agent Location</span>
                </span>
              </div>
            </div>

            {/* Hint for pressing node */}
            <div className="mb-2 text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Tip: Press/click any circular node to open the comprehensive Member Information Form.</span>
            </div>

            {/* SVG 2D Interactive Board */}
            <div className="relative w-full aspect-[16/10] sm:aspect-[2.1/1] min-h-[250px] sm:min-h-[340px] max-h-[480px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center p-1 sm:p-2 overflow-hidden">
              {/* Decorative Map Grid Lines */}
              <svg
                className="absolute inset-0 w-full h-full opacity-15 dark:opacity-10 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="route-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#route-grid)" />
              </svg>

              <svg viewBox="0 0 800 360" className="w-full h-full overflow-visible z-10">
                <defs>
                  {/* Linear gradient for route path */}
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>

                  {/* Pulsing glow filter */}
                  <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* 1. Underlying Route Path spline connecting each member node */}
                {activeRoute.stops.length > 1 && (
                  <>
                    <path
                      d={getRouteSvgPath(activeRoute.stops)}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="6 6"
                      className="opacity-40"
                    />
                    <path
                      d={getRouteSvgPath(activeRoute.stops)}
                      fill="none"
                      stroke="url(#routeGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="opacity-80"
                    />
                  </>
                )}

                {/* 2. Member Nodes along the route (Pressing node opens Member Information Form) */}
                {activeRoute.stops.map((stop) => {
                  const isSelected = selectedStop?.id === stop.id;
                  const isPaid =
                    stop.status === 'PAID' || stop.nodeColor === 'GREEN' || stop.status === 'VISITED_COLLECTED';

                  const stopFill = isPaid ? '#10b981' : '#ef4444';
                  const stopStroke = isPaid ? '#059669' : '#dc2626';

                  return (
                    <g
                      key={stop.id}
                      className="cursor-pointer transition-transform hover:scale-110"
                      onClick={() => handleNodePress(stop)}
                    >
                      {/* Touch target padding for mobile screens */}
                      <circle cx={stop.coordX} cy={stop.coordY} r="28" fill="transparent" />

                      {/* Selection Halo */}
                      {isSelected && (
                        <circle
                          cx={stop.coordX}
                          cy={stop.coordY}
                          r="24"
                          fill="none"
                          stroke={isPaid ? '#10b981' : '#ef4444'}
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                          className="animate-spin"
                          style={{ transformOrigin: `${stop.coordX}px ${stop.coordY}px`, animationDuration: '6s' }}
                        />
                      )}

                      {/* Main Member Node Circle (Green if paid, Red if not paid) */}
                      <circle
                        cx={stop.coordX}
                        cy={stop.coordY}
                        r={isSelected ? '17' : '15'}
                        fill={stopFill}
                        stroke={stopStroke}
                        strokeWidth="3.5"
                        filter={isPaid ? 'url(#glowGreen)' : 'url(#glowRed)'}
                        className="transition-all"
                      />

                      {/* Ticket Number inside Circle */}
                      <text
                        x={stop.coordX}
                        y={stop.coordY + 4}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        className="pointer-events-none select-none"
                      >
                        {stop.stopOrder}
                      </text>

                      {/* Ticket Label below node */}
                      <text
                        x={stop.coordX}
                        y={stop.coordY + 28}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="600"
                        className="pointer-events-none select-none"
                      >
                        Ticket #{stop.stopOrder}
                      </text>

                      {/* Prominent PAID (Green) or NOT PAID (Red) text below */}
                      <text
                        x={stop.coordX}
                        y={stop.coordY + 40}
                        textAnchor="middle"
                        fill={isPaid ? '#10b981' : '#ef4444'}
                        fontSize="9"
                        fontWeight="800"
                        className="pointer-events-none select-none tracking-tight uppercase"
                      >
                        {isPaid ? 'PAID' : 'NOT PAID'}
                      </text>
                    </g>
                  );
                })}

                {/* 3. Agent Real-Time Pin & Radar Wave */}
                {activeRoute.agent && (
                  <g
                    transform={`translate(${activeRoute.agentPosition.x}, ${activeRoute.agentPosition.y})`}
                    className="cursor-pointer"
                  >
                    {/* Animated Radar Pulse */}
                    <circle cx="0" cy="0" r="26" fill="rgba(37, 99, 235, 0.2)" className="animate-ping" />
                    <circle cx="0" cy="0" r="18" fill="rgba(37, 99, 235, 0.3)" />

                    {/* Agent Pin Base */}
                    <circle cx="0" cy="0" r="13" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />

                    {/* Icon */}
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      A
                    </text>

                    {/* Agent Floating Badge */}
                    <g transform="translate(0, -22)">
                      <rect x="-48" y="-14" width="96" height="18" rx="9" fill="#1e293b" className="shadow-sm" />
                      <text x="0" y="-2" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                        {activeRoute.agent.name?.split(' ')[0]} (On Route)
                      </text>
                    </g>
                  </g>
                )}
              </svg>
            </div>

            {/* Selected Stop Quick Inspector & Member Form Launcher */}
            {selectedStop && (() => {
              const isPaid =
                selectedStop.status === 'PAID' ||
                selectedStop.nodeColor === 'GREEN' ||
                selectedStop.status === 'VISITED_COLLECTED';

              return (
                <div
                  className={`mt-4 p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isPaid
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
                        isPaid ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      #{selectedStop.stopOrder}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {activeRoute.groupCode} · Ticket #{selectedStop.stopOrder}
                        </h4>

                        {/* Synchronous Status Pill */}
                        {isPaid ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>PAID</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span>NOT PAID</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Subscriber Member:{' '}
                        <strong className="text-slate-900 dark:text-white font-semibold">
                          {selectedStop.memberName}
                        </strong>
                        {selectedStop.memberPhone && ` · 📞 ${selectedStop.memberPhone}`}
                      </p>

                      {/* If Paid: Show Collection Receipt & Note */}
                      {isPaid ? (
                        <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                          {selectedStop.collectionDetails ? (
                            <span>
                              Receipt: <strong>{selectedStop.collectionDetails.receiptNumber}</strong> · ₹
                              {selectedStop.collectionDetails.amount} ({selectedStop.collectionDetails.paymentMethod})
                              {selectedStop.collectionDetails.time &&
                                ` at ${formatTime(selectedStop.collectionDetails.time)}`}
                            </span>
                          ) : (
                            <span>Payment registered by agent terminal</span>
                          )}
                          {selectedStop.notes && selectedStop.notes !== 'Awaiting payment' && (
                            <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                              Note: {selectedStop.notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* If Not Paid: Show Agent Remark / Note */
                        <div className="mt-1.5 p-2 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>
                            Agent Remark:{' '}
                            <strong>{selectedStop.notes || 'Awaiting payment'}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="text-right mr-1">
                      <span className="text-[11px] text-slate-400 block">Due Installment</span>
                      <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                        ₹{Number(selectedStop.expectedAmount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Open Member Information Form */}
                    <button
                      type="button"
                      onClick={() => setShowMemberModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Open Member Form</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoggingStatus(isPaid ? 'PAID' : 'NOT_PAID');
                        setLogNotes(selectedStop.notes && selectedStop.notes !== 'Awaiting payment' ? selectedStop.notes : '');
                        setShowLogModal(true);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Update Note
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sequential Waypoint Roster Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Route Member Node Schedule ({searchedStops.length} of {activeRoute.stops.length} Waypoints)
                </h4>
                <p className="text-xs text-slate-400">
                  Click any subscriber row or node to open the related Member Information Form
                </p>
              </div>

              {/* Instant Stop Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={stopSearchTerm}
                  onChange={(e) => setStopSearchTerm(e.target.value)}
                  placeholder="Search member, ticket #, phone..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {stopSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setStopSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Chit Node / Ticket</th>
                    <th className="py-2.5 px-3">Subscriber Member</th>
                    <th className="py-2.5 px-3">Due Amount</th>
                    <th className="py-2.5 px-3">Synchronous Status</th>
                    <th className="py-2.5 px-3">Agent Remark / Receipt</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedStops.map((stop) => {
                    const isPaid =
                      stop.status === 'PAID' || stop.nodeColor === 'GREEN' || stop.status === 'VISITED_COLLECTED';

                    return (
                      <tr
                        key={stop.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${
                          selectedStop?.id === stop.id ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                        onClick={() => handleNodePress(stop)}
                      >
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">#{stop.stopOrder}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                            Ticket #{stop.stopOrder}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1.5 font-normal">({activeRoute.groupCode})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <div className="font-medium text-slate-900 dark:text-white">{stop.memberName}</div>
                          {stop.memberPhone && <div className="text-[11px] text-slate-400">📞 {stop.memberPhone}</div>}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          ₹{Number(stop.expectedAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          {isPaid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>PAID</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>NOT PAID</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {isPaid ? (
                            <div className="text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                              {stop.collectionDetails ? (
                                <span>
                                  {stop.collectionDetails.receiptNumber} · ₹{stop.collectionDetails.amount} (
                                  {stop.collectionDetails.paymentMethod})
                                </span>
                              ) : (
                                <span>Receipt: REC-TODAY · Paid</span>
                              )}
                              {stop.notes && stop.notes !== 'Awaiting payment' && (
                                <div className="text-[11px] text-slate-400 font-sans">
                                  <ShowMoreText text={stop.notes} maxChars={35} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-rose-700 dark:text-rose-300 font-medium text-[11px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                              <div className="flex-1">
                                <ShowMoreText text={stop.notes || 'Awaiting payment'} maxChars={35} />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNodePress(stop);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1 cursor-pointer"
                          >
                            Form
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStop(stop);
                              setLoggingStatus(isPaid ? 'PAID' : 'NOT_PAID');
                              setLogNotes(stop.notes && stop.notes !== 'Awaiting payment' ? stop.notes : '');
                              setShowLogModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={stopsPage}
              totalItems={activeRoute?.stops?.length || 0}
              pageSize={stopsPageSize}
              onPageChange={setStopsPage}
              onPageSizeChange={setStopsPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        </div>
      )}
    </>
  )}

      {/* Member Information Form Modal (Brought up when pressing any node) */}
      {showMemberModal && selectedStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-xs ${
                    selectedStop.status === 'PAID' || selectedStop.nodeColor === 'GREEN'
                      ? 'bg-emerald-600'
                      : 'bg-rose-600'
                  }`}
                >
                  #{selectedStop.stopOrder}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                      Member Information & Node Form
                    </h3>
                    {selectedStop.status === 'PAID' || selectedStop.nodeColor === 'GREEN' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>PAID</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>NOT PAID</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chit Route Node #{selectedStop.stopOrder} · {activeRoute.groupName} ({activeRoute.groupCode})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[72vh] overflow-y-auto">
              {/* Section 1: Member Personal & Contact Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Member Personal & Contact Information</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedStop.memberName || 'Not Available'}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Member Identification Code
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedStop.memberCode || `MEM-${selectedStop.memberId || selectedStop.id}`}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Primary Phone Number
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={selectedStop.memberPhone || 'Not Provided'}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                      />
                      {selectedStop.memberPhone && (
                        <a
                          href={`tel:${selectedStop.memberPhone}`}
                          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors shrink-0"
                          title="Call Member"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Alternate Phone Number
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedStop.alternatePhone || 'None Registered'}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Physical Address / Waypoint Landmark
                    </label>
                    <textarea
                      rows="2"
                      readOnly
                      value={selectedStop.memberAddress || `${activeRoute.locationName} (Waypoint Stop #${selectedStop.stopOrder})`}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: KYC & Chit Membership */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>KYC Identity & Enrollment Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      KYC Document Type
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedStop.kycType || 'Aadhaar Card'}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      KYC Document Number
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedStop.kycNumber || 'Verified ID'}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Joined Date
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedStop.joinedDate ? formatDate(selectedStop.joinedDate) : '-'}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Chit Route Financials & Synchronous Tracking Status */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-500" />
                  <span>Chit Route Financials & Live Node Status</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Chit Scheme / Route
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${activeRoute.groupName} (${activeRoute.groupCode})`}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Assigned Route Ticket Number
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`Ticket #${selectedStop.stopOrder}`}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Due Installment Amount (₹)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${Number(selectedStop.expectedAmount).toLocaleString('en-IN')}`}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Assigned Route Agent
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={activeRoute.agent?.name || 'Unassigned'}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Live Status Callout in Form */}
                {selectedStop.status === 'PAID' || selectedStop.nodeColor === 'GREEN' ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {activeRoute.frequency === 'DAILY'
                          ? 'Paid for Today (Day-by-Day Installment Reconciled)'
                          : 'Paid for Month (Current Monthly Cycle Reconciled)'}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                      {selectedStop.collectionDetails ? (
                        <span>
                          Receipt: <strong>{selectedStop.collectionDetails.receiptNumber}</strong> · ₹
                          {selectedStop.collectionDetails.amount} ({selectedStop.collectionDetails.paymentMethod})
                          {selectedStop.collectionDetails.date && ` on ${formatDate(selectedStop.collectionDetails.date)}`}
                          {selectedStop.collectionDetails.time && ` at ${formatTime(selectedStop.collectionDetails.time)}`}
                        </span>
                      ) : (
                        <span>Receipt registered for active cycle</span>
                      )}
                    </div>
                    {selectedStop.notes && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Field Note: {selectedStop.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>
                        {activeRoute.frequency === 'DAILY'
                          ? 'Not Paid for Today (Awaiting Daily Installment)'
                          : 'Not Paid for Month (Awaiting Monthly Installment)'}
                      </span>
                    </div>
                    <div className="text-xs text-rose-700 dark:text-rose-300">
                      Agent Remark: <strong>{selectedStop.notes || (activeRoute.frequency === 'DAILY' ? 'Awaiting today installment' : 'Awaiting monthly installment')}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Footer Actions */}
            <div className="p-3.5 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowMemberModal(false);
                  setLoggingStatus(
                    selectedStop.status === 'PAID' || selectedStop.nodeColor === 'GREEN' ? 'PAID' : 'NOT_PAID'
                  );
                  setLogNotes(
                    selectedStop.notes && selectedStop.notes !== 'Awaiting payment' ? selectedStop.notes : ''
                  );
                  setShowLogModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Update Status / Remark</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showLogModal && selectedStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg font-heading">
                  Update Waypoint #{selectedStop.stopOrder} Status
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ticket #{selectedStop.stopOrder} · {selectedStop.memberName} ({activeRoute.groupCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogStopActivity} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Synchronous Collection State *
                </label>
                <select
                  value={loggingStatus}
                  onChange={(e) => setLoggingStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="NOT_PAID">🔴 NOT PAID (Awaiting Payment)</option>
                  <option value="PAID">🟢 PAID (Money Collected & Verified)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Agent Remark / Waypoint Note
                </label>
                <input
                  type="text"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g. Shop shutter closed, promised to pay tomorrow"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingLog ? 'Saving...' : 'Save & Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
