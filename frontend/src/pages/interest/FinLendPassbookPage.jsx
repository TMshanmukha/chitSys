import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Share2,
  Coins,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  Sparkles,
  Check,
  Plus,
} from 'lucide-react';
import api from '../../api/client';
import { formatCurrency, formatDate, formatTime, getServerYMD } from '../../utils/interestUtils';
import QuickCollectSheet from '../../components/interest-ui/QuickCollectSheet';
import NewLoanModal from '../../components/interest-ui/NewLoanModal';

export default function FinLendPassbookPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('CHARTS'); // 'CHARTS' | 'STATEMENT' | 'LOANS'
  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const [showAllDaysMap, setShowAllDaysMap] = useState({});

  // Modals
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);

  const loadPassbook = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/interest/customers/${id}`);
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError('Unable to load customer passbook.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadPassbook();
  }, [id]);

  const customer = data?.customer || {};
  const loans = data?.loans || [];
  const ledger = data?.ledger || [];
  const todayStr = getServerYMD();

  // Summary Metrics
  const summary = useMemo(() => {
    let totalTaken = 0;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let balanceToClose = 0;

    loans.forEach((l) => {
      totalTaken += Number(l.principal_amount || 0);
      totalPrincipalPaid += Number(l.total_principal_paid || 0);
      totalInterestPaid += Number(l.total_interest_paid || 0);
      balanceToClose += Number(l.principal_outstanding || 0) + Number(l.interest_outstanding || 0);
    });

    let totalPaid = totalPrincipalPaid + totalInterestPaid;
    if (Number(customer.total_collected || 0) > totalPaid) {
      totalPaid = Number(customer.total_collected);
    }

    const totalPayable = totalPaid + balanceToClose;
    const progressPercent = totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 0;
    const totalPendingOverdue = Number(customer.total_pending_overdue || 0);

    return {
      totalTaken,
      totalPaid,
      totalPrincipalPaid,
      totalInterestPaid,
      balanceToClose,
      totalPayable,
      progressPercent,
      totalPendingOverdue,
    };
  }, [loans, customer]);

  // Selected borrower object for QuickCollect
  const borrowerForCollect = useMemo(() => {
    const activeLoan = loans.find((l) => l.loan_status === 'ACTIVE') || loans[0];
    const due = Number(activeLoan?.current_due_amount || activeLoan?.installment_amount || 0);
    const balance = Number(activeLoan?.principal_outstanding || 0) + Number(activeLoan?.interest_outstanding || 0);
    return {
      id: customer.id,
      name: customer.full_name,
      phone: customer.phone,
      loan_id: activeLoan?.id,
      loan_account_number: activeLoan?.loan_account_number,
      due_today: due,
      balance_left: balance,
    };
  }, [customer, loans]);

  // WhatsApp Share Passbook Summary
  const handleShareWhatsApp = () => {
    const text = `*FINLEND PRO - BORROWER PASSBOOK*
Customer: ${customer.full_name} (${customer.customer_code})
Phone: ${customer.phone}
Total Amount Taken: ₹${summary.totalTaken.toLocaleString('en-IN')}
Total Amount Paid: ₹${summary.totalPaid.toLocaleString('en-IN')}
Balance Left to Close: ₹${summary.balanceToClose.toLocaleString('en-IN')}
Active Loans: ${loans.filter((l) => l.loan_status === 'ACTIVE').length}

For repayments or balance settlement, contact your loan manager.`;

    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const toggleShowAllDays = (loanId) => {
    setShowAllDaysMap((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Loading customer passbook & charts...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{error || 'Customer not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/interest/customers')}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-16">
      {/* 1. Header with Back Button and Quick Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/interest/customers')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Customers</span>
        </button>

        <div className="flex items-center gap-2">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 2. Customer Profile Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md font-heading shrink-0">
            {(customer.full_name || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                {customer.full_name}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {customer.customer_code}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              📱 {customer.phone} {customer.city ? `• 📍 ${customer.city}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsCollectOpen(true)}
            className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading cursor-pointer active:scale-95"
          >
            <Coins className="w-4 h-4" />
            <span>Collect Money</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewLoanOpen(true)}
            className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan</span>
          </button>
        </div>
      </div>

      {/* 3. Three Big Numbers Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Amount Taken */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 text-center shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Amount Taken
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-heading">
            {formatCurrency(summary.totalTaken)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 hidden sm:block">
            {loans.length} loan account{loans.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Total Paid */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 text-center shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Total Paid
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-heading">
            {formatCurrency(summary.totalPaid)}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 hidden sm:block">
            {summary.progressPercent}% of total payable
          </div>
        </div>

        {/* Balance to Close */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 text-center shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Balance to Close
          </div>
          <div className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-heading">
            {formatCurrency(summary.balanceToClose)}
          </div>
          <div className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80 mt-1 hidden sm:block">
            Principal + Interest Left
          </div>
        </div>
      </div>

      {/* 4. Total Pending Overdue across all loans card (Always clearly shown) */}
      <div className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border shadow-xs ${summary.totalPendingOverdue > 0
        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
        : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60'
        }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${summary.totalPendingOverdue > 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60'
            }`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white font-heading">
              Total Pending Dues Across {loans.length} Loan{loans.length !== 1 ? 's' : ''}: {formatCurrency(summary.totalPendingOverdue > 0 ? summary.totalPendingOverdue : summary.balanceToClose)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {summary.totalPendingOverdue > 0
                ? 'Borrower has past-due installments requiring collection.'
                : 'All past installments are cleared. Showing total remaining closure balance across accounts.'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCollectOpen(true)}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold text-white shrink-0 shadow-xs transition-colors cursor-pointer self-start sm:self-center font-heading ${summary.totalPendingOverdue > 0 ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
        >
          {summary.totalPendingOverdue > 0 ? 'Collect Overdue' : 'Collect Installment'}
        </button>
      </div>

      {/* 5. Overall Progress Visual Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-heading">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Overall Repayment Progress
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-black font-heading">
            {summary.progressPercent}% Completed ({formatCurrency(summary.totalPaid)} of {formatCurrency(summary.totalPayable)})
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${summary.progressPercent}%` }}
            title={`Paid: ${formatCurrency(summary.totalPaid)}`}
          />
          <div
            className="h-full bg-indigo-500/20 dark:bg-indigo-500/30 transition-all duration-500"
            style={{ width: `${100 - summary.progressPercent}%` }}
            title={`Balance: ${formatCurrency(summary.balanceToClose)}`}
          />
        </div>

        {/* 4 Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
            <span className="text-[10px] text-slate-400 block">Principal Repaid</span>
            <span className="font-extrabold text-slate-900 dark:text-white font-heading">
              {formatCurrency(summary.totalPrincipalPaid)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
            <span className="text-[10px] text-slate-400 block">Interest Repaid</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
              {formatCurrency(summary.totalInterestPaid)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
            <span className="text-[10px] text-slate-400 block">Balance Left</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">
              {formatCurrency(summary.balanceToClose)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
            <span className="text-[10px] text-slate-400 block">Active Loans</span>
            <span className="font-extrabold text-slate-900 dark:text-white font-heading">
              {loans.filter((l) => l.loan_status === 'ACTIVE').length} Active
            </span>
          </div>
        </div>
      </div>

      {/* 6. Tab Selector: Days & Loan Tracker (Charts) | Passbook Statement | Loan Accounts */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('CHARTS')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all font-heading flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'CHARTS'
            ? 'bg-white dark:bg-[#0c1220] text-indigo-600 dark:text-indigo-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Days & Loan Charts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STATEMENT')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all font-heading flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'STATEMENT'
            ? 'bg-white dark:bg-[#0c1220] text-indigo-600 dark:text-indigo-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <FileText className="w-4 h-4" />
          <span>Passbook ({ledger.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOANS')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all font-heading flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'LOANS'
            ? 'bg-white dark:bg-[#0c1220] text-indigo-600 dark:text-indigo-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <span>Loan Details ({loans.length})</span>
        </button>
      </div>

      {/* 7. Tab 1: Days & Loan Charts (Interactive Visual Trackers) */}
      {activeTab === 'CHARTS' && (
        <div className="space-y-4">
          {loans.map((loan) => {
            const completedDays = Number(loan.completed_installments || 0);
            const totalDays = Number(loan.total_installments || loan.tenure_periods || 1);
            const remainingDays = Math.max(0, totalDays - completedDays);
            const daysPercent = Math.min(100, Math.round((completedDays / totalDays) * 100));

            const pPaid = Number(loan.total_principal_paid || 0);
            const iPaid = Number(loan.total_interest_paid || 0);
            const pOutstanding = Number(loan.principal_outstanding || 0);
            const iOutstanding = Number(loan.interest_outstanding || 0);
            const totPaid = pPaid + iPaid;
            const totToClose = pOutstanding + iOutstanding;
            const totPayable = totPaid + totToClose;
            const moneyPercent = totPayable > 0 ? Math.min(100, Math.round((totPaid / totPayable) * 100)) : 0;

            const isPaidAhead = loan.paid_until_date && loan.paid_until_date > todayStr;
            const isPaidToday = loan.paid_until_date && loan.paid_until_date >= todayStr;
            const dueAmt = Number(loan.current_due_amount || 0);
            const overdueAmt = Number(loan.overdue_amount || 0);
            const isOverdue = overdueAmt > 0;

            const showAllDays = !!showAllDaysMap[loan.id];
            // Display sample of days (up to 20 or all if toggled)
            const daysToRender = showAllDays ? totalDays : Math.min(totalDays, 25);

            return (
              <div
                key={loan.id}
                className="rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs space-y-5"
              >
                {/* Loan Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white font-heading">
                        {loan.scheme_name || 'Loan Account'}
                      </span>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {loan.loan_account_number}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${loan.loan_status === 'ACTIVE'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                      >
                        {loan.loan_status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Given: <strong>{formatCurrency(loan.principal_amount)}</strong> • Daily Installment:{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(loan.installment_amount)} / day
                      </strong>
                    </div>
                  </div>

                  {/* Status Chip */}
                  <div className="flex items-center gap-2">
                    {isOverdue ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        Overdue: {formatCurrency(overdueAmt)}
                      </span>
                    ) : dueAmt > 0 ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        Due Today: {formatCurrency(dueAmt)}
                      </span>
                    ) : isPaidAhead ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        ✓ Paid in Advance ({formatDate(loan.paid_until_date)})
                      </span>
                    ) : isPaidToday ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        ✓ Paid Today
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Up to Date
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsCollectOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Collect</span>
                    </button>
                  </div>
                </div>

                {/* Section A: Days & Schedule Analytics Chart */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-heading">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Days Completed vs Days Remaining
                    </span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 font-heading">
                      {completedDays} of {totalDays} Days ({daysPercent}%)
                    </span>
                  </div>

                  {/* Dual Days Progress Bar */}
                  <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(daysPercent > 0 ? 3 : 0, daysPercent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      {completedDays} Days Completed
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      ⏳ {remainingDays} Days Left
                    </span>
                    {loan.next_due_date && (
                      <span className="text-slate-400 text-[11px]">
                        Next Due: {formatDate(loan.next_due_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Section B: Financial Breakdown Meter (Paid vs Balance) */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 font-heading">
                      Amount Paid vs Remaining Balance
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-heading">
                      {formatCurrency(totPaid)} Paid • {formatCurrency(totToClose)} Left
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${moneyPercent}%` }}
                    />
                    <div
                      className="h-full bg-indigo-500/20 dark:bg-indigo-500/30 transition-all duration-500"
                      style={{ width: `${100 - moneyPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block">Principal Repaid</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
                        {formatCurrency(pPaid)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block">Interest Repaid</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
                        {formatCurrency(iPaid)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block">Principal Left</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 font-heading">
                        {formatCurrency(pOutstanding)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                      <span className="text-[10px] text-slate-400 block">Remaining Profit/Interest</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">
                        {formatCurrency(iOutstanding)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section C: Visual Daily Days Grid */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 font-heading">
                      Daily Schedule Visual Grid
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleShowAllDays(loan.id)}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer text-xs"
                    >
                      {showAllDays ? 'Show Less' : `Show All ${totalDays} Days`}
                    </button>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                    {Array.from({ length: daysToRender }, (_, idx) => {
                      const dayNumber = idx + 1;
                      const isCompleted = dayNumber <= completedDays;
                      const isCurrentNext = dayNumber === completedDays + 1;

                      return (
                        <div
                          key={dayNumber}
                          className={`p-2 rounded-xl text-center border transition-all ${isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : isCurrentNext
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-black'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-white/5 text-slate-400'
                            }`}
                          title={`Day ${dayNumber}: ${isCompleted ? 'PAID' : isCurrentNext ? 'NEXT DUE' : 'UPCOMING'}`}
                        >
                          <div className="text-[10px] font-mono leading-none">Day</div>
                          <div className="text-xs font-extrabold font-heading mt-0.5">{dayNumber}</div>
                          <div className="text-[9px] mt-0.5">
                            {isCompleted ? '✓' : isCurrentNext ? 'Next' : '•'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!showAllDays && totalDays > 25 && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => toggleShowAllDays(loan.id)}
                        className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 cursor-pointer"
                      >
                        + {totalDays - 25} more days remaining in this tenure (Click to expand)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 8. Tab 2: Passbook Statement */}
      {activeTab === 'STATEMENT' && (
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
          {ledger.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No transactions recorded yet in customer passbook.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {ledger.map((entry) => {
                const isDisbursement = entry.entry_type === 'DISBURSEMENT';
                const isPayment = entry.entry_type === 'REPAYMENT' || Number(entry.credit_amount || 0) > 0;

                return (
                  <div
                    key={entry.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPayment
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-200 dark:border-indigo-800'
                          }`}
                      >
                        {isPayment ? <Coins className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate font-heading">
                          {entry.description || (isPayment ? 'Collection Received' : 'Loan Disbursed')}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatDate(entry.transaction_date)} {entry.reference_no ? `• Ref: ${entry.reference_no}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm sm:text-base font-extrabold font-heading ${isPayment ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                          }`}
                      >
                        {isPayment
                          ? `+${formatCurrency(entry.credit_amount)}`
                          : `-${formatCurrency(entry.debit_amount)}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Balance to Close: {formatCurrency(entry.net_balance || 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 9. Tab 3: Loan Details List */}
      {activeTab === 'LOANS' && (
        <div className="space-y-3">
          {loans.map((loan) => {
            const isExpanded = expandedLoanId === loan.id;
            const isLoanActive = loan.loan_status === 'ACTIVE';
            const balanceLeft = Number(loan.principal_outstanding || 0) + Number(loan.interest_outstanding || 0);

            return (
              <div
                key={loan.id}
                className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs"
              >
                <div
                  onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
                        {loan.scheme_name || 'Loan'}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {loan.loan_account_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isLoanActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                      >
                        {loan.loan_status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Given: <strong>{formatCurrency(loan.principal_amount)}</strong> • Installment:{' '}
                      <strong>{formatCurrency(loan.installment_amount)}</strong> ({loan.repayment_frequency})
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Balance to Close</div>
                      <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">
                        {formatCurrency(balanceLeft)}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-slate-400">Disbursed On</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {formatDate(loan.disbursement_date)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Principal Paid</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(loan.total_principal_paid)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Interest Paid</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(loan.total_interest_paid)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Total Payable</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(loan.total_payable)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Collect Bottom Sheet */}
      <QuickCollectSheet
        isOpen={isCollectOpen}
        onClose={() => setIsCollectOpen(false)}
        onSuccess={loadPassbook}
        initialBorrower={borrowerForCollect}
      />

      {/* New Loan Modal */}
      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => setIsNewLoanOpen(false)}
        onSuccess={loadPassbook}
        initialCustomerId={customer.id}
      />
    </div>
  );
}
