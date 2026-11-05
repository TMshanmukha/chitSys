import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Coins,
  Percent,
  TrendingUp,
  AlertCircle,
  Receipt,
  Users,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Landmark,
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  Filter,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Search,
  Wallet,
  Smartphone,
  Layers,
} from 'lucide-react';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

export default function InterestDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filter & Search states
  const [selectedMethod, setSelectedMethod] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('loans'); // 'loans' | 'collections'

  const fetchDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');
      const res = await api.get('/interest/dashboard');
      if (res.data?.success) {
        setMetrics(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError('Unable to load interest business dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false);
  }, []);

  const loanStats = metrics?.loanStats || {};
  const todayCol = metrics?.todayColStats || {};
  const overdueStats = metrics?.overdueStats || {};
  const customerStats = metrics?.customerStats || {};
  const recentCollections = Array.isArray(metrics?.recentCollections) ? metrics.recentCollections : [];
  const activeLoans = Array.isArray(metrics?.activeLoans) ? metrics.activeLoans : [];

  // Filter calculations
  const totalPrincipalOutstanding = Number(loanStats.total_principal_outstanding || 0);
  const totalInterestCollected = Number(loanStats.total_interest_collected || 0);
  const totalTodayCollected = Number(todayCol.today_collected || 0);
  const totalTodayCash = Number(todayCol.today_cash || 0);
  const totalTodayDigital = Number(todayCol.today_digital || 0);
  const totalOverdue = Number(overdueStats.total_overdue_amount || 0);
  const overdueCount = Number(overdueStats.overdue_accounts_count || 0);
  const activeLoansCount = Number(loanStats.active_loans || 0);

  // Digital vs Cash percentages
  const cashPercent = totalTodayCollected > 0 ? Math.round((totalTodayCash / totalTodayCollected) * 100) : 0;
  const digitalPercent = totalTodayCollected > 0 ? Math.round((totalTodayDigital / totalTodayCollected) * 100) : 0;

  // Filter active loans by method & search
  const filteredLoans = activeLoans.filter((loan) => {
    const matchMethod = !selectedMethod || loan.calculation_method === selectedMethod;
    const matchSearch =
      !searchQuery ||
      loan.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.loan_account_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.scheme_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMethod && matchSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn font-sans pb-10">
      {/* 1. Top Executive Welcome Banner (Frosted Glass with Soft Glow) */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-heading">
              FinLend Pro
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              Synced: {formatTime(lastUpdated)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-heading mt-1">
            Welcome, {user?.full_name || 'Administrator'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time management of Loan Schemes, Amortization Schedules, Borrower Ledgers & Recovery.
          </p>
        </div>

        {/* Quick Action Buttons with 3D Hover Lift */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs font-heading"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/interest/admin/schemes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(99,102,241,0.25)] font-heading"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Scheme Builder</span>
          </Link>

          <Link
            to="/interest/admin/customers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 transition-all hover:-translate-y-0.5 font-heading"
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Borrowers ({customerStats.total_customers || 0})</span>
          </Link>

          <Link
            to="/interest/admin/loans?action=new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(99,102,241,0.35)] font-heading"
          >
            <Plus className="w-4 h-4" />
            <span>Disburse Loan</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 2. Rich 4-KPI Metric Cards Grid (With 3D Hover Lift & Colored Glow Shadows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Principal Outstanding */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-6px_rgba(99,102,241,0.3)] transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold font-heading">
            <span>Principal Outstanding</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight block">
              ₹{totalPrincipalOutstanding.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold font-heading">
              <span>{activeLoansCount} Active Accounts</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] text-slate-400 font-normal">Active Lending</span>
            </div>
          </div>
        </div>

        {/* Card 2: Interest Collected */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.3)] transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold font-heading">
            <span>Interest Income Realized</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight block">
              ₹{totalInterestCollected.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold font-heading">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Net Profit Yield Realized</span>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Collection */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-6px_rgba(14,165,233,0.3)] transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold font-heading">
            <span>Today's Recovery</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight block">
              ₹{totalTodayCollected.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Cash: ₹{totalTodayCash.toLocaleString('en-IN')}</span>
              <span>·</span>
              <span>UPI: ₹{totalTodayDigital.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Overdue Recovery */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.3)] transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold font-heading">
            <span>At-Risk / Overdue</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight block">
              ₹{totalOverdue.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-rose-600/90 dark:text-rose-400/90 font-bold block mt-1 font-heading">
              {overdueCount} Accounts Overdue
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Multi-Factor Filter & Portfolio Scheme Chips */}
      <section className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-heading">
                Interactive Portfolio Scheme Filters
              </h2>
              <p className="text-[11px] text-slate-500">
                Filter loan accounts and performance by financial calculation method in real time.
              </p>
            </div>
          </div>

          {selectedMethod || searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSelectedMethod('');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-heading"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Viewing All Portfolios</span>
          )}
        </div>

        {/* Quick Filter Scheme Calculation Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-heading">
            Scheme Models:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMethod('')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading ${
              !selectedMethod
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Methods ({activeLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('FLAT')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 font-heading ${
              selectedMethod === 'FLAT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Flat Interest
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('REDUCING_BALANCE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 font-heading ${
              selectedMethod === 'REDUCING_BALANCE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Reducing Balance EMI
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('INTEREST_ONLY')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 font-heading ${
              selectedMethod === 'INTEREST_ONLY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Interest-Only Bullet
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('DAILY_BALANCE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 font-heading ${
              selectedMethod === 'DAILY_BALANCE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Daily Balance
          </button>
        </div>

        {/* Live Search Bar */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search borrower name, loan account number, or scheme..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </section>

      {/* 4. Today's Recovery Progress Split Meter */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-heading">
              Today's Recovery Channels Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live settlement split between Cash Handover and Direct Digital / UPI Collections
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold font-mono">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-3.5 h-3.5" /> Cash: {cashPercent}% (₹{totalTodayCash.toLocaleString('en-IN')})
            </span>
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-3.5 h-3.5" /> UPI/Online: {digitalPercent}% (₹{totalTodayDigital.toLocaleString('en-IN')})
            </span>
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${cashPercent}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Cash: ${cashPercent}%`}
          />
          <div
            style={{ width: `${digitalPercent}%` }}
            className="bg-indigo-500 transition-all duration-500"
            title={`UPI/Online: ${digitalPercent}%`}
          />
        </div>
      </div>

      {/* 5. Dual Tabbed Showcase: Active Portfolios & Live Collections Stream */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-2xl border border-slate-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('loans')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading ${
                activeTab === 'loans'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active Loan Portfolios ({filteredLoans.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('collections')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading ${
                activeTab === 'collections'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Live Collections Stream ({recentCollections.length})
            </button>
          </div>

          <Link
            to={activeTab === 'loans' ? '/interest/admin/loans' : '/interest/admin/collections'}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-heading"
          >
            <span>{activeTab === 'loans' ? 'Manage All Loan Accounts' : 'Open Collections Center'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tab 1: Active Loan Portfolios Table */}
        {activeTab === 'loans' && (
          <div>
            {filteredLoans.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-2">
                <Coins className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No active loan accounts match your filters.</p>
                <Link
                  to="/interest/admin/loans?action=new"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline pt-2 font-heading"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Disburse a new loan now</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-white/[0.02] text-slate-500 uppercase font-bold text-[10px] tracking-wider border-y border-slate-200/60 dark:border-white/5">
                    <tr>
                      <th className="py-3 px-4">Borrower & Account</th>
                      <th className="py-3 px-4">Scheme Model</th>
                      <th className="py-3 px-4">Disbursed Principal</th>
                      <th className="py-3 px-4">Outstanding Balance</th>
                      <th className="py-3 px-4">Current Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                    {filteredLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-indigo-50/30 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {loan.customer_name ? loan.customer_name[0].toUpperCase() : 'B'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white font-heading">
                                {loan.customer_name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {loan.loan_account_number}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            {loan.scheme_name}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {loan.calculation_method}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          ₹{Number(loan.principal_amount).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          ₹{Number(loan.principal_balance || loan.outstanding_principal || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black text-rose-600 dark:text-rose-400">
                          ₹{Number(loan.current_due_amount || loan.installment_amount || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              loan.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {loan.status || 'ACTIVE'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/interest/admin/collections?loanId=${loan.id}&action=collect`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:-translate-y-0.5 transition-all font-heading"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Collections Stream */}
        {activeTab === 'collections' && (
          <div>
            {recentCollections.length === 0 ? (
              <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No collections recorded yet today.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-white/[0.02] text-slate-500 uppercase font-bold text-[10px] tracking-wider border-y border-slate-200/60 dark:border-white/5">
                    <tr>
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Borrower & Loan Account</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Amount Credited</th>
                      <th className="py-3 px-4">Allocation (Principal / Interest)</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Collector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                    {recentCollections.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {col.receipt_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white font-heading">
                            {col.customer_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {col.loan_account_number}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                          {formatDate(col.collection_date)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Number(col.amount_collected).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-[11px]">
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            P: ₹{Number(col.principal_component).toLocaleString('en-IN')}
                          </span>
                          {' · '}
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            I: ₹{Number(col.interest_component).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 font-mono">
                            {col.payment_method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-heading">
                          {col.agent_name || 'Admin'}
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
}
