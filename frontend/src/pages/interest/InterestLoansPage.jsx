import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import {
  Coins,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  User,
} from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import { formatDate } from '../../utils/dateUtils';

export default function InterestLoansPage() {
  const [searchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Disburse Wizard State
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [schemesList, setSchemesList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);

  // Form State
  const initialForm = {
    customer_id: '',
    scheme_id: '',
    principal_amount: '50000',
    tenure_periods: '12',
    disbursement_date: new Date().toISOString().slice(0, 10),
    first_due_date: '',
    assigned_agent_id: '',
    purpose: '',
    notes: '',
  };
  const [disburseForm, setDisburseForm] = useState(initialForm);
  const [previewSchedule, setPreviewSchedule] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disburseError, setDisburseError] = useState('');

  // Loan Detail Modal State
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [loanDetail, setLoanDetail] = useState(null);
  const [loadingLoanDetail, setLoadingLoanDetail] = useState(false);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/interest/loans?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      if (res.data?.success) {
        setLoans(res.data.data);
      }
    } catch (err) {
      setError('Failed to load loan accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [custRes, schemeRes, agentRes] = await Promise.all([
        api.get('/interest/customers?limit=100'),
        api.get('/interest/schemes?status=ACTIVE'),
        api.get('/admin/users'),
      ]);
      if (custRes.data?.success) setCustomersList(custRes.data.data);
      if (schemeRes.data?.success) setSchemesList(schemeRes.data.data);
      if (agentRes.data?.success) {
        setAgentsList(agentRes.data.data.filter((u) => u.role === 'COLLECTION_AGENT'));
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchLoans();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoans();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openDisburseModal();
    }
  }, [searchParams]);

  const openDisburseModal = () => {
    setDisburseForm(initialForm);
    setPreviewSchedule(null);
    setDisburseError('');
    setShowDisburseModal(true);
    fetchDropdownData();
  };

  const handleSchemeSelect = (schemeId) => {
    const s = schemesList.find((x) => String(x.id) === String(schemeId));
    setDisburseForm((prev) => ({
      ...prev,
      scheme_id: schemeId,
      principal_amount: s?.default_principal ? String(s.default_principal) : prev.principal_amount,
      tenure_periods: s?.default_tenure_periods ? String(s.default_tenure_periods) : prev.tenure_periods,
    }));
  };

  // Compute live schedule preview whenever principal, scheme, tenure changes
  useEffect(() => {
    if (!disburseForm.scheme_id || !disburseForm.principal_amount) return;
    const s = schemesList.find((x) => String(x.id) === String(disburseForm.scheme_id));
    if (!s) return;

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const res = await api.post('/interest/schemes/preview', {
          principal: parseFloat(disburseForm.principal_amount) || 0,
          interest_rate: parseFloat(s.interest_rate) || 0,
          rate_period: s.rate_period,
          calculation_method: s.calculation_method,
          repayment_frequency: s.repayment_frequency,
          tenure_periods: parseInt(disburseForm.tenure_periods, 10) || 12,
          start_date: disburseForm.disbursement_date,
          first_due_date: disburseForm.first_due_date || undefined,
        });
        if (res.data?.success) {
          setPreviewSchedule(res.data.data);
        }
      } catch (_) {
      } finally {
        setPreviewLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [disburseForm.scheme_id, disburseForm.principal_amount, disburseForm.tenure_periods, disburseForm.disbursement_date, disburseForm.first_due_date, schemesList]);

  const handleDisburseSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDisburseError('');

    try {
      const res = await api.post('/interest/loans', disburseForm);
      if (res.data?.success) {
        setShowDisburseModal(false);
        fetchLoans();
      }
    } catch (err) {
      setDisburseError(err.response?.data?.message || 'Failed to disburse loan');
    } finally {
      setSubmitting(false);
    }
  };

  const openLoanDetail = async (id) => {
    setSelectedLoanId(id);
    setLoanDetail(null);
    setLoadingLoanDetail(true);
    try {
      const res = await api.get(`/interest/loans/${id}`);
      if (res.data?.success) {
        setLoanDetail(res.data.data);
      }
    } catch (_) {
    } finally {
      setLoadingLoanDetail(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn font-sans pb-10">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-heading">
              Loan Portfolios
            </span>
            <span className="text-xs text-slate-400">· {loans.length} Originated Accounts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-heading mt-1">
            Loan Accounts & Repayment Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Originate, disburse, monitor amortization schedules & inspect borrower balances.
          </p>
        </div>

        <button
          type="button"
          onClick={openDisburseModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer font-heading"
        >
          <Plus className="w-4 h-4" />
          <span>Disburse New Loan</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loan account #, borrower name, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs sm:text-sm shadow-2xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-2xl border border-slate-200/60 dark:border-white/5">
          {['ALL', 'ACTIVE', 'OVERDUE', 'CLOSED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/60 dark:border-white/5">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading loan accounts...</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <Coins className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-heading">No Loans Found</p>
          <p className="text-xs text-slate-500 mt-1">Click "Disburse New Loan" to originate your first loan account.</p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-white/[0.02] text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200/60 dark:border-white/5">
                <tr>
                  <th className="py-3.5 px-4">Account #</th>
                  <th className="py-3.5 px-4">Borrower</th>
                  <th className="py-3.5 px-4">Scheme & Model</th>
                  <th className="py-3.5 px-4">Principal</th>
                  <th className="py-3.5 px-4">Installment</th>
                  <th className="py-3.5 px-4">Outstanding</th>
                  <th className="py-3.5 px-4">Disbursed Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-indigo-50/30 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {l.loan_account_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-white font-heading">{l.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.customer_phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{l.scheme_name}</div>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                        {l.calculation_method} · {l.repayment_frequency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      ₹{Number(l.principal_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{Number(l.installment_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-rose-600 dark:text-rose-400">
                      ₹{Number(l.principal_outstanding).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {formatDate(l.disbursement_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          l.loan_status === 'ACTIVE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : l.loan_status === 'OVERDUE'
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {l.loan_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openLoanDetail(l.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer font-heading shadow-2xs hover:-translate-y-0.5"
                      >
                        Schedules & Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disburse Loan Modal */}
      {showDisburseModal && (
        <ModalPortal
          id="interest-disburse-loan-modal"
          isOpen={showDisburseModal}
          onClose={() => setShowDisburseModal(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-600 font-heading">New Loan Origination</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                  Disburse Loan Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {disburseError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{disburseError}</span>
              </div>
            )}

            <form onSubmit={handleDisburseSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Select Customer */}
              <div>
                <label className="block font-bold mb-1">Select Customer / Borrower *</label>
                <select
                  required
                  value={disburseForm.customer_id}
                  onChange={(e) => setDisburseForm({ ...disburseForm, customer_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="">-- Choose Borrower --</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone}) — {c.customer_code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Scheme */}
              <div>
                <label className="block font-bold mb-1">Select Financial Lending Scheme *</label>
                <select
                  required
                  value={disburseForm.scheme_id}
                  onChange={(e) => handleSchemeSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="">-- Choose Scheme --</option>
                  {schemesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.scheme_name} [{s.scheme_code}] — {s.calculation_method} ({s.interest_rate}%/{s.rate_period.toLowerCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Principal & Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={disburseForm.principal_amount}
                    onChange={(e) => setDisburseForm({ ...disburseForm, principal_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold text-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tenure (Number of Installments) *</label>
                  <input
                    type="number"
                    required
                    value={disburseForm.tenure_periods}
                    onChange={(e) => setDisburseForm({ ...disburseForm, tenure_periods: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Dates & Agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={disburseForm.disbursement_date}
                    onChange={(e) => setDisburseForm({ ...disburseForm, disbursement_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Assign Field Collection Agent</label>
                  <select
                    value={disburseForm.assigned_agent_id}
                    onChange={(e) => setDisburseForm({ ...disburseForm, assigned_agent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="">Unassigned (Office / Self)</option>
                    {agentsList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name} ({a.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Slab */}
              {previewSchedule && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-900 dark:text-indigo-200 font-heading">
                      Live Schedule Summary
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      Matures: {previewSchedule.maturity_date}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Installment</span>
                      <strong className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                        ₹{Number(previewSchedule.installment_amount).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Interest Yield</span>
                      <strong className="text-xs font-mono font-bold text-emerald-600">
                        ₹{Number(previewSchedule.total_interest_expected).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Payable</span>
                      <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        ₹{Number(previewSchedule.total_payable).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-md font-heading"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Disburse Loan & Generate Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Loan Details & Repayment Schedule Modal */}
      {selectedLoanId && (
        <ModalPortal
          id="interest-loan-detail-modal"
          isOpen={Boolean(selectedLoanId)}
          onClose={() => setSelectedLoanId(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-600 font-heading">Loan Account Overview</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                  {loanDetail?.loan?.loan_account_number} · {loanDetail?.loan?.customer_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoanId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingLoanDetail ? (
              <div className="p-12 text-center flex-1">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-1" />
                <p className="text-xs text-slate-500">Loading repayment schedules...</p>
              </div>
            ) : loanDetail ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {/* Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Principal</span>
                    <strong>₹{Number(loanDetail.loan.principal_amount).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Outstanding</span>
                    <strong className="text-rose-600">₹{Number(loanDetail.loan.principal_outstanding).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Principal Paid</span>
                    <strong className="text-emerald-600">₹{Number(loanDetail.loan.total_principal_paid).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Interest Paid</span>
                    <strong className="text-indigo-600">₹{Number(loanDetail.loan.total_interest_paid).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Repayment Installment Schedule */}
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white font-heading mb-2">
                    Repayment Schedule ({loanDetail.schedules?.length || 0} Installments)
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3">Principal Due</th>
                          <th className="py-2 px-3">Interest Due</th>
                          <th className="py-2 px-3">Total Due</th>
                          <th className="py-2 px-3">Total Paid</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {loanDetail.schedules?.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-bold">{s.installment_number}</td>
                            <td className="py-2 px-3 font-sans">{formatDate(s.due_date)}</td>
                            <td className="py-2 px-3">₹{Number(s.principal_due).toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-indigo-600">₹{Number(s.interest_due).toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 font-bold">₹{Number(s.total_due).toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-emerald-600 font-bold">
                              ₹{Number(s.total_paid).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  s.status === 'PAID'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600'
                                    : s.status === 'PARTIAL'
                                    ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-600'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

