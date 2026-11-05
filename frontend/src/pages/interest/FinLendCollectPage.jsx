import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  Search,
  CheckCircle2,
  Clock,
  Share2,
  Printer,
  RefreshCw,
  Phone,
  ArrowUpRight,
  Filter,
  Check,
} from 'lucide-react';
import api from '../../api/client';
import { formatCurrency, formatDate, formatTime } from '../../utils/interestUtils';
import QuickCollectSheet from '../../components/interest-ui/QuickCollectSheet';

export default function FinLendCollectPage() {

  const [activeTab, setActiveTab] = useState('COLLECT'); // 'COLLECT' | 'RECEIPTS'
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'DUE_TODAY' | 'OVERDUE'
  const [searchQuery, setSearchQuery] = useState('');

  const [assignedLoans, setAssignedLoans] = useState([]);
  const [todayReceipts, setTodayReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Collect Sheet
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);

  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [loansRes, reportRes] = await Promise.allSettled([
        api.get('/interest/agent/assigned-customers'),
        api.get('/interest/reports/collections'),
      ]);

      if (loansRes.status === 'fulfilled' && loansRes.value.data?.success) {
        setAssignedLoans(loansRes.value.data.data || []);
      }

      if (reportRes.status === 'fulfilled' && reportRes.value.data?.success) {
        const collections = reportRes.value.data.data?.collections || [];
        setTodayReceipts(collections);
      }
    } catch (err) {
      console.error('Failed to load collections data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtered Loans to Collect
  const filteredLoans = useMemo(() => {
    return assignedLoans.filter((loan) => {
      const dueAmt = Number(loan.current_due_amount || 0);
      const isOverdue = loan.oldest_pending_date && loan.oldest_pending_date < todayStr && dueAmt > 0;

      // Filter Mode
      if (filterMode === 'DUE_TODAY' && dueAmt <= 0) return false;
      if (filterMode === 'OVERDUE' && !isOverdue) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = loan.customer_name?.toLowerCase().includes(q);
        const matchPhone = loan.customer_phone?.includes(q);
        const matchAcc = loan.loan_account_number?.toLowerCase().includes(q);
        return matchName || matchPhone || matchAcc;
      }
      return true;
    });
  }, [assignedLoans, filterMode, searchQuery, todayStr]);

  // Filtered Today's Receipts
  const filteredReceipts = useMemo(() => {
    if (!searchQuery.trim()) return todayReceipts;
    const q = searchQuery.toLowerCase().trim();
    return todayReceipts.filter((r) => {
      return (
        r.customer_name?.toLowerCase().includes(q) ||
        r.customer_phone?.includes(q) ||
        r.loan_account_number?.toLowerCase().includes(q) ||
        r.receipt_number?.toLowerCase().includes(q)
      );
    });
  }, [todayReceipts, searchQuery]);

  const totalCollectedToday = useMemo(() => {
    return todayReceipts.reduce((sum, r) => sum + Number(r.amount_collected || 0), 0);
  }, [todayReceipts]);

  const handleOpenCollect = (loan) => {
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

  const handleShareWhatsAppReceipt = (receipt) => {
    const text = `*FINLEND PRO - COLLECTION RECEIPT*
Receipt #: ${receipt.receipt_number || 'N/A'}
Date: ${formatDate(receipt.collection_date)}
Customer: ${receipt.customer_name}
Loan Account: ${receipt.loan_account_number}
Amount Paid: ₹${Number(receipt.amount_collected || 0).toLocaleString('en-IN')}
Payment Mode: ${receipt.payment_method || 'CASH'}
Agent: ${receipt.agent_name || 'Admin'}
Thank you for your payment!`;

    const cleanPhone = (receipt.customer_phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            Collect
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Collected Today: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCollectedToday)}</strong> ({todayReceipts.length} receipts)
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
        </button>
      </div>

      {/* Main Tabs: Collect Money | Today's Receipts */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('COLLECT')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all font-heading ${
            activeTab === 'COLLECT'
              ? 'bg-white dark:bg-[#0c1220] text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Collect Money ({assignedLoans.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECEIPTS')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all font-heading ${
            activeTab === 'RECEIPTS'
              ? 'bg-white dark:bg-[#0c1220] text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Today's Receipts ({todayReceipts.length})
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'COLLECT'
              ? 'Search borrower name, phone, loan account #...'
              : 'Search receipt #, borrower name, phone...'
          }
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* View 1: Collect Money List */}
      {activeTab === 'COLLECT' && (
        <div className="space-y-3">
          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterMode === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
              }`}
            >
              All ({assignedLoans.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('DUE_TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterMode === 'DUE_TODAY'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
              }`}
            >
              Due Today
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('OVERDUE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterMode === 'OVERDUE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-[#0c1220] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
              }`}
            >
              Overdue
            </button>
          </div>

          {/* Cards */}
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">
                No matching borrowers found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try clearing your search query or switching filters.
              </p>
            </div>
          ) : (
            filteredLoans.map((loan) => {
              const due = Number(loan.current_due_amount || loan.installment_amount || 0);
              const balance = Number(loan.principal_outstanding || 0);
              const initial = (loan.customer_name || 'B').charAt(0).toUpperCase();

              return (
                <div
                  key={loan.id}
                  className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200/60 dark:border-indigo-800/40 font-heading">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate font-heading">
                        {loan.customer_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{loan.customer_phone || 'No phone'}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{loan.loan_account_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Due: <strong className="text-slate-900 dark:text-white">{formatCurrency(due)}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Balance: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(balance)}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCollect(loan)}
                      className="py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95 font-heading"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Collect</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View 2: Today's Receipts */}
      {activeTab === 'RECEIPTS' && (
        <div className="space-y-3">
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 space-y-2">
              <Clock className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">
                No receipts recorded today yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collect payments to generate receipts automatically.
              </p>
            </div>
          ) : (
            filteredReceipts.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
                      {r.customer_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                      {r.payment_method || 'CASH'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-[11px]">{r.receipt_number}</span>
                    <span>•</span>
                    <span>{formatTime(r.created_at)}</span>
                    <span>•</span>
                    <span>By {r.agent_name || 'Admin'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                  <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-heading">
                    +{formatCurrency(r.amount_collected)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppReceipt(r)}
                    className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 transition-colors"
                    title="Send WhatsApp receipt"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Collect Bottom Sheet */}
      <QuickCollectSheet
        isOpen={isCollectOpen}
        onClose={() => setIsCollectOpen(false)}
        onSuccess={() => loadData(true)}
        initialBorrower={selectedBorrower}
      />
    </div>
  );
}

