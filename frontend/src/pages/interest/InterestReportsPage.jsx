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

export default function InterestReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-heading">
            Financial Reports & Audit Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit principal recovery, net interest income realized, cash flow & agent collection statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs font-heading"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">From Date:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">To Date:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Payment Mode:</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase font-heading block">Total Collections</span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
            ₹{Number(summary.totalCollected || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">{summary.count || 0} Transactions</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase font-heading block">Principal Recovered</span>
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            ₹{Number(summary.totalPrincipal || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">Capital Returned to Business</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase font-heading block">Interest Earned</span>
          <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1 block">
            ₹{Number(summary.totalInterest || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">Net Business Yield</span>
        </div>
      </div>

      {/* Detailed Ledger Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-black text-slate-900 dark:text-white text-base font-heading">
            Itemized Collection Records
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Compiling financial report...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No collection records matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Loan Account</th>
                  <th className="py-3 px-4">Scheme</th>
                  <th className="py-3 px-4">Principal Component</th>
                  <th className="py-3 px-4">Interest Component</th>
                  <th className="py-3 px-4">Total Collected</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Collected By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{r.receipt_number}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-300">{formatDate(r.collection_date)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.customer_name}</td>
                    <td className="py-3 px-4 font-mono">{r.loan_account_number}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.scheme_name}</td>
                    <td className="py-3 px-4 font-mono text-emerald-600 font-bold">₹{Number(r.principal_component).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono text-purple-600 font-bold">₹{Number(r.interest_component).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white">₹{Number(r.amount_collected).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {r.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{r.agent_name || 'Admin'}</td>
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
