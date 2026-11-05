import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Coins,
  Receipt,
  Search,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
  Calendar,
  LogOut,
  Sun,
  Moon,
  Landmark,
  Layers,
  ArrowRight,
  TrendingUp,
  Wallet,
  Smartphone,
  PhoneCall,
  User,
  Users,
  Clock,
  RefreshCw,
  Printer,
  ShieldCheck,
  Check,
  MessageSquare,
  Copy,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency, formatDate, formatTime } from '../../utils/interestUtils';
import Keypad from '../../components/interest-ui/Keypad';
import BigButton from '../../components/interest-ui/BigButton';
import FinLendChangePasswordModal from '../../components/interest-ui/FinLendChangePasswordModal';
import AnimatedFinLendBackground from '../../components/AnimatedFinLendBackground';
import FinLendLogo from '../../components/FinLendLogo';

export default function InterestAgentPortalPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Tabs: 'today' | 'collected' | 'handover'
  const [activeTab, setActiveTab] = useState('today');

  // Data states
  const [assignedLoans, setAssignedLoans] = useState([]);
  const [summary, setSummary] = useState({
    today_total: 0,
    today_cash: 0,
    today_upi: 0,
    today_count: 0,
  });
  const [recentCollections, setRecentCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'

  // Collect Bottom Sheet / Modal state
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'UPI'
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [collectError, setCollectError] = useState('');

  // Success Receipt Modal state
  const [lastReceipt, setLastReceipt] = useState(null);

  // Handover confirmation modal
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverSuccess, setHandoverSuccess] = useState(false);

  // Forced password change modal
  const [pwdForcedClosed, setPwdForcedClosed] = useState(false);
  const mustChangePassword = Boolean(user?.interest_profile?.must_change_password) && !pwdForcedClosed;

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [assignedRes, summaryRes] = await Promise.all([
        api.get('/interest/agent/assigned-customers'),
        api.get('/interest/agent/summary').catch(() => ({ data: { success: false } })),
      ]);

      if (assignedRes.data?.success) {
        setAssignedLoans(assignedRes.data.data || []);
      }
      if (summaryRes.data?.success) {
        setSummary(summaryRes.data.data.summary || { today_total: 0, today_cash: 0, today_upi: 0, today_count: 0 });
        setRecentCollections(summaryRes.data.data.recentCollections || []);
      }
    } catch (err) {
      console.error('Failed to load agent data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const totalDueToday = useMemo(() => {
    return assignedLoans.reduce((sum, l) => {
      const due = Number(l.current_due_amount || l.installment_amount || 0);
      return sum + due;
    }, 0);
  }, [assignedLoans]);

  const dailyTarget = Number(user?.interest_profile?.daily_target || 0) || Math.max(totalDueToday, Number(summary.today_total || 0));
  const progressPercent = dailyTarget > 0 ? Math.min(100, Math.round((Number(summary.today_total || 0) / dailyTarget) * 100)) : 100;

  // Filtered customer list
  const filteredLoans = useMemo(() => {
    return assignedLoans.filter((loan) => {
      const due = Number(loan.current_due_amount || 0);
      const isOverdue = loan.oldest_pending_date && loan.oldest_pending_date < todayStr && due > 0;
      const isPaid = due <= 0;

      if (filter === 'PENDING' && (isPaid || isOverdue)) return false;
      if (filter === 'PAID' && !isPaid) return false;
      if (filter === 'OVERDUE' && !isOverdue) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (loan.customer_name || '').toLowerCase();
        const phone = (loan.customer_phone || '').toLowerCase();
        const acc = (loan.loan_account_number || '').toLowerCase();
        const area = (loan.area_name || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || acc.includes(q) || area.includes(q);
      }
      return true;
    });
  }, [assignedLoans, filter, search, todayStr]);

  // Open Collect Sheet for Loan
  const openCollectSheet = (loan) => {
    setSelectedLoan(loan);
    const defaultAmt = Number(loan.current_due_amount || loan.installment_amount || 0);
    setAmountStr(defaultAmt > 0 ? String(defaultAmt) : '');
    setPaymentMethod('CASH');
    setReferenceNo('');
    setNotes('');
    setCollectError('');
  };

  const closeCollectSheet = () => {
    setSelectedLoan(null);
    setAmountStr('');
    setCollectError('');
  };

  // Keypad Handlers
  const handleKeypadPress = (key) => {
    if (key === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr ? amountStr + '.' : '0.');
      }
      return;
    }
    // Prevent more than 2 decimal places
    if (amountStr.includes('.') && amountStr.split('.')[1].length >= 2) return;
    setAmountStr(amountStr + key);
  };

  const handleKeypadDelete = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  // Submit Collection
  const handleSubmitCollection = async () => {
    const amt = parseFloat(amountStr);
    if (!amt || isNaN(amt) || amt <= 0) {
      setCollectError('Please enter a valid collection amount.');
      return;
    }

    try {
      setSubmitting(true);
      setCollectError('');

      const res = await api.post('/interest/collections', {
        loan_id: selectedLoan.id,
        customer_id: selectedLoan.customer_id,
        collection_date: todayStr,
        amount: amt,
        payment_method: paymentMethod,
        reference_number: referenceNo || undefined,
        notes: notes || undefined,
      });

      if (res.data?.success) {
        setLastReceipt(res.data.receipt);
        closeCollectSheet();
        await loadData(true);
      } else {
        setCollectError(res.data?.message || 'Failed to record collection.');
      }
    } catch (err) {
      setCollectError(err.response?.data?.message || 'Network error recording collection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Build WhatsApp Share Link
  const getWhatsAppShareUrl = (receipt) => {
    if (!receipt) return '#';
    const phone = receipt.customer_phone?.replace(/[^0-9]/g, '') || '';
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const text = encodeURIComponent(
      `*FinLend Pro Payment Receipt*\n` +
      `Receipt No: ${receipt.receipt_number}\n` +
      `Customer: ${receipt.customer_name}\n` +
      `Loan Acc: ${receipt.loan_account_number}\n` +
      `Amount Received: ₹${Number(receipt.amount_collected).toLocaleString('en-IN')}\n` +
      `Mode: ${receipt.payment_method}\n` +
      `Date: ${receipt.collection_date}\n` +
      `Remaining Principal: ₹${Number(receipt.remaining_principal || 0).toLocaleString('en-IN')}\n\n` +
      `Thank you for your payment!`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Build Handover Text for Copy/Share
  const getHandoverText = () => {
    return (
      `*FinLend Pro Shift Handover*\n` +
      `Agent: ${user?.full_name || user?.username}\n` +
      `Date: ${formatDate(new Date())}\n` +
      `Total Collections: ₹${Number(summary.today_total).toLocaleString('en-IN')}\n` +
      `💵 Cash in Hand: ₹${Number(summary.today_cash).toLocaleString('en-IN')}\n` +
      `📱 UPI Collected: ₹${Number(summary.today_upi).toLocaleString('en-IN')}\n` +
      `Total Receipts: ${summary.today_count}\n` +
      `Status: Handed over to Owner / Cashier.`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500 selection:text-white pb-24">
      {/* Background Graphic */}
      <AnimatedFinLendBackground />

      {/* Forced Password Modal */}
      <FinLendChangePasswordModal
        isOpen={mustChangePassword}
        onClose={() => setPwdForcedClosed(true)}
        forced={true}
      />

      {/* Top Header - Transparent */}
      <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between bg-transparent backdrop-blur-md border-b border-slate-200/40 dark:border-white/5">
        <div className="flex items-center gap-3">
          <FinLendLogo size={40} variant="app-icon" className="shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white font-heading">
                FinLend
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {user?.full_name || user?.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch to ChitFund Pro if granted */}
          {(user?.assigned_business === 'ALL' || user?.role === 'SUPER_ADMIN') && (
            <Link
              to="/agent/tasks"
              className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 transition-colors"
              title="Switch to ChitFund Agent Portal"
            >
              <Layers className="w-4 h-4" />
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
            title="Refresh assigned list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 relative z-10 space-y-5">
        
        {/* Progress Card (Only shown on Today and Handover tabs) */}
        <div className="rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/10 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Today's Collection Progress
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
                  {formatCurrency(summary.today_total)}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  of {formatCurrency(dailyTarget)} Target
                </span>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-heading">
                {progressPercent}%
              </span>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {summary.today_count} Receipts Recorded
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-white/10 h-3 rounded-full mt-4 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 3 Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 text-center pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-400">💵 Cash in Hand</div>
              <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-heading mt-0.5">
                {formatCurrency(summary.today_cash)}
              </div>
            </div>
            <div className="border-x border-slate-100 dark:border-white/5">
              <div className="text-[11px] sm:text-xs font-semibold text-slate-400">📱 UPI / QR</div>
              <div className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400 font-heading mt-0.5">
                {formatCurrency(summary.today_upi)}
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-slate-400">⏳ Route Remaining</div>
              <div className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 font-heading mt-0.5">
                {formatCurrency(Math.max(0, dailyTarget - Number(summary.today_total)))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TODAY (ASSIGNED ROUTE & COLLECTION)                                 */}
        {/* ========================================================================= */}
        {activeTab === 'today' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                  Assigned Route & Tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {filteredLoans.length} borrowers assigned for today's collection
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search borrower or phone..."
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-xs"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'ALL', label: 'All Tasks' },
                { id: 'PENDING', label: 'Pending Dues' },
                { id: 'OVERDUE', label: 'Overdue Dues' },
                { id: 'PAID', label: 'Collected Today' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilter(pill.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    filter === pill.id
                      ? 'bg-indigo-600 text-white shadow-xs font-heading'
                      : 'bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Borrower Cards Grid (Responsive 2-column on laptop/desktop, 1-col on mobile) */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-slate-800 dark:text-white font-heading">
                  {search ? 'No borrowers match your search.' : 'All route dues are clear!'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {search ? 'Try searching with another name or phone number.' : 'Great job completing today’s collection route.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredLoans.map((loan) => {
                  const due = Number(loan.current_due_amount || loan.installment_amount || 0);
                  const isPaid = due <= 0;
                  const isOverdue = loan.oldest_pending_date && loan.oldest_pending_date < todayStr && due > 0;
                  const initial = (loan.customer_name || 'B').charAt(0).toUpperCase();

                  return (
                    <div
                      key={loan.id}
                      className="rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/10 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                    >
                      {/* Top row: Avatar & Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200/60 dark:border-indigo-800/40">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate font-heading">
                              {loan.customer_name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {loan.customer_phone ? (
                                <a
                                  href={`tel:${loan.customer_phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-indigo-600 font-semibold"
                                >
                                  <PhoneCall className="w-3 h-3 text-slate-400" />
                                  <span>{loan.customer_phone}</span>
                                </a>
                              ) : (
                                <span>No phone</span>
                              )}
                              <span>•</span>
                              <span className="font-mono">{loan.loan_account_number}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status chip */}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shrink-0 ${
                            isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                              : isOverdue
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40'
                          }`}
                        >
                          {isPaid ? 'Collected' : isOverdue ? 'Overdue' : 'Due Today'}
                        </span>
                      </div>

                      {/* Bottom row: Amount & Huge Action button */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5 mt-1">
                        <div>
                          <div className="text-[11px] font-medium text-slate-400">
                            {isPaid ? 'Collected' : 'Due Amount'}
                          </div>
                          <div
                            className={`text-base sm:text-lg font-black font-heading ${
                              isPaid
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isOverdue
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {formatCurrency(due)}
                          </div>
                        </div>

                        {!isPaid ? (
                          <button
                            type="button"
                            onClick={() => openCollectSheet(loan)}
                            className="h-11 px-5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 font-heading shrink-0"
                          >
                            <Coins className="w-4 h-4" />
                            <span>₹ Collect</span>
                          </button>
                        ) : (
                          <div className="h-10 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Paid</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: COLLECTED (TODAY'S RECEIPTS)                                        */}
        {/* ========================================================================= */}
        {activeTab === 'collected' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white font-heading">
                  Today's Receipts
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {summary.today_count} collections recorded today
                </p>
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-heading">
                {formatCurrency(summary.today_total)}
              </span>
            </div>

            {recentCollections.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-3">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <div className="font-bold text-sm text-slate-700 dark:text-slate-300 font-heading">
                  No collections made yet today.
                </div>
                <p className="text-xs text-slate-400">
                  Switch to the "Today" tab and tap "Collect" on any borrower to start.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentCollections.map((col) => (
                  <div
                    key={col.id}
                    className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white font-heading truncate">
                          {col.customer_name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500">
                          {col.receipt_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {col.payment_method}
                        </span>
                        <span>•</span>
                        <span>{formatDate(col.collection_date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900 dark:text-white font-heading">
                          {formatCurrency(col.amount_collected)}
                        </div>
                      </div>

                      {/* WhatsApp Receipt Button */}
                      <a
                        href={getWhatsAppShareUrl(col)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors cursor-pointer"
                        title="Send WhatsApp receipt"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CASH HANDOVER & DAY CLOSING                                         */}
        {/* ========================================================================= */}
        {activeTab === 'handover' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Cash in Hand Banner */}
            <div className="rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-700 p-6 text-white shadow-lg shadow-emerald-600/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  Cash In Hand
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                  Shift Active
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black mt-2 font-heading tracking-tight">
                {formatCurrency(summary.today_cash)}
              </div>
              <p className="text-xs text-emerald-100 mt-1">
                Physical cash to be handed over to administrator / owner
              </p>
            </div>

            {/* Handover Breakdown Card */}
            <div className="rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                Collection Mode Breakdown
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Physical Cash
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-heading">
                    {formatCurrency(summary.today_cash)}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Direct UPI / QR
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-heading">
                    {formatCurrency(summary.today_upi)}
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-white font-heading">
                    Total Collections
                  </span>
                  <span className="text-base text-indigo-600 dark:text-indigo-400 font-heading">
                    {formatCurrency(summary.today_total)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(true)}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 font-heading cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Prepare Handover Statement</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3-TAP QUICK COLLECT BOTTOM SHEET / MODAL                                   */}
      {/* ========================================================================= */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0c1220] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-slideUp sm:animate-zoomIn space-y-4 max-h-[92vh] overflow-y-auto">
            
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Collecting Payment
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  {selectedLoan.customer_name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {selectedLoan.loan_account_number}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCollectSheet}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {collectError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            {/* Due & Balance Info Chips */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-[11px] text-slate-400">Due Today</div>
                <div className="text-sm font-black text-slate-900 dark:text-white font-heading mt-0.5">
                  {formatCurrency(selectedLoan.current_due_amount || selectedLoan.installment_amount || 0)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="text-[11px] text-slate-400">Balance Left</div>
                <div className="text-sm font-black text-slate-900 dark:text-white font-heading mt-0.5">
                  {formatCurrency(selectedLoan.principal_outstanding || 0)}
                </div>
              </div>
            </div>

            {/* Amount Input with Currency Symbol */}
            <div>
              <div className="text-center py-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Collection Amount
                </span>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-center gap-1">
                  <span className="text-indigo-600 dark:text-indigo-400">₹</span>
                  <span>{amountStr || '0'}</span>
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setAmountStr(String(Number(selectedLoan.current_due_amount || selectedLoan.installment_amount || 0)))}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Due Amount
                </button>
                <button
                  type="button"
                  onClick={() => setAmountStr(String(Number(selectedLoan.principal_outstanding || 0)))}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Full Balance
                </button>
                <button
                  type="button"
                  onClick={() => setAmountStr((prev) => String((Number(prev) || 0) + 500))}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 transition-colors"
                >
                  +₹500
                </button>
              </div>
            </div>

            {/* Numeric Keypad (Eliminates mobile virtual keyboard jumping) */}
            <Keypad
              onKeyPress={handleKeypadPress}
              onDelete={handleKeypadDelete}
            />

            {/* Cash vs UPI Toggle */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Cash Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>
            </div>

            {/* Submit Big Button (Tap 3) */}
            <div className="pt-2">
              <BigButton
                variant="success"
                onClick={handleSubmitCollection}
                disabled={submitting || !amountStr || parseFloat(amountStr) <= 0}
                loading={submitting}
                className="w-full"
              >
                Collect ₹{amountStr ? Number(amountStr).toLocaleString('en-IN') : '0'}
              </BigButton>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INSTANT SUCCESS RECEIPT MODAL                                              */}
      {/* ========================================================================= */}
      {lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c1220] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 text-center space-y-4 animate-scaleUp">
            
            {/* Animated Green Tick */}
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Payment Received
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-white font-heading mt-1">
                {formatCurrency(lastReceipt.amount_collected)}
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">
                from {lastReceipt.customer_name}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Receipt #{lastReceipt.receipt_number}
              </p>
            </div>

            {/* Quick Summary Card */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Mode</span>
                <span className="font-bold text-slate-800 dark:text-white">{lastReceipt.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Balance</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {formatCurrency(lastReceipt.remaining_principal || 0)}
                </span>
              </div>
            </div>

            {/* WhatsApp Share Button */}
            <a
              href={getWhatsAppShareUrl(lastReceipt)}
              target="_blank"
              rel="noreferrer"
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 font-heading cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send WhatsApp Receipt</span>
            </a>

            {/* Done / Next Customer */}
            <BigButton
              variant="secondary"
              onClick={() => setLastReceipt(null)}
              className="w-full"
            >
              Done & Next Customer
            </BigButton>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HANDOVER CONFIRMATION MODAL                                                */}
      {/* ========================================================================= */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1220] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
                  Shift Handover Statement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify your physical cash and copy or send the handover breakdown to the owner on WhatsApp.
            </p>

            {/* Handover Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 font-mono text-xs space-y-2 whitespace-pre-line text-slate-800 dark:text-slate-200">
              {getHandoverText()}
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getHandoverText());
                  setHandoverSuccess(true);
                  setTimeout(() => setHandoverSuccess(false), 2000);
                }}
                className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{handoverSuccess ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(getHandoverText())}`}
                target="_blank"
                rel="noreferrer"
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share Handover on WhatsApp</span>
              </a>

              <BigButton
                variant="secondary"
                onClick={() => setIsHandoverModalOpen(false)}
                className="w-full"
              >
                Close
              </BigButton>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-TAB AGENT BOTTOM NAVIGATION (VeeCredit style)                           */}
      {/* ========================================================================= */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-4 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        aria-label="Agent Navigation"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Tab 1: Today */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl min-w-[64px] transition-all cursor-pointer ${
              activeTab === 'today'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <div className={`w-10 h-7 rounded-xl flex items-center justify-center ${activeTab === 'today' ? 'bg-indigo-50 dark:bg-indigo-950/80' : ''}`}>
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-heading tracking-tight mt-0.5">
              Today's Route
            </span>
          </button>

          {/* Tab 2: Collected */}
          <button
            type="button"
            onClick={() => setActiveTab('collected')}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl min-w-[64px] transition-all cursor-pointer ${
              activeTab === 'collected'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <div className={`w-10 h-7 rounded-xl flex items-center justify-center ${activeTab === 'collected' ? 'bg-indigo-50 dark:bg-indigo-950/80' : ''}`}>
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-heading tracking-tight mt-0.5">
              Receipts ({summary.today_count})
            </span>
          </button>

          {/* Tab 3: Handover */}
          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl min-w-[64px] transition-all cursor-pointer ${
              activeTab === 'handover'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <div className={`w-10 h-7 rounded-xl flex items-center justify-center ${activeTab === 'handover' ? 'bg-indigo-50 dark:bg-indigo-950/80' : ''}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-heading tracking-tight mt-0.5">
              Cash Handover
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
