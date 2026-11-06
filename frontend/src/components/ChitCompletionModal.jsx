import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  Search,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import ModalPortal from './ModalPortal';

export default function ChitCompletionModal({ group, isOpen, onClose, onCompleted }) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (!isOpen || !group?.id) return;

    let isMounted = true;
    async function fetchGroupData() {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/admin/groups/${group.id}`);
        if (isMounted) {
          if (res.data?.success) {
            setDetails(res.data.data);
          } else {
            setError(res.data?.message || 'Failed to fetch chit scheme details');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Error loading chit audit data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchGroupData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, group?.id]);

  if (!isOpen || !group) return null;

  const isDaily = group.frequency === 'DAILY' || group.route_category === 'DAILY_ROUTE';
  const totalPeriods = parseInt(group.duration_periods, 10) || (isDaily ? 100 : 20);
  const installmentAmt = parseFloat(group.installment_amount) || 0;
  const periodLabel = isDaily ? 'Days' : 'Months';
  const singularLabel = isDaily ? 'Day' : 'Month';

  // Elapsed duration from chit start date
  let elapsedPeriods = 0;
  if (group.start_date) {
    const start = new Date(group.start_date);
    const now = new Date();
    if (isDaily) {
      const diffMs = now.getTime() - start.getTime();
      elapsedPeriods = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      elapsedPeriods = Math.max(0, diffMonths);
    }
  }
  const periodsRemaining = Math.max(0, totalPeriods - elapsedPeriods);

  const members = details?.members || [];
  const totalRequiredPerMember = totalPeriods * installmentAmt;

  const memberLedger = members.map((m) => {
    const paid = parseFloat(m.total_paid_in_group || 0);
    const pendingDue = Math.max(0, totalRequiredPerMember - paid);
    const daysPaid = installmentAmt > 0 ? Math.floor(paid / installmentAmt) : 0;
    const daysLeft = Math.max(0, totalPeriods - daysPaid);
    return {
      ...m,
      totalPaid: paid,
      pendingDue,
      daysPaid,
      daysLeft,
      isFullyPaid: pendingDue === 0,
    };
  });

  const sumTotalRequired = memberLedger.length * totalRequiredPerMember;
  const sumTotalPaid = memberLedger.reduce((acc, m) => acc + m.totalPaid, 0);
  const sumTotalPendingDue = memberLedger.reduce((acc, m) => acc + m.pendingDue, 0);
  const membersWithDue = memberLedger.filter((m) => m.pendingDue > 0);

  // Criteria for completion:
  // 1) 0 days remaining
  // 2) Every member has 0 due
  const isDurationComplete = periodsRemaining <= 0;
  const areAllMembersCleared = members.length > 0 && sumTotalPendingDue === 0 && membersWithDue.length === 0;
  const canComplete = isDurationComplete && areAllMembersCleared;

  const filteredMembers = memberLedger.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      String(m.ticket_number || '').includes(q)
    );
  });

  const handleConfirmComplete = async () => {
    if (!canComplete) return;
    setCompleting(true);
    setError('');
    try {
      const res = await api.post(`/admin/groups/${group.id}/complete`);
      if (res.data?.success) {
        if (onCompleted) onCompleted(res.data.message);
        onClose();
      } else {
        setError(res.data?.message || 'Failed to complete chit group');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error completing chit group');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <ModalPortal id="chit-completion-modal" isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-fadeIn">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                {group.group_code}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {isDaily ? '🚚 Daily Route Scheme' : '🏛️ Monthly Auction Scheme'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                Current Status: {group.status || 'ACTIVE'}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              Chit Scheme Closure & Completion Audit
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scheme: <strong>{group.group_name}</strong> · Territory: <strong>{group.location_name || 'All Territory'}</strong> · Start: <strong>{group.start_date ? formatDate(group.start_date) : 'N/A'}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 2-Column Status Check Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            
            {/* 1. Timeline / Duration Condition */}
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              isDurationComplete
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Condition 1: Days / Duration Maturity
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  isDurationComplete
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                }`}>
                  {isDurationComplete ? '✓ Completed' : '⚠️ Pending'}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {periodsRemaining}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 ml-1">
                    {periodLabel.toLowerCase()} left
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500 block">Total: <strong>{totalPeriods} {periodLabel}</strong></span>
                  <span className="text-slate-500 block">Elapsed: <strong>{elapsedPeriods} {periodLabel}</strong></span>
                </div>
              </div>

              <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {isDurationComplete ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All {totalPeriods} {periodLabel.toLowerCase()} have elapsed. Time requirement fulfilled.
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Chit cannot complete yet. {periodsRemaining} {periodLabel.toLowerCase()} still remaining.
                  </span>
                )}
              </div>
            </div>

            {/* 2. Member Balances / Dues Condition */}
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              areAllMembersCleared
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Condition 2: Subscriber Dues Zero Balance
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  areAllMembersCleared
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                }`}>
                  {areAllMembersCleared ? '✓ Cleared' : '⚠️ Dues Unpaid'}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    ₹{sumTotalPendingDue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 ml-1">
                    total pending due
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500 block">Members: <strong>{members.length}</strong></span>
                  <span className={`font-bold block ${membersWithDue.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {membersWithDue.length} with dues
                  </span>
                </div>
              </div>

              <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {areAllMembersCleared ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All members have paid 100%. Total due is ₹0.
                  </span>
                ) : (
                  <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Chit cannot complete yet. {membersWithDue.length} member(s) have unpaid dues.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Member Dues Audit Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Subscriber Ledger & Due Audit ({members.length} Members)
                </h4>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter member or phone..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] z-10">
                    <tr>
                      <th className="py-2.5 px-3">Ticket</th>
                      <th className="py-2.5 px-3">Subscriber</th>
                      <th className="py-2.5 px-3 text-center">Paid {periodLabel}</th>
                      <th className="py-2.5 px-3 text-center">Pending {periodLabel}</th>
                      <th className="py-2.5 px-3 text-right">Required (₹)</th>
                      <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                      <th className="py-2.5 px-3 text-right">Pending Due (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400">Loading subscriber audit ledger...</td>
                      </tr>
                    ) : filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400">No subscribers enrolled or matching search.</td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr key={m.member_id || m.ticket_number} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                            #{m.ticket_number}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900 dark:text-white uppercase truncate max-w-[180px]">
                              {m.full_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {m.phone}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600">
                            {m.daysPaid}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-amber-600">
                            {m.daysLeft}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            ₹{totalRequiredPerMember.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                            ₹{m.totalPaid.toLocaleString('en-IN')}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${m.pendingDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                            ₹{m.pendingDue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {m.isFullyPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                ✓ Cleared
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                ⚠️ Due
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t border-slate-200 dark:border-slate-700 text-xs">
                    <tr>
                      <td colSpan="4" className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        TOTALS ({memberLedger.length} Subscribers)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                        ₹{sumTotalRequired.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{sumTotalPaid.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        ₹{sumTotalPendingDue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {areAllMembersCleared ? '✓ 100%' : `${membersWithDue.length} Dues`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Conclusion Sentence Box */}
          <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
            canComplete
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 shadow-sm'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-900 text-rose-950 dark:text-rose-100 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
              {canComplete ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400">Closure Verification: Fully Eligible for Completion</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="text-rose-700 dark:text-rose-400">Closure Verification: Ineligible for Completion</span>
                </>
              )}
            </div>

            <p className="text-xs sm:text-sm mt-2 leading-relaxed">
              {canComplete ? (
                <>
                  <strong>Conclusion:</strong> All <strong>{totalPeriods} {periodLabel.toLowerCase()}</strong> are finished (0 days remaining) and all <strong>{members.length} subscribers</strong> have paid 100% of their installments with <strong>₹0 pending dues</strong>. This chit scheme is completely settled and eligible to be closed and moved to <strong>Completed / Inactive Schemes</strong>.
                </>
              ) : (
                <>
                  <strong>Conclusion:</strong> This chit cannot be completed because{' '}
                  {periodsRemaining > 0 && sumTotalPendingDue > 0 ? (
                    <>
                      <strong>{periodsRemaining} {periodLabel.toLowerCase()}</strong> are still remaining until maturity, and{' '}
                      <strong>{membersWithDue.length} subscriber(s)</strong> have unpaid dues totaling{' '}
                      <strong>₹{sumTotalPendingDue.toLocaleString('en-IN')}</strong>.
                    </>
                  ) : periodsRemaining > 0 ? (
                    <>
                      <strong>{periodsRemaining} {periodLabel.toLowerCase()}</strong> are still remaining until maturity.
                    </>
                  ) : (
                    <>
                      <strong>{membersWithDue.length} subscriber(s)</strong> have unpaid dues totaling{' '}
                      <strong>₹{sumTotalPendingDue.toLocaleString('en-IN')}</strong>.
                    </>
                  )}{' '}
                  A chit scheme can only be marked completed when <strong>0 {periodLabel.toLowerCase()} remain</strong> and <strong>every member has zero pending due</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs sm:text-sm transition-colors cursor-pointer text-center"
          >
            Cancel / Return
          </button>

          <button
            type="button"
            disabled={!canComplete || completing}
            onClick={handleConfirmComplete}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
              !canComplete || completing
                ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer ring-2 ring-emerald-500/30'
            }`}
          >
            {completing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Marking Scheme as Completed...</span>
              </>
            ) : !canComplete ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Cannot Complete (Criteria Unmet)</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm & Mark Chit as Completed</span>
              </>
            )}
          </button>
        </div>

      </div>
    </ModalPortal>
  );
}
