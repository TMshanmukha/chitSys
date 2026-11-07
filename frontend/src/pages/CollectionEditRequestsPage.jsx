import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import {
  FilePenLine,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  User,
  Layers,
  Receipt,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Pagination from '../components/Pagination';

export default function CollectionEditRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0, appliedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'ALL'
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Approval/Rejection action modal state
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'APPROVE', // 'APPROVE' | 'REJECT'
    request: null,
    adminNotes: '',
    submitting: false,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchRequests = async (showSpinner = false) => {
    try {
      if (showSpinner) setRefreshing(true);
      const res = await api.get('/admin/collection-edits');
      if (res.data?.success) {
        setRequests(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load collection edit requests.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterStatus !== 'ALL' && r.status !== filterStatus) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesAgent = (r.agent_name || '').toLowerCase().includes(term) || (r.agent_username || '').toLowerCase().includes(term);
        const matchesMember = (r.member_name || '').toLowerCase().includes(term) || String(r.ticket_number || '').includes(term);
        const matchesReceipt = (r.receipt_number || '').toLowerCase().includes(term);
        const matchesGroup = (r.group_name || '').toLowerCase().includes(term) || (r.group_code || '').toLowerCase().includes(term);
        if (!matchesAgent && !matchesMember && !matchesReceipt && !matchesGroup) {
          return false;
        }
      }
      return true;
    });
  }, [requests, filterStatus, searchTerm]);

  // Paginated requests
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Open action modal
  const openActionModal = (request, type) => {
    setActionModal({
      isOpen: true,
      type,
      request,
      adminNotes: type === 'APPROVE' ? 'Approved for agent correction.' : 'Rejected. Please verify physical receipt.',
      submitting: false,
    });
  };

  // Submit action (Approve or Reject)
  const submitAction = async (e) => {
    e.preventDefault();
    if (!actionModal.request) return;

    setActionModal((prev) => ({ ...prev, submitting: true }));
    setError('');
    setMessage('');

    try {
      const endpoint = actionModal.type === 'APPROVE'
        ? `/admin/collection-edits/${actionModal.request.id}/approve`
        : `/admin/collection-edits/${actionModal.request.id}/reject`;

      const res = await api.put(endpoint, {
        admin_notes: actionModal.adminNotes,
      });

      if (res.data?.success) {
        setMessage(
          actionModal.type === 'APPROVE'
            ? `✅ Request approved! Edit access unlocked ONLY for ${actionModal.request.agent_name} to correct ${actionModal.request.member_name}'s payment.`
            : `Request rejected.`
        );
        setActionModal({ isOpen: false, type: 'APPROVE', request: null, adminNotes: '', submitting: false });
        await fetchRequests();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, `Failed to ${actionModal.type === 'APPROVE' ? 'approve' : 'reject'} request.`));
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
            <FilePenLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight flex items-center gap-2">
              <span>Collection Edit Requests</span>
              {summary.pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-2xs animate-pulse">
                  {summary.pendingCount} Pending
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review and approve agent correction requests when wrong payment amounts were entered in the field.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchRequests(true)}
          disabled={refreshing}
          className="self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setFilterStatus('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            filterStatus === 'PENDING'
              ? 'bg-amber-500/10 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold uppercase font-heading">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-200 mt-2 font-heading">
            {summary.pendingCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting your approval</p>
        </div>

        <div
          onClick={() => setFilterStatus('APPROVED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            filterStatus === 'APPROVED'
              ? 'bg-blue-500/10 border-blue-400 dark:border-blue-700 ring-2 ring-blue-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-bold uppercase font-heading">
            <span>Unlocked for Agent</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-blue-200 mt-2 font-heading">
            {summary.approvedCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Agent permitted to edit</p>
        </div>

        <div
          onClick={() => setFilterStatus('APPLIED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            filterStatus === 'APPLIED'
              ? 'bg-emerald-500/10 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase font-heading">
            <span>Completed Edits</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-200 mt-2 font-heading">
            {summary.appliedCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Updated & locked</p>
        </div>

        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            filterStatus === 'ALL'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 ring-2 ring-slate-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-400 font-bold uppercase font-heading">
            <span>All Requests</span>
            <Filter className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-heading">
            {summary.totalCount || requests.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Lifetime total history</p>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button type="button" onClick={() => setMessage('')} className="p-1 rounded-lg hover:bg-emerald-100 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="p-1 rounded-lg hover:bg-rose-100 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by agent, member, ticket #, or receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['PENDING', 'APPROVED', 'APPLIED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold uppercase font-heading transition-all cursor-pointer shrink-0 ${
                filterStatus === st
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Loading collection edit requests...</p>
        </div>
      ) : paginatedRequests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/40 text-amber-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white font-heading">
            No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} edit requests found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {filterStatus === 'PENDING'
              ? 'All agent collection receipts are up-to-date with no pending edit requests.'
              : 'No collection edit records match the selected filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {paginatedRequests.map((req) => {
            const currentAmt = Number(req.current_amount || 0);
            const reqAmt = Number(req.requested_amount || 0);
            const diff = reqAmt - currentAmt;

            return (
              <div
                key={req.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Top Row: Status badge & Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    {req.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-heading">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pending Admin Approval</span>
                      </span>
                    )}
                    {req.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-heading">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Unlocked for Agent to Edit</span>
                      </span>
                    )}
                    {req.status === 'APPLIED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-heading">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Correction Applied & Locked</span>
                      </span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-heading">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Request Rejected</span>
                      </span>
                    )}

                    <span className="text-xs text-slate-400 font-medium">
                      Requested {formatDateTime(req.created_at)}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-500">
                    Receipt #{req.receipt_number}
                  </span>
                </div>

                {/* Middle Grid: Agent, Member, Chit Scheme, Amount Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Agent Details */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading block">
                      Field Agent
                    </span>
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {req.agent_name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">@{req.agent_username} · {req.agent_phone}</p>
                  </div>

                  {/* Member & Chit Scheme */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading block">
                      Subscriber & Chit Scheme
                    </span>
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {req.member_name} {req.ticket_number ? `(#${req.ticket_number})` : ''}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                      {req.group_name} ({req.group_code})
                    </p>
                  </div>

                  {/* Current Recorded Amount */}
                  <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 font-heading block">
                      Recorded Wrong Amount
                    </span>
                    <p className="font-black text-base text-rose-700 dark:text-rose-300">
                      ₹{currentAmt.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase font-mono">Mode: {req.current_payment_method}</p>
                  </div>

                  {/* Requested Correct Amount */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-heading block">
                      Requested Correct Amount
                    </span>
                    <div className="flex items-baseline gap-2">
                      <p className="font-black text-base text-emerald-700 dark:text-emerald-300">
                        ₹{reqAmt.toLocaleString('en-IN')}
                      </p>
                      <span className={`text-[11px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        ({diff >= 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 uppercase font-mono">Mode: {req.requested_payment_method}</p>
                  </div>
                </div>

                {/* Reason Strip */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold font-heading">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                    <span>Agent's Reason for Correction:</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium pl-5 italic">
                    "{req.reason}"
                  </p>
                </div>

                {/* Admin Notes if reviewed */}
                {req.admin_notes && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-bold text-slate-500">Admin Remarks: </span>
                    <span className="text-slate-700 dark:text-slate-300">{req.admin_notes}</span>
                    {req.reviewed_by_name && (
                      <span className="text-[11px] text-slate-400 ml-2">
                        · by {req.reviewed_by_name} at {formatDateTime(req.reviewed_at)}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Bar for Pending Requests */}
                {req.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => openActionModal(req, 'REJECT')}
                      className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openActionModal(req, 'APPROVE')}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black tracking-wide shadow-sm flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve & Unlock for Agent</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {filteredRequests.length > pageSize && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredRequests.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 25, 50]}
              />
            </div>
          )}
        </div>
      )}

      {/* Approve / Reject Confirmation Modal */}
      {actionModal.isOpen && actionModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${actionModal.type === 'APPROVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                  {actionModal.type === 'APPROVE' ? <ShieldCheck className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-heading">
                  {actionModal.type === 'APPROVE' ? 'Approve & Unlock Collection Edit' : 'Reject Edit Request'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, type: 'APPROVE', request: null, adminNotes: '', submitting: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {actionModal.type === 'APPROVE' ? (
                  <>
                    Are you sure you want to approve this request? Once approved, <strong>{actionModal.request.agent_name}</strong> will be granted permission to edit <strong>ONLY this specific receipt (#{actionModal.request.receipt_number}) for {actionModal.request.member_name}</strong>. No other payments or members can be modified.
                  </>
                ) : (
                  <>
                    Are you sure you want to reject this request? The original collection of <strong>₹{Number(actionModal.request.current_amount).toLocaleString('en-IN')}</strong> will remain locked in the ledger.
                  </>
                )}
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Recorded Amount:</span>
                  <span className="font-black text-rose-600">₹{Number(actionModal.request.current_amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">Proposed Correct Amount:</span>
                  <span className="font-black text-emerald-600">₹{Number(actionModal.request.requested_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 font-heading">
                  Admin Verification Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={actionModal.adminNotes}
                  onChange={(e) => setActionModal({ ...actionModal, adminNotes: e.target.value })}
                  placeholder="Enter remarks or instructions for the agent..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, type: 'APPROVE', request: null, adminNotes: '', submitting: false })}
                disabled={actionModal.submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAction}
                disabled={actionModal.submitting}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer ${
                  actionModal.type === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{actionModal.type === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

