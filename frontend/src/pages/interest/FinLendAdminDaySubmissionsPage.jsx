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
  ArrowLeft,
  Banknote,
  FileText,
  User,
  Phone,
  ShieldCheck,
  X,
  Unlock,
  Check,
  ChevronDown,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeSync } from '../../context/RealtimeContext';
import { formatCurrency, formatDate } from '../../utils/interestUtils';
import Toast from '../../components/Toast';
import ModalPortal from '../../components/ModalPortal';

export default function FinLendAdminDaySubmissionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState({
    pending_count: 0,
    pending_cash: 0,
    approved_today_count: 0,
    approved_today_cash: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  const [dateFilter, setDateFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [agentsList, setAgentsList] = useState([]);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');

  // Modals
  const [approveModalSub, setApproveModalSub] = useState(null);
  const [verifiedCash, setVerifiedCash] = useState('');
  const [verifiedUpi, setVerifiedUpi] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Reject Modal
  const [rejectModalSub, setRejectModalSub] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Expanded Collections Breakdown Modal
  const [viewDetailsSub, setViewDetailsSub] = useState(null);

  const loadSubmissions = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      let url = `/interest/day-submissions?status=${statusFilter}`;
      if (dateFilter) url += `&date=${dateFilter}`;
      if (agentFilter !== 'ALL') url += `&agentId=${agentFilter}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setSubmissions(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }

      // Also fetch staff/agents list for dropdown
      if (agentsList.length === 0) {
        const uRes = await api.get('/interest/users?role=AGENT');
        if (uRes.data?.success) {
          setAgentsList(uRes.data.data || []);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load agent day submissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter, dateFilter, agentFilter]);

  useRealtimeSync(['finlend:day-submissions'], () => {
    loadSubmissions(true);
  });

  const handleOpenApprove = (sub) => {
    setApproveModalSub(sub);
    setVerifiedCash(String(sub.cash_collected || 0));
    setVerifiedUpi(String(sub.upi_collected || 0));
    setAdminNotes('');
  };

  const handleExecuteApprove = async (e) => {
    e.preventDefault();
    if (!approveModalSub) return;
    try {
      setSubmittingAction(true);
      const res = await api.post(`/interest/day-submissions/${approveModalSub.id}/approve`, {
        verified_cash: verifiedCash,
        verified_upi: verifiedUpi,
        admin_notes: adminNotes,
      });

      if (res.data?.success) {
        setToast({
          type: 'success',
          message: `✓ Cash handover of ₹${Number(verifiedCash).toLocaleString('en-IN')} approved for ${approveModalSub.agent_name}!`,
        });
        setApproveModalSub(null);
        await loadSubmissions(true);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to approve submission.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteReject = async (e) => {
    e.preventDefault();
    if (!rejectModalSub) return;
    try {
      setSubmittingAction(true);
      const res = await api.post(`/interest/day-submissions/${rejectModalSub.id}/reject`, {
        admin_notes: rejectReason || 'Cash discrepancy reported by Admin.',
      });

      if (res.data?.success) {
        setToast({ type: 'warning', message: `Submission marked for discrepancy review.` });
        setRejectModalSub(null);
        setRejectReason('');
        await loadSubmissions(true);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to reject submission.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExecuteUnlock = async (sub) => {
    try {
      const res = await api.post(`/interest/day-submissions/${sub.id}/unlock`);
      if (res.data?.success) {
        setToast({ type: 'success', message: `Submission unlocked. Agent can now re-submit.` });
        await loadSubmissions(true);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to unlock submission.' });
    }
  };

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

        <button
          type="button"
          onClick={() => loadSubmissions(true)}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
        </button>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
          Day Closings & Agent Handovers
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Verify field collection reports, count physical cash received, and close agent shifts
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Approvals */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-heading mt-1">
            {summary.pending_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Requires cash counting</div>
        </div>

        {/* Cash Handover Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Cash Handover Due</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {formatCurrency(summary.pending_cash)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting physical collection</div>
        </div>

        {/* Approved Today Count */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Approved Today</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading mt-1">
            {summary.approved_today_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Closed agent shifts</div>
        </div>

        {/* Approved Cash Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Verified Cash Today</span>
            <ShieldCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono mt-1">
            {formatCurrency(summary.approved_today_cash)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Vault deposited</div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'PENDING_APPROVAL', label: `Pending (${summary.pending_count})` },
            { key: 'APPROVED', label: 'Approved' },
            { key: 'REJECTED', label: 'Discrepancy' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Dropdown */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Agents</option>
            {agentsList.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.full_name}
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold shadow-xs">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none font-mono cursor-pointer"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUBMISSIONS LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs text-slate-400">Loading day submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">
              No day submissions found
            </p>
            <p className="text-xs text-slate-400">
              {statusFilter === 'PENDING_APPROVAL'
                ? 'All field agent handovers have been approved and closed!'
                : 'No records matching the selected filters.'}
            </p>
          </div>
        ) : (
          submissions.map((sub) => {
            const isPending = sub.status === 'PENDING_APPROVAL';
            const isApproved = sub.status === 'APPROVED';
            const isRejected = sub.status === 'REJECTED';

            return (
              <div
                key={sub.id}
                className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0c1220] border transition-all shadow-xs space-y-4 ${
                  isPending
                    ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-400/30'
                    : 'border-slate-200/80 dark:border-white/10'
                }`}
              >
                {/* Header row: Agent details & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs font-heading shrink-0">
                      {(sub.agent_name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-heading">
                          {sub.agent_name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">@{sub.agent_username}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                        <span>Work Date: {formatDate(sub.submission_date)}</span>
                        {sub.agent_phone && <span>• 📱 {sub.agent_phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                          : isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {isPending ? 'Pending Verification' : isApproved ? 'Approved ✓' : 'Discrepancy'}
                    </span>
                  </div>
                </div>

                {/* Amounts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5">
                    <span className="text-slate-400 block text-[11px]">Total Collected</span>
                    <strong className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {formatCurrency(sub.total_collected)}
                    </strong>
                    <span className="text-[10px] text-slate-400">{sub.total_receipts} receipts</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                    <span className="text-emerald-700 dark:text-emerald-400 block text-[11px]">Physical Cash Handover</span>
                    <strong className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      {formatCurrency(sub.cash_collected)}
                    </strong>
                    <span className="text-[10px] text-emerald-600/80">
                      {isApproved ? `Verified: ${formatCurrency(sub.verified_cash || sub.cash_collected)}` : 'Count cash from agent'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40">
                    <span className="text-teal-700 dark:text-teal-400 block text-[11px]">UPI / Online</span>
                    <strong className="text-sm sm:text-base font-black text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                      {formatCurrency(sub.upi_collected)}
                    </strong>
                    <span className="text-[10px] text-teal-600/80">Digital collection</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
                    <span className="text-purple-700 dark:text-purple-400 block text-[11px]">Borrower Coverage</span>
                    <strong className="text-sm sm:text-base font-black text-purple-700 dark:text-purple-300 font-mono mt-0.5 block">
                      {sub.total_borrowers_visited || 0} visited
                    </strong>
                    <span className="text-[10px] text-purple-600/80">
                      {sub.total_borrowers_pending ? `${sub.total_borrowers_pending} pending` : 'All cleared'}
                    </span>
                  </div>
                </div>

                {/* Notes and Approver info */}
                {(sub.agent_notes || sub.admin_notes || sub.approved_by_name) && (
                  <div className="text-xs space-y-1.5 pt-1">
                    {sub.agent_notes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white">Agent Note:</strong> "{sub.agent_notes}"
                      </div>
                    )}
                    {isApproved && (
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex flex-wrap items-center gap-2">
                        <span>✓ Approved by {sub.approved_by_name || 'Admin'} on {formatDate(sub.approved_at || sub.updated_at)}</span>
                        {sub.admin_notes && <span>• Admin Note: "{sub.admin_notes}"</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setViewDetailsSub(sub)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View {sub.total_receipts || 0} Receipts Breakdown</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalSub(sub);
                            setRejectReason('');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                        >
                          Mark Discrepancy
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenApprove(sub)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-sm font-heading flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                          <span>Verify & Approve Cash</span>
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        type="button"
                        onClick={() => handleExecuteUnlock(sub)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock for Re-Submission</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VERIFY & APPROVE CASH MODAL */}
      {approveModalSub && (
        <ModalPortal id="approve-cash-modal" isOpen={Boolean(approveModalSub)} onClose={() => setApproveModalSub(null)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto my-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-heading">
                  Verify Cash Handover
                </h3>
                <p className="text-xs text-slate-500">
                  {approveModalSub.agent_name} · Work Date: {formatDate(approveModalSub.submission_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalSub(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteApprove} className="space-y-4 text-xs">
              {/* Cash Verification Input */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between font-heading">
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                    Physical Cash Handed Over *
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    Reported: {formatCurrency(approveModalSub.cash_collected)}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  value={verifiedCash}
                  onChange={(e) => setVerifiedCash(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white font-mono text-base font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">
                  Count physical bills received and confirm the amount.
                </span>
              </div>

              {/* UPI Verification */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Verified UPI / Online Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={verifiedUpi}
                  onChange={(e) => setVerifiedUpi(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm font-bold"
                />
              </div>

              {/* Admin Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Verification Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Cash counted in office. Deposited to safe."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalSub(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md font-heading cursor-pointer disabled:opacity-50"
                >
                  {submittingAction ? 'Approving...' : 'Approve & Close Shift'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* REJECT / DISCREPANCY MODAL */}
      {rejectModalSub && (
        <ModalPortal id="reject-cash-modal" isOpen={Boolean(rejectModalSub)} onClose={() => setRejectModalSub(null)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 space-y-4 my-auto animate-scaleUp text-xs"
          >
            <h3 className="text-base font-black text-rose-600 dark:text-rose-400 font-heading">
              Report Discrepancy / Return to Agent
            </h3>
            <p className="text-slate-500 leading-snug">
              Explain why this submission does not match so {rejectModalSub.agent_name} can review and re-submit.
            </p>
            <form onSubmit={handleExecuteReject} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Discrepancy Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Cash received was ₹28,000 but reported ₹30,000. Please recount."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalSub(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !rejectReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold"
                >
                  {submittingAction ? 'Rejecting...' : 'Confirm Discrepancy'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* RECEIPTS BREAKDOWN MODAL */}
      {viewDetailsSub && (
        <ModalPortal id="view-receipts-modal" isOpen={Boolean(viewDetailsSub)} onClose={() => setViewDetailsSub(null)} preventBackdropClose={true}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col my-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
                  Collections Breakdown
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {viewDetailsSub.agent_name} · {formatDate(viewDetailsSub.submission_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailsSub(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(!viewDetailsSub.details || viewDetailsSub.details.length === 0) ? (
                <p className="text-center py-8 text-xs text-slate-400">
                  No individual receipts data attached to this submission.
                </p>
              ) : (
                viewDetailsSub.details.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white font-heading">
                        {c.customer_name || 'Borrower'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        #{c.loan_account_number || 'Loan'} · Receipt #{c.receipt_number || c.id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(c.amount_collected || c.amount || 0)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {c.payment_method || 'CASH'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewDetailsSub(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
