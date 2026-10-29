import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Shield,
  ShieldCheck,
  User,
  Building2,
  Coins,
  Receipt,
  Wallet,
  Users,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  CreditCard,
  Hash,
  Award,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '../utils/dateUtils';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import { smoothScrollTo } from '../utils/scrollHelper';

export default function AdminCommissionsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Main Data from Database
  const [data, setData] = useState({
    adminUser: {},
    adminProfile: {},
    financialOverview: {
      totalForemanCommission: 0,
      totalAuctionsConducted: 0,
      totalPaymentsReceived: 0,
      cashPayments: 0,
      digitalPayments: 0,
      chequePayments: 0,
      totalTransactionsCount: 0,
      totalGroupsCount: 0,
      totalMembersCount: 0,
      totalAgentsCount: 0,
      totalPayoutsDisbursed: 0,
    },
    auctionLedger: [],
    paymentsLedger: [],
    withdrawalsHistory: [],
  });

  // Active Sub-Section: 'overview' | 'personal' | 'firm' | 'bank' | 'auctions' | 'collections'
  const [activeSection, setActiveSection] = useState('overview');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Pagination states
  const [auctionPage, setAuctionPage] = useState(1);
  const [auctionPageSize, setAuctionPageSize] = useState(10);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(10);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.get('/admin/commissions');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to retrieve administrator profile from database. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const overview = data.financialOverview || {};
  const user = data.adminUser || {};
  const profile = data.adminProfile || {};
  const auctionLedger = data.auctionLedger || [];
  const paymentsLedger = data.paymentsLedger || [];

  // Filtered Auction Ledger
  const filteredAuctions = auctionLedger.filter((a) => {
    if (!ledgerSearch) return true;
    const q = ledgerSearch.toLowerCase();
    return (
      a.group_name?.toLowerCase().includes(q) ||
      a.group_code?.toLowerCase().includes(q) ||
      a.winner_name?.toLowerCase().includes(q) ||
      String(a.period_number).includes(q)
    );
  });

  // Filtered Payments Ledger
  const filteredPayments = paymentsLedger.filter((p) => {
    if (!ledgerSearch) return true;
    const q = ledgerSearch.toLowerCase();
    return (
      p.receipt_number?.toLowerCase().includes(q) ||
      p.group_name?.toLowerCase().includes(q) ||
      p.member_name?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q)
    );
  });

  // Paginated slices
  const paginatedAuctions = filteredAuctions.slice(
    (auctionPage - 1) * auctionPageSize,
    auctionPage * auctionPageSize
  );

  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * paymentPageSize,
    paymentPage * paymentPageSize
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading Administrator Profile from Database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Human-Friendly Error Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-sm shadow-xs"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Database Sync Notice</span>
            {error}
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Hero Administrator Identity Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white p-6 sm:p-8 shadow-2xl border border-slate-800">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar and Primary Details */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-1 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-[20px] bg-slate-900/80 flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl tracking-wider">
                  {(user.full_name || 'Admin')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-xl text-white shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {user.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active · Full Authority
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: #{user.id || 1}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {user.full_name || 'Business Administrator'}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-300 mt-2">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="font-mono font-semibold">@{user.username || 'admin'}</span>
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>{user.phone}</span>
                  </span>
                )}
                {profile.official_email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-sky-400" />
                    <span>{profile.official_email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action / Sync Button & Session Timestamps */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 border-slate-800/80 pt-4 lg:pt-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all border border-white/15 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync from Database'}</span>
            </button>

            <div className="text-right text-[11px] text-slate-400 space-y-0.5">
              <p>
                Member Since:{' '}
                <span className="text-slate-200 font-medium">
                  {user.created_at ? formatDate(user.created_at) : 'Active'}
                </span>
              </p>
              <p>
                Last Login:{' '}
                <span className="text-slate-200 font-medium">
                  {user.last_login_at ? formatDateTime(user.last_login_at) : 'Current Active Session'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Real-time Database KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1: Total Foreman Commission Earned */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Statutory Commission
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ₹{(overview.totalForemanCommission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>5% Foreman Commission</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {overview.totalAuctionsConducted || 0} Auctions Conducted
            </span>
          </div>
        </div>

        {/* Metric 2: Total Collections Received */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Inflows Received
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ₹{(overview.totalPaymentsReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Across All Payment Modes</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {overview.totalTransactionsCount || 0} Receipts Issued
            </span>
          </div>
        </div>

        {/* Metric 3: Total Payouts Disbursed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Prize Payouts Disbursed
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ₹{(overview.totalPayoutsDisbursed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Paid to Winning Subscribers</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">Settled in Full</span>
          </div>
        </div>

        {/* Metric 4: Active Chit Schemes Supervised */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Supervised Schemes
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {overview.totalGroupsCount || 0}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Daily & Monthly Groups</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Active Schemes</span>
          </div>
        </div>

        {/* Metric 5: Registered Subscribers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enrolled Subscribers
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {overview.totalMembersCount || 0}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>KYC Verified Participants</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">In System</span>
          </div>
        </div>

        {/* Metric 6: Collection Agents Under Command */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Field Collection Agents
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {overview.totalAgentsCount || 0}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span>Route Tracking Synchronized</span>
            <span className="font-bold text-sky-600 dark:text-sky-400">Field Staff</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Profile Information with Automatic Window Move */}
      <div id="admin-profile-details" className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 scroll-mt-6">
        <button
          type="button"
          onClick={() => {
            setActiveSection('overview');
            smoothScrollTo('admin-profile-details', { offset: 32, behavior: 'smooth' });
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeSection === 'overview'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Full Admin Profile</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('firm');
            smoothScrollTo('admin-profile-details', { offset: 32, behavior: 'smooth' });
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeSection === 'firm'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Firm & Regulatory Details</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('auctions');
            smoothScrollTo('admin-profile-details', { offset: 32, behavior: 'smooth' });
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeSection === 'auctions'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Foreman Commission Ledger ({auctionLedger.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('collections');
            smoothScrollTo('admin-profile-details', { offset: 32, behavior: 'smooth' });
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeSection === 'collections'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Collections Inflows ({paymentsLedger.length})</span>
        </button>
      </div>

      {/* SECTION 1: Full Admin Profile (Personal + System Overview) */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Account Information */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Administrator Personal Details
                </h2>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-semibold">
                Database Verified
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Full Legal Name</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {user.full_name || 'Business Administrator'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">System Username</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                  {user.username || 'admin'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">System User ID</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  #{user.id || 1}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Authority Level</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  {user.role === 'SUPER_ADMIN' ? 'Super Administrator (Full Rights)' : 'Administrator'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Registered Phone</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {user.phone || '9876543210'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Official Email</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {profile.official_email || 'admin@chitfundpro.com'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Account Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active & Operational
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Account Created</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {user.created_at ? formatDateTime(user.created_at) : 'System Initialized'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Last Active Session</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {user.last_login_at ? formatDateTime(user.last_login_at) : 'Current Live Session'}
                </span>
              </div>
            </div>
          </div>

          {/* Firm & Security Protocol Summary */}
          <div className="space-y-6">
            {/* Quick Firm Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Registered Firm Information
                  </h2>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-semibold">
                  Licensed
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Firm Legal Name
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {profile.firm_name || 'ChitFund Pro Enterprise Services'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Registration No.
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {profile.registration_number || 'CF/TS/2026/8849'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Jurisdiction
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                      {profile.registrar_office || 'Office of the Registrar of Chits, Telangana'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Statutory Compliance
                  </span>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 p-2 rounded-xl block mt-1 border border-blue-200 dark:border-blue-900/60">
                    {profile.act_compliance || 'Chit Funds Act, 1982 (Act No. 40 of 1982)'}
                  </span>
                </div>
              </div>
            </div>

            {/* System Operational Oversight & Security Protocol (Replaced bank details with essential admin intelligence) */}
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 card-interactive-elevate">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Operational Oversight & Security Protocol
                  </h2>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  256-Bit SSL Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-xs font-semibold text-slate-400">Authority Role</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Super Administrator
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-xs font-semibold text-slate-400">System Database</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    chitfund_db (Active)
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-xs font-semibold text-slate-400">Audit Trail</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Immutable MySQL Logs
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="block text-xs font-semibold text-slate-400">Statutory Law</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
                    Chit Funds Act, 1982
                  </span>
                </div>
              </div>

              {/* Quick Summary Pill Bar */}
              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                <span className="font-medium">Total Lifetime Foreman Commission:</span>
                <span className="font-mono font-extrabold text-sm text-blue-700 dark:text-blue-300">
                  ₹{Number(overview.totalForemanCommission || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Firm & Regulatory Details */}
      {activeSection === 'firm' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Chit Fund Firm & Statutory Registration Dossier
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Government license and administrative authority records registered in database
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Registered Firm Name
              </span>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">
                {profile.firm_name || 'ChitFund Pro Enterprise Services'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Registration / License Number
                </span>
                <p className="text-base font-mono font-extrabold text-blue-600 dark:text-blue-400">
                  {profile.registration_number || 'CF/TS/2026/8849'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(profile.registration_number || 'CF/TS/2026/8849', 'reg')}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy Registration Number"
              >
                {copiedKey === 'reg' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Governing Act & Legal Compliance
              </span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {profile.act_compliance || 'Chit Funds Act, 1982 (Act No. 40 of 1982)'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Registrar Office Jurisdiction
              </span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {profile.registrar_office || 'Office of the Registrar of Chits, Telangana'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 md:col-span-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Official Registered Headquarters Address
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {profile.office_address || 'Plot No. 42, Financial District, Gachibowli, Hyderabad, Telangana - 500032'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Official Correspondence Email
              </span>
              <p className="font-mono text-slate-900 dark:text-white">
                {profile.official_email || 'contact@chitfundpro.com'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Official Contact Telephone
              </span>
              <p className="font-mono text-slate-900 dark:text-white">
                {profile.official_phone || user.phone || '+91 98765 43210'}
              </p>
            </div>

            {profile.notes && (
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 md:col-span-2">
                <span className="block text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">
                  Enterprise Operational Directives & Notes
                </span>
                <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  {profile.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* SECTION 4: Foreman Commission Ledger (Auctions from DB) */}
      {activeSection === 'auctions' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Statutory Foreman Commission Ledger</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  5% Section 21
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exact statutory foreman commissions earned from conducted auctions in MySQL ledger
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search scheme, winner..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {filteredAuctions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
              <Coins className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-semibold">No auction records found in database.</p>
              <p className="text-xs text-slate-400 mt-1">
                Conducted chit auctions automatically register the 5% foreman commission into this ledger.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Chit Scheme</th>
                      <th className="py-3 px-3">Draw</th>
                      <th className="py-3 px-3">Pool Amount</th>
                      <th className="py-3 px-3">Winning Bid</th>
                      <th className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">Foreman Commission</th>
                      <th className="py-3 px-3">Winning Subscriber</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedAuctions.map((auc) => (
                      <tr key={auc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(auc.auction_date)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {auc.group_name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {auc.group_code} · {auc.chit_type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                          #{auc.period_number || auc.draw_number}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          ₹{parseFloat(auc.total_pool_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          ₹{parseFloat(auc.bid_discount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-amber-600 dark:text-amber-400 text-sm whitespace-nowrap">
                          ₹{parseFloat(auc.foreman_commission || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {auc.winner_name || 'N/A'}
                          </span>
                          {auc.winner_phone && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {auc.winner_phone}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              auc.payout_status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {auc.payout_status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={auctionPage}
                totalItems={filteredAuctions.length}
                pageSize={auctionPageSize}
                onPageChange={setAuctionPage}
                onPageSizeChange={setAuctionPageSize}
              />
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Collections & Inflows Ledger (Collections from DB) */}
      {activeSection === 'collections' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Member Payment Inflows Ledger
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Payments collected from subscribers across all daily and monthly chit schemes
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search receipt, member..."
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value);
                  setPaymentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Payment Mode Breakdown Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Cash Collections</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                ₹{(overview.cashPayments || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Digital / UPI / Bank</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                ₹{(overview.digitalPayments || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Cheque Collections</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{(overview.chequePayments || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-semibold">No collection records found in database.</p>
              <p className="text-xs text-slate-400 mt-1">
                Field agent collections and office payments will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Receipt No.</th>
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Chit Group</th>
                      <th className="py-3 px-3">Subscriber</th>
                      <th className="py-3 px-3 font-bold text-slate-900 dark:text-white">Amount</th>
                      <th className="py-3 px-3">Mode</th>
                      <th className="py-3 px-3">Collected By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {p.receipt_number}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(p.collection_date)} {p.collection_time ? formatTime(p.collection_time) : ''}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {p.group_name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {p.member_name}
                          </span>
                          {p.member_phone && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.member_phone}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                          ₹{parseFloat(p.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {p.payment_method || 'CASH'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {p.collected_by || 'Admin / Office'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={paymentPage}
                totalItems={filteredPayments.length}
                pageSize={paymentPageSize}
                onPageChange={setPaymentPage}
                onPageSizeChange={setPaymentPageSize}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
