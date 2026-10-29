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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatTime } from '../utils/dateUtils';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Pagination states for dashboard overview tables
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsPageSize, setGroupsPageSize] = useState(5);
  const [recentCollPage, setRecentCollPage] = useState(1);
  const [recentCollPageSize, setRecentCollPageSize] = useState(5);

  const fetchDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await api.get('/admin/overview');
      if (res.data?.success) {
        setData(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false);
  }, []);

  const totalGroups = data?.totalGroups || 0;
  const dailyChitGroups = data?.dailyChitGroups || 0;
  const auctionChitGroups = data?.auctionChitGroups || 0;
  const doubleChitGroups = data?.doubleChitGroups || 0;
  const totalMembers = data?.totalMembers || 0;
  const totalAgents = data?.totalAgents || 0;
  const todayCash = parseFloat(data?.todayCash || 0);
  const todayOnline = parseFloat(data?.todayOnline || 0);
  const todayTotal = parseFloat(data?.todayTotal || 0);
  const expectedTarget = parseFloat(data?.expectedDailyTarget || 0);
  const progressPercent = expectedTarget > 0 ? Math.min(Math.round((todayTotal / expectedTarget) * 100), 100) : 0;
  const dailyOverview = data?.dailyOverview || {
    target: expectedTarget,
    cash: todayCash,
    online: todayOnline,
    total: todayTotal,
    progressPercent,
  };
  const monthlyOverview = data?.monthlyOverview || {
    target: parseFloat(data?.expectedMonthlyTarget || 0),
    cash: 0,
    online: 0,
    total: 0,
    progressPercent: 0,
  };
  const totalAuctionsCount = data?.totalAuctionsCount || 0;
  const totalDividendsGenerated = parseFloat(data?.totalDividendsGenerated || 0);
  const totalPrizeMoneyDisbursed = parseFloat(data?.totalPrizeMoneyDisbursed || 0);
  const recentCollections = data?.recentCollections || [];
  const groupsList = data?.groupsList || [];
  const agentsSummary = data?.agentsSummary || [];

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
              ChitFund Management System
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
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time management of Daily Routes, Monthly Auction Chits, Double Chits & Live Agent Tracking.
          </p>
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
            <span>2D Route Tracking</span>
          </Link>
          <Link
            to="/admin/auctions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            <Gavel className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Auctions & Double Chit</span>
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

      {/* Chit Schemes Categorization Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Daily Chit Route Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-white dark:from-blue-950/20 dark:to-slate-900 border border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
              Daily Chit Route
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {loading ? '...' : dailyChitGroups}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Door-to-door routes</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Fixed daily collections with sequential route stops & agent tracking
          </p>
        </div>

        {/* Monthly Auction Chit Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50/70 to-white dark:from-purple-950/20 dark:to-slate-900 border border-purple-100 dark:border-purple-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
              Monthly Auction Chit
            </span>
            <Gavel className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {loading ? '...' : auctionChitGroups}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Reverse auction</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Monthly bidding, 5% foreman commission & dividend installment deduction
          </p>
        </div>

        {/* Monthly Double Chit Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
              Monthly Double Chit
            </span>
            <Split className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {loading ? '...' : doubleChitGroups}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Dual draw slots</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Two prize draws per cycle, dual payouts & double dividend calculations
          </p>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Chit Groups */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Schemes
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : totalGroups}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              All Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configured chit schemes</p>
        </div>

        {/* Metric 2: Members Enrolled */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Registered Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : totalMembers}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Passbooks ready</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Direct private subscribers</p>
        </div>

        {/* Metric 3: Collection Agents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Route Agents
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading ? '...' : totalAgents}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Admin Created</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Assigned to daily routes</p>
        </div>

        {/* Metric 4: Dividends & Prize Money */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Dividends Created
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ₹{totalDividendsGenerated.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">From {totalAuctionsCount} Auctions</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Distributed to subscribers</p>
        </div>
      </div>

      {/* Today's Collection Overview: Cash vs Online Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Collection Breakdown Card with Day-by-Day vs Month-by-Month Clarity */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Collections & Target Progress
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Daily vs Monthly Segregated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Day-by-day live installments for daily chits & month-by-month cycle collections for monthly schemes
              </p>
            </div>
            <Link
              to="/admin/collections"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Sub-cards: Daily Chits (Day-by-Day) vs Monthly Chits (Month-by-Month) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Daily Chits (Day-by-Day) */}
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span>📅 Daily Chits (Day-by-Day)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Today</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Today's Daily Target</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    ₹{dailyOverview.target.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Collected Today</span>
                  <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                    ₹{dailyOverview.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span>Daily Progress</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">{dailyOverview.progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${dailyOverview.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Monthly Chits (Month-by-Month) */}
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <span>🗓️ Monthly Chits (Month-by-Month)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Current Month</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Monthly Target</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    ₹{monthlyOverview.target.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Collected This Month</span>
                  <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                    ₹{monthlyOverview.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span>Monthly Cycle Progress</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{monthlyOverview.progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${monthlyOverview.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Today's Combined Cash vs Online Reconciled */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium mb-0.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Today's Cash Handover</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                ₹{todayCash.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-slate-400">Handover pending</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium mb-0.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Today's Digital UPI</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                ₹{todayOnline.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Direct bank credit</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Today's Total Receipts</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                ₹{todayTotal.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400">{data?.todayCount || 0} collections today</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Links */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Quick Operations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Key operational management portals
            </p>
          </div>

          <div className="space-y-2">
            <Link
              to="/admin/chit-groups"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Chit Groups & Routes</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/agents"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Create & Assign Agents</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/members"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Enroll Participants</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/admin/collections"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Record New Collection</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2D Route Tracking & ChitBase Operations Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: 2D Route Tracking Live Map Preview */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  2D Route & Agent Tracking
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sequential shop waypoints, live agent trajectory & collection status
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live 2D Diagram
            </span>
          </div>

          {/* Stylized Mini 2D Route Canvas Graphic */}
          <div className="h-32 w-full rounded-xl bg-slate-900 dark:bg-slate-950 p-3 relative overflow-hidden flex items-center justify-center border border-slate-800">
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            {/* SVG Corridors */}
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
              {/* Waypoint 1 */}
              <circle cx="50" cy="60" r="10" fill="#10b981" />
              <text x="50" y="90" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                Stop 1 (Paid)
              </text>
              {/* Waypoint 2 */}
              <circle cx="150" cy="40" r="10" fill="#10b981" />
              <text x="150" y="24" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                Stop 2 (Paid)
              </text>
              {/* Waypoint 3 - Agent Pin */}
              <circle cx="250" cy="60" r="14" fill="#3b82f6" fillOpacity="0.3" className="animate-ping" />
              <circle cx="250" cy="60" r="10" fill="#3b82f6" />
              <text x="250" y="90" textAnchor="middle" fill="#60a5fa" fontWeight="bold" fontSize="10" fontFamily="sans-serif">
                Agent Active Pin
              </text>
              {/* Waypoint 4 */}
              <circle cx="350" cy="80" r="8" fill="#475569" />
              <text x="350" y="104" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                Stop 4 (Pending)
              </text>
              {/* Waypoint 5 */}
              <circle cx="450" cy="60" r="8" fill="#475569" />
              <text x="450" y="90" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">
                Stop 5 (Pending)
              </text>
            </svg>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Interactive 2D vector coordinate path with shop visit status
            </span>
            <Link
              to="/admin/tracking"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <span>Open 2D Visual Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Auctions & Double Chit Portal Preview */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Gavel className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Auctions & Double Chit Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ChitBase reverse auction calculator, foreman cut & dividend splits
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              ChitBase Rules
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Total Dividend Savings
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                ₹{totalDividendsGenerated.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Reduced next installment
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Prize Money Disbursed
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                ₹{totalPrizeMoneyDisbursed.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-purple-600 dark:text-purple-400">
                {totalAuctionsCount} Payout vouchers issued
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Automated 5% foreman commission calculation & voucher generation
            </span>
            <Link
              to="/admin/auctions"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs"
            >
              <span>Manage Auctions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Groups Overview Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
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
                paginatedGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400 font-mono">
                      {group.group_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {group.group_name}
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
                      <span>{group.location_name}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      ₹{parseFloat(group.installment_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {group.enrolled_members} Members
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <ShowMoreText text={group.assigned_agents || 'Unassigned'} maxChars={22} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={groupsPage}
          totalItems={groupsList.length}
          pageSize={groupsPageSize}
          onPageChange={setGroupsPage}
          onPageSizeChange={setGroupsPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Recent Collections Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
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
                paginatedCollections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {c.receipt_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {c.member_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {c.group_name} ({c.group_code})
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(c.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.payment_method === 'CASH'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {c.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {c.agent_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                      {formatDate(c.created_at)} {c.collection_time ? `· ${formatTime(c.collection_time)}` : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={recentCollPage}
          totalItems={recentCollections.length}
          pageSize={recentCollPageSize}
          onPageChange={setRecentCollPage}
          onPageSizeChange={setRecentCollPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>
    </div>
  );
}
