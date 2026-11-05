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
  Download,
  Receipt,
  User,
  Plus,
} from 'lucide-react';
import api from '../../api/client';
import { useLanguage } from '../../components/interest-ui/LanguageContext';
import QuickCollectSheet from '../../components/interest-ui/QuickCollectSheet';
import NewLoanModal from '../../components/interest-ui/NewLoanModal';

export default function FinLendPassbookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, formatCurrency, formatDate, formatTime } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('STATEMENT'); // 'STATEMENT' | 'LOANS'
  const [expandedLoanId, setExpandedLoanId] = useState(null);

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

  // Summary Metrics
  const summary = useMemo(() => {
    let totalTaken = 0;
    let totalPaid = 0;
    let balanceToClose = 0;

    loans.forEach((l) => {
      totalTaken += Number(l.principal_amount || 0);
      totalPaid += Number(l.total_principal_paid || 0) + Number(l.total_interest_paid || 0);
      balanceToClose += Number(l.principal_outstanding || 0) + Number(l.interest_outstanding || 0);
    });

    return { totalTaken, totalPaid, balanceToClose };
  }, [loans]);

  // Selected borrower object for QuickCollect
  const borrowerForCollect = useMemo(() => {
    const activeLoan = loans.find((l) => l.loan_status === 'ACTIVE') || loans[0];
    return {
      id: customer.id,
      name: customer.full_name,
      phone: customer.phone,
      loan_id: activeLoan?.id,
      loan_account_number: activeLoan?.loan_account_number,
      due_today: Number(activeLoan?.installment_amount || 0),
      balance_left: Number(activeLoan?.principal_outstanding || 0),
    };
  }, [customer, loans]);

  // WhatsApp Share Passbook Summary
  const handleShareWhatsApp = () => {
    const text = `*FINLEND PRO - BORROWER PASSBOOK*
Customer: ${customer.full_name} (${customer.customer_code})
Phone: ${customer.phone}
Total Loans Taken: ₹${summary.totalTaken.toLocaleString('en-IN')}
Total Amount Paid: ₹${summary.totalPaid.toLocaleString('en-IN')}
Balance Left to Close: ₹${summary.balanceToClose.toLocaleString('en-IN')}
Active Loans: ${loans.filter((l) => l.loan_status === 'ACTIVE').length}

For questions or repayments, contact your manager.`;

    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Loading passbook...</p>
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('customers')}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Call button */}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </a>
          )}

          {/* WhatsApp Share button */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 2. Customer Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md font-heading shrink-0">
            {(customer.full_name || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                {customer.full_name}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
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
            className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading"
          >
            <Coins className="w-4 h-4" />
            <span>{t('collectMoney')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewLoanOpen(true)}
            className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newLoan')}</span>
          </button>
        </div>
      </div>

      {/* 3. Three Big Numbers Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Amount Taken */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 text-center shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('amountTaken')}
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-heading">
            {formatCurrency(summary.totalTaken)}
          </div>
        </div>

        {/* Total Paid */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 text-center shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {t('totalPaid')}
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-heading">
            {formatCurrency(summary.totalPaid)}
          </div>
        </div>

        {/* Balance to Close */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 text-center shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {t('balanceToClose')}
          </div>
          <div className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-heading">
            {formatCurrency(summary.balanceToClose)}
          </div>
        </div>
      </div>

      {/* 4. Tab Selector: Passbook Statement | Active Loans */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('STATEMENT')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all font-heading ${
            activeTab === 'STATEMENT'
              ? 'bg-white dark:bg-[#0c1220] text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t('passbook')} ({ledger.length} entries)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOANS')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all font-heading ${
            activeTab === 'LOANS'
              ? 'bg-white dark:bg-[#0c1220] text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Loans ({loans.length})
        </button>
      </div>

      {/* 5. Tab Content */}
      {activeTab === 'STATEMENT' ? (
        /* Passbook Timeline / Statement */
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
                  <div key={entry.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPayment
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
                        className={`text-sm sm:text-base font-extrabold font-heading ${
                          isPayment ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isPayment
                          ? `+${formatCurrency(entry.credit_amount)}`
                          : `-${formatCurrency(entry.debit_amount)}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Balance: {formatCurrency(entry.net_balance || entry.principal_balance || 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Loans List Accordion */
        <div className="space-y-3">
          {loans.map((loan) => {
            const isExpanded = expandedLoanId === loan.id;
            const isLoanActive = loan.loan_status === 'ACTIVE';

            return (
              <div
                key={loan.id}
                className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs"
              >
                <div
                  onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isLoanActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {loan.loan_status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Given: <strong>{formatCurrency(loan.principal_amount)}</strong> • Installment: <strong>{formatCurrency(loan.installment_amount)}</strong> ({loan.repayment_frequency})
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Balance Left</div>
                      <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">
                        {formatCurrency(loan.principal_outstanding)}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <div className="text-slate-400">Disbursed On</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{formatDate(loan.disbursement_date)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Interest Paid</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(loan.total_interest_paid)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Principal Paid</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(loan.total_principal_paid)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Total Payable</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(loan.total_payable)}</div>
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

