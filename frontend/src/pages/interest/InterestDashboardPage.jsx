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
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

export default function InterestDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/interest/dashboard');
      if (res.data?.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      setError('Unable to load interest business dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const loanStats = metrics?.loanStats || {};
  const todayCol = metrics?.todayColStats || {};
  const overdueStats = metrics?.overdueStats || {};
  const customerStats = metrics?.customerStats || {};

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-heading">
              FinLend Pro
            </span>
            <span className="text-xs text-slate-400">· Isolated Business Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-heading mt-1">
            Interest & Lending Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time portfolio management, active loan recovery & financial yields.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/interest/admin/loans?action=new"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all font-heading"
          >
            <Plus className="w-4 h-4" />
            <span>Disburse Loan</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Principal Outstanding */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="font-heading">Active Principal Outstanding</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              ₹{Number(loanStats.total_principal_outstanding || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold block mt-1">
              Across {loanStats.active_loans || 0} active loan accounts
            </span>
          </div>
        </div>

        {/* Card 2: Interest Collected */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="font-heading">Total Interest Income</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              ₹{Number(loanStats.total_interest_collected || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
              Net interest realized to date
            </span>
          </div>
        </div>

        {/* Card 3: Today's Collection */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="font-heading">Today's Collections</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
              ₹{Number(todayCol.today_collected || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
              Cash: ₹{Number(todayCol.today_cash || 0).toLocaleString('en-IN')} · Digital: ₹{Number(todayCol.today_digital || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Card 4: Overdue Accounts */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span className="font-heading">Overdue Recovery Due</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              ₹{Number(overdueStats.total_overdue_amount || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-rose-600/90 dark:text-rose-400/90 font-semibold block mt-1">
              {overdueStats.overdue_accounts_count || 0} overdue accounts pending
            </span>
          </div>
        </div>
      </div>

      {/* Quick Access Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/interest/admin/schemes"
          className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
              <Percent className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-heading mt-4">
            Scheme Builder
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure Flat rate, Reducing EMI, Daily balance, and Bullet interest products.
          </p>
        </Link>

        <Link
          to="/interest/admin/customers"
          className="p-5 rounded-3xl bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent border border-blue-200 dark:border-blue-900/60 hover:border-blue-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30">
              <Users className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-heading mt-4">
            Customer KYC & Ledgers
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage {customerStats.total_customers || 0} borrower profiles, nominees, guarantors & universal ledgers.
          </p>
        </Link>

        <Link
          to="/interest/admin/collections"
          className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/30">
              <Receipt className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-heading mt-4">
            Collections Center
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Record payments, review agent handovers, generate WhatsApp receipts & verify cash.
          </p>
        </Link>
      </div>

      {/* Recent Collections Stream */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-heading">
              Recent Loan Collections
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live audit stream of recent receipts recorded across all schemes
            </p>
          </div>
          <Link
            to="/interest/admin/collections"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline font-heading"
          >
            View All Collections →
          </Link>
        </div>

        {metrics?.recentCollections?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No collections recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Customer & Account</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Allocation (P / I)</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {metrics?.recentCollections?.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {col.receipt_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{col.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{col.loan_account_number}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {formatDate(col.collection_date)}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ₹{Number(col.amount_collected).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-mono">P: ₹{Number(col.principal_component).toLocaleString('en-IN')}</span> · <span className="font-mono text-indigo-600 dark:text-indigo-400">I: ₹{Number(col.interest_component).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {col.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {col.agent_name || 'Admin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

