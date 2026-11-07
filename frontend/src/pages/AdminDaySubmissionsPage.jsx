import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  Wallet,
  CreditCard,
  User,
  Filter,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Send,
  Calendar,
  Layers,
  Banknote,
  Search,
  Check,
  X,
  LockOpen,
  AlertTriangle,
} from 'lucide-react';
import api from '../api/client';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Toast from '../components/Toast';
import { formatDate, formatDateTime } from '../utils/dateUtils';

export default function AdminDaySubmissionsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState(null);

  // Submissions Data
  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState({});
  const [agentsList, setAgentsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [unsubmittedAgents, setUnsubmittedAgents] = useState([]);
  const [remindingAgentId, setRemindingAgentId] = useState(null);

  // Multi-Factor Filters
  const [filters, setFilters] = useState({
    status: 'ALL',
    agentId: 'ALL',
    groupId: 'ALL',
    date: '',
    startDate: '',
    endDate: '',
  });

  // Expanded Accordion State
  const [expandedId, setExpandedId] = useState(null);

  // Verification Form State per submission
  const [verifyForms, setVerifyForms] = useState({});

  const loadSubmissions = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      const params = {};
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;
      if (filters.agentId && filters.agentId !== 'ALL') params.agentId = filters.agentId;
      if (filters.groupId && filters.groupId !== 'ALL') params.groupId = filters.groupId;
      if (filters.date) params.date = filters.date;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [res, agentsRes, groupsRes] = await Promise.all([
        api.get('/admin/day-submissions', { params }),
        api.get('/admin/agents?role=COLLECTION_AGENT'),
        api.get('/admin/groups'),
      ]);

      if (res.data?.success) {
        setSubmissions(res.data.data?.submissions || []);
        setSummary(res.data.data?.summary || {});
        setUnsubmittedAgents(res.data.data?.unsubmittedAgents || []);
      }
      setAgentsList(agentsRes.data?.data || []);
      setGroupsList(groupsRes.data?.data || []);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load agent day submissions.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [filters]);

  const handleUnlockSubmission = async (id) => {
    try {
      setSubmittingAction(true);
      setError('');
      const res = await api.post(`/admin/day-submissions/${id}/unlock`);
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Day shift unlocked. Agent can now record additional collections.');
        loadSubmissions();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to unlock submission.'));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRemindAgent = async (agentId, workDate) => {
    try {
      setRemindingAgentId(agentId);
      const res = await api.post('/admin/day-submissions/remind', { agentId, workDate });
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Reminder sent to agent successfully.');
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not send reminder.'));
    } finally {
      setRemindingAgentId(null);
    }
  };

  const handleAction = async (sub, actionStatus) => {
    const form = verifyForms[sub.id] || {
      cash: sub.cash_collected,
      upi: sub.upi_collected,
      notes: '',
    };

    const confirmMsg =
      actionStatus === 'APPROVED'
        ? `Approve and close day shift for ${sub.agent_name} on ${formatDate(sub.work_date)}?\n\nVerified Cash Count: ₹${Number(form.cash ?? sub.cash_collected).toLocaleString('en-IN')}\nVerified UPI: ₹${Number(form.upi ?? sub.upi_collected).toLocaleString('en-IN')}`
        : `Flag cash discrepancy for ${sub.agent_name}?\n\nDiscrepancy Note: ${form.notes || 'No note'}`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmittingAction(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post(`/admin/day-submissions/${sub.id}/approve`, {
        status: actionStatus,
        verified_cash_amount: form.cash !== undefined ? form.cash : sub.cash_collected,
        verified_upi_amount: form.upi !== undefined ? form.upi : sub.upi_collected,
        admin_notes: form.notes || '',
      });

      if (res.data?.success) {
        setToast({
          title: actionStatus === 'APPROVED' ? 'Shift Approved & Closed' : 'Cash Discrepancy Flagged',
          message:
            actionStatus === 'APPROVED'
              ? `Day shift for ${sub.agent_name} verified and closed successfully.`
              : `Cash discrepancy flagged for ${sub.agent_name}. Status recorded.`,
          type: actionStatus === 'APPROVED' ? 'success' : 'error',
        });
        setSuccessMsg(res.data.message || `Day submission ${actionStatus.toLowerCase()} successfully.`);
        await loadSubmissions(true);
      }
    } catch (err) {
      const errText = getFriendlyErrorMessage(err, 'Failed to update day submission.');
      setError(errText);
      setToast({
        title: 'Action Failed',
        message: errText,
        type: 'error',
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      status: 'ALL',
      agentId: 'ALL',
      groupId: 'ALL',
      date: '',
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      {/* Floating Toast Notification */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {/* Page Header */}
      <header className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 shadow-sm">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
              Agent Day Submissions & Cash Counting Approvals
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review agent shift submissions, count physical cash on hand, inspect chit-by-chit progress, and approve day closures.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadSubmissions(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </header>

      {/* Multi-Factor Filter Bar */}
      <section className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
            <Filter className="w-4 h-4 text-amber-600" />
            <span>Multi-Factor Review Filters</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Submission Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Statuses ({submissions.length})</option>
              <option value="PENDING_APPROVAL">Pending Verification (Amber)</option>
              <option value="APPROVED">Approved & Closed (Green)</option>
              <option value="REJECTED_DISCREPANCY">Discrepancy Flagged (Red)</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Field Agent
            </label>
            <select
              value={filters.agentId}
              onChange={(e) => setFilters((f) => ({ ...f, agentId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Field Agents</option>
              {agentsList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name} (@{a.username})
                </option>
              ))}
            </select>
          </div>

          {/* Chit Scheme Route */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Chit Scheme
            </label>
            <select
              value={filters.groupId}
              onChange={(e) => setFilters((f) => ({ ...f, groupId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Chit Schemes</option>
              {groupsList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Shift Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </section>

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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <div className="p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300 font-heading">
            {summary.pendingCount || 0} Shifts
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-400 font-mono">
            Awaiting physical cash counting
          </p>
        </div>

        {/* Physical Cash to Count */}
        <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Cash to Count</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
            ₹{Number(summary.pendingTotalCash || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
            Physical banknotes from pending shifts
          </p>
        </div>

        {/* Total Online / UPI Collected */}
        <div className="p-5 rounded-3xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Pending UPI</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-heading">
            ₹{Number(summary.pendingTotalUpi || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-400 font-mono">
            Credited direct to bank
          </p>
        </div>

        {/* Total Approved Shifts */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider font-heading">Approved Closed</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            {summary.approvedCount || 0} Shifts
          </div>
          <p className="text-xs text-slate-500 font-mono">
            ₹{Number(summary.approvedTotalAmount || 0).toLocaleString('en-IN')} closed
          </p>
        </div>
      </div>

      {/* Submissions Roster */}
      <section className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
            <p>Loading agent day submissions from database...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            No agent day submissions found matching the selected filters.
          </div>
        ) : (
          submissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const details = sub.details || {};
            const breakdown = details.chitBreakdown || [];
            const graphs = details.graphsAnalyses || {};
            const isPending = sub.status === 'PENDING_APPROVAL';
            const isApproved = sub.status === 'APPROVED';
            const isDiscrepancy = sub.status === 'REJECTED_DISCREPANCY';

            const form = verifyForms[sub.id] || {
              cash: sub.verified_cash_amount !== null ? sub.verified_cash_amount : sub.cash_collected,
              upi: sub.verified_upi_amount !== null ? sub.verified_upi_amount : sub.upi_collected,
              notes: sub.admin_notes || '',
            };

            return (
              <article
                key={sub.id}
                className={`rounded-3xl border transition-all overflow-hidden bg-white dark:bg-slate-900 shadow-sm ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-800'
                    : isApproved
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-rose-300 dark:border-rose-800'
                }`}
              >
                {/* Header Summary Bar */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-300 dark:border-amber-800 flex items-center justify-center font-black text-lg shrink-0">
                      {sub.agent_name?.charAt(0) || 'A'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
                          {sub.agent_name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          (@{sub.agent_username})
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 animate-pulse'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Shift Date: {formatDate(sub.work_date)}</span>
                        </span>
                        <span>·</span>
                        <span className="font-mono">
                          Submitted: {sub.submitted_at ? formatDateTime(sub.submitted_at) : 'N/A'}
                        </span>
                        {sub.approved_by_name && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600 font-bold">
                              Closed by: {sub.approved_by_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between lg:justify-end">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-heading">
                        Physical Cash
                      </span>
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-heading">
                        ₹{Number(sub.cash_collected).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-heading">
                        Online / UPI
                      </span>
                      <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-heading">
                        ₹{Number(sub.upi_collected).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-heading">
                        Total Inflow
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white font-heading">
                        ₹{Number(sub.total_collected).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Breakdowns, Graphs & Cash Counting Form */}
                {isExpanded && (
                  <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
                    {/* Performance & Payment Split Analytics Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-heading">
                          Target Progress ({graphs.overallCompletionPercent || 0}%)
                        </span>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, graphs.overallCompletionPercent || 0)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                          <span>₹{Number(sub.total_collected).toLocaleString('en-IN')}</span>
                          <span>Target: ₹{Number(graphs.grandExpectedTarget || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-heading">
                          Stops Completed
                        </span>
                        <div className="text-lg font-black text-slate-900 dark:text-white font-heading">
                          {sub.total_stops_visited} Visited · {sub.total_stops_pending} Pending
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {sub.total_receipts} official receipts issued
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-heading">
                          Agent Remarks:
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                          {sub.agent_notes || 'No notes submitted by agent.'}
                        </p>
                      </div>
                    </div>

                    {/* Chit Schemes Breakdown */}
                    {breakdown.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-heading">
                          Chit Scheme Route Breakdown ({breakdown.length} Schemes)
                        </h3>

                        <div className="grid md:grid-cols-2 gap-3">
                          {breakdown.map((chit, cIdx) => {
                            const adminAmt = Number(chit.adminCollected || 0);
                            const agentCollAmt = chit.agentCollected != null
                              ? Number(chit.agentCollected)
                              : Math.max(0, Number(chit.totalCollected || 0) - adminAmt);
                            const agentUpiAmt = chit.agentUpiCollected != null
                              ? Number(chit.agentUpiCollected)
                              : Math.max(0, Number(chit.upiCollected || 0) - adminAmt);
                            const agentCashAmt = Number(chit.agentCashCollected ?? chit.cashCollected ?? 0);

                            const adminPaidCount = chit.paidMembers?.filter((m) => m.completedByAdmin || (m.statusLabel && m.statusLabel.includes('Admin'))).length || Number(chit.adminPaidSubscribersCount || 0);
                            const agentPaidCount = Math.max(0, (chit.paidMembers?.length || 0) - adminPaidCount);

                            return (
                              <div
                                key={cIdx}
                                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-slate-900 dark:text-white font-heading">
                                    {chit.groupName} ({chit.groupCode})
                                  </span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-heading">
                                    ₹{agentCollAmt.toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                                  <span>Agent Cash: ₹{agentCashAmt.toLocaleString('en-IN')}</span>
                                  <span>UPI: ₹{agentUpiAmt.toLocaleString('en-IN')}</span>
                                  <span>Dues: ₹{Number(chit.pendingAmount || 0).toLocaleString('en-IN')}</span>
                                </div>

                                {adminAmt > 0 && (
                                  <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                                    ⚡ Paid by Admin, not by Agent: ₹{adminAmt.toLocaleString('en-IN')}
                                  </div>
                                )}

                                <div className="text-[11px] text-slate-500">
                                  Paid members: <strong>{agentPaidCount} by Agent</strong>
                                  {adminPaidCount > 0 && (
                                    <span className="text-purple-600 dark:text-purple-400 font-semibold"> (+ {adminPaidCount} paid to Admin)</span>
                                  )}
                                  {' '}· Pending: <strong>{chit.unpaidMembers?.length || 0}</strong>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cash Counting & Verification Action Box */}
                    <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-4">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-amber-600" />
                        <h4 className="font-extrabold text-sm text-amber-950 dark:text-amber-200 font-heading">
                          Physical Cash Counting & Verification Actions
                        </h4>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-bold text-amber-900 dark:text-amber-300 mb-1">
                            Counted Physical Cash (₹) *
                          </label>
                          <input
                            type="number"
                            value={form.cash}
                            onChange={(e) =>
                              setVerifyForms((vf) => ({
                                ...vf,
                                [sub.id]: { ...form, cash: parseFloat(e.target.value) || 0 },
                              }))
                            }
                            className="w-full rounded-xl border border-amber-300 dark:border-amber-700 p-2.5 font-bold font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 block">
                            Reported by agent: ₹{Number(sub.cash_collected).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <label className="block font-bold text-amber-900 dark:text-amber-300 mb-1">
                            Verified UPI / Digital Amount (₹) *
                          </label>
                          <input
                            type="number"
                            value={form.upi}
                            onChange={(e) =>
                              setVerifyForms((vf) => ({
                                ...vf,
                                [sub.id]: { ...form, upi: parseFloat(e.target.value) || 0 },
                              }))
                            }
                            className="w-full rounded-xl border border-amber-300 dark:border-amber-700 p-2.5 font-bold font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[10px] text-purple-700 dark:text-purple-400 mt-1 block">
                            Bank Statement match: ₹{Number(sub.upi_collected).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                          Admin Verification Notes (Optional / Required if Discrepancy)
                        </label>
                        <input
                          type="text"
                          value={form.notes}
                          onChange={(e) =>
                            setVerifyForms((vf) => ({
                              ...vf,
                              [sub.id]: { ...form, notes: e.target.value },
                            }))
                          }
                          placeholder="Note down currency denominations, safe deposit receipt, or discrepancy details..."
                          className="w-full rounded-xl border border-amber-300 dark:border-amber-700 p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2 flex-wrap">
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleUnlockSubmission(sub.id)}
                          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Unlock shift so agent can record additional collections"
                        >
                          <LockOpen className="w-4 h-4" />
                          <span>Unlock for Re-collection</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleAction(sub, 'REJECTED_DISCREPANCY')}
                          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>Flag Cash Discrepancy</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={() => handleAction(sub, 'APPROVED')}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {isApproved ? 'Update Approved Closure' : 'Approve & Close Day Shift'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

