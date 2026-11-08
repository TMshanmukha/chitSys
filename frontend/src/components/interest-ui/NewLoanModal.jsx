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
  Camera,
  Image as ImageIcon,
  Trash2,
  Printer,
  Receipt,
} from 'lucide-react';
import ModalPortal from '../ModalPortal';
import { formatDate } from '../../utils/dateUtils';

export default function NewLoanModal({ isOpen, onClose, onCreated }) {

  const [customers, setCustomers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Core Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountGiven, setAmountGiven] = useState('50000');
  const [payEvery, setPayEvery] = useState('DAILY'); // 'DAILY' | 'INTEREST_ONLY'
  const [interestValue, setInterestValue] = useState('2'); // e.g. 2%
  const [tenureCount, setTenureCount] = useState('100'); // e.g. 100 days
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const getInitialEndDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 100);
    return d.toISOString().slice(0, 10);
  };
  const [endDate, setEndDate] = useState(getInitialEndDate());

  // Inline Quick Add Customer
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustPhoto, setNewCustPhoto] = useState('');
  const [savingCust, setSavingCust] = useState(false);

  // Collapsible Advanced
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [processingFee, setProcessingFee] = useState('0');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [agentsList, setAgentsList] = useState([]);
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
        const [custRes, schemeRes, userRes, agentRes] = await Promise.all([
          api.get('/interest/customers?limit=150'),
          api.get('/interest/schemes?status=ACTIVE'),
          api.get('/interest/users').catch(() => ({ data: { data: [] } })),
          api.get('/admin/agents').catch(() => ({ data: { data: [] } })),
        ]);
        if (custRes.data?.success) setCustomers(custRes.data.data || []);
        if (schemeRes.data?.success) setSchemes(schemeRes.data.data || []);

        const rawStaff = [...(userRes.data?.data || []), ...(agentRes.data?.data || [])];
        const uniqueStaff = [];
        const seenStaff = new Set();
        for (const u of rawStaff) {
          const id = u.id || u.user_id;
          if (id && !seenStaff.has(String(id))) {
            seenStaff.add(String(id));
            const role = (u.role || '').toUpperCase();
            if (role === 'COLLECTION_AGENT' || role === 'ADMIN' || role === 'OWNER' || role === 'SUPER_ADMIN') {
              uniqueStaff.push({
                id: String(id),
                full_name: u.full_name || u.name || u.username,
                phone: u.phone || '',
                role: u.role,
              });
            }
          }
        }
        setAgentsList(uniqueStaff);
        if (uniqueStaff.length === 1 && !assignedAgentId) {
          setAssignedAgentId(uniqueStaff[0].id);
        }
      } catch (_) {
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchPrerequisites();
    setCreatedLoan(null);
    setError('');
  }, [isOpen]);

  // Handle Date & Duration Changes
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val && endDate) {
      const d1 = new Date(val);
      const d2 = new Date(endDate);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
      const days = diff > 0 ? diff : 1;
      setTenureCount(String(days));
    }
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    if (startDate && val) {
      const d1 = new Date(startDate);
      const d2 = new Date(val);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
      const days = diff > 0 ? diff : 1;
      setTenureCount(String(days));
    }
  };

  const handleDurationChange = (val) => {
    const days = parseInt(val, 10) || 1;
    setTenureCount(String(days));
    if (startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + days);
      setEndDate(d.toISOString().slice(0, 10));
    }
  };

  const handleNewCustPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCustPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Summary Calculation Engine
  const liveSummary = useMemo(() => {
    const P = parseFloat(amountGiven) || 0;
    const N = Math.max(1, parseInt(tenureCount, 10) || 1);
    const rateVal = parseFloat(interestValue) || 0;

    if (payEvery === 'INTEREST_ONLY') {
      const monthlyInterest = Math.round((P * (rateVal / 100)));
      const durationInMonths = Math.max(1, Math.round(N / 30));
      const totalInterest = monthlyInterest * durationInMonths;
      const totalPayable = P + totalInterest;
      return {
        principal: P,
        installmentAmt: monthlyInterest,
        totalPayable,
        profit: totalInterest,
        isVaddi: false,
        summaryText: `Customer pays ₹${monthlyInterest.toLocaleString('en-IN')} interest monthly · Principal ₹${P.toLocaleString('en-IN')} returnable at maturity or anytime.`,
      };
    }

    // Daily Installments:
    // Interest % is calculated on the duration in months (N / 30)
    const durationInMonths = N / 30;
    const totalInterest = Math.round(P * (rateVal / 100) * durationInMonths);
    const totalPayable = P + totalInterest;
    const installmentAmt = Math.round(totalPayable / N);

    return {
      principal: P,
      installmentAmt,
      totalPayable,
      profit: totalInterest,
      isVaddi: false,
      summaryText: `Customer pays ₹${installmentAmt.toLocaleString('en-IN')} daily for ${N} days · Total customer returns ₹${totalPayable.toLocaleString('en-IN')} · Your profit ₹${totalInterest.toLocaleString('en-IN')}`,
    };
  }, [amountGiven, payEvery, interestValue, tenureCount]);

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
        photo_url: newCustPhoto || null,
      });
      if (res.data?.success) {
        const created = res.data.data;
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomerId(String(created.id));
        setShowAddCustomer(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
        setNewCustPhoto('');
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
    if (!assignedAgentId) {
      setError('⚠️ Collection Agent Required: Please select an agent to assign this loan to.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const isDaily = payEvery === 'DAILY';
      const isVaddi = payEvery === 'MONTHLY_VADDI' || payEvery === 'INTEREST_ONLY';
      const effCalcMethod = isVaddi ? 'INTEREST_ONLY' : 'FLAT';
      const effFrequency = isVaddi ? 'MONTHLY' : (isDaily ? 'DAILY' : 'MONTHLY');
      const effRate = parseFloat(interestValue) || 2;
      const effTenure = parseInt(tenureCount, 10) || (isDaily ? 100 : 12);

      const payload = {
        customer_id: selectedCustomerId,
        scheme_id: getMatchedSchemeId(),
        principal_amount: P,
        interest_rate: effRate,
        rate_period: 'MONTHLY',
        calculation_method: effCalcMethod,
        repayment_frequency: effFrequency,
        tenure_periods: effTenure,
        disbursement_date: startDate || getServerYMD(),
        first_due_date: startDate || getServerYMD(),
        assigned_agent_id: assignedAgentId || null,
        processing_fee: parseFloat(processingFee) || 0,
        purpose: loanPurpose || 'General Business / Personal',
        notes: `Disbursed via FinLend Pro (${payEvery})`,
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

  const handlePrintLoanReceipt = () => {
    if (!createdLoan) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Loan Disbursement Receipt - ${createdLoan.loan_account_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #0f172a; margin: 0; max-width: 540px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #312e81; padding-bottom: 14px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 900; color: #4338ca; letter-spacing: 0.5px; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600; text-transform: uppercase; }
            .amount-box { text-align: center; background: #eef2ff; border: 1.5px solid #c7d2fe; padding: 14px; border-radius: 12px; margin: 16px 0; }
            .amount { font-size: 28px; font-weight: 900; color: #1e1b4b; }
            .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
            .signs { display: flex; justify-content: space-between; margin-top: 48px; font-size: 12px; font-weight: bold; padding: 0 12px; }
            .sign-line { border-top: 1px solid #94a3b8; width: 140px; text-align: center; padding-top: 6px; }
            .footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">FINLEND PRO</div>
            <div class="subtitle">Official Loan Disbursement Voucher</div>
          </div>
          <div class="amount-box">
            <div style="font-size: 12px; font-weight: 600; color: #4338ca; text-transform: uppercase;">Disbursed Principal Amount</div>
            <div class="amount">₹${Number(amountGiven).toLocaleString('en-IN')}</div>
            <div style="font-size: 12px; color: #4f46e5; margin-top: 4px; font-family: monospace; font-weight: 700;">Account #${createdLoan.loan_account_number}</div>
          </div>
          <div class="row"><span>Borrower Name:</span><strong>${createdLoan.customer_name || 'Customer'}</strong></div>
          <div class="row"><span>Sanction Date:</span><strong>${formatDate(startDate)}</strong></div>
          <div class="row"><span>Tenure Period:</span><strong>${formatDate(startDate)} to ${formatDate(endDate)} (${tenureCount} days)</strong></div>
          <div class="row"><span>Repayment Mode:</span><strong>${payEvery === 'DAILY' ? 'Daily' : 'Monthly'}</strong></div>
          <div class="row"><span>Installment Amount:</span><strong>₹${Number(liveSummary.installmentAmt).toLocaleString('en-IN')}</strong></div>
          <div class="row"><span>Total Expected Return:</span><strong>₹${Number(liveSummary.totalPayable).toLocaleString('en-IN')}</strong></div>
          <div class="signs">
            <div class="sign-line">Authorized Signatory</div>
            <div class="sign-line">Borrower Signature</div>
          </div>
          <div class="footer">Generated via FinLend Pro · Computerized Receipt Voucher</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal id="new-loan-modal" isOpen={isOpen} onClose={onClose} preventBackdropClose={true}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full sm:max-w-lg bg-white dark:bg-[#0c1220] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header - Fixed at Top */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-heading">
              New Loan
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

        {/* Scrollable Body (Only scrolls if on small mobile screen or quick-registering customer) */}
        <div className="overflow-y-auto px-5 sm:px-6 py-4 flex-1 space-y-3.5">
          {/* ========================================================= */}
          {/* SUCCESS STATE                                             */}
          {/* ========================================================= */}
          {createdLoan ? (
            <div className="py-2 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm animate-successPop">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Disbursed to {createdLoan.customer_name}
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight block mt-0.5">
                  ₹{Number(amountGiven).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                  Account #{createdLoan.loan_account_number}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Installment:</span>
                  <strong className="font-mono">₹{liveSummary.installmentAmt.toLocaleString('en-IN')} ({payEvery === 'DAILY' ? 'Daily' : 'Monthly Interest'})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Return:</span>
                  <strong className="font-mono">₹{liveSummary.totalPayable.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Disbursed On:</span>
                  <strong className="font-mono">{formatDate(startDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Period:</span>
                  <strong className="font-mono">{formatDate(startDate)} to {formatDate(endDate)} ({tenureCount} days)</strong>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleShareLoanWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm font-heading cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share Loan Details on WhatsApp</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrintLoanReceipt}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors font-heading cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center transition-colors font-heading cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* COMPACT 1-PAGE LOAN FORM                                  */
            /* ========================================================= */
            <form onSubmit={handleDisburseLoan} className="space-y-3">
              
              {/* Field 1: Customer Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                    1. Borrower Customer *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(!showAddCustomer)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-heading cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showAddCustomer ? 'Select Existing' : 'Add New Customer'}</span>
                  </button>
                </div>

                {showAddCustomer ? (
                  <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 font-heading block">
                      Quick Register Customer
                    </span>

                    {/* Customer Photo Upload (Gallery / Camera) */}
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                        {newCustPhoto ? (
                          <img src={newCustPhoto} alt="Customer" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block">
                          Customer Photo
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold cursor-pointer hover:bg-indigo-100">
                            <ImageIcon className="w-3 h-3" />
                            <span>Gallery</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleNewCustPhotoUpload}
                              className="hidden"
                            />
                          </label>

                          <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold cursor-pointer hover:bg-emerald-100">
                            <Camera className="w-3 h-3" />
                            <span>Camera</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleNewCustPhotoUpload}
                              className="hidden"
                            />
                          </label>

                          {newCustPhoto && (
                            <button
                              type="button"
                              onClick={() => setNewCustPhoto('')}
                              className="p-0.5 rounded text-rose-500 hover:bg-rose-50 text-[10px] font-bold"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Village / Area / Address (Optional)"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCustomer}
                      disabled={savingCust || !newCustName || !newCustPhone}
                      className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 font-heading cursor-pointer"
                    >
                      {savingCust ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save & Select Customer'}
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Borrower --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}{c.phone ? ` · ${c.phone}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Field 2: Amount Given & Repayment Mode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                    2. Amount Given (₹) *
                  </label>
                  {/* Inline Mode Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-slate-200/60 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setPayEvery('DAILY')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        payEvery === 'DAILY'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayEvery('INTEREST_ONLY')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        payEvery === 'INTEREST_ONLY'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amountGiven}
                    onChange={(e) => setAmountGiven(e.target.value)}
                    placeholder="50000"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Field 3: Loan Period (From Date & To Date) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                  3. Loan Period (From & To Date) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                      From Date
                    </span>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                      To Date
                    </span>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Field 4: Interest Setting & Tenure Duration */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Interest Input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                    4. Interest (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={interestValue}
                      onChange={(e) => setInterestValue(e.target.value)}
                      placeholder="2"
                      className="w-full pl-3 pr-7 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      %
                    </span>
                  </div>
                </div>

                {/* Duration Days (Auto calculated from From & To dates) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                    Duration (Days) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={tenureCount}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      placeholder="100"
                      className="w-full pl-3 pr-11 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                      Days
                    </span>
                  </div>
                </div>
              </div>

              {/* Field 5: Assigned Collection Agent */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                  5. Assign Field Collection Agent *
                </label>
                <select
                  required
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-heading"
                >
                  <option value="">-- Choose Field Collection Agent --</option>
                  {agentsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} {a.phone ? `(${a.phone})` : ''} - {a.role === 'COLLECTION_AGENT' ? 'Agent' : 'Staff'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Assigned agent will see this borrower on their daily route and collection sheet.
                </p>
              </div>

              {/* LIVE SUMMARY CARD (Compact) */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug">
                  {liveSummary.summaryText}
                </div>
              </div>

              {/* Collapsed More Options Link */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-heading"
                >
                  {showMoreOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showMoreOptions ? 'Hide additional options' : 'More options (processing fee, date, notes)'}</span>
                </button>

                {showMoreOptions && (
                  <div className="p-3 mt-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Processing Fee (₹)</label>
                        <input
                          type="number"
                          value={processingFee}
                          onChange={(e) => setProcessingFee(e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Purpose / Notes</label>
                      <input
                        type="text"
                        value={loanPurpose}
                        onChange={(e) => setLoanPurpose(e.target.value)}
                        placeholder="e.g. Shop renovation, personal"
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Primary Disburse Button */}
              <button
                type="submit"
                disabled={submitting || !selectedCustomerId || !amountGiven}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm font-heading cursor-pointer transition-all hover:-translate-y-0.5 mt-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Disbursing Loan...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    <span>Give Loan</span>
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

