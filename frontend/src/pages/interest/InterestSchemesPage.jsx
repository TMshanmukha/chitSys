import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Percent,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  Calendar,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';

export default function InterestSchemesPage() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBuilderModal, setShowBuilderModal] = useState(false);

  // 7-Step Builder Wizard State
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [builderError, setBuilderError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form State
  const initialForm = {
    scheme_name: '',
    scheme_code: '',
    description: '',
    calculation_method: 'FLAT', // 'FLAT' | 'REDUCING_BALANCE' | 'INTEREST_ONLY' | 'DAILY_BALANCE'
    interest_rate: '2.0',
    rate_period: 'MONTHLY', // 'ANNUAL' | 'MONTHLY' | 'WEEKLY' | 'DAILY'
    repayment_frequency: 'MONTHLY', // 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'BULLET'
    min_principal: '5000',
    max_principal: '500000',
    default_principal: '50000',
    min_tenure_periods: '1',
    max_tenure_periods: '36',
    default_tenure_periods: '12',
    grace_period_days: '0',
    late_penalty_percent: '0',
    late_penalty_flat: '0',
    allow_part_payment: true,
    allow_advance_payment: true,
    allow_preclosure: true,
    allocation_priority: 'STANDARD',
    status: 'ACTIVE',
  };

  const [form, setForm] = useState(initialForm);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/interest/schemes');
      if (res.data?.success) {
        setSchemes(res.data.data);
      }
    } catch (err) {
      setError('Failed to load interest schemes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const openBuilder = () => {
    setForm(initialForm);
    setStep(1);
    setBuilderError('');
    setPreviewData(null);
    setShowBuilderModal(true);
  };

  const handleNextStep = async () => {
    setBuilderError('');
    if (step === 1) {
      if (!form.scheme_name.trim() || !form.scheme_code.trim()) {
        setBuilderError('Please provide Scheme Name and unique Scheme Code.');
        return;
      }
    }

    if (step === 6) {
      // Step 6 -> 7: Fetch live preview
      try {
        setPreviewLoading(true);
        const res = await api.post('/interest/schemes/preview', {
          principal: parseFloat(form.default_principal) || 50000,
          interest_rate: parseFloat(form.interest_rate) || 18,
          rate_period: form.rate_period,
          calculation_method: form.calculation_method,
          repayment_frequency: form.repayment_frequency,
          tenure_periods: parseInt(form.default_tenure_periods, 10) || 12,
        });
        if (res.data?.success) {
          setPreviewData(res.data.data);
        }
      } catch (err) {
        setBuilderError('Could not compute schedule preview');
      } finally {
        setPreviewLoading(false);
      }
    }

    setStep((prev) => Math.min(prev + 1, 7));
  };

  const handlePrevStep = () => {
    setBuilderError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBuilderError('');

    try {
      const res = await api.post('/interest/schemes', form);
      if (res.data?.success) {
        setShowBuilderModal(false);
        fetchSchemes();
      }
    } catch (err) {
      setBuilderError(err.response?.data?.message || 'Failed to save scheme');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-heading">
            Configurable Scheme Builder
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create and manage financial lending products with flexible interest calculation rules.
          </p>
        </div>

        <button
          type="button"
          onClick={openBuilder}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer font-heading"
        >
          <Plus className="w-4 h-4" />
          <span>New Financial Scheme</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Schemes Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading configurable lending schemes...</p>
        </div>
      ) : schemes.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Percent className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Schemes Created Yet</p>
          <p className="text-xs text-slate-500 mt-1">Click New Financial Scheme to launch the 7-step builder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {schemes.map((s) => {
            const isFlat = s.calculation_method === 'FLAT';
            const isReducing = s.calculation_method === 'REDUCING_BALANCE';
            const isBullet = s.calculation_method === 'INTEREST_ONLY';
            const isDaily = s.calculation_method === 'DAILY_BALANCE';

            return (
              <div
                key={s.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {s.scheme_code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-heading">
                    {s.scheme_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {s.description || 'Configurable lending product with automated schedule breakdown.'}
                  </p>

                  {/* Method Tag & Rate */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Calculation Model:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-bold font-heading">
                        {isFlat && 'Flat Rate'}
                        {isReducing && 'Reducing Balance (EMI)'}
                        {isBullet && 'Interest-Only (Bullet)'}
                        {isDaily && 'Daily Balance'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Interest Rate:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                        {s.interest_rate}% / {s.rate_period.toLowerCase()}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Repayment Frequency:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-bold font-mono">
                        {s.repayment_frequency}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Tenure: {s.min_tenure_periods}–{s.max_tenure_periods} periods</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    Def: ₹{Number(s.default_principal).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7-Step Interactive Scheme Builder Modal */}
      {showBuilderModal && (
        <ModalPortal
          id="interest-scheme-builder-modal"
          isOpen={showBuilderModal}
          onClose={() => setShowBuilderModal(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] flex flex-col">
            {/* Header with Steps */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-heading">
                    Step {step} of 7
                  </span>
                  <span className="text-xs text-slate-400">
                    {step === 1 && 'Basic Scheme Identity'}
                    {step === 2 && 'Loan Amounts & Limits'}
                    {step === 3 && 'Interest Calculation Model'}
                    {step === 4 && 'Repayment Intervals'}
                    {step === 5 && 'Late Fees & Rules'}
                    {step === 6 && 'Payment Allocation Priority'}
                    {step === 7 && 'Schedule Preview & Activation'}
                  </span>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-heading mt-0.5">
                  Financial Scheme Builder
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBuilderModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {builderError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{builderError}</span>
              </div>
            )}

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                      Scheme Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.scheme_name}
                      onChange={(e) => setForm({ ...form, scheme_name: e.target.value })}
                      placeholder="e.g. Standard Monthly Reducing EMI Loan"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                      Unique Scheme Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.scheme_code}
                      onChange={(e) => setForm({ ...form, scheme_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. EMI-REDUCE-12M"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                      Scheme Description
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Outline the product purpose, borrower category, and business terms..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Min Principal (₹)
                      </label>
                      <input
                        type="number"
                        value={form.min_principal}
                        onChange={(e) => setForm({ ...form, min_principal: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Default Principal (₹)
                      </label>
                      <input
                        type="number"
                        value={form.default_principal}
                        onChange={(e) => setForm({ ...form, default_principal: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Max Principal (₹)
                      </label>
                      <input
                        type="number"
                        value={form.max_principal}
                        onChange={(e) => setForm({ ...form, max_principal: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Min Tenure Periods
                      </label>
                      <input
                        type="number"
                        value={form.min_tenure_periods}
                        onChange={(e) => setForm({ ...form, min_tenure_periods: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Default Tenure
                      </label>
                      <input
                        type="number"
                        value={form.default_tenure_periods}
                        onChange={(e) => setForm({ ...form, default_tenure_periods: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Max Tenure Periods
                      </label>
                      <input
                        type="number"
                        value={form.max_tenure_periods}
                        onChange={(e) => setForm({ ...form, max_tenure_periods: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 font-heading">
                      Select Calculation Method
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { id: 'FLAT', title: 'Flat Rate Interest', desc: 'Total interest calculated upfront on initial principal' },
                        { id: 'REDUCING_BALANCE', title: 'Reducing Balance EMI', desc: 'Interest charged only on remaining unpaid balance' },
                        { id: 'INTEREST_ONLY', title: 'Interest-Only (Bullet)', desc: 'Periodic interest only; full principal at maturity' },
                        { id: 'DAILY_BALANCE', title: 'Daily Outstanding Balance', desc: 'Daily interest accrual based on end-of-day balance' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setForm({ ...form, calculation_method: m.id })}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            form.calculation_method === m.id
                              ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white font-heading">
                            {m.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {m.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.interest_rate}
                        onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Rate Stated In Period
                      </label>
                      <select
                        value={form.rate_period}
                        onChange={(e) => setForm({ ...form, rate_period: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      >
                        <option value="MONTHLY">Monthly (% / Month)</option>
                        <option value="ANNUAL">Annual (% Per Annum)</option>
                        <option value="DAILY">Daily (% / Day)</option>
                        <option value="WEEKLY">Weekly (% / Week)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                      Repayment Frequency
                    </label>
                    <select
                      value={form.repayment_frequency}
                      onChange={(e) => setForm({ ...form, repayment_frequency: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    >
                      <option value="MONTHLY">Monthly Installments</option>
                      <option value="DAILY">Daily Route Collections</option>
                      <option value="WEEKLY">Weekly Repayments</option>
                      <option value="BULLET">Bullet (Full at Maturity)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                      Grace Period (Days before penalty)
                    </label>
                    <input
                      type="number"
                      value={form.grace_period_days}
                      onChange={(e) => setForm({ ...form, grace_period_days: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Late Penalty (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.late_penalty_percent}
                        onChange={(e) => setForm({ ...form, late_penalty_percent: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                        Late Penalty Flat (₹)
                      </label>
                      <input
                        type="number"
                        value={form.late_penalty_flat}
                        onChange={(e) => setForm({ ...form, late_penalty_flat: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.allow_part_payment}
                        onChange={(e) => setForm({ ...form, allow_part_payment: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Allow Partial Payments (Subscriber can pay any amount)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.allow_advance_payment}
                        onChange={(e) => setForm({ ...form, allow_advance_payment: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Allow Advance Payments towards future installments</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.allow_preclosure}
                        onChange={(e) => setForm({ ...form, allow_preclosure: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Allow Pre-closure before maturity</span>
                    </label>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                    Payment Allocation Priority
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        form.allocation_priority === 'STANDARD'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value="STANDARD"
                        checked={form.allocation_priority === 'STANDARD'}
                        onChange={(e) => setForm({ ...form, allocation_priority: e.target.value })}
                        className="mt-1 text-indigo-600"
                      />
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white font-heading">
                          Standard Financial Order (Recommended)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          1. Penalty / Charges → 2. Interest Due → 3. Principal Due → 4. Advance
                        </div>
                      </div>
                    </label>

                    <label
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                        form.allocation_priority === 'PRINCIPAL_FIRST'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value="PRINCIPAL_FIRST"
                        checked={form.allocation_priority === 'PRINCIPAL_FIRST'}
                        onChange={(e) => setForm({ ...form, allocation_priority: e.target.value })}
                        className="mt-1 text-indigo-600"
                      />
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white font-heading">
                          Principal First Order
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          1. Principal Due directly reduces balance → 2. Interest → 3. Penalty
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4 animate-fadeIn">
                  {previewLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Generating live amortization schedule...</p>
                    </div>
                  ) : previewData ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Sample Principal</span>
                          <strong className="text-xs sm:text-sm font-mono text-slate-900 dark:text-white">
                            ₹{Number(form.default_principal).toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Estimated Installment</span>
                          <strong className="text-xs sm:text-sm font-mono text-indigo-600 dark:text-indigo-400">
                            ₹{Number(previewData.installment_amount).toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Interest Yield</span>
                          <strong className="text-xs sm:text-sm font-mono text-emerald-600 dark:text-emerald-400">
                            ₹{Number(previewData.total_interest_expected).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-slate-500 uppercase">
                        Sample Installment Schedule Preview (First 5 Rows)
                      </div>
                      <div className="overflow-x-auto max-h-48 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-bold">
                            <tr>
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">Due Date</th>
                              <th className="py-2 px-3">Principal</th>
                              <th className="py-2 px-3">Interest</th>
                              <th className="py-2 px-3">Total Due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                            {previewData.schedules?.slice(0, 5).map((row) => (
                              <tr key={row.installment_number}>
                                <td className="py-2 px-3 font-bold">{row.installment_number}</td>
                                <td className="py-2 px-3 font-sans">{row.due_date}</td>
                                <td className="py-2 px-3">₹{row.principal_due}</td>
                                <td className="py-2 px-3 text-indigo-600">₹{row.interest_due}</td>
                                <td className="py-2 px-3 font-bold">₹{row.total_due}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Footer Navigation Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              {step < 7 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer font-heading"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateScheme}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer font-heading"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Scheme...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Activate Scheme</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
