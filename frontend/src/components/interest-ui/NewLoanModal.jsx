import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  X,
  UserPlus,
  Coins,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Share2,
} from 'lucide-react';
import ModalPortal from '../ModalPortal';
import { useLanguage } from './LanguageContext';
import { formatDate } from '../../utils/dateUtils';

export default function NewLoanModal({ isOpen, onClose, onCreated }) {
  const { t } = useLanguage();

  const [customers, setCustomers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Core 4 Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountGiven, setAmountGiven] = useState('50000');
  const [payEvery, setPayEvery] = useState('DAILY'); // 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MONTHLY_VADDI'
  const [interestType, setInterestType] = useState('PERCENT_MONTHLY'); // 'PERCENT_MONTHLY' | 'FIXED_PER_INST'
  const [interestValue, setInterestValue] = useState('2'); // e.g. 2% per month or ₹500 flat
  const [tenureCount, setTenureCount] = useState('100'); // e.g. 100 days, 20 weeks, 12 months
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Inline Quick Add Customer
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [savingCust, setSavingCust] = useState(false);

  // Collapsible Advanced
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [processingFee, setProcessingFee] = useState('0');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  // Submission & Success
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdLoan, setCreatedLoan] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchPrerequisites = async () => {
      try {
        setLoadingInitial(true);
        const [custRes, schemeRes] = await Promise.all([
          api.get('/interest/customers?limit=150'),
          api.get('/interest/schemes?status=ACTIVE'),
        ]);
        if (custRes.data?.success) setCustomers(custRes.data.data || []);
        if (schemeRes.data?.success) setSchemes(schemeRes.data.data || []);
      } catch (_) {
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchPrerequisites();
    setCreatedLoan(null);
    setError('');
  }, [isOpen]);

  // Adjust default tenure when payEvery changes
  const handlePayEveryChange = (val) => {
    setPayEvery(val);
    if (val === 'DAILY') {
      setTenureCount('100');
      setInterestType('FIXED_PER_INST');
      setInterestValue('500'); // e.g. 50,000 gives 550 daily for 100 days
    } else if (val === 'WEEKLY') {
      setTenureCount('20');
      setInterestType('PERCENT_MONTHLY');
      setInterestValue('2');
    } else if (val === 'MONTHLY') {
      setTenureCount('12');
      setInterestType('PERCENT_MONTHLY');
      setInterestValue('2');
    } else if (val === 'MONTHLY_VADDI') {
      setTenureCount('12'); // open-ended or 12 month cycle
      setInterestType('PERCENT_MONTHLY');
      setInterestValue('2'); // 2% per month bullet
    }
  };

  // Live Summary Calculation Engine
  const liveSummary = useMemo(() => {
    const P = parseFloat(amountGiven) || 0;
    const N = Math.max(1, parseInt(tenureCount, 10) || 1);
    const rateVal = parseFloat(interestValue) || 0;

    let totalInterest = 0;
    let installmentAmt = 0;
    let totalPayable = 0;

    if (payEvery === 'MONTHLY_VADDI') {
      // Interest-Only / Vaddi Vyaparam: Monthly interest = P * (rate / 100)
      const monthlyInterest = Math.round((P * (rateVal / 100)));
      installmentAmt = monthlyInterest;
      totalInterest = monthlyInterest * N;
      totalPayable = P + totalInterest;
      return {
        principal: P,
        installmentAmt,
        totalPayable,
        profit: totalInterest,
        isVaddi: true,
        summaryText: `Customer pays ₹${monthlyInterest.toLocaleString('en-IN')} interest monthly · Principal ₹${P.toLocaleString('en-IN')} returnable at maturity or anytime.`,
      };
    }

    if (interestType === 'FIXED_PER_INST') {
      installmentAmt = rateVal > 0 ? rateVal : Math.round(P / N);
      totalPayable = Math.round(installmentAmt * N);
      totalInterest = Math.max(0, totalPayable - P);
    } else {
      // Percentage per month
      let durationInMonths = 1;
      if (payEvery === 'DAILY') durationInMonths = N / 30;
      else if (payEvery === 'WEEKLY') durationInMonths = (N * 7) / 30;
      else durationInMonths = N;

      totalInterest = Math.round(P * (rateVal / 100) * durationInMonths);
      totalPayable = P + totalInterest;
      installmentAmt = Math.round(totalPayable / N);
    }

    const unitWord = payEvery === 'DAILY' ? 'daily' : payEvery === 'WEEKLY' ? 'weekly' : 'monthly';
    const periodUnit = payEvery === 'DAILY' ? 'days' : payEvery === 'WEEKLY' ? 'weeks' : 'months';

    return {
      principal: P,
      installmentAmt,
      totalPayable,
      profit: totalInterest,
      isVaddi: false,
      summaryText: `Customer pays ₹${installmentAmt.toLocaleString('en-IN')} ${unitWord} for ${N} ${periodUnit} · Total customer returns ₹${totalPayable.toLocaleString('en-IN')} · Your profit ₹${totalInterest.toLocaleString('en-IN')}`,
    };
  }, [amountGiven, payEvery, interestType, interestValue, tenureCount]);

  // Handle Quick Add Customer
  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;
    try {
      setSavingCust(true);
      const res = await api.post('/interest/customers', {
        full_name: newCustName,
        phone: newCustPhone,
        address: newCustAddress || 'Local Area',
      });
      if (res.data?.success) {
        const created = res.data.data;
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomerId(String(created.id));
        setShowAddCustomer(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setSavingCust(false);
    }
  };

  // Find or Auto-Match Scheme
  const getMatchedSchemeId = () => {
    // Look for matching scheme in schemes list or use first active
    let method = 'FLAT';
    let freq = payEvery === 'MONTHLY_VADDI' ? 'MONTHLY' : payEvery;
    if (payEvery === 'MONTHLY_VADDI') method = 'INTEREST_ONLY';
    else if (payEvery === 'MONTHLY' && interestType === 'PERCENT_MONTHLY') method = 'REDUCING_BALANCE';

    const found = schemes.find((s) => s.calculation_method === method && s.repayment_frequency === freq);
    if (found) return found.id;
    return schemes[0]?.id || 1;
  };

  const handleDisburseLoan = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a borrower customer.');
      return;
    }
    const P = parseFloat(amountGiven);
    if (isNaN(P) || P <= 0) {
      setError('Please enter a valid loan amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        customer_id: selectedCustomerId,
        scheme_id: getMatchedSchemeId(),
        principal_amount: P,
        tenure_periods: parseInt(tenureCount, 10) || 12,
        disbursement_date: startDate,
        processing_fee: parseFloat(processingFee) || 0,
        purpose: loanPurpose || 'General Business / Personal',
        notes: `Disbursed via simplified VeeCredit portal (${payEvery})`,
      };

      const res = await api.post('/interest/loans', payload);
      if (res.data?.success) {
        const custObj = customers.find((c) => String(c.id) === String(selectedCustomerId));
        setCreatedLoan({
          ...res.data.data,
          customer_name: custObj?.full_name || 'Borrower',
          customer_phone: custObj?.phone || '',
        });
        if (onCreated) onCreated();
      } else {
        setError(res.data?.message || 'Failed to disburse loan');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to disburse loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareLoanWhatsApp = () => {
    if (!createdLoan) return;
    const phone = createdLoan.customer_phone?.replace(/[^0-9]/g, '') || '';
    const formattedPhone = phone.length === 10 ? `91${phone}` : phone;

    const text = encodeURIComponent(
      `*FINLEND PRO - NEW LOAN APPROVED*\n` +
      `--------------------------------\n` +
      `Dear ${createdLoan.customer_name},\n` +
      `Your loan has been successfully disbursed.\n` +
      `Loan Account #: ${createdLoan.loan_account_number}\n` +
      `Principal Amount: ₹${Number(amountGiven).toLocaleString('en-IN')}\n` +
      `Installment: ₹${liveSummary.installmentAmt.toLocaleString('en-IN')} (${payEvery})\n` +
      `Start Date: ${formatDate(startDate)}\n` +
      `--------------------------------\n` +
      `FinLend Pro Lending Services`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <ModalPortal id="new-loan-modal" isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        <div className="w-full sm:max-w-lg bg-white dark:bg-[#0c1220] rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto flex flex-col space-y-4 animate-scaleUp">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-heading">
                {t('newLoan')}
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white font-heading">
                {createdLoan ? 'Loan Approved & Disbursed' : 'Give New Loan'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ========================================================= */}
          {/* SUCCESS STATE                                             */}
          {/* ========================================================= */}
          {createdLoan ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm animate-successPop">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Disbursed to {createdLoan.customer_name}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight block mt-1">
                  ₹{Number(amountGiven).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
                  Account #{createdLoan.loan_account_number}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Installment:</span>
                  <strong className="font-mono">₹{liveSummary.installmentAmt.toLocaleString('en-IN')} ({payEvery})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Return:</span>
                  <strong className="font-mono">₹{liveSummary.totalPayable.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Disbursed On:</span>
                  <strong className="font-mono">{formatDate(startDate)}</strong>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleShareLoanWhatsApp}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm font-heading cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share Loan Details on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center transition-colors font-heading cursor-pointer"
                >
                  {t('done')}
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* 1-PAGE LOAN FORM                                          */
            /* ========================================================= */
            <form onSubmit={handleDisburseLoan} className="space-y-4">
              
              {/* Field 1: Customer Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                    1. Borrower Customer *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(!showAddCustomer)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-heading cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showAddCustomer ? 'Select Existing' : '+ Add New Customer'}</span>
                  </button>
                </div>

                {showAddCustomer ? (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 font-heading block">
                      Quick Register Customer
                    </span>
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Village / Area / Address (Optional)"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCustomer}
                      disabled={savingCust || !newCustName || !newCustPhone}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 font-heading cursor-pointer"
                    >
                      {savingCust ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Select Customer'}
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Borrower --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Field 2: Amount Given */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                  2. {t('amountGiven')} (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amountGiven}
                    onChange={(e) => setAmountGiven(e.target.value)}
                    placeholder="50000"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-2xl text-2xl font-black font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Field 3: Pay Every (4 Big Pills) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1.5">
                  3. {t('payEvery')} *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'DAILY', label: t('daily') },
                    { key: 'WEEKLY', label: t('weekly') },
                    { key: 'MONTHLY', label: t('monthly') },
                    { key: 'MONTHLY_VADDI', label: t('monthlyVaddi') },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handlePayEveryChange(p.key)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer font-heading text-center ${
                        payEvery === p.key
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 4: Interest Setting & Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Interest Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                      4. {t('interest')} *
                    </label>
                    {payEvery !== 'MONTHLY_VADDI' && (
                      <button
                        type="button"
                        onClick={() => setInterestType(interestType === 'PERCENT_MONTHLY' ? 'FIXED_PER_INST' : 'PERCENT_MONTHLY')}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {interestType === 'PERCENT_MONTHLY' ? '% per mo' : 'Fixed ₹ / inst'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={interestValue}
                      onChange={(e) => setInterestValue(e.target.value)}
                      placeholder="2"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {interestType === 'PERCENT_MONTHLY' ? '%/mo' : '₹/inst'}
                    </span>
                  </div>
                </div>

                {/* Duration / Tenure */}
                {payEvery !== 'MONTHLY_VADDI' ? (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                      {t('forHowLong')} ({payEvery === 'DAILY' ? t('days') : payEvery === 'WEEKLY' ? t('weeks') : t('months')}) *
                    </label>
                    <input
                      type="number"
                      required
                      value={tenureCount}
                      onChange={(e) => setTenureCount(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                      Repayment Model
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold">
                      Open-Ended / Principal at End
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE SUMMARY CARD (Real-time updates) */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 font-heading">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Live Loan Summary</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {liveSummary.summaryText}
                </p>
              </div>

              {/* Collapsed More Options Link */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-heading"
                >
                  {showMoreOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{showMoreOptions ? 'Hide additional options' : 'More options (processing fee, date, notes)'}</span>
                </button>

                {showMoreOptions && (
                  <div className="p-3.5 mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Processing Fee (₹)</label>
                        <input
                          type="number"
                          value={processingFee}
                          onChange={(e) => setProcessingFee(e.target.value)}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Purpose / Notes</label>
                      <input
                        type="text"
                        value={loanPurpose}
                        onChange={(e) => setLoanPurpose(e.target.value)}
                        placeholder="e.g. Shop renovation, personal"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Primary Disburse Button */}
              <button
                type="submit"
                disabled={submitting || !selectedCustomerId || !amountGiven}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 font-heading cursor-pointer transition-all hover:-translate-y-0.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Disbursing Loan...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    <span>{t('giveLoan')}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
