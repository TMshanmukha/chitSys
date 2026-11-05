import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Coins,
  TrendingUp,
  AlertCircle,
  Users,
  Search,
  RefreshCw,
  Printer,
} from 'lucide-react';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/interestUtils';

export default function FinLendReportsPage() {

  const [activeReport, setActiveReport] = useState('COLLECTIONS'); // 'COLLECTIONS' | 'PENDING' | 'SUMMARY'
  const [dateRange, setDateRange] = useState('THIS_MONTH'); // 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');

  const [collectionsData, setCollectionsData] = useState([]);
  const [loansData, setLoansData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReportData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [colRes, loansRes] = await Promise.allSettled([
        api.get('/interest/reports/collections'),
        api.get('/interest/loans'),
      ]);

      if (colRes.status === 'fulfilled' && colRes.value.data?.success) {
        setCollectionsData(colRes.value.data.data?.collections || []);
      }
      if (loansRes.status === 'fulfilled' && loansRes.value.data?.success) {
        setLoansData(loansRes.value.data.data?.loans || loansRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load reports data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Filter collections by dateRange & search
  const filteredCollections = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return collectionsData.filter((c) => {
      const cDate = (c.collection_date || '').slice(0, 10);

      // Date Range Filter
      if (dateRange === 'TODAY' && cDate !== todayStr) return false;
      if (dateRange === 'THIS_WEEK') {
        const d = new Date(cDate);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diffDays > 7 || diffDays < 0) return false;
      }
      if (dateRange === 'THIS_MONTH') {
        const thisMonthStr = now.toISOString().slice(0, 7);
        if (!cDate.startsWith(thisMonthStr)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          c.customer_name?.toLowerCase().includes(q) ||
          c.customer_phone?.includes(q) ||
          c.receipt_number?.toLowerCase().includes(q) ||
          c.loan_account_number?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [collectionsData, dateRange, searchQuery]);

  // Aggregate Metrics
  const totalCollectionsAmount = useMemo(() => {
    return filteredCollections.reduce((sum, c) => sum + Number(c.amount_collected || 0), 0);
  }, [filteredCollections]);

  const totalPrincipalOut = useMemo(() => {
    return loansData.reduce((sum, l) => sum + Number(l.principal_outstanding || 0), 0);
  }, [loansData]);

  const totalInterestEarned = useMemo(() => {
    return loansData.reduce((sum, l) => sum + Number(l.total_interest_paid || 0), 0);
  }, [loansData]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredCollections.length === 0) return;

    const headers = ['Receipt #', 'Date', 'Customer', 'Phone', 'Loan Account', 'Amount Collected', 'Payment Method', 'Collected By'];
    const rows = filteredCollections.map((c) => [
      c.receipt_number,
      c.collection_date,
      `"${c.customer_name || ''}"`,
      c.customer_phone || '',
      c.loan_account_number,
      c.amount_collected,
      c.payment_method,
      `"${c.agent_name || 'Admin'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinLend_Collections_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Operational collections & financial statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadReportData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Collected */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            <span>Collections in Range</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-heading">
            {formatCurrency(totalCollectionsAmount)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {filteredCollections.length} receipts issued
          </div>
        </div>

        {/* Principal Outstanding */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span>Total Given Out</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-heading">
            {formatCurrency(totalPrincipalOut)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Active portfolio outstanding
          </div>
        </div>

        {/* Total Interest Earned */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs">
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4" />
            <span>Interest Earned</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-heading">
            {formatCurrency(totalInterestEarned)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cumulative net interest received
          </div>
        </div>
      </div>

      {/* Date Range Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setDateRange('TODAY')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            dateRange === 'TODAY'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setDateRange('THIS_WEEK')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            dateRange === 'THIS_WEEK'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          This Week
        </button>
        <button
          type="button"
          onClick={() => setDateRange('THIS_MONTH')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            dateRange === 'THIS_MONTH'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => setDateRange('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            dateRange === 'ALL'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter statement by customer name, receipt #, phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Statements Table / Card List */}
      <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
        {filteredCollections.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No collection records matching selected range.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredCollections.map((c) => (
              <div
                key={c.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
                      {c.customer_name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {c.receipt_number}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                      {c.payment_method}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatDate(c.collection_date)} • Loan: <span className="font-mono">{c.loan_account_number}</span> • Agent: {c.agent_name || 'Admin'}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-heading">
                    +{formatCurrency(c.amount_collected)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Principal: {formatCurrency(c.principal_component || 0)} • Interest: {formatCurrency(c.interest_component || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

