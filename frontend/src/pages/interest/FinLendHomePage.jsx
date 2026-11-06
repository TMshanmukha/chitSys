import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Coins,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Phone,
  UserCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getServerDate, getServerYMD } from '../../utils/interestUtils';
import QuickCollectSheet from '../../components/interest-ui/QuickCollectSheet';
import NewLoanModal from '../../components/interest-ui/NewLoanModal';

export default function FinLendHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userRole = user?.interest_profile?.role || (user?.role === 'COLLECTION_AGENT' ? 'AGENT' : 'OWNER');
  const isViewer = userRole === 'VIEWER';
  const isAgent = userRole === 'AGENT';

  useEffect(() => {
    if (isAgent) {
      navigate('/interest/agent', { replace: true });
    }
  }, [isAgent, navigate]);

  const [metrics, setMetrics] = useState(null);
  const [assignedLoans, setAssignedLoans] = useState([]);
  const [todayCollections, setTodayCollections] = useState([]);
  const [past7Days, setPast7Days] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick modals
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);

  // Today list filtering
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | PAID | OVERDUE
  const [searchQuery, setSearchQuery] = useState('');

  // Greeting
  const greeting = useMemo(() => {
    const hour = getServerDate().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayDateFormatted = useMemo(() => {
    return formatDate(getServerDate());
  }, []);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [dashRes, loansRes, colReportRes] = await Promise.allSettled([
        api.get('/interest/dashboard'),
        api.get('/interest/agent/assigned-customers'),
        api.get('/interest/reports/collections'),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data?.success) {
        setMetrics(dashRes.value.data.data);
      }

      if (loansRes.status === 'fulfilled' && loansRes.value.data?.success) {
        setAssignedLoans(loansRes.value.data.data || []);
      }

      if (colReportRes.status === 'fulfilled' && colReportRes.value.data?.success) {
        const report = colReportRes.value.data.data || {};
        const collections = report.collections || [];
        setTodayCollections(collections);

        // Aggregate last 7 days collections
        const daysMap = {};
        for (let i = 6; i >= 0; i--) {
          const d = getServerDate();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
          daysMap[key] = { date: key, day: dayName, amount: 0 };
        }

        collections.forEach((c) => {
          const cDate = (c.collection_date || '').slice(0, 10);
          if (daysMap[cDate]) {
            daysMap[cDate].amount += Number(c.amount_collected || 0);
          }
        });

        setPast7Days(Object.values(daysMap));
      }
    } catch (err) {
      console.error('Failed to load FinLend home data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const todayColStats = metrics?.todayColStats || {};
  const loanStats = metrics?.loanStats || {};
  const overdueStats = metrics?.overdueStats || {};

  const collectedToday = Number(todayColStats.today_collected || 0);

  // Total due today across assigned active loans
  const totalDueToday = useMemo(() => {
    return assignedLoans.reduce((sum, loan) => {
      const due = Number(loan.current_due_amount || 0);
      return sum + due;
    }, 0);
  }, [assignedLoans]);

  const targetToday = totalDueToday + collectedToday;
  const pendingToday = totalDueToday;
  const progressPercent = targetToday > 0 ? Math.min(100, Math.round((collectedToday / targetToday) * 100)) : 100;

  // Split loans into Pending, Paid, Overdue
  const todayStr = getServerYMD();

  const categorizedLoans = useMemo(() => {
    const pending = [];
    const paid = [];
    const overdue = [];

    assignedLoans.forEach((loan) => {
      const dueAmt = Number(loan.current_due_amount || 0);
      const isOverdue = loan.oldest_pending_date && loan.oldest_pending_date < todayStr && dueAmt > 0;

      if (dueAmt <= 0) {
        paid.push({ ...loan, statusTag: 'PAID' });
      } else if (isOverdue) {
        overdue.push({ ...loan, statusTag: 'OVERDUE' });
      } else {
        pending.push({ ...loan, statusTag: 'PENDING' });
      }
    });

    return { pending, paid, overdue };
  }, [assignedLoans, todayStr]);

  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'PENDING') list = categorizedLoans.pending;
    else if (activeTab === 'PAID') list = categorizedLoans.paid;
    else if (activeTab === 'OVERDUE') list = categorizedLoans.overdue;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
      return (
        item.customer_name?.toLowerCase().includes(q) ||
        item.customer_phone?.includes(q) ||
        item.loan_account_number?.toLowerCase().includes(q)
      );
    });
  }, [activeTab, categorizedLoans, searchQuery]);

  const handleOpenCollectForLoan = (loan) => {
    setSelectedBorrower({
      id: loan.customer_id,
      name: loan.customer_name,
      phone: loan.customer_phone,
      loan_id: loan.id,
      loan_account_number: loan.loan_account_number,
      due_today: Number(loan.current_due_amount || loan.installment_amount || 0),
      balance_left: Number(loan.principal_outstanding || 0),
    });
    setIsCollectOpen(true);
  };

  const handleCollectionSuccess = () => {
    loadData(true);
  };

  const handleLoanDisbursed = () => {
    loadData(true);
  };

  // Find max in 7 days for SVG scaling
  const max7Day = useMemo(() => {
    const vals = past7Days.map((d) => d.amount);
    return Math.max(...vals, 1000);
  }, [past7Days]);

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn font-sans pb-12">
      {/* 1. Top Greeting & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            {greeting}, {user?.full_name?.split(' ')[0] || 'Partner'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {todayDateFormatted}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition-colors cursor-pointer"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
        </button>
      </div>

      {/* 2. Primary Action Cards (Sleek Horizontal VeeCredit Style) */}
      {!isViewer ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* + New Loan */}
          <button
            type="button"
            onClick={() => setIsNewLoanOpen(true)}
            className="group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-200 cursor-pointer active:scale-[0.99]"
          >
            <div className="text-left">
              <div className="text-base sm:text-lg font-black font-heading tracking-tight flex items-center gap-1.5">
                <span>+ New Loan</span>
              </div>
              <p className="text-xs text-indigo-100 font-medium mt-0.5">
                Disburse new EMI or vaddi loan in 1 page
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
          </button>

          {/* ₹ Collect Money */}
          <button
            type="button"
            onClick={() => {
              setSelectedBorrower(null);
              setIsCollectOpen(true);
            }}
            className="group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-200 cursor-pointer active:scale-[0.99]"
          >
            <div className="text-left">
              <div className="text-base sm:text-lg font-black font-heading tracking-tight flex items-center gap-1.5">
                <span>₹ Collect Money</span>
              </div>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                1-tap quick receipt & WhatsApp share
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Coins className="w-6 h-6 stroke-[2.5]" />
            </div>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Viewer Mode Active (Read Only). Creation and money collections are disabled.</span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">Viewer</span>
        </div>
      )}

      {/* Staff & Route Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/90 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-heading">
              User Management & Field Agents
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assign borrower accounts to agents, configure roles and track field collections
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/interest/more/users')}
          className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 text-xs font-bold font-heading flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <span>Open Staff Management</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Today Strip (3 cards only + progress bar) */}
      <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          {/* To Collect */}
          <div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              To Collect Today
            </div>
            <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-heading">
              {formatCurrency(targetToday)}
            </div>
          </div>

          {/* Collected */}
          <div className="border-x border-slate-200/60 dark:border-white/10 px-2">
            <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Collected Today
            </div>
            <div className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-heading">
              {formatCurrency(collectedToday)}
            </div>
          </div>

          {/* Pending */}
          <div>
            <div className="text-[11px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400">
              Pending Today
            </div>
            <div className="text-base sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-heading">
              {formatCurrency(pendingToday)}
            </div>
          </div>
        </div>

        {/* Thin progress bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
            <span>Today's Progress</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Today's Due List (Main Content) */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading">
            Today's Due List
          </h2>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tabs: Pending | Paid | Overdue */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PENDING'
                ? 'bg-white dark:bg-[#0c1220] text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pending ({categorizedLoans.pending.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAID')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PAID'
                ? 'bg-white dark:bg-[#0c1220] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Paid ({categorizedLoans.paid.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OVERDUE')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'OVERDUE'
                ? 'bg-white dark:bg-[#0c1220] text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overdue ({categorizedLoans.overdue.length})
          </button>
        </div>

        {/* List of Borrowers */}
        <div className="space-y-2.5">
          {currentList.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-heading">
                {activeTab === 'PENDING'
                  ? 'No pending dues for today! All caught up.'
                  : activeTab === 'PAID'
                  ? 'No collections recorded yet for today.'
                  : 'No overdue loans. Great collection rate!'}
              </p>
              {activeTab === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => setIsNewLoanOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Give a new loan</span>
                </button>
              )}
            </div>
          ) : (
            currentList.map((loan) => {
              const due = Number(loan.current_due_amount || loan.installment_amount || 0);
              const initial = (loan.customer_name || 'B').charAt(0).toUpperCase();

              return (
                <div
                  key={loan.id}
                  className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Avatar & Customer info */}
                    <div
                      onClick={() => navigate(`/interest/customers/${loan.customer_id}`)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200/60 dark:border-indigo-800/40 overflow-hidden">
                        {loan.customer_photo ? (
                          <img src={loan.customer_photo} alt={loan.customer_name} className="w-full h-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate font-heading hover:text-indigo-600 dark:hover:text-indigo-400">
                          {loan.customer_name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          <span>{loan.customer_phone || 'No phone'}</span>
                          <span>•</span>
                          <span className="font-mono">{loan.loan_account_number}</span>
                          {Number(loan.customer_total_loans_count || 1) > 1 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                              All Loans Pending: ₹{Number(loan.customer_total_pending_all_loans || 0).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & 1-tap Collect button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {loan.statusTag === 'PAID' ? 'Paid' : 'Due'}
                        </div>
                        <div
                          className={`text-sm sm:text-base font-extrabold font-heading ${
                            loan.statusTag === 'PAID'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : loan.statusTag === 'OVERDUE'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {formatCurrency(due)}
                        </div>
                      </div>

                      {loan.statusTag !== 'PAID' ? (
                        !isViewer ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCollectForLoan(loan)}
                            className="py-2 px-3 sm:px-4 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Collect</span>
                          </button>
                        ) : (
                          <div className="py-1 px-2.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500">
                            Due
                          </div>
                        )
                      ) : (
                        <div className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Paid</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Tracker Strip (Days Completed, Left, Overdue & Advance Notice) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Days: {loan.completed_installments || 0} / {loan.total_installments || 0}
                        {loan.total_installments > 0 && (
                          <span className="text-slate-400 font-normal ml-1">
                            ({Math.round(((loan.completed_installments || 0) / loan.total_installments) * 100)}%)
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {Number(loan.overdue_amount || 0) > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md">
                            Overdue: ₹{Number(loan.overdue_amount).toLocaleString('en-IN')}
                          </span>
                        )}
                        {loan.paid_until_date && loan.paid_until_date >= todayStr && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                            Paid in advance until {loan.paid_until_date}
                          </span>
                        )}
                      </div>
                    </div>
                    {Number(loan.total_installments || 0) > 0 && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round(((loan.completed_installments || 0) / loan.total_installments) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. 7-Day Micro Bar Chart */}
      <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-heading">
            Collected Last 7 Days
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Past 7 Days
          </div>
        </div>

        {/* Clean Responsive SVG Bar Chart */}
        <div className="h-32 w-full flex items-end justify-between gap-2 pt-2 px-2">
          {past7Days.map((item, idx) => {
            const heightPercent = max7Day > 0 ? Math.max(8, Math.round((item.amount / max7Day) * 100)) : 8;
            const isToday = idx === past7Days.length - 1;

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.amount > 0 ? `₹${item.amount}` : '0'}
                </div>
                <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-end h-20">
                  <div
                    className={`w-full rounded-lg transition-all duration-300 ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                        : item.amount > 0
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isToday ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Small Summary Row (Tap opens Reports) */}
      <div
        onClick={() => navigate('/interest/reports')}
        className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:shadow-lg transition-all"
      >
        <div className="grid grid-cols-2 gap-4 flex-1">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              Total Given Out
            </div>
            <div className="text-base sm:text-xl font-black mt-0.5 font-heading">
              {formatCurrency(loanStats.total_principal_outstanding || 0)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              Interest Earned
            </div>
            <div className="text-base sm:text-xl font-black mt-0.5 text-emerald-400 font-heading">
              {formatCurrency(loanStats.total_interest_collected || 0)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-white shrink-0">
          <span>View Reports</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {/* Quick Collect Bottom Sheet */}
      <QuickCollectSheet
        isOpen={isCollectOpen}
        onClose={() => setIsCollectOpen(false)}
        onSuccess={handleCollectionSuccess}
        initialBorrower={selectedBorrower}
      />

      {/* 1-Page New Loan Modal */}
      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => setIsNewLoanOpen(false)}
        onSuccess={handleLoanDisbursed}
      />
    </div>
  );
}
