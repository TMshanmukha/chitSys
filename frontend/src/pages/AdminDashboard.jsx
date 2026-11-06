import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Layers,
  Users,
  UserCheck,
  Receipt,
  PlusCircle,
  MapPin,
  CheckCircle2,
  Wallet,
  Smartphone,
  ArrowRight,
  TrendingUp,
  Gavel,
  Compass,
  Coins,
  Split,
  Radio,
  Eye,
  RefreshCw,
  Clock,
  Filter,
  RotateCcw,
  Calendar,
  Sparkles,
  Target,
  AlertCircle,
  Award,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatTime, getServerDate } from '../utils/dateUtils';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import { smoothScrollTo } from '../utils/scrollHelper';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(getServerDate());

  // Pagination states for dashboard overview tables
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsPageSize, setGroupsPageSize] = useState(5);
  const [recentCollPage, setRecentCollPage] = useState(1);
  const [recentCollPageSize, setRecentCollPageSize] = useState(5);

  const [overviewFilters, setOverviewFilters] = useState({
    groupId: '',
    startDate: '',
    endDate: '',
    frequency: '',
    agentId: '',
  });

  const fetchDashboard = async (isManual = false, filters = overviewFilters) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = Object.fromEntries(Object.entries(filters).filter(([, val]) => Boolean(val)));
      const res = await api.get('/admin/overview', { params });
      if (res.data?.success) {
        setData(res.data.data);
        setLastUpdated(getServerDate());
      }
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateFilter = (key, value) => {
    const updated = { ...overviewFilters, [key]: value };
    setOverviewFilters(updated);
    setGroupsPage(1);
    setRecentCollPage(1);
    fetchDashboard(true, updated);
  };

  const setQuickFrequency = (freq) => {
    const updated = { ...overviewFilters, frequency: freq };
    setOverviewFilters(updated);
    setGroupsPage(1);
    setRecentCollPage(1);
    fetchDashboard(true, updated);
  };

  const clearAllFilters = () => {
    const reset = { groupId: '', startDate: '', endDate: '', frequency: '', agentId: '' };
    setOverviewFilters(reset);
    setGroupsPage(1);
    setRecentCollPage(1);
    fetchDashboard(true, reset);
  };

  useEffect(() => {
    fetchDashboard(false);
  }, []);

  const totalGroups = Number(data?.totalGroups) || 0;
  const dailyChitGroups = Number(data?.dailyChitGroups) || 0;
  const auctionChitGroups = Number(data?.auctionChitGroups) || 0;
  const doubleChitGroups = Number(data?.doubleChitGroups) || 0;
  const totalMembers = Number(data?.totalMembers) || 0;
  const totalAgents = Number(data?.totalAgents) || 0;
  const todayCash = parseFloat(data?.todayCash || 0) || 0;
  const todayOnline = parseFloat(data?.todayOnline || 0) || 0;
  const todayTotal = parseFloat(data?.todayTotal || 0) || 0;
  const expectedTarget = parseFloat(data?.expectedDailyTarget || 0) || 0;
  const progressPercent = expectedTarget > 0 ? Math.min(Math.round((todayTotal / expectedTarget) * 100), 100) : 0;
  const dailyOverview = {
    target: parseFloat(data?.dailyOverview?.target ?? expectedTarget) || 0,
    cash: parseFloat(data?.dailyOverview?.cash ?? todayCash) || 0,
    online: parseFloat(data?.dailyOverview?.online ?? todayOnline) || 0,
    total: parseFloat(data?.dailyOverview?.total ?? todayTotal) || 0,
    progressPercent: Number(data?.dailyOverview?.progressPercent ?? progressPercent) || 0,
  };
  const monthlyOverview = {
    target: parseFloat(data?.monthlyOverview?.target ?? data?.expectedMonthlyTarget ?? 0) || 0,
    cash: parseFloat(data?.monthlyOverview?.cash ?? 0) || 0,
    online: parseFloat(data?.monthlyOverview?.online ?? 0) || 0,
    total: parseFloat(data?.monthlyOverview?.total ?? 0) || 0,
    progressPercent: Number(data?.monthlyOverview?.progressPercent ?? 0) || 0,
  };
  const totalAuctionsCount = Number(data?.totalAuctionsCount) || 0;
  const totalDividendsGenerated = parseFloat(data?.totalDividendsGenerated || 0) || 0;
  const totalPrizeMoneyDisbursed = parseFloat(data?.totalPrizeMoneyDisbursed || 0) || 0;
  const recentCollections = Array.isArray(data?.recentCollections) ? data.recentCollections.filter(Boolean) : [];
  const groupsList = Array.isArray(data?.groupsList) ? data.groupsList.filter(Boolean) : [];
  const agentsSummary = Array.isArray(data?.agentsSummary) ? data.agentsSummary.filter(Boolean) : [];

  const paginatedGroups = groupsList.slice(
    (groupsPage - 1) * groupsPageSize,
    groupsPage * groupsPageSize
  );

  const paginatedCollections = recentCollections.slice(
    (recentCollPage - 1) * recentCollPageSize,
    recentCollPage * recentCollPageSize
  );

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              ChitFund Pro Management System
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" />
              Synced: {formatTime(lastUpdated)}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Welcome, {user?.full_name || 'Administrator'}
          </h2>
          
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/admin/tracking"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Live Tracking</span>
          </Link>
          <Link
            to="/admin/auctions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            <Gavel className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Auctions</span>
          </Link>
          <Link
            to="/admin/chit-groups"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Scheme</span>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 1: TODAY TARGET | COLLECTED (CASH / UPI) | PENDING   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Today Target */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Today Target
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {loading ? '...' : `₹${expectedTarget.toLocaleString('en-IN')}`}
            </div>
            
          </div>
        </div>

        {/* Card 2: Collected (Cash / UPI) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Collected
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {loading ? '...' : `₹${todayTotal.toLocaleString('en-IN')}`}
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold">
              <span className="text-emerald-700 dark:text-emerald-300">
                Cash: ₹{todayCash.toLocaleString('en-IN')}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-blue-700 dark:text-blue-300">
                UPI: ₹{todayOnline.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Pending
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {loading ? '...' : `₹${(data?.totalPendingAdvances > 0 ? Number(data.totalPendingAdvances) : Math.max(0, expectedTarget - todayTotal)).toLocaleString('en-IN')}`}
            </div>
            
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 2: TOTAL SCHEME | DAILY CHIT | MONTHLY CHIT          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Total Scheme */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Total Scheme
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {loading ? '...' : totalGroups}
            </div>
            
          </div>
        </div>

        {/* Card 2: Daily Chit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Daily Chit
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight">
              {loading ? '...' : dailyChitGroups}
            </div>
            
          </div>
        </div>

        {/* Card 3: Monthly Chit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Monthly Chit
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
              {loading ? '...' : auctionChitGroups}
            </div>
            
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 3: ROUTE AGENTS | REGISTERED MEMBERS                 */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {/* Card 1: Route Agents */}
        <Link
          to="/admin/agents"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-teal-300 dark:hover:border-teal-800 transition-all block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Route Agents
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {loading ? '...' : totalAgents}
            </div>
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-heading">
              <span>View Agents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          
        </Link>

        {/* Card 2: Registered Members */}
        <Link
          to="/admin/members"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all block cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Registered Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {loading ? '...' : totalMembers}
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-heading">
              <span>View Members</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          
        </Link>
      </div>

      {/* ======================================================== */}
      {/* ROW 4: TODAY AUCTION | DAILY AUCTION | MONTHLY AUCTION   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Today Auction */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Today Auction
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {loading ? '...' : (Number(data?.todayAuctionsCount) || 0)}
            </div>
            
          </div>
        </div>

        {/* Card 2: Daily Auction */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Daily Auction
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono tracking-tight">
              {loading ? '...' : (Number(data?.dailyAuctionsCount) || 0)}
            </div>
            
          </div>
        </div>

        {/* Card 3: Monthly Auction */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading">
              Monthly Auction
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 font-mono tracking-tight">
              {loading ? '...' : (Number(data?.monthlyAuctionsCount || totalAuctionsCount) || 0)}
            </div>
            
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 5: ROUTE 2D  |  QUERIES                              */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Box: Route 2D */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Route Map
                </h3>
                
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live 2D Diagram
            </span>
          </div>

          {/* Stylized Mini 2D Route Canvas Graphic */}
          <div className="h-36 w-full rounded-xl bg-slate-900 dark:bg-slate-950 p-3 relative overflow-hidden flex items-center justify-center border border-slate-800">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            <svg className="w-full h-full" viewBox="0 0 500 120">
              <path
                d="M 50 60 Q 150 20 250 60 T 450 60"
                fill="none"
                stroke="#334155"
                strokeWidth="4"
                strokeDasharray="6 6"
              />
              <path
                d="M 50 60 Q 150 20 250 60"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
              />
              <circle cx="50" cy="60" r="9" fill="#10b981" />
              <text x="50" y="86" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                Stop 1
              </text>
              <circle cx="150" cy="40" r="9" fill="#10b981" />
              <text x="150" y="24" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                Stop 2
              </text>
              <circle cx="250" cy="60" r="14" fill="#3b82f6" fillOpacity="0.3" className="animate-ping" />
              <circle cx="250" cy="60" r="9" fill="#3b82f6" />
              <text x="250" y="86" textAnchor="middle" fill="#60a5fa" fontWeight="bold" fontSize="10" fontFamily="sans-serif">
                Agent Pin
              </text>
              <circle cx="350" cy="80" r="7" fill="#475569" />
              <text x="350" y="104" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                Stop 4
              </text>
              <circle cx="450" cy="60" r="7" fill="#475569" />
              <text x="450" y="86" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                Stop 5
              </text>
            </svg>
          </div>

          <div className="flex items-center justify-between pt-1">
            
            <Link
              to="/admin/tracking"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs font-heading"
            >
              <span>Open 2D Visual Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Box: Queries (Quirys) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                  Quick Links
                </h3>
                
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-heading">
              Quick Portals
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link
              to="/admin/chit-groups"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate font-semibold">Chit Schemes</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/agents"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="truncate font-semibold">Agents</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/members"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate font-semibold">Member Passbooks</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/collections"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="truncate font-semibold">Field Collections</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/auctions"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="truncate font-semibold">Auctions & Dividends</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/reports"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate font-semibold">Pending Dues & Deficits</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Search and manage your entire ChitFund Pro ecosystem
            </span>
            <Link
              to="/admin/reports"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-heading"
            >
              <span>View Full Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Groups Overview Table with Automatic Window Move */}
      <div id="dashboard-schemes-table" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden scroll-mt-6">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Active Chit Schemes ({groupsList.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Running schemes from MySQL database
            </p>
          </div>
          <Link
            to="/admin/chit-groups"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Manage All Groups</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[380px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 shadow-xs">
              <tr>
                <th className="py-3 px-4">Scheme Code</th>
                <th className="py-3 px-4">Group Name</th>
                <th className="py-3 px-4">Chit Scheme Type</th>
                <th className="py-3 px-4">Route Track</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Installment</th>
                <th className="py-3 px-4">Enrolled Members</th>
                <th className="py-3 px-4">Assigned Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {groupsList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No active chit groups created yet. Click "New Scheme" to start your first scheme.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group) => {
                  if (!group) return null;
                  return (
                    <tr key={group.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400 font-mono">
                        {group.group_code || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {group.group_name || 'Unnamed Chit Scheme'}
                      </td>
                      <td className="py-3 px-4">
                        {group.chit_type === 'DAILY_CHIT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            Daily Chit
                          </span>
                        ) : group.chit_type === 'DOUBLE_CHIT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Double Chit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            Auction Chit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {group.route_category === 'DAILY_ROUTE' ? 'Daily Route' : 'Monthly Route'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{group.location_name || '-'}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        ₹{(parseFloat(group.installment_amount) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {group.enrolled_members || 0} Members
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        <ShowMoreText text={group.assigned_agents || 'Unassigned'} maxChars={22} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={groupsPage}
          totalItems={groupsList.length}
          pageSize={groupsPageSize}
          onPageChange={(page) => {
            setGroupsPage(page);
            smoothScrollTo('dashboard-schemes-table', { offset: 32, behavior: 'smooth' });
          }}
          onPageSizeChange={setGroupsPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Recent Collections Table with Automatic Window Move */}
      <div id="dashboard-collections-table" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden scroll-mt-6">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Recent Collections ({recentCollections.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest payment records stored in MySQL
            </p>
          </div>
          <Link
            to="/admin/collections"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>All Collections</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[380px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 shadow-xs">
              <tr>
                <th className="py-3 px-4">Receipt No.</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Chit Group</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Collector</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {recentCollections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No collection records yet today. Go to "Collections" to record payments.
                  </td>
                </tr>
              ) : (
                paginatedCollections.map((c) => {
                  if (!c) return null;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {c.receipt_number || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {c.member_name || 'Subscriber'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {c.group_name || 'Scheme'} {c.group_code ? `(${c.group_code})` : ''}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{(parseFloat(c.amount) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${c.payment_method === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                        >
                          {c.payment_method || 'CASH'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {c.agent_name || 'Admin'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {formatDate(c.created_at)} {c.collection_time ? `· ${formatTime(c.collection_time)}` : ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={recentCollPage}
          totalItems={recentCollections.length}
          pageSize={recentCollPageSize}
          onPageChange={(page) => {
            setRecentCollPage(page);
            smoothScrollTo('dashboard-collections-table', { offset: 32, behavior: 'smooth' });
          }}
          onPageSizeChange={setRecentCollPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>
    </div>
  );
}
