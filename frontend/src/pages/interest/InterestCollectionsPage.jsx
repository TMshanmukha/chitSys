import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Printer,
  Share2,
  Calendar,
  Clock,
  Landmark,
  Coins,
} from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import { formatDate, getServerYMD } from '../../utils/dateUtils';

export default function InterestCollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');

  // Record Collection Modal
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('CASH');
  const [collectRef, setCollectRef] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectDate, setCollectDate] = useState(getServerYMD());
  const [submittingCollect, setSubmittingCollect] = useState(false);
  const [collectError, setCollectError] = useState('');

  // Receipt Modal
  const [receiptData, setReceiptData] = useState(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (paymentMethod && paymentMethod !== 'ALL') params.append('payment_method', paymentMethod);

      const res = await api.get(`/interest/reports/collections?${params.toString()}`);
      if (res.data?.success) {
        setCollections(res.data.data.collections || []);
        setSummary(res.data.data.summary || null);
      }
    } catch (err) {
      setError('Failed to load collections report');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveLoans = async () => {
    try {
      const res = await api.get('/interest/loans?status=ACTIVE&limit=100');
      if (res.data?.success) {
        setActiveLoans(res.data.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchCollections();
  }, [fromDate, toDate, paymentMethod]);

  const openRecordModal = () => {
    setSelectedLoan(null);
    setCollectAmount('');
    setCollectMethod('CASH');
    setCollectRef('');
    setCollectNotes('');
    setCollectError('');
    setShowCollectModal(true);
    fetchActiveLoans();
  };

  const handleLoanSelect = (loanId) => {
    const l = activeLoans.find((x) => String(x.id) === String(loanId));
    setSelectedLoan(l || null);
    if (l?.installment_amount) {
      setCollectAmount(String(l.installment_amount));
    }
  };

  const handleExecuteCollection = async (e) => {
    e.preventDefault();
    if (!selectedLoan || !collectAmount) {
      setCollectError('Please select loan account and enter payment amount.');
      return;
    }

    setSubmittingCollect(true);
    setCollectError('');

    try {
      const res = await api.post('/interest/collections', {
        loan_id: selectedLoan.id,
        amount: parseFloat(collectAmount),
        payment_method: collectMethod,
        transaction_reference: collectRef || null,
        collection_date: collectDate,
        notes: collectNotes || null,
      });

      if (res.data?.success) {
        setShowCollectModal(false);
        setReceiptData(res.data.receipt);
        fetchCollections();
      }
    } catch (err) {
      setCollectError(err.response?.data?.message || 'Failed to record collection');
    } finally {
      setSubmittingCollect(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn font-sans pb-10">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-heading">
              Collections Center
            </span>
            <span className="text-xs text-slate-400">· Real-Time Payment Receipts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-heading mt-1">
            Collections & Payment Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record loan installments, verify cash handovers, generate official receipts & inspect double-entry allocations.
          </p>
        </div>

        <button
          type="button"
          onClick={openRecordModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer font-heading"
        >
          <Plus className="w-4 h-4" />
          <span>Record Collection (Paid)</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] transition-all duration-300">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-heading">
              Total Recovered
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2 block tracking-tight">
              ₹{Number(summary.totalCollected || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-heading">
              {summary.count || 0} Receipts Reconciled
            </span>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] transition-all duration-300">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-heading">
              Principal Recovered
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-2 block tracking-tight">
              ₹{Number(summary.totalPrincipal || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Applied directly to reduce principal debt
            </span>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] transition-all duration-300">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-heading">
              Interest Income Realized
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400 mt-2 block tracking-tight">
              ₹{Number(summary.totalInterest || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Realized net interest profit
            </span>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 font-heading">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 font-heading">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 font-heading">Mode:</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-heading"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / Digital</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>

        {(fromDate || toDate || paymentMethod !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setFromDate('');
              setToDate('');
              setPaymentMethod('ALL');
            }}
            className="text-xs text-rose-600 font-bold hover:underline cursor-pointer ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Collections Table */}
      {loading ? (
        <div className="p-16 text-center rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-white/10">
          <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-heading">Loading collection receipts...</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-black text-slate-800 dark:text-slate-200 font-heading">No Collection Receipts Found</p>
          <p className="text-xs text-slate-400 mt-1">Click &quot;Record Collection&quot; to post a loan payment voucher.</p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-200/70 dark:border-white/10 font-heading">
                <tr>
                  <th className="py-4 px-5">Receipt #</th>
                  <th className="py-4 px-5">Borrower & Account</th>
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-5">Amount Paid</th>
                  <th className="py-4 px-5">Allocation (P / I)</th>
                  <th className="py-4 px-5">Method & Ref</th>
                  <th className="py-4 px-5">Collected By</th>
                  <th className="py-4 px-5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {collections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {c.receipt_number}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-extrabold text-slate-900 dark:text-white font-heading text-sm">{c.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {c.loan_account_number} · {c.customer_phone}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-600 dark:text-slate-300 font-sans">
                      {formatDate(c.collection_date)}
                    </td>
                    <td className="py-4 px-5 font-mono font-black text-slate-900 dark:text-white text-sm">
                      ₹{Number(c.amount_collected).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-5 text-[11px] font-mono">
                      <span>P: ₹{Number(c.principal_component).toLocaleString('en-IN')}</span> · <span className="text-purple-600 dark:text-purple-400 font-bold">I: ₹{Number(c.interest_component).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                        {c.payment_method}
                      </span>
                      {c.transaction_reference && (
                        <div className="text-[10px] text-slate-400 font-mono mt-1">{c.transaction_reference}</div>
                      )}
                    </td>
                    <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-heading text-xs">
                      {c.agent_name || 'Admin'}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptData({
                            receipt_number: c.receipt_number,
                            customer_name: c.customer_name,
                            customer_phone: c.customer_phone,
                            loan_account_number: c.loan_account_number,
                            amount_collected: c.amount_collected,
                            payment_method: c.payment_method,
                            collection_date: c.collection_date,
                            allocation: {
                              principal_component: c.principal_component,
                              interest_component: c.interest_component,
                            },
                          })
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer font-heading shadow-xs"
                      >
                        Print Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Collection Modal */}
      {showCollectModal && (
        <ModalPortal
          id="interest-record-collect-modal"
          isOpen={showCollectModal}
          onClose={() => setShowCollectModal(false)}
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl max-w-lg w-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-6 sm:p-7 space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 font-heading tracking-wider">Payment Entry</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                  Record Loan Collection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {collectError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200/60 dark:border-rose-900/40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteCollection} className="space-y-4 text-xs">
              {/* Select Loan */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Select Borrower Loan Account *</label>
                <select
                  required
                  value={selectedLoan?.id || ''}
                  onChange={(e) => handleLoanSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-heading text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Loan Account --</option>
                  {activeLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loan_account_number} · {l.customer_name} (Due: ₹{Number(l.installment_amount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLoan && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] uppercase font-sans font-black text-slate-400 block font-heading">Principal Balance</span>
                    <strong className="text-sm font-black text-rose-600 dark:text-rose-400">₹{Number(selectedLoan.principal_outstanding).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-sans font-black text-slate-400 block font-heading">Standard Installment</span>
                    <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹{Number(selectedLoan.installment_amount).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              )}

              {/* Amount to Collect (Fully Editable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 font-heading">Collection Amount (₹) *</label>
                  <span className="text-[10px] text-slate-400">Subscriber can pay any amount</span>
                </div>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="Enter amount collected"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-base font-black text-indigo-600 dark:text-indigo-400"
                />
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Collection Date</label>
                  <input
                    type="date"
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Payment Method</label>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-bold font-heading text-slate-900 dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {collectMethod !== 'CASH' && (
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">UPI UTR / Bank Reference #</label>
                  <input
                    type="text"
                    value={collectRef}
                    onChange={(e) => setCollectRef(e.target.value)}
                    placeholder="e.g. 329048293849"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">Notes / Remark</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="Optional collection note..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 font-bold cursor-pointer font-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCollect}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-sm font-heading"
                >
                  {submittingCollect ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Submit & Generate Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Official Receipt Printable Modal */}
      {receiptData && (
        <ModalPortal
          id="interest-receipt-modal"
          isOpen={Boolean(receiptData)}
          onClose={() => setReceiptData(null)}
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl max-w-md w-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-6 sm:p-7 space-y-4 my-auto">
            {/* Success Header */}
            <div className="text-center pb-3 border-b border-slate-200/70 dark:border-white/10">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg font-heading">
                Payment Recorded Successfully!
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Receipt #{receiptData.receipt_number}
              </p>
            </div>

            {/* Receipt Body */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-heading">Borrower:</span>
                <strong className="text-slate-900 dark:text-white font-heading">{receiptData.customer_name}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400 font-heading">Loan Account:</span>
                <strong className="text-indigo-600 dark:text-indigo-400">{receiptData.loan_account_number}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-heading">Date:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">{formatDate(receiptData.collection_date)}</span>
              </div>
              <div className="flex justify-between font-mono text-base border-t border-slate-200/70 dark:border-white/10 pt-2 font-black">
                <span className="font-heading text-xs font-black text-slate-700 dark:text-slate-300">Amount Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{Number(receiptData.amount_collected).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Principal: ₹{Number(receiptData.allocation?.principal_component || 0).toLocaleString('en-IN')}</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">Interest: ₹{Number(receiptData.allocation?.interest_component || 0).toLocaleString('en-IN')}</span>
              </div>
              {receiptData.remaining_principal !== undefined && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200/70 dark:border-white/10">
                  <span className="text-slate-400 font-heading">Remaining Balance:</span>
                  <strong className="font-mono text-rose-600 dark:text-rose-400">
                    ₹{Number(receiptData.remaining_principal).toLocaleString('en-IN')}
                  </strong>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer font-heading transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center cursor-pointer font-heading shadow-md"
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

