import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Percent,
  Plus,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/client';
import { useLanguage } from '../../components/interest-ui/LanguageContext';

export default function FinLendLoanTypesPage() {
  const navigate = useNavigate();
  const { t, formatCurrency } = useLanguage();

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Scheme Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    scheme_name: '',
    calculation_method: 'FLAT',
    interest_rate: '2.00',
    rate_period: 'MONTHLY',
    repayment_frequency: 'DAILY',
    tenure_periods: 100,
    allocation_priority: 'PRINCIPAL_FIRST',
  });

  const loadSchemes = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await api.get('/interest/schemes');
      if (res.data?.success) {
        setSchemes(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load loan schemes', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.scheme_name.trim()) {
      setFormError('Scheme name is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/interest/schemes', formData);
      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({
          scheme_name: '',
          calculation_method: 'FLAT',
          interest_rate: '2.00',
          rate_period: 'MONTHLY',
          repayment_frequency: 'DAILY',
          tenure_periods: 100,
          allocation_priority: 'PRINCIPAL_FIRST',
        });
        loadSchemes(true);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create loan scheme.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/interest/more')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('more')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadSchemes(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan Type</span>
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
          {t('loanTypes')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configured lending types and interest calculations
        </p>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {schemes.map((scheme) => (
          <div
            key={scheme.id}
            className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
                  {scheme.scheme_name}
                </h2>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {scheme.scheme_code}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                {scheme.repayment_frequency}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-white/5">
              <div>
                <span className="text-slate-400">Interest Rate:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {scheme.interest_rate}% {scheme.rate_period?.toLowerCase()}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Model:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {scheme.calculation_method}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Default Tenure:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {scheme.default_tenure_periods} installments
                </div>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {scheme.status}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Scheme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Create Loan Type
                </h3>
                <p className="text-xs text-slate-500">Configure new interest product</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateScheme} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Days Daily Micro Loan"
                  value={formData.scheme_name}
                  onChange={(e) => setFormData({ ...formData, scheme_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Repayment</label>
                  <select
                    value={formData.repayment_frequency}
                    onChange={(e) => setFormData({ ...formData, repayment_frequency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Method</label>
                  <select
                    value={formData.calculation_method}
                    onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                  >
                    <option value="FLAT">Flat Rate</option>
                    <option value="REDUCING_BALANCE">Reducing Balance</option>
                    <option value="INTEREST_ONLY">Monthly Vaddi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Interest % per Month</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Tenure (Installments)</label>
                  <input
                    type="number"
                    value={formData.tenure_periods}
                    onChange={(e) => setFormData({ ...formData, tenure_periods: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
                >
                  {saving ? 'Creating...' : 'Save Loan Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
