import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Coins,
  Wallet,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Send,
  ArrowLeft,
  Banknote,
  FileText,
  User,
  Phone,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeSync } from '../../context/RealtimeContext';
import { formatCurrency, formatDate } from '../../utils/interestUtils';
import Toast from '../../components/Toast';

export default function FinLendAgentDayClosingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const [workDate, setWorkDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [agentNotes, setAgentNotes] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const fetchDayData = async (date = workDate, quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError('');

      const res = await api.get(`/interest/day-preview?date=${date}`);
      if (res.data?.success) {
        setData(res.data.data);
        if (res.data.data.submission?.agent_notes) {
          setAgentNotes(res.data.data.submission.agent_notes);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load day collection records. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayData(workDate);
  }, [workDate]);

  useRealtimeSync(['finlend:day-submissions', 'finlend:collections'], () => {
    fetchDayData(workDate, true);
  });

  const handleSubmitDayWork = async (e) => {
    e?.preventDefault?.();
    try {
      setSubmitting(true);
      setError('');

      const res = await api.post('/interest/day-submit', {
        work_date: workDate,
        agent_notes: agentNotes,
      });

      if (res.data?.success) {
        setToast({
          type: 'success',
          message: '✓ Day collection work submitted to Admin! Please handover cash for verification.',
        });
        await fetchDayData(workDate, true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit day work.');
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved = data?.submission?.status === 'APPROVED';
  const isPending = data?.submission?.status === 'PENDING_APPROVAL';
  const isRejected = data?.submission?.status === 'REJECTED';

  const totalCollected = data ? Number(data.totalCollected || data.total_collected || 0) : 0;
  const cashCollected = data ? Number(data.cashCollected || data.cash_collected || 0) : 0;
  const upiCollected = data ? Number(data.upiCollected || data.upi_collected || 0) : 0;
  const totalReceipts = data ? Number(data.totalReceipts || data.total_receipts || 0) : 0;
  const visitedCount = data ? Number(data.totalBorrowersVisited || data.total_borrowers_visited || 0) : 0;
  const pendingCount = data ? Number(data.totalBorrowersPending || data.total_borrowers_pending || 0) : 0;
  const collectionsList = data?.collections || data?.submission?.details || [];

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-16">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/interest/home')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Work Date Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none font-mono cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchDayData(workDate)}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
          Day Closing & Cash Handover
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Submit today's collected money for Admin physical cash counting and shift closure
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STATUS BANNER */}
      {isApproved ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm sm:text-base font-heading text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Shift Verified & Approved by Admin ✓</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Approved by <strong>{data.submission.approved_by_name || 'Admin'}</strong> on{' '}
            <strong>{formatDate(data.submission.approved_at || data.submission.updated_at)}</strong>.
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-xs font-mono font-bold">
            <span className="text-emerald-700 dark:text-emerald-300">
              Verified Cash: {formatCurrency(data.submission.verified_cash || data.submission.cash_collected)}
            </span>
            <span className="text-teal-700 dark:text-teal-300">
              Verified UPI: {formatCurrency(data.submission.verified_upi || data.submission.upi_collected)}
            </span>
          </div>
          {data.submission.admin_notes && (
            <div className="text-xs italic bg-white/60 dark:bg-black/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 mt-1">
              Admin Note: "{data.submission.admin_notes}"
            </div>
          )}
        </div>
      ) : isPending ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm sm:text-base font-heading text-amber-700 dark:text-amber-400">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
            <span>Submitted · Awaiting Admin Verification & Approval</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Your collection report was submitted on{' '}
            <strong>{formatDate(data.submission.submitted_at || data.submission.created_at)}</strong>.
            Please hand over <strong className="text-amber-700 dark:text-amber-400 font-mono">{formatCurrency(cashCollected)}</strong> in physical cash to Admin.
          </p>
        </div>
      ) : isRejected ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-rose-500/10 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm sm:text-base font-heading text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Discrepancy Reported by Admin</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {data.submission.admin_notes || 'Physical cash counted does not match. Please review collections and re-submit.'}
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 space-y-1.5">
          <div className="flex items-center gap-2 font-black text-sm font-heading text-indigo-700 dark:text-indigo-300">
            <Coins className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Shift Active · Ready for End-of-Day Handover</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Review your collections below, count your physical cash, and submit for Admin verification.
          </p>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Collected */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Collected</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{totalReceipts} receipts issued</div>
        </div>

        {/* Physical Cash Handover */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Physical Cash</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {formatCurrency(cashCollected)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Handover to Admin</div>
        </div>

        {/* UPI / Online */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>UPI / Online</span>
            <CreditCard className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400 font-mono mt-1">
            {formatCurrency(upiCollected)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Direct to account</div>
        </div>

        {/* Borrowers Coverage */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Borrower Stops</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {visitedCount} <span className="text-xs font-normal text-slate-400">/ {visitedCount + pendingCount}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {pendingCount > 0 ? `${pendingCount} stops pending` : 'All assigned visited!'}
          </div>
        </div>
      </div>

      {/* TODAY'S COLLECTIONS BREAKDOWN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-heading">
            Receipts Recorded Today ({collectionsList.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {formatDate(workDate)}
          </span>
        </div>

        {collectionsList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              No loan collections recorded yet for this date.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
            {collectionsList.map((c) => {
              const amt = Number(c.amount_collected || c.amount || 0);
              const isCash = (c.payment_method || '').toUpperCase() === 'CASH';

              return (
                <div key={c.id || c.receipt_number} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white font-heading truncate">
                        {c.customer_name || 'Borrower'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        #{c.loan_account_number || 'Loan'} · Receipt #{c.receipt_number || c.id}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-sm text-slate-900 dark:text-white font-mono">
                      {formatCurrency(amt)}
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mt-0.5 ${
                        isCash
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60'
                      }`}
                    >
                      {c.payment_method || 'CASH'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SUBMIT ACTION BOX */}
      {!isApproved && (
        <form onSubmit={handleSubmitDayWork} className="p-5 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 font-heading">
              Agent Handover Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              placeholder="e.g. Handed over ₹35,000 cash to Admin in evening shift. 2 borrowers promised tomorrow."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 font-heading cursor-pointer disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {isPending
                ? 'Update & Re-Submit Day Handover'
                : `Submit Day Work (Handover ₹${cashCollected.toLocaleString('en-IN')} Cash)`}
            </span>
          </button>
        </form>
      )}
    </div>
  );
}

