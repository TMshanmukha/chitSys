import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  FileBarChart2,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  Loader2,
  Coins,
  TrendingUp,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import ExportCsvModal from '../../components/ExportCsvModal';

export default function InterestReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (paymentMethod && paymentMethod !== 'ALL') params.append('payment_method', paymentMethod);

      const res = await api.get(`/interest/reports/collections?${params.toString()}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError('Failed to fetch financial reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, paymentMethod]);

  const summary = data?.summary || {};
  const rows = data?.collections || [];

  const handleExportCSV = (customFileName) => {
    if (!rows || rows.length === 0) return;
    const headers = [
      'Receipt #',
      'Date',
      'Borrower',
      'Loan Account',
      'Scheme',
      'Principal Component (Rs)',
      'Interest Component (Rs)',
      'Total Collected (Rs)',
      'Payment Method',
      'Collected By',
    ];
    const exportRows = rows.map((r) => [
      r.receipt_number,
      formatDate(r.collection_date),
      `"${r.customer_name || ''}"`,
      r.loan_account_number,
      `"${r.scheme_name || ''}"`,
      r.principal_component,
      r.interest_component,
      r.amount_collected,
      r.payment_method,
      `"${r.agent_name || 'Admin'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...exportRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = customFileName || `FinLend_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn font-sans pb-10">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-heading">
              Financial Audit
            </span>
            <span className="text-xs text-slate-400">· Comprehensive Ledger Statements</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-heading mt-1">
            Financial Reports & Audit Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit principal recovery, net interest income realized, cash flow & agent collection statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs font-heading"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer shadow-2xs font-heading"
          >
            <Printer className="w-4 h-4 text-indigo-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 font-heading">From Date:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 font-heading">To Date:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 font-heading">Payment Mode:</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-heading"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / Online</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] transition-all duration-300">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading block">
            Total Collections
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-2 block tracking-tight">
            ₹{Number(summary.totalCollected || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 block font-heading">
            {summary.count || 0} Transactions
          </span>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] transition-all duration-300">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading block">
            Principal Recovered
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2 block tracking-tight">
            ₹{Number(summary.totalPrincipal || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Capital Returned to Business</span>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] transition-all duration-300">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-heading block">
            Interest Earned
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400 mt-2 block tracking-tight">
            ₹{Number(summary.totalInterest || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Net Business Yield</span>
        </div>
      </div>

      {/* Detailed Ledger Transactions Table */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="p-5 border-b border-slate-100 dark:border-white/5">
          <h2 className="font-extrabold text-slate-900 dark:text-white text-base font-heading">
            Itemized Collection Records & Ledger Breakdown
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Compiling financial report...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No collection records matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-white/[0.02] text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200/60 dark:border-white/5">
                <tr>
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Borrower</th>
                  <th className="py-3.5 px-4">Loan Account</th>
                  <th className="py-3.5 px-4">Scheme</th>
                  <th className="py-3.5 px-4">Principal Component</th>
                  <th className="py-3.5 px-4">Interest Component</th>
                  <th className="py-3.5 px-4">Total Collected</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Collected By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/30 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.receipt_number}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">{formatDate(r.collection_date)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-heading">{r.customer_name}</td>
                    <td className="py-3.5 px-4 font-mono">{r.loan_account_number}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{r.scheme_name}</td>
                    <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">₹{Number(r.principal_component).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-mono text-purple-600 font-bold">₹{Number(r.interest_component).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white">₹{Number(r.amount_collected).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 font-mono">
                        {r.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-heading">{r.agent_name || 'Admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom File Name Export Modal */}
      <ExportCsvModal
        isOpen={isExportModalOpen}
        defaultFileName={`FinLend_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`}
        title="Export Financial Ledger Report"
        description="Enter a custom file name before downloading your CSV report."
        onClose={() => setIsExportModalOpen(false)}
        onExport={(fileName) => handleExportCSV(fileName)}
      />
    </div>
  );
}

