import React, { useState, useEffect, useMemo } from 'react';
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
  TrendingUp,
  Wallet,
  Smartphone,
  PhoneCall,
  User,
  Users,
  Clock,
  Filter,
  RefreshCw,
  FileText,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import ModalPortal from '../../components/ModalPortal';
import { useNavigate, Link } from 'react-router-dom';
import AnimatedFinLendBackground from '../../components/AnimatedFinLendBackground';

export default function InterestAgentPortalPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [assignedLoans, setAssignedLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'borrowers' | 'history' | 'profile'
  const [taskFilter, setTaskFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COLLECTED'

  // Summary and Recent Collections from /interest/agent/summary
  const [agentSummary, setAgentSummary] = useState({
    today_total: 0,
    today_cash: 0,
    today_upi: 0,
    today_count: 0,
  });
  const [recentCollections, setRecentCollections] = useState([]);

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

  const loadAgentData = async () => {
    try {
      setError('');
      const [assignedRes, summaryRes] = await Promise.all([
        api.get('/interest/agent/assigned-customers'),
        api.get('/interest/agent/summary').catch(() => ({ data: { success: false } })),
      ]);

      if (assignedRes.data?.success) {
        setAssignedLoans(assignedRes.data.data || []);
      }
      if (summaryRes.data?.success) {
        setAgentSummary(summaryRes.data.data.summary || { today_total: 0, today_cash: 0, today_upi: 0, today_count: 0 });
        setRecentCollections(summaryRes.data.data.recentCollections || []);
      }
    } catch (err) {
      console.error('Failed to load agent portal data:', err);
      setError('Unable to load assigned route data. Please pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAgentData();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login?business=interest');
  };

  const openCollectModal = (loan) => {
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
        loadAgentData();
      }
    } catch (err) {
      setCollectError(err.response?.data?.message || 'Collection failed');
    } finally {
      setSubmittingCollect(false);
    }
  };

  // IDs of loans collected today
  const collectedLoanIdsToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return new Set(
      recentCollections
        .filter((c) => c.collection_date?.slice(0, 10) === todayStr)
        .map((c) => c.loan_id)
    );
  }, [recentCollections]);

  // Filtered loans list based on search and task filter
  const filteredLoans = useMemo(() => {
    return assignedLoans.filter((l) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.customer_name?.toLowerCase().includes(q) ||
        l.customer_phone?.includes(q) ||
        l.loan_account_number?.toLowerCase().includes(q) ||
        l.customer_code?.toLowerCase().includes(q);

      const isCollected = collectedLoanIdsToday.has(l.id);
      let matchesTaskFilter = true;
      if (taskFilter === 'PENDING') matchesTaskFilter = !isCollected;
      if (taskFilter === 'COLLECTED') matchesTaskFilter = isCollected;

      return matchesSearch && matchesTaskFilter;
    });
  }, [assignedLoans, search, taskFilter, collectedLoanIdsToday]);

  const totalAssignedDue = assignedLoans.reduce(
    (sum, l) => sum + Number(l.current_due_amount || l.installment_amount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080b12] text-slate-800 dark:text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Calm, Minimalist FinTech Background */}
      <AnimatedFinLendBackground />

      {/* 1. Mobile-First Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#0d131f]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs font-heading">
            FL
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white font-heading leading-tight flex items-center gap-1.5">
              <span>FinLend Pro</span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.2 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                Agent
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.full_name || 'Field Agent'} • {formatDate(new Date())}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/5 transition-all cursor-pointer"
            title="Refresh Route"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/5 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Business Switcher for Admins */}
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <Link
              to="/agent/tasks"
              className="p-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-bold flex items-center gap-1 shadow-xs"
              title="Switch to ChitFund Route"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chits</span>
            </Link>
          )}

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4 relative z-10 pb-20">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2. KPI Quick Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase font-heading">
              <span>Today's Collections</span>
              <Receipt className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
              ₹{Number(agentSummary.today_total || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {agentSummary.today_count || 0} Receipts Posted
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase font-heading">
              <span>Cash in Hand</span>
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{Number(agentSummary.today_cash || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              UPI: ₹{Number(agentSummary.today_upi || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs (Tasks / Borrowers / History / Profile) */}
        <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 shadow-xs">
          {[
            { id: 'tasks', label: 'Due Tasks', count: assignedLoans.length },
            { id: 'borrowers', label: 'Borrowers' },
            { id: 'history', label: 'History', count: recentCollections.length },
            { id: 'profile', label: 'Shift Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer font-heading ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DUE INSTALLMENT TASKS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {/* Search and Task Filter Chips */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search borrower name, phone, loan #..."
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All Tasks' },
                  { id: 'PENDING', label: 'Pending Dues' },
                  { id: 'COLLECTED', label: 'Collected Today' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTaskFilter(f.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading ${
                      taskFilter === f.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                        : 'bg-white dark:bg-[#0d131f] text-slate-500 border border-slate-200/70 dark:border-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Cards List */}
            {loading ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading collection route...</p>
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white/40 dark:bg-[#0d131f]/40">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-heading">
                  {taskFilter === 'PENDING' ? 'All dues collected!' : 'No matching borrower tasks'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Great job! Route tasks are up to date.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLoans.map((loan) => {
                  const isCollectedToday = collectedLoanIdsToday.has(loan.id);
                  const isOverdue = loan.current_due_amount > loan.installment_amount;

                  return (
                    <div
                      key={loan.id}
                      className={`p-4 rounded-2xl bg-white dark:bg-[#0d131f] border transition-all shadow-xs ${
                        isCollectedToday
                          ? 'border-emerald-200/80 dark:border-emerald-900/40 opacity-80'
                          : isOverdue
                          ? 'border-rose-200/80 dark:border-rose-900/40'
                          : 'border-slate-200/70 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white font-heading truncate">
                              {loan.customer_name}
                            </h3>
                            {isCollectedToday ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 uppercase">
                                Paid Today ✓
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40 uppercase">
                                Overdue
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 uppercase">
                                Due Today
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {loan.loan_account_number} • {loan.scheme_name}
                          </div>
                        </div>

                        {loan.customer_phone && (
                          <a
                            href={`tel:${loan.customer_phone}`}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Call borrower"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* Due & Balance Info */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Installment Due</span>
                          <strong className="text-sm font-black text-slate-900 dark:text-white">
                            ₹{Number(loan.current_due_amount || loan.installment_amount || 0).toLocaleString('en-IN')}
                          </strong>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-sans block">Principal Balance</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            ₹{Number(loan.principal_outstanding || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openCollectModal(loan)}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-heading ${
                            isCollectedToday
                              ? 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                          }`}
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{isCollectedToday ? 'Record Another Payment' : 'Collect Payment (Any Amount)'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BORROWERS DIRECTORY                                                */}
        {/* ========================================================================= */}
        {activeTab === 'borrowers' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search borrowers..."
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white shadow-xs"
              />
            </div>

            <div className="space-y-2.5">
              {assignedLoans.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 font-heading">
                      {b.customer_name ? b.customer_name[0].toUpperCase() : 'B'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white font-heading truncate">
                        {b.customer_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {b.customer_phone || b.customer_code} • {b.loan_account_number}
                      </div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                        Balance: ₹{Number(b.principal_outstanding || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {b.customer_phone && (
                    <a
                      href={`tel:${b.customer_phone}`}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors shrink-0"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COLLECTION HISTORY & RECEIPTS                                      */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 font-heading">Receipts Recorded</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{recentCollections.length} Vouchers</span>
            </div>

            {recentCollections.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white/40 dark:bg-[#0d131f]/40">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-heading">No Receipts Yet</p>
                <p className="text-xs text-slate-400 mt-1">Collections recorded during your shift will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentCollections.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {c.receipt_number}
                        </span>
                        <div className="font-extrabold text-slate-900 dark:text-white font-heading text-sm mt-0.5">
                          {c.customer_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {c.loan_account_number} • {formatDate(c.collection_date)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                          ₹{Number(c.amount_collected).toLocaleString('en-IN')}
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-heading uppercase">
                          {c.payment_method}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-end">
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
                        className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer font-heading"
                      >
                        Print Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AGENT PROFILE & SHIFT SUMMARY                                      */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d131f] border border-slate-200/70 dark:border-white/10 space-y-4 shadow-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base font-heading shadow-xs">
                  {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-heading">
                    {user?.full_name || 'Agent User'}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">@{user?.username}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                    FinLend Pro Field Agent
                  </span>
                </div>
              </div>

              {/* Shift Handover Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-heading">Assigned Business:</span>
                  <strong className="text-slate-900 dark:text-white font-heading">FinLend Pro</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-heading">Today's Collections:</span>
                  <span className="font-mono font-bold">{agentSummary.today_count || 0} Receipts</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-100 dark:border-white/5 pt-2">
                  <span className="text-slate-400 font-heading">Total Cash for Handover:</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{Number(agentSummary.today_cash || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-heading">UPI / Digital Inflows:</span>
                  <strong className="font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                    ₹{Number(agentSummary.today_upi || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
              <div className="flex items-center gap-2 font-bold font-heading">
                <ShieldCheck className="w-4 h-4" />
                <span>Strict Isolation Active</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your account is assigned strictly to FinLend Pro. All customer records and receipts are segregated. Hand over physical cash collections to your Admin at day end.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 4. Record Collection Modal */}
      {selectedLoan && (
        <ModalPortal id="agent-record-collect-modal" isOpen={Boolean(selectedLoan)} onClose={() => setSelectedLoan(null)}>
          <div className="bg-white/95 dark:bg-[#0d131f]/95 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 font-heading">
                  Field Receipt
                </span>
                <h3 className="font-black text-slate-900 dark:text-white text-base font-heading">
                  Record Loan Collection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {collectError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            {/* Borrower Details Banner */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1 text-xs">
              <div className="flex justify-between font-heading">
                <span className="text-slate-400">Borrower:</span>
                <strong className="text-slate-900 dark:text-white">{selectedLoan.customer_name}</strong>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400 font-sans">Account:</span>
                <span>{selectedLoan.loan_account_number}</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400 font-sans">Principal Balance:</span>
                <strong className="text-rose-600 dark:text-rose-400">
                  ₹{Number(selectedLoan.principal_outstanding || 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <form onSubmit={handleExecuteCollect} className="space-y-4 text-xs">
              {/* Amount - Fully Editable */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 font-heading">
                    Amount Collected (₹) *
                  </label>
                  <span className="text-[10px] text-slate-400">Can be any amount</span>
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

              {/* Payment Method */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['CASH', 'UPI'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCollectMethod(m)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs font-heading border transition-all cursor-pointer ${
                        collectMethod === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10'
                      }`}
                    >
                      {m === 'CASH' ? 'Cash Collection' : 'UPI / Digital'}
                    </button>
                  ))}
                </div>
              </div>

              {collectMethod !== 'CASH' && (
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                    UPI UTR / Reference #
                  </label>
                  <input
                    type="text"
                    value={collectRef}
                    onChange={(e) => setCollectRef(e.target.value)}
                    placeholder="e.g. 402910482910"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300 font-heading">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Paid at borrower shop"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 font-bold cursor-pointer font-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCollect}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-sm font-heading"
                >
                  {submittingCollect ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Generate Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* 5. Printable Official Receipt Modal */}
      {receiptData && (
        <ModalPortal id="agent-receipt-modal" isOpen={Boolean(receiptData)} onClose={() => setReceiptData(null)}>
          <div className="bg-white/95 dark:bg-[#0d131f]/95 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl max-w-sm w-full shadow-2xl p-6 space-y-4 my-auto">
            <div className="text-center pb-3 border-b border-slate-200/70 dark:border-white/10">
              <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-base font-heading">
                Payment Recorded!
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Receipt #{receiptData.receipt_number}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-heading">Borrower:</span>
                <strong className="text-slate-900 dark:text-white font-heading">{receiptData.customer_name}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400 font-heading">Account:</span>
                <strong className="text-indigo-600 dark:text-indigo-400">{receiptData.loan_account_number}</strong>
              </div>
              <div className="flex justify-between font-mono text-sm border-t border-slate-200/70 dark:border-white/10 pt-2 font-black">
                <span className="font-heading text-xs text-slate-700 dark:text-slate-300">Amount Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{Number(receiptData.amount_collected).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Principal: ₹{Number(receiptData.allocation?.principal_component || 0).toLocaleString('en-IN')}</span>
                <span>Interest: ₹{Number(receiptData.allocation?.interest_component || 0).toLocaleString('en-IN')}</span>
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

            <div className="pt-2 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer font-heading"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center cursor-pointer font-heading shadow-xs"
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
