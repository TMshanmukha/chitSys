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
import { formatDate } from '../../utils/dateUtils';

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
  const [collectDate, setCollectDate] = useState(new Date().toISOString().slice(0, 10));
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-heading">
            Collections & Payment Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record loan installments, verify cash handovers, generate official receipts & view audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={openRecordModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer font-heading"
        >
          <Plus className="w-4 h-4" />
          <span>Record Collection (Paid)</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase block font-heading">Total Recovered</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              ₹{Number(summary.totalCollected || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{summary.count || 0} Receipts</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase block font-heading">Principal Recovered</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
              ₹{Number(summary.totalPrincipal || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Applied to reduce principal debt</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase block font-heading">Interest Earned</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1 block">
              ₹{Number(summary.totalInterest || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Realized net interest income</span>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Mode:</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
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
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading collection receipts...</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Collection Receipts Found</p>
          <p className="text-xs text-slate-500 mt-1">Click Record Collection to post a loan payment.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Borrower & Account</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Allocation (P / I)</th>
                  <th className="py-3 px-4">Method & Ref</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {collections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {c.receipt_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-white font-heading">{c.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {c.loan_account_number} · {c.customer_phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans">
                      {formatDate(c.collection_date)}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white">
                      ₹{Number(c.amount_collected).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono">
                      <span>P: ₹{Number(c.principal_component).toLocaleString('en-IN')}</span> · <span className="text-purple-600 dark:text-purple-400">I: ₹{Number(c.interest_component).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.payment_method}
                      </span>
                      {c.transaction_reference && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.transaction_reference}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.agent_name || 'Admin'}
                    </td>
                    <td className="py-3 px-4 text-right">
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
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer font-heading"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 font-heading">Payment Entry</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                  Record Loan Collection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {collectError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteCollection} className="space-y-4 text-xs">
              {/* Select Loan */}
              <div>
                <label className="block font-bold mb-1">Select Borrower Loan Account *</label>
                <select
                  required
                  value={selectedLoan?.id || ''}
                  onChange={(e) => handleLoanSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
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
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block">Principal Balance</span>
                    <strong className="text-xs text-rose-600">₹{Number(selectedLoan.principal_outstanding).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block">Standard Installment</span>
                    <strong className="text-xs text-indigo-600">₹{Number(selectedLoan.installment_amount).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              )}

              {/* Amount to Collect (Fully Editable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold">Collection Amount (₹) *</label>
                  <span className="text-[10px] text-slate-400">Subscriber can pay any amount</span>
                </div>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="Enter amount collected"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-base font-bold text-emerald-600"
                />
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Collection Date</label>
                  <input
                    type="date"
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Payment Method</label>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {collectMethod !== 'CASH' && (
                <div>
                  <label className="block font-bold mb-1">UPI UTR / Bank Reference #</label>
                  <input
                    type="text"
                    value={collectRef}
                    onChange={(e) => setCollectRef(e.target.value)}
                    placeholder="e.g. 329048293849"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Notes / Remark</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="Optional collection note..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCollect}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-md font-heading"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 my-auto">
            {/* Success Header */}
            <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg font-heading">
                Payment Recorded Successfully!
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Receipt #{receiptData.receipt_number}
              </p>
            </div>

            {/* Receipt Body */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower:</span>
                <strong className="text-slate-900 dark:text-white">{receiptData.customer_name}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400 font-sans">Loan Account:</span>
                <strong className="text-indigo-600">{receiptData.loan_account_number}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span>{formatDate(receiptData.collection_date)}</span>
              </div>
              <div className="flex justify-between font-mono text-base border-t border-slate-200 dark:border-slate-700 pt-2 font-black">
                <span className="font-sans text-xs font-bold text-slate-700 dark:text-slate-300">Amount Paid:</span>
                <span className="text-emerald-600">₹{Number(receiptData.amount_collected).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Principal Paid: ₹{Number(receiptData.allocation?.principal_component || 0).toLocaleString('en-IN')}</span>
                <span>Interest: ₹{Number(receiptData.allocation?.interest_component || 0).toLocaleString('en-IN')}</span>
              </div>
              {receiptData.remaining_principal !== undefined && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400">Remaining Balance:</span>
                  <strong className="font-mono text-rose-600">
                    ₹{Number(receiptData.remaining_principal).toLocaleString('en-IN')}
                  </strong>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center cursor-pointer font-heading"
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

