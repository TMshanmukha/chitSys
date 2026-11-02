import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Coins,
  Wallet,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Send,
  CheckSquare,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Banknote,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getFriendlyErrorMessage } from '../utils/friendlyError';

export default function AgentDayClosingPage() {
  const { user } = useAuth();
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [agentNotes, setAgentNotes] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedChitId, setExpandedChitId] = useState(null);

  const fetchDayData = async (date) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.get(`/agent/day-preview?date=${date}`);
      if (res.data?.success) {
        setData(res.data.data);
        if (res.data.data.submission?.agentNotes) {
          setAgentNotes(res.data.data.submission.agentNotes);
        }
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load day collection records.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayData(workDate);
  }, [workDate]);

  const handleSubmitDayWork = async (e) => {
    e.preventDefault();
    if (!data) return;

    const cashOnHand = data.cashCollected || 0;
    const confirmText = `Are you sure you want to submit today's work for ${workDate}?\n\nYou are reporting ₹${cashOnHand.toLocaleString('en-IN')} physical cash on hand to handover to Admin.`;
    if (!window.confirm(confirmText)) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');
      const res = await api.post('/agent/day-submit', {
        work_date: workDate,
        agent_notes: agentNotes,
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Day shift submitted successfully for Admin reconciliation.');
        await fetchDayData(workDate);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not submit day shift.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved = data?.submission?.status === 'APPROVED';
  const isPending = data?.submission?.status === 'PENDING_APPROVAL';
  const isDiscrepancy = data?.submission?.status === 'REJECTED_DISCREPANCY';

  const summary = data?.graphsAnalyses || {};
  const chitBreakdown = data?.chitBreakdown || [];

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      {/* Top Banner Header */}
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 text-white p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-3xl shadow-lg">
              <Banknote className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-400/30 font-heading">
                  Shift Closing Terminal
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Custodian: {user?.full_name} (@{user?.username})
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
                Day Closing & Collections Submission
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Reconcile your physical cash on hand, view chit-by-chit performance, and submit your day for Admin verification.
              </p>
            </div>
          </div>

          {/* Date Picker & Sync */}
          <div className="flex items-center gap-2.5 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0 ml-1.5" />
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold font-mono focus:outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={() => fetchDayData(workDate)}
              className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
              title="Refresh Shift Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Status Notice Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Shift State Banner */}
      {data?.isSubmitted && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isApproved
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : isDiscrepancy
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl ${
                isApproved
                  ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : isDiscrepancy
                  ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                  : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
              }`}
            >
              {isApproved ? (
                <ShieldCheck className="w-6 h-6" />
              ) : isDiscrepancy ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base font-heading">
                  {isApproved
                    ? 'Day Shift Approved & Closed by Admin ✓'
                    : isDiscrepancy
                    ? 'Discrepancy Flagged by Admin'
                    : 'Submitted · Awaiting Admin Verification'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/80 dark:bg-slate-900 border">
                  {data?.submission?.status}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {isApproved
                  ? `Verified by ${data.submission.approvedByName || 'Administrator'} on ${data.submission.approvedAt ? new Date(data.submission.approvedAt).toLocaleDateString() : 'Today'}. Verified Cash: ₹${Number(data.submission.verifiedCashAmount || data.cashCollected).toLocaleString('en-IN')}.`
                  : isDiscrepancy
                  ? `Admin Note: ${data.submission.adminNotes || 'Cash difference detected. Please meet admin.'}`
                  : 'Your day sheet has been registered. Please physically count and hand over cash to the Admin.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* High-Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Total Collected</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            ₹{Number(data?.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 font-mono">
            {data?.totalReceipts || 0} Official Receipts Issued
          </p>
        </div>

        {/* Cash to Hand Over */}
        <div className="p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Cash to Hand Over</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-heading">
            ₹{Number(data?.cashCollected || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Physical currency in hand
          </p>
        </div>

        {/* Digital / UPI Inflows */}
        <div className="p-5 rounded-3xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">UPI / Online Collections</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-heading">
            ₹{Number(data?.upiCollected || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-400">
            Credited direct to bank
          </p>
        </div>

        {/* Stops Visited vs Pending */}
        <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Stops Completed</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
            {data?.totalStopsVisited || 0} / {(data?.totalStopsVisited || 0) + (data?.totalStopsPending || 0)}
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {data?.totalStopsPending || 0} stops remaining
          </p>
        </div>
      </div>

      {/* Visual Analytics & Breakdown Graphs */}
      <section className="grid lg:grid-cols-3 gap-6">
        {/* Progress Towards Target Gauge */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-heading">
              Daily Target Completion
            </h2>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {summary.overallCompletionPercent || 0}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, summary.overallCompletionPercent || 0)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-mono pt-1">
              <span>Collected: ₹{Number(data?.totalCollected || 0).toLocaleString('en-IN')}</span>
              <span>Target: ₹{Number(summary.grandExpectedTarget || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Remaining Pending Dues:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                ₹{Number(summary.grandPendingAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Daily Schemes Pending:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                ₹{Number(summary.dailyOverview?.pending || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Cash vs UPI Payment Split */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-heading">
              Payment Method Breakdown
            </h2>
            <span className="text-xs text-slate-400 font-mono">Mode Split</span>
          </div>

          <div className="space-y-3">
            {/* Split Progress Bar */}
            <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${summary.paymentSplit?.cashPercent || 0}%` }}
                title={`Cash: ${summary.paymentSplit?.cashPercent || 0}%`}
              />
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${summary.paymentSplit?.upiPercent || 0}%` }}
                title={`UPI: ${summary.paymentSplit?.upiPercent || 0}%`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Physical Cash</span>
                </div>
                <div className="font-extrabold text-slate-900 dark:text-white mt-1">
                  ₹{Number(summary.paymentSplit?.cashAmount || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-amber-600 font-mono">
                  {summary.paymentSplit?.cashPercent || 0}% of collections
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Digital / UPI</span>
                </div>
                <div className="font-extrabold text-slate-900 dark:text-white mt-1">
                  ₹{Number(summary.paymentSplit?.upiAmount || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-purple-600 font-mono">
                  {summary.paymentSplit?.upiPercent || 0}% of collections
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Task Visit Progress */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-heading">
              Route Stop Performance
            </h2>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {summary.taskProgress?.ratePercent || 0}% Visited
            </span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${summary.taskProgress?.ratePercent || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-mono pt-1">
              <span>Completed: {summary.taskProgress?.visitedCount || 0} stops</span>
              <span>Pending: {summary.taskProgress?.pendingCount || 0} stops</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
              Cycle Status:
            </span>
            <p className="text-[11px]">
              {summary.monthlyOverview?.statusNotice || 'All monthly routes and daily stops reconciled.'}
            </p>
          </div>
        </div>
      </section>

      {/* Chit-by-Chit Summary: What Chits Collected & What Pending */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Chit Scheme Collections & Remaining Dues</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clear breakdown of collections per chit scheme with detailed subscriber records.
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
          <div className="space-y-4">
            {chitBreakdown.map((chit) => {
              const isExpanded = expandedChitId === chit.groupId;
              return (
                <div
                  key={chit.groupId}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* Scheme Header Card */}
                  <div
                    onClick={() => setExpandedChitId(isExpanded ? null : chit.groupId)}
                    className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
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
                        {chit.coveringForAbsentAgent && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                            Covering for: {chit.coveringForAbsentAgent}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Installment: ₹{Number(chit.installmentAmount).toLocaleString('en-IN')} · Subscribers: {chit.totalSubscribersCount} · {chit.scheduleAnalysisNotice}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold">Collected Today</div>
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-heading">
                          ₹{Number(chit.totalCollected).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Cash: ₹{Number(chit.cashCollected).toLocaleString('en-IN')} · UPI: ₹{Number(chit.upiCollected).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold">Remaining Due</div>
                        <div className="text-base font-black text-rose-600 dark:text-rose-400 font-heading">
                          ₹{Number(chit.pendingAmount).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {chit.unpaidSubscribersCount} pending members
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Subscriber Rosters: Paid vs Pending */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid md:grid-cols-2 gap-4">
                      {/* Paid Members */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center justify-between font-heading">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Paid Subscribers Today ({chit.paidMembers.length})</span>
                          </span>
                          <span className="font-mono text-[11px]">
                            ₹{Number(chit.totalCollected).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {chit.paidMembers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              No collections recorded for this scheme today.
                            </div>
                          ) : (
                            chit.paidMembers.map((m, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block font-heading">
                                    {m.memberName}{' '}
                                    <span className="font-mono text-slate-400 text-[10px]">
                                      (#{m.ticketNumber})
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {m.paymentMethod} · Rcpt: {m.receiptNumber}
                                    {m.completedBy ? ` · Handled by ${m.completedBy}` : ''}
                                  </span>
                                </div>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 font-heading">
                                  ₹{Number(m.amount).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Unpaid / Pending Members */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center justify-between font-heading">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending / Unpaid Subscribers ({chit.unpaidMembers.length})</span>
                          </span>
                          <span className="font-mono text-[11px]">
                            ₹{Number(chit.pendingAmount).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {chit.unpaidMembers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-emerald-600 font-bold">
                              All subscribers in this scheme paid! ✓
                            </div>
                          ) : (
                            chit.unpaidMembers.map((m, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block font-heading">
                                    {m.memberName}{' '}
                                    <span className="font-mono text-slate-400 text-[10px]">
                                      (#{m.ticketNumber})
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {m.statusNotice}
                                  </span>
                                </div>
                                <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
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
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
              Physical Cash Handover & Admin Verification Notes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Confirm your cash handover details before dispatching to the Administrator.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitDayWork} className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200 block">
                Total Physical Cash to Hand Over:
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-300">
                Please match currency note bundles before handing over to the Admin.
              </span>
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-heading">
              ₹{Number(data?.cashCollected || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Agent Handover Notes / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              disabled={isApproved}
              placeholder="Enter details on cash bundles, customer promises, or route notes for the Admin..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-xs dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || isApproved}
              className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Submitting Day Sheet...'
                  : isApproved
                  ? 'Day Shift Approved & Closed ✓'
                  : isPending
                  ? 'Update Submitted Shift Handover'
                  : 'Submit Day Work & Handover Cash'}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
