import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Coins,
  Wallet,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Send,
  CheckSquare,
  Layers,
  ChevronDown,
  ChevronUp,
  Banknote,
  Sparkles,
  Building2,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Toast from '../components/Toast';
import { formatDate, getServerYMD } from '../utils/dateUtils';

export default function AgentDayClosingPage() {
  const { user } = useAuth();
  const [workDate, setWorkDate] = useState(getServerYMD());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unsubmittedDays, setUnsubmittedDays] = useState([]);
  const [submittingAllDays, setSubmittingAllDays] = useState(false);
  const [data, setData] = useState(null);
  const [agentNotes, setAgentNotes] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [expandedChitId, setExpandedChitId] = useState(null);

  const fetchDayData = async (date) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const targetDate = date || workDate;

      // Fetch unsubmitted past shifts
      try {
        const unres = await api.get('/agent/day-unsubmitted');
        if (unres.data?.success) {
          setUnsubmittedDays(unres.data.unsubmitted || []);
        }
      } catch (_) { }

      // Primary call to preview endpoint with fallback
      try {
        const res = await api.get(`/agent/day-preview?date=${targetDate}`);
        if (res.data?.success) {
          setData(res.data.data);
          if (res.data.data.submission?.agentNotes) {
            setAgentNotes(res.data.data.submission.agentNotes);
          }
          return;
        }
      } catch (previewErr) {
        // Fallback: If preview is unavailable, fetch day submissions
        const subRes = await api.get(`/agent/day-submissions?date=${targetDate}`);
        if (subRes.data?.success && subRes.data.data?.length > 0) {
          const s = subRes.data.data[0];
          setData({
            workDate: targetDate,
            isSubmitted: true,
            submission: s,
            cashCollected: s.cash_collected,
            upiCollected: s.upi_collected,
            chequeCollected: s.cheque_collected,
            totalCollected: s.total_collected,
            totalReceipts: s.total_receipts,
            totalStopsVisited: s.total_stops_visited,
            totalStopsPending: s.total_stops_pending,
            chitBreakdown: s.details?.chitBreakdown || [],
            graphsAnalyses: s.details?.graphsAnalyses || {},
          });
          return;
        }
        throw previewErr;
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not load shift records. Please retry.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayData(workDate);
  }, [workDate]);

  const handleSubmitDayWork = (e) => {
    e?.preventDefault();
    if (submitting) return;
    setShowConfirmModal(true);
  };

  const executeSubmitDayWork = async () => {
    setShowConfirmModal(false);
    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post('/agent/day-submit', {
        work_date: workDate,
        agent_notes: agentNotes,
      });

      if (res.data?.success) {
        setToast({
          title: 'Day Shift Submitted!',
          message: 'Day collections & physical cash handover submitted successfully! Forwarded to Admin for cash counting and closing.',
          type: 'success',
        });
        setSuccessMsg(res.data.message || `Day shift for ${workDate} submitted successfully for Admin cash counting.`);
        await fetchDayData(workDate);
      }
    } catch (err) {
      const errText = getFriendlyErrorMessage(err, 'Failed to submit day collections handover. Please try again.');
      setError(errText);
      setToast({
        title: 'Submission Failed',
        message: errText,
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAllUnsubmittedDays = async () => {
    if (!unsubmittedDays.length || submittingAllDays) return;
    setSubmittingAllDays(true);
    setError('');
    setSuccessMsg('');
    try {
      let count = 0;
      for (const item of unsubmittedDays) {
        await api.post('/agent/day-submit', {
          work_date: item.work_date,
          agent_notes: `Submitted in batch for ${formatDate(item.work_date)}. Separate verified accounting ledger.`,
        });
        count++;
      }
      setToast({
        title: 'All Shifts Submitted!',
        message: `Successfully submitted ${count} previous day shifts for Admin verification.`,
        type: 'success',
      });
      setSuccessMsg(`Successfully submitted ${count} previous day shifts for Admin verification.`);
      await fetchDayData(workDate);
    } catch (err) {
      const errText = getFriendlyErrorMessage(err, 'Failed submitting past shifts. Please retry individually.');
      setError(errText);
      setToast({
        title: 'Batch Submission Failed',
        message: errText,
        type: 'error',
      });
    } finally {
      setSubmittingAllDays(false);
    }
  };

  const hasAdditionalWork = Boolean(data?.hasAdditionalWork);
  const isApproved = !hasAdditionalWork && data?.submission?.status === 'APPROVED';
  const isPending = !hasAdditionalWork && data?.submission?.status === 'PENDING_APPROVAL';
  const isDiscrepancy = !hasAdditionalWork && data?.submission?.status === 'REJECTED_DISCREPANCY';

  const summary = data?.graphsAnalyses || {};
  const chitBreakdown = data?.chitBreakdown || [];

  const adminTotalCollected = useMemo(() => {
    if (summary.adminTotalCollected != null && Number(summary.adminTotalCollected) > 0) {
      return Number(summary.adminTotalCollected);
    }
    if (data?.adminTotalCollected != null && Number(data.adminTotalCollected) > 0) {
      return Number(data.adminTotalCollected);
    }
    return chitBreakdown.reduce((sum, chit) => {
      const cAdmin = Number(chit.adminCollected || 0);
      if (cAdmin > 0) return sum + cAdmin;
      const adminMembers = (chit.paidMembers || []).filter((m) => Boolean(
        m.completedByAdmin || (m.statusLabel && m.statusLabel.includes('Admin')) || (m.completedBy && m.completedBy.toLowerCase().includes('admin')) || (m.paidByNotice && m.paidByNotice.toLowerCase().includes('admin'))
      ));
      return sum + adminMembers.reduce((mSum, m) => mSum + Number(m.adminAmount || (m.completedByAdmin && !m.agentAmount ? m.amount : 0) || 0), 0);
    }, 0);
  }, [summary, data, chitBreakdown]);

  const adminPaidCount = useMemo(() => {
    if (summary.adminPaidMembersCount != null && Number(summary.adminPaidMembersCount) > 0) {
      return Number(summary.adminPaidMembersCount);
    }
    if (data?.adminPaidMembersCount != null && Number(data.adminPaidMembersCount) > 0) {
      return Number(data.adminPaidMembersCount);
    }
    return chitBreakdown.reduce((sum, chit) => {
      if (chit.adminPaidSubscribersCount != null && Number(chit.adminPaidSubscribersCount) > 0) {
        return sum + Number(chit.adminPaidSubscribersCount);
      }
      const adminMembers = (chit.paidMembers || []).filter((m) => Boolean(
        m.completedByAdmin || (m.statusLabel && m.statusLabel.includes('Admin')) || (m.completedBy && m.completedBy.toLowerCase().includes('admin')) || (m.paidByNotice && m.paidByNotice.toLowerCase().includes('admin'))
      ));
      return sum + adminMembers.length;
    }, 0);
  }, [summary, data, chitBreakdown]);

  const effectiveAgentTarget = useMemo(() => {
    const rawTarget = Number(summary.grandExpectedTarget || data?.expectedTarget || 0);
    const agentCollected = Number(data?.totalCollected || 0);
    if (rawTarget > 0) {
      if (adminTotalCollected > 0 && rawTarget > adminTotalCollected) {
        return rawTarget - adminTotalCollected;
      }
      return rawTarget;
    }
    return agentCollected;
  }, [summary, data, adminTotalCollected]);

  const effectiveStopsVisited = useMemo(() => {
    const rawVisited = Number(data?.totalStopsVisited || 0);
    if (adminPaidCount > 0 && rawVisited >= adminPaidCount) {
      return Math.max(0, rawVisited - adminPaidCount);
    }
    return rawVisited;
  }, [data, adminPaidCount]);

  const effectiveStopsPending = Number(data?.totalStopsPending || 0);
  const effectiveTotalStops = effectiveStopsVisited + effectiveStopsPending;
  const targetCompletionPercent = effectiveAgentTarget > 0
    ? Math.min(100, Math.round((Number(data?.totalCollected || 0) / effectiveAgentTarget) * 100))
    : (Number(data?.totalCollected || 0) > 0 ? 100 : 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16 font-sans px-1 sm:px-0">
      {/* Floating Toast Notification */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {/* Top Banner Header: Mobile-First Responsive Design */}
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 text-white p-4 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-md">
              <Banknote className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 font-heading">
                  Day Closing
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400 font-mono truncate">
                  {user?.full_name} (@{user?.username})
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-heading leading-tight break-words">
                Day Closing
              </h1>

            </div>
          </div>

          {/* Date Picker & Sync Island */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="bg-transparent text-white text-xs font-bold font-mono focus:outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchDayData(workDate)}
              className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Refresh Shift Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Status Notice Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="break-words">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-bold shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Additional Shift Banner: When Admin assigns new work after Shift 1 approval */}
      {data?.hasAdditionalWork && (
        <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base font-heading">
                  Shift #1 Handover Approved · Shift #{data.shiftNumber || 2} Open
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 border border-indigo-300">
                  New Work Assigned by Admin
                </span>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Shift #1 physical cash (₹{Number(data.previouslyApprovedCash || 0).toLocaleString('en-IN')}) was approved and closed by Admin. You have additional assigned tasks today. Submit Shift #{data.shiftNumber || 2} below when your collections are complete.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-200 dark:border-indigo-800">
            <span className="text-[10px] uppercase font-bold text-indigo-500 block">Shift #{data.shiftNumber || 2} Cash to Handover</span>
            <span className="font-black text-base sm:text-lg text-indigo-600 dark:text-indigo-400 font-mono">
              ₹{Number(data.shiftCashToHandover != null ? data.shiftCashToHandover : data.cashCollected).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* Shift State Banner */}
      {data?.isSubmitted && !data?.hasAdditionalWork && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isApproved
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : isDiscrepancy
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 sm:p-3 rounded-2xl shrink-0 ${isApproved
                  ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : isDiscrepancy
                    ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                    : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                }`}
            >
              {isApproved ? (
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : isDiscrepancy ? (
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base font-heading">
                  {isApproved
                    ? 'Day Shift Approved & Closed by Admin ✓'
                    : isDiscrepancy
                      ? 'Discrepancy Flagged by Admin'
                      : 'Submitted · Awaiting Admin Verification'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/80 dark:bg-slate-900 border">
                  {data?.submission?.status}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90 break-words">
                {isApproved
                  ? `Verified by ${data.submission.approvedByName || 'Administrator'}. Verified Cash: ₹${Number(data.submission.verifiedCashAmount || data.cashCollected).toLocaleString('en-IN')}.`
                  : isDiscrepancy
                    ? `Admin Note: ${data.submission.adminNotes || 'Cash difference detected. Please meet admin.'}`
                    : 'Registered in database. Please physically count and hand over cash to the Admin.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* High-Level Metric Cards: Mobile-Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Collected */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-heading">Total Collected</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-heading truncate">
            ₹{Number(data?.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">{data?.totalReceipts || 0} Receipts</p>
        </div>

        {/* Cash on Hand */}
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-1 overflow-hidden">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-heading">Cash on Hand</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-600 dark:text-amber-400 font-heading truncate">
            ₹{Number(data?.cashCollected || 0).toLocaleString('en-IN')}
          </div>

        </div>

        {/* Digital / UPI Inflows */}
        <div className="p-4 sm:p-5 rounded-3xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-1 overflow-hidden">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-heading">UPI / Online</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 font-heading truncate">
            ₹{Number(data?.upiCollected || 0).toLocaleString('en-IN')}
          </div>

        </div>

        {/* Stops Visited vs Pending */}
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-1 overflow-hidden">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider font-heading">Stops Visited</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-heading truncate">
            {effectiveStopsVisited} / {effectiveTotalStops}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
            {effectiveStopsPending} stops remaining
            {adminPaidCount > 0 && (
              <span className="ml-1 text-purple-600 dark:text-purple-400 font-bold">
                (⚡ {adminPaidCount} Paid to Admin)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Visual Analytics & Breakdown Graphs */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Progress Towards Target */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-heading">
              Daily Target Completion
            </h2>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {targetCompletionPercent}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                style={{
                  width: `${targetCompletionPercent}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
              <span>Collected: ₹{Number(data?.totalCollected || 0).toLocaleString('en-IN')}</span>
              <span>Target: ₹{effectiveAgentTarget.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Cash vs UPI Payment Split */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-heading">
              Payment Breakdown
            </h2>
            <span className="text-xs text-slate-400 font-mono">Mode Split</span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${summary.paymentSplit?.cashPercent || 0}%` }}
              />
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${summary.paymentSplit?.upiPercent || 0}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">Cash Handover</span>
                <span className="font-black text-slate-900 dark:text-white truncate block">
                  ₹{Number(summary.paymentSplit?.cashAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs">
                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">UPI / Online</span>
                <span className="font-black text-slate-900 dark:text-white truncate block">
                  ₹{Number(summary.paymentSplit?.upiAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Progress */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-heading">
              Route Stop Performance
            </h2>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {effectiveTotalStops > 0 ? Math.round((effectiveStopsVisited / effectiveTotalStops) * 100) : 100}% Visited
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${effectiveTotalStops > 0 ? Math.round((effectiveStopsVisited / effectiveTotalStops) * 100) : 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
              <span>{effectiveStopsVisited} stops done</span>
              <span>{effectiveStopsPending} stops left</span>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Collection Notice Box (Directly below the 3 Analytics Boxes) */}
      {adminTotalCollected > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-50 to-indigo-50/70 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base font-heading text-purple-950 dark:text-white">
                  ₹{adminTotalCollected.toLocaleString('en-IN')} Collected by Admin / Head Office Today
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-200 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                  {adminPaidCount} Subscriber{adminPaidCount > 1 ? 's' : ''} Paid
                </span>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5 leading-relaxed">
                Admin collected this installment directly at head office for this shift. Your active route stops are reduced by {adminPaidCount} stop{adminPaidCount > 1 ? 's' : ''}, and this ₹{adminTotalCollected.toLocaleString('en-IN')} is deducted from your daily target and physical cash handover.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-purple-200/60 dark:border-purple-800/60">
            <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Deducted from Target</span>
            <span className="font-black text-base sm:text-lg text-purple-700 dark:text-purple-300 font-mono">
              -₹{adminTotalCollected.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* Chit-by-Chit Summary */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Chit Scheme Collections & Remaining Dues</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clear breakdown of collections per chit scheme with subscriber details.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {chitBreakdown.length} Assigned Routes
          </span>
        </div>

        {chitBreakdown.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No active chit schemes assigned for this shift date.
          </div>
        ) : (
          <div className="space-y-3">
            {chitBreakdown.map((chit) => {
              const isExpanded = expandedChitId === chit.groupId;
              const chitAdminCollected = Number(chit.adminCollected || 0) > 0
                ? Number(chit.adminCollected)
                : (chit.paidMembers || []).filter((m) => Boolean(
                    m.completedByAdmin || 
                    (m.statusLabel && m.statusLabel.includes('Admin')) || 
                    (m.completedBy && m.completedBy.toLowerCase().includes('admin')) ||
                    (m.paidByNotice && m.paidByNotice.toLowerCase().includes('admin'))
                  )).reduce((sum, m) => sum + Number(m.adminAmount || (m.completedByAdmin && !m.agentAmount ? m.amount : 0) || (m.paidByNotice?.includes('Admin') ? m.amount : 0) || 0), 0);

              const chitAgentCollected = chit.agentCollected != null
                ? Number(chit.agentCollected)
                : Math.max(0, Number(chit.totalCollected || 0) - chitAdminCollected);

              return (
                <div
                  key={chit.groupId}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div
                    onClick={() => setExpandedChitId(isExpanded ? null : chit.groupId)}
                    className="p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white font-heading">
                          {chit.groupName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {chit.groupCode}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {chit.frequency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Installment: ₹{Number(chit.installmentAmount).toLocaleString('en-IN')} · Subscribers: {chit.totalSubscribersCount} {chitAdminCollected > 0 ? `(${chit.totalSubscribersCount - (chit.adminPaidSubscribersCount || 1)} Active · ${chit.adminPaidSubscribersCount || 1} Paid to Admin)` : ''} · {chit.scheduleAnalysisNotice}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {chitAdminCollected > 0 ? 'Agent Collected' : 'Collected'}
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-heading">
                          ₹{Number(chitAgentCollected).toLocaleString('en-IN')}
                        </span>
                        {chitAdminCollected > 0 && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-semibold">
                            + ₹{Number(chitAdminCollected).toLocaleString('en-IN')} by Admin
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">Due</span>
                        <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 font-heading">
                          ₹{Number(chit.pendingAmount).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3.5 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Paid Members */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center justify-between font-heading">
                          <span>Paid Subscribers Today ({chit.paidMembers.length})</span>
                          <span className="font-mono">
                            ₹{Number(chitAgentCollected).toLocaleString('en-IN')}
                            {chitAdminCollected > 0 ? ` (+ ₹${Number(chitAdminCollected).toLocaleString('en-IN')} Admin)` : ''}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {chit.paidMembers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">No collections for this scheme today.</div>
                          ) : (
                            chit.paidMembers.map((m, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                                  m.completedByAdmin
                                    ? 'bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900'
                                    : 'bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 dark:text-white block font-heading truncate">
                                      {m.memberName} (#{m.ticketNumber})
                                    </span>
                                    {m.completedByAdmin ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200 border border-purple-300">
                                        Paid by Admin, not by Agent
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200">
                                        Agent Collected
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono truncate block">
                                    {m.paymentMethod} · {m.receiptNumber} {m.completedByAdmin ? '· Office Collection' : ''}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`font-black ${m.completedByAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    ₹{Number(m.amount).toLocaleString('en-IN')}
                                  </span>
                                  {m.completedByAdmin && (
                                    <span className="block text-[9px] font-bold text-purple-600 dark:text-purple-400">
                                      Office Paid
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Unpaid Members */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center justify-between font-heading">
                          <span>Pending / Unpaid Subscribers ({chit.unpaidMembers.length})</span>
                          <span className="font-mono">₹{Number(chit.pendingAmount).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {chit.unpaidMembers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-emerald-600 font-bold">All members paid! ✓</div>
                          ) : (
                            chit.unpaidMembers.map((m, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 dark:text-white block font-heading truncate">
                                    {m.memberName} (#{m.ticketNumber})
                                  </span>
                                  <span className="text-[10px] text-slate-500 truncate block">
                                    {m.statusNotice}
                                  </span>
                                </div>
                                <span className="font-bold text-rose-600 dark:text-rose-400 font-mono shrink-0">
                                  ₹{Number(m.remainingDue).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Submission & Physical Cash Handover Section */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
              Physical Cash Handover & Admin Verification Notes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirm your cash handover details before dispatching to the Administrator.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitDayWork} className="space-y-4">


          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Agent Handover Notes / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              disabled={isApproved && !data?.hasAdditionalWork}
              placeholder={data?.hasAdditionalWork ? `Enter details for Shift #${data.shiftNumber || 2} cash handover to Admin...` : "Enter details on currency note bundles, customer promises, or route notes for Admin..."}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-xs dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || (isApproved && !data?.hasAdditionalWork)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Submitting Day Work...'
                  : data?.hasAdditionalWork
                    ? `Submit Shift #${data.shiftNumber || 2} Handover (₹${Number(data.shiftCashToHandover != null ? data.shiftCashToHandover : data.cashCollected).toLocaleString('en-IN')} Cash)`
                    : isApproved
                      ? 'Day Work Approved & Closed ✓'
                      : isPending
                        ? 'Update Submitted Day Work'
                        : 'Submit Day Work'}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Confirmation Modal for Day Submit */}
      {showConfirmModal && (
        <div
          style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white font-heading">
                  Confirm Day Closing & Cash Handover?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Date: <span className="font-bold text-slate-900 dark:text-white">{workDate}</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs space-y-2">
              <div className="flex items-baseline justify-between font-bold text-amber-900 dark:text-amber-200">
                <span>Physical Cash on Hand:</span>
                <span className="text-sm font-black font-mono">₹{Number(data?.cashCollected || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-baseline justify-between text-slate-600 dark:text-slate-300">
                <span>Digital / UPI Collected:</span>
                <span className="font-mono">₹{Number(data?.upiCollected || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-amber-200 dark:border-amber-800 pt-1.5 flex items-baseline justify-between font-extrabold text-slate-900 dark:text-white">
                <span>Total Inflow:</span>
                <span className="font-mono text-sm">₹{Number(data?.totalCollected || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Once submitted, collection entries for this date will be <strong>locked for Admin verification</strong>. If you need to record additional collections later, you can request Admin to unlock this shift.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel / Review
              </button>
              <button
                type="button"
                onClick={executeSubmitDayWork}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-colors"
              >
                Submit Day Work
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
