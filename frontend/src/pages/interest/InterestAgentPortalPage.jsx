import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Coins,
  Receipt,
  Search,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Printer,
  Calendar,
  LogOut,
  Sun,
  Moon,
  Landmark,
  ArrowRightLeft,
  ArrowRight,
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import ModalPortal from '../../components/ModalPortal';
import { useNavigate, Link } from 'react-router-dom';

export default function InterestAgentPortalPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [assignedLoans, setAssignedLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Collect Modal
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('CASH');
  const [collectRef, setCollectRef] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [submittingCollect, setSubmittingCollect] = useState(false);
  const [collectError, setCollectError] = useState('');

  // Receipt Modal
  const [receiptData, setReceiptData] = useState(null);

  const fetchAssigned = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/interest/agent/assigned-customers');
      if (res.data?.success) {
        setAssignedLoans(res.data.data);
      }
    } catch (err) {
      setError('Unable to load assigned collection routes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  const openCollect = (loan) => {
    setSelectedLoan(loan);
    setCollectAmount(String(loan.current_due_amount || loan.installment_amount || ''));
    setCollectMethod('CASH');
    setCollectRef('');
    setCollectNotes('');
    setCollectError('');
  };

  const handleExecuteCollect = async (e) => {
    e.preventDefault();
    const amt = parseFloat(collectAmount);
    if (!selectedLoan || isNaN(amt) || amt <= 0) {
      setCollectError('Please enter a valid positive collection amount.');
      return;
    }

    setSubmittingCollect(true);
    setCollectError('');

    try {
      const res = await api.post('/interest/collections', {
        loan_id: selectedLoan.id,
        amount: amt,
        payment_method: collectMethod,
        transaction_reference: collectRef || null,
        collection_date: new Date().toISOString().slice(0, 10),
        notes: collectNotes || null,
      });

      if (res.data?.success) {
        setSelectedLoan(null);
        setReceiptData(res.data.receipt);
        fetchAssigned();
      }
    } catch (err) {
      setCollectError(err.response?.data?.message || 'Collection failed');
    } finally {
      setSubmittingCollect(false);
    }
  };

  const filteredLoans = assignedLoans.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.customer_name?.toLowerCase().includes(q) ||
      l.customer_phone?.includes(q) ||
      l.loan_account_number?.toLowerCase().includes(q) ||
      l.customer_code?.toLowerCase().includes(q)
    );
  });

  const totalDueSum = assignedLoans.reduce((sum, l) => sum + Number(l.current_due_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Agent Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
            FL
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
              FinLend Pro <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">· Agent Portal</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {user?.full_name || 'Agent'} · Today: {formatDate(new Date())}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Switch to ChitFund Agent Portal */}
          <Link
            to="/agent/tasks"
            className="p-1.5 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1"
            title="Switch to ChitFund Route Tasks"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ChitFund Route</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* KPI Strip */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 space-y-2">
          <div className="flex items-center justify-between text-indigo-100 text-xs font-bold">
            <span>Today's Assigned Route Dues</span>
            <span className="font-mono">{assignedLoans.length} Customers</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono">
            ₹{totalDueSum.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-indigo-200">
            Open customer card to collect payment. Amount is fully customizable.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search borrower name, phone, loan #..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm shadow-2xs"
          />
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Assigned Customers Cards */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading assigned borrowers...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-xs text-slate-400">
            No assigned customers found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLoans.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-heading">
                      {l.customer_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                      <a href={`tel:${l.customer_phone}`} className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                        <Phone className="w-3 h-3" />
                        <span>{l.customer_phone}</span>
                      </a>
                      <span>·</span>
                      <span>{l.loan_account_number}</span>
                    </div>
                    {l.customer_address && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{l.customer_address}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block font-heading">Due Amount</span>
                    <strong className="text-base sm:text-lg font-mono font-black text-rose-600 dark:text-rose-400">
                      ₹{Number(l.current_due_amount || l.installment_amount).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {l.scheme_name} · Bal: ₹{Number(l.principal_outstanding).toLocaleString('en-IN')}
                  </span>

                  <button
                    type="button"
                    onClick={() => openCollect(l)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold shadow-sm flex items-center gap-1.5 cursor-pointer font-heading"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Collect Payment</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Collect Modal */}
      {selectedLoan && (
        <ModalPortal
          id="agent-collect-modal"
          isOpen={Boolean(selectedLoan)}
          onClose={() => setSelectedLoan(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl p-5 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 font-heading">Field Collection</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base font-heading">
                  {selectedLoan.customer_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {collectError && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteCollect} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold">Collection Amount (₹) *</label>
                  <span className="text-[10px] text-slate-400">Editable</span>
                </div>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-lg font-black text-emerald-600"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCollectAmount(String(selectedLoan.current_due_amount || selectedLoan.installment_amount))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Full Due (₹{selectedLoan.current_due_amount || selectedLoan.installment_amount})
                </button>
                <button
                  type="button"
                  onClick={() => setCollectAmount(String(selectedLoan.installment_amount))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  1 Installment (₹{selectedLoan.installment_amount})
                </button>
              </div>

              <div>
                <label className="block font-bold mb-1">Payment Method</label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI (Google Pay / PhonePe)</option>
                </select>
              </div>

              {collectMethod === 'UPI' && (
                <div>
                  <label className="block font-bold mb-1">UPI UTR / Reference #</label>
                  <input
                    type="text"
                    value={collectRef}
                    onChange={(e) => setCollectRef(e.target.value)}
                    placeholder="12-digit UTR number"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Paid at shop"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCollect}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md font-heading"
                >
                  {submittingCollect ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm & Save</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <ModalPortal
          id="agent-receipt-modal"
          isOpen={Boolean(receiptData)}
          onClose={() => setReceiptData(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl p-5 space-y-4 my-auto">
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 mx-auto flex items-center justify-center mb-1">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-base font-heading">
                Receipt #{receiptData.receipt_number}
              </h3>
              <p className="text-[11px] text-slate-400">
                Payment saved to loan account
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower:</span>
                <strong>{receiptData.customer_name}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400 font-sans">Account:</span>
                <strong>{receiptData.loan_account_number}</strong>
              </div>
              <div className="flex justify-between font-mono text-base font-black border-t pt-1.5">
                <span className="font-sans text-xs font-bold text-slate-700 dark:text-slate-300">Amount Paid:</span>
                <span className="text-emerald-600">₹{Number(receiptData.amount_collected).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Principal: ₹{Number(receiptData.allocation?.principal_component || 0).toLocaleString('en-IN')}</span>
                <span>Interest: ₹{Number(receiptData.allocation?.interest_component || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReceiptData(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
            >
              Done / Next Borrower
            </button>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

