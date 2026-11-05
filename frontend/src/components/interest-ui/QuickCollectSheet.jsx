import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Share2,
  MessageCircle,
  Banknote,
  Smartphone,
  Building,
} from 'lucide-react';
import ModalPortal from '../ModalPortal';

export default function QuickCollectSheet({ isOpen, onClose, preselectedLoan, onCollected }) {

  const [search, setSearch] = useState('');
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'UPI' | 'BANK'
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Success State
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (preselectedLoan) {
      setSelectedLoan(preselectedLoan);
      const due = Number(preselectedLoan.current_due_amount || preselectedLoan.installment_amount || 0);
      setAmount(due > 0 ? String(due) : '');
    } else {
      setSelectedLoan(null);
      setAmount('');
    }
    setReceipt(null);
    setError('');
  }, [preselectedLoan, isOpen]);

  // Search typeahead for loans
  useEffect(() => {
    if (!isOpen || selectedLoan) return;
    const fetchBorrowers = async () => {
      try {
        setLoadingLoans(true);
        const res = await api.get(`/interest/loans?status=ACTIVE&search=${encodeURIComponent(search)}`);
        if (res.data?.success) {
          setLoans(res.data.data || []);
        }
      } catch (_) {
      } finally {
        setLoadingLoans(false);
      }
    };

    const timer = setTimeout(fetchBorrowers, 250);
    return () => clearTimeout(timer);
  }, [search, isOpen, selectedLoan]);

  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);
    const due = Number(loan.current_due_amount || loan.installment_amount || 0);
    setAmount(due > 0 ? String(due) : '');
  };

  const handleExecuteCollect = async (e) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!selectedLoan || isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/interest/collections', {
        loan_id: selectedLoan.id,
        amount: numAmt,
        payment_method: paymentMode,
        transaction_reference: reference || null,
        collection_date: new Date().toISOString().slice(0, 10),
      });

      if (res.data?.success) {
        setReceipt(res.data.receipt || {
          receipt_number: `REC-${Date.now()}`,
          customer_name: selectedLoan.customer_name,
          customer_phone: selectedLoan.customer_phone,
          amount_paid: numAmt,
          payment_method: paymentMode,
          new_principal_outstanding: Math.max(0, Number(selectedLoan.principal_outstanding || 0) - numAmt),
        });
        if (onCollected) onCollected();
      } else {
        setError(res.data?.message || 'Collection failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Collection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!receipt) return;
    const phone = receipt.customer_phone || selectedLoan?.customer_phone;
    const cleanPhone = phone?.replace(/[^0-9]/g, '') || '';
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const text = encodeURIComponent(
      `*FINLEND PRO PAYMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `Receipt No: ${receipt.receipt_number}\n` +
      `Customer: ${receipt.customer_name || selectedLoan?.customer_name}\n` +
      `Amount Received: ₹${Number(receipt.amount_paid || amount).toLocaleString('en-IN')}\n` +
      `Payment Mode: ${paymentMode}\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
      `Remaining Balance: ₹${Number(receipt.new_principal_outstanding || 0).toLocaleString('en-IN')}\n` +
      `--------------------------------\n` +
      `Thank you for your payment!`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal id="quick-collect-sheet" isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        <div className="w-full sm:max-w-md bg-white dark:bg-[#0c1220] rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto flex flex-col space-y-4 animate-scaleUp">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-heading">
                Collect Money
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white font-heading">
                {receipt ? 'Payment Confirmed' : 'Quick Collect'}
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
          {/* STEP 2: RECEIPT SUCCESS SCREEN                            */}
          {/* ========================================================= */}
          {receipt ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm animate-successPop">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Received from {receipt.customer_name || selectedLoan?.customer_name}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight block mt-1">
                  ₹{Number(receipt.amount_paid || amount).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500 font-mono mt-1 block">
                  New Balance Left: ₹{Number(receipt.new_principal_outstanding || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Receipt Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm font-heading cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send WhatsApp Receipt</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors font-heading cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center transition-colors font-heading cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* STEP 1: SELECT BORROWER & ENTER AMOUNT                    */
            /* ========================================================= */
            <form onSubmit={handleExecuteCollect} className="space-y-4">
              {/* Borrower Selection */}
              {!selectedLoan ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block">
                    Select Borrower
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search borrower by name or phone..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {loadingLoans ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-600" />
                      Loading active borrowers...
                    </div>
                  ) : loans.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No active loans found matching search.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl">
                      {loans.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => handleSelectLoan(l)}
                          className="p-3 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs font-heading">
                              {l.customer_name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {l.customer_phone} · #{l.loan_account_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
                              Due: ₹{Number(l.current_due_amount || l.installment_amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Left: ₹{Number(l.principal_outstanding).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Borrower Mini Banner */
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-heading">
                      Selected Borrower
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
                      {selectedLoan.customer_name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                      <span>Due Today: <strong className="text-emerald-600 dark:text-emerald-400">₹{Number(selectedLoan.current_due_amount || selectedLoan.installment_amount).toLocaleString('en-IN')}</strong></span>
                      <span>·</span>
                      <span>Balance: ₹{Number(selectedLoan.principal_outstanding).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  {!preselectedLoan && (
                    <button
                      type="button"
                      onClick={() => setSelectedLoan(null)}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer font-heading"
                    >
                      Change
                    </button>
                  )}
                </div>
              )}

              {/* Amount Entry & Quick Chips */}
              {selectedLoan && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1">
                      Enter Amount Received (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-2xl text-2xl font-black font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Quick Chips */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(String(selectedLoan.current_due_amount || selectedLoan.installment_amount || ''))}
                      className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors font-heading cursor-pointer"
                    >
                      Due Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(String(selectedLoan.principal_outstanding || ''))}
                      className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors font-heading cursor-pointer"
                    >
                      Full Balance
                    </button>
                  </div>

                  {/* Payment Mode Selector: 3 Big Toggles */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading block mb-1.5">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mode: 'CASH', label: 'Cash', icon: Banknote },
                        { mode: 'UPI', label: 'UPI / QR', icon: Smartphone },
                        { mode: 'BANK', label: 'Bank Transfer', icon: Building },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = paymentMode === item.mode;
                        return (
                          <button
                            key={item.mode}
                            type="button"
                            onClick={() => setPaymentMode(item.mode)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-heading ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {paymentMode !== 'CASH' && (
                    <div>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Transaction UTR / Reference # (optional)"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Primary Collect Button */}
                  <button
                    type="submit"
                    disabled={submitting || !amount || parseFloat(amount) <= 0}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 font-heading cursor-pointer transition-all hover:-translate-y-0.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <span>Collect ₹{Number(amount || 0).toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

