import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  FileText,
  AlertTriangle,
  Trophy,
  Users,
  Printer,
  Download,
  Share2,
  MessageCircle,
  CheckCircle2,
  Wallet,
  Smartphone,
  Search,
  Filter,
  Clock,
  ArrowRight,
  ExternalLink,
  Calendar,
  Building2,
  RefreshCw,
  TrendingUp,
  X,
  CreditCard,
  Layers,
  Sparkles,
  Phone,
  Eye,
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '../utils/dateUtils';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import { smoothScrollTo, scrollToFormOrModal } from '../utils/scrollHelper';
import ModalPortal from '../components/ModalPortal';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportsData, setReportsData] = useState({
    summary: {},
    collections: [],
    defaulters: [],
    auctions: [],
    memberSummaries: [],
    groups: [],
  });

  // Active ChitBase Report Tab: 'collections' | 'defaulters' | 'auctions' | 'members'
  const [activeTab, setActiveTab] = useState('collections');

  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'MONTH'
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Pagination states for all 4 report tables
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionsPageSize, setCollectionsPageSize] = useState(10);
  const [defaultersPage, setDefaultersPage] = useState(1);
  const [defaultersPageSize, setDefaultersPageSize] = useState(10);
  const [auctionsPage, setAuctionsPage] = useState(1);
  const [auctionsPageSize, setAuctionsPageSize] = useState(10);
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);

  // Reset pagination to first page when search, filter, or active tab changes
  useEffect(() => {
    setCollectionsPage(1);
    setDefaultersPage(1);
    setAuctionsPage(1);
    setMembersPage(1);
  }, [searchQuery, selectedGroupId, periodFilter, activeTab]);

  // Modals
  const [selectedAuctionVoucher, setSelectedAuctionVoucher] = useState(null);
  const [selectedMemberPassbook, setSelectedMemberPassbook] = useState(null);
  const [loadingPassbook, setLoadingPassbook] = useState(false);
  const [memberPassbookData, setMemberPassbookData] = useState(null);

  // Quick WhatsApp share feedback
  const [whatsappCopied, setWhatsappCopied] = useState(false);

  const loadReports = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.get('/admin/reports', {
        params: {
          groupId: selectedGroupId !== 'ALL' ? selectedGroupId : undefined,
          period: periodFilter !== 'ALL' ? periodFilter : undefined,
        },
      });

      if (res.data?.success) {
        setReportsData(res.data.data);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load ChitBase reports. Please check your connection and click Refresh.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports(false);
  }, [selectedGroupId, periodFilter]);

  const handleRefresh = () => {
    loadReports(true);
  };

  const summary = reportsData.summary || {};
  const collections = reportsData.collections || [];
  const defaulters = reportsData.defaulters || [];
  const auctions = reportsData.auctions || [];
  const memberSummaries = reportsData.memberSummaries || [];
  const groups = reportsData.groups || [];

  // Filter collections by search query
  const filteredCollections = collections.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.receipt_number || '').toLowerCase().includes(q) ||
      (c.member_name || '').toLowerCase().includes(q) ||
      (c.member_phone || '').includes(q) ||
      (c.group_name || '').toLowerCase().includes(q) ||
      (c.group_code || '').toLowerCase().includes(q) ||
      (c.agent_name || '').toLowerCase().includes(q)
    );
  });

  // Filter defaulters by search query
  const filteredDefaulters = defaulters.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.memberName || '').toLowerCase().includes(q) ||
      (d.memberPhone || '').includes(q) ||
      (d.groupName || '').toLowerCase().includes(q) ||
      (d.groupCode || '').toLowerCase().includes(q) ||
      (d.memberCode || '').toLowerCase().includes(q) ||
      String(d.ticketNumber).includes(q)
    );
  });

  // Filter auctions by search query
  const filteredAuctions = auctions.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.winner_name || '').toLowerCase().includes(q) ||
      (a.group_name || '').toLowerCase().includes(q) ||
      (a.group_code || '').toLowerCase().includes(q) ||
      String(a.period_number).includes(q) ||
      String(a.winning_ticket_number).includes(q)
    );
  });

  // Filter member summaries by search query
  const filteredMembers = memberSummaries.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.member_code || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q)
    );
  });

  // Paginated slices for each report tab
  const paginatedCollections = filteredCollections.slice(
    (collectionsPage - 1) * collectionsPageSize,
    collectionsPage * collectionsPageSize
  );

  const paginatedDefaulters = filteredDefaulters.slice(
    (defaultersPage - 1) * defaultersPageSize,
    defaultersPage * defaultersPageSize
  );

  const paginatedAuctions = filteredAuctions.slice(
    (auctionsPage - 1) * auctionsPageSize,
    auctionsPage * auctionsPageSize
  );

  const paginatedMembers = filteredMembers.slice(
    (membersPage - 1) * membersPageSize,
    membersPage * membersPageSize
  );

  // Generate WhatsApp Reminder Link for a Defaulter
  const getWhatsAppReminderUrl = (defaulter) => {
    const phone = (defaulter.memberPhone || '').replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const isDaily = defaulter.cycleType === 'DAILY';
    const cycleText = isDaily ? 'daily installment for today' : 'monthly installment for the current month cycle';
    const message = encodeURIComponent(
      `Hello ${defaulter.memberName}, this is a gentle payment reminder from ChitFund Pro. Your ${cycleText} of ₹${Number(defaulter.dueAmount).toLocaleString('en-IN')} for scheme ${defaulter.groupName} (${defaulter.groupCode}, Ticket #${defaulter.ticketNumber}) is currently pending. Please make the payment via Cash or UPI to keep your chit account active. Thank you!`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  // Generate Full Report Summary Text for WhatsApp Sharing
  const handleShareSummaryWhatsApp = () => {
    const todayStr = formatDate(new Date());
    const reportText = `*📊 ChitFund Pro — Daily Collection & Reconciliation Report*\n*Date:* ${todayStr}\n----------------------------------\n*Total Collected:* ₹${Number(summary.totalCollected || 0).toLocaleString('en-IN')}\n*💵 Cash Handover:* ₹${Number(summary.cashCollected || 0).toLocaleString('en-IN')}\n*📱 Digital UPI:* ₹${Number(summary.digitalCollected || 0).toLocaleString('en-IN')}\n*Collection Efficiency:* ${summary.collectionEfficiency || 100}%\n*Pending Defaulters:* ${summary.defaultersCount || 0} Members (₹${Number(summary.totalDefaulterAmount || 0).toLocaleString('en-IN')})\n*Total Foreman Commission:* ₹${Number(summary.totalForemanCommission || 0).toLocaleString('en-IN')}\n----------------------------------\n*Verified by ChitFund Pro System*`;
    const url = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank');
  };

  // Export current tab to CSV
  const handleExportCSV = () => {
    const today = new Date().toISOString().slice(0, 10);
    let headers = [];
    let rows = [];
    let filename = `ChitFund_Report_${activeTab}_${today}.csv`;

    if (activeTab === 'collections') {
      headers = ['Receipt Number', 'Date', 'Member Name', 'Phone', 'Chit Scheme', 'Ticket #', 'Amount (INR)', 'Payment Mode', 'Collected By', 'Reference / Notes'];
      rows = filteredCollections.map((c) => [
        c.receipt_number,
        formatDate(c.collection_date),
        `"${c.member_name || ''}"`,
        c.member_phone || '',
        `"${c.group_name || ''} (${c.group_code || ''})"`,
        c.ticket_number || '',
        c.amount,
        c.payment_method,
        `"${c.agent_name || ''}"`,
        `"${c.payment_reference || c.notes || ''}"`,
      ]);
    } else if (activeTab === 'defaulters') {
      headers = ['Member Code', 'Member Name', 'Contact Phone', 'Chit Scheme', 'Cycle Type', 'Ticket #', 'Due Amount (INR)', 'Expected Amount', 'Paid So Far', 'Agent Remarks'];
      rows = filteredDefaulters.map((d) => [
        d.memberCode,
        `"${d.memberName || ''}"`,
        d.memberPhone || '',
        `"${d.groupName || ''} (${d.groupCode || ''})"`,
        d.cycleType === 'DAILY' ? 'Daily (Day-by-Day)' : 'Monthly (Month-by-Month)',
        d.ticketNumber,
        d.dueAmount,
        d.expectedAmount,
        d.paidAmount,
        `"${d.agentNotes || ''}"`,
      ]);
    } else if (activeTab === 'auctions') {
      headers = ['Cycle Month #', 'Draw #', 'Chit Scheme', 'Winning Member', 'Ticket #', 'Pool Amount', 'Bid Discount', 'Foreman Commission (5%)', 'Total Dividend', 'Dividend / Member', 'Net Prize Disbursed', 'Payout Status', 'Date'];
      rows = filteredAuctions.map((a) => [
        a.period_number,
        a.draw_number,
        `"${a.group_name} (${a.group_code})"`,
        `"${a.winner_name}"`,
        a.winning_ticket_number,
        a.total_pool_amount,
        a.bid_discount,
        a.foreman_commission,
        a.total_dividend,
        a.dividend_per_member,
        a.net_payable_amount,
        a.payout_status,
        formatDate(a.auction_date),
      ]);
    } else if (activeTab === 'members') {
      headers = ['Member Code', 'Full Name', 'Phone Number', 'Enrolled Groups', 'Total Contributed (INR)', 'Total Dividends Earned', 'Prize Money Won'];
      rows = filteredMembers.map((m) => [
        m.member_code,
        `"${m.full_name}"`,
        m.phone,
        m.enrolled_groups_count,
        m.total_contributed,
        m.total_dividends_earned,
        m.total_prize_won,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Open Passbook for a member
  const handleOpenMemberPassbook = async (memberId, memberName) => {
    setSelectedMemberPassbook({ id: memberId, name: memberName });
    scrollToFormOrModal('report-member-passbook-modal');
    setLoadingPassbook(true);
    try {
      const res = await api.get(`/admin/members/${memberId}/passbook`);
      if (res.data?.success) {
        setMemberPassbookData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load passbook:', err);
    } finally {
      setLoadingPassbook(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn print:space-y-4">
      {/* Friendly Error Alert Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs sm:text-sm animate-fadeIn"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadReports(true)}
            className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              ChitBase Financial Reports Suite
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[11px] font-mono text-slate-400">Date Standard: DD/MM/YYYY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Reports & Statements Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Instant PDF & WhatsApp reports for Monthly Collections, Defaulters, Auction Lifts, and Member Statements
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh All Reports"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleShareSummaryWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
            title="Share summary to WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Share WhatsApp Summary</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 5 Financial Summary KPI Cards (ChitBase Foreman Analytics) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Collected */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Collected
            </span>
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5">
            ₹{Number(summary.totalCollected || 0).toLocaleString('en-IN')}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span className="text-emerald-600 font-bold">Cash: ₹{Number(summary.cashCollected || 0).toLocaleString('en-IN')}</span>
            <span>·</span>
            <span className="text-blue-600 font-bold">UPI: ₹{Number(summary.digitalCollected || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Collection Efficiency */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Collection Rate
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {summary.collectionEfficiency || 100}%
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {summary.totalReceiptsCount || 0} Receipts Reconciled
          </span>
        </div>

        {/* Defaulter / Arrears Dues */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Dues (Arrears)
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1.5">
            ₹{Number(summary.totalDefaulterAmount || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold mt-1 block">
            {summary.defaultersCount || 0} Members Awaiting Payment
          </span>
        </div>

        {/* Foreman Commission Earned (5%) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Foreman Commission
            </span>
            <Trophy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1.5">
            ₹{Number(summary.totalForemanCommission || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium mt-1 block">
            5% Organizer Operating Cut
          </span>
        </div>

        {/* Total Dividend Savings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Dividend Savings
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">
            ₹{Number(summary.totalDividendsDistributed || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-1 block">
            Distributed to Subscribers
          </span>
        </div>
      </div>

      {/* Filter and Search Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        {/* Left: Chit Group Selector & Period Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                smoothScrollTo('report-results-table', { offset: 32, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Chit Schemes & Routes</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} ({g.group_code}) — {g.chit_type === 'DAILY_CHIT' ? 'Daily Chit' : 'Monthly Chit'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                smoothScrollTo('report-results-table', { offset: 32, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Collection Cycles</option>
              <option value="TODAY">Today's Cycle Only</option>
              <option value="MONTH">This Current Month</option>
            </select>
          </div>
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt, member, phone, code..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* 4 Primary ChitBase Report Navigation Tabs with Automatic Smooth Window Move */}
      <div id="report-results-table" className="border-b border-slate-200 dark:border-slate-800 print:hidden scroll-mt-6">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('collections');
              smoothScrollTo('report-results-table', { offset: 32, behavior: 'smooth' });
            }}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'collections'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Monthly & Cycle Collections</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredCollections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('defaulters');
              smoothScrollTo('report-results-table', { offset: 32, behavior: 'smooth' });
            }}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'defaulters'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Defaulters & Pending Dues</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
              {filteredDefaulters.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('auctions');
              smoothScrollTo('report-results-table', { offset: 32, behavior: 'smooth' });
            }}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'auctions'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 text-purple-500" />
            <span>Auction & Lift History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredAuctions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('members');
              smoothScrollTo('report-results-table', { offset: 32, behavior: 'smooth' });
            }}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Member Statements & Passbooks</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredMembers.length}
            </span>
          </button>
        </nav>
      </div>

      {/* =========================================================================
          TAB 1: MONTHLY & CYCLE COLLECTIONS REPORT
          ========================================================================= */}
      {activeTab === 'collections' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Collection Transactions ({filteredCollections.length} Records)
              </span>
              <span className="font-mono text-[11px]">Universal Date: DD/MM/YYYY</span>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Chit Scheme</th>
                    <th className="py-3 px-4">Ticket #</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Collected By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        Loading collection records from MySQL...
                      </td>
                    </tr>
                  ) : filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500">
                        No collection records found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedCollections.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {c.receipt_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatDate(c.collection_date)} {c.collection_time ? `· ${formatTime(c.collection_time)}` : ''}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {c.member_name}
                          {c.member_phone && (
                            <span className="block text-[10px] text-slate-400 font-mono">{c.member_phone}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {c.group_name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{c.group_code}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {c.ticket_number ? `Ticket #${c.ticket_number}` : '-'}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white text-sm">
                          ₹{Number(c.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.payment_method === 'CASH'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {c.payment_method}
                          </span>
                          {c.payment_reference && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              <ShowMoreText text={c.payment_reference} maxChars={16} />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                          {c.agent_name || 'Admin'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={collectionsPage}
              totalItems={filteredCollections.length}
              pageSize={collectionsPageSize}
              onPageChange={setCollectionsPage}
              onPageSizeChange={setCollectionsPageSize}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DEFAULTERS & PENDING DUES REPORT (CHITBASE DEFAULTERS WITH WHATSAPP)
          ========================================================================= */}
      {activeTab === 'defaulters' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  {filteredDefaulters.length} Subscribers with Pending Installments (Total Overdue: ₹{Number(summary.totalDefaulterAmount || 0).toLocaleString('en-IN')})
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-rose-700 dark:text-rose-300 flex-wrap">
                  <span className="font-semibold">
                    📅 Daily Overdue Today: {summary.dailyDefaultersCount || 0} (₹{Number(summary.dailyDefaulterAmount || 0).toLocaleString('en-IN')})
                  </span>
                  <span>·</span>
                  <span className="font-semibold">
                    🗓️ Monthly Overdue This Month: {summary.monthlyDefaultersCount || 0} (₹{Number(summary.monthlyDefaulterAmount || 0).toLocaleString('en-IN')})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Chit Scheme</th>
                    <th className="py-3 px-4">Installment Cycle</th>
                    <th className="py-3 px-4">Ticket #</th>
                    <th className="py-3 px-4">Installment Due</th>
                    <th className="py-3 px-4">Agent Field Remark</th>
                    <th className="py-3 px-4 text-right">Instant WhatsApp Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        Scanning active memberships for pending dues...
                      </td>
                    </tr>
                  ) : filteredDefaulters.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                        <span className="font-bold">All enrolled members have paid their due installments! 100% Reconciled.</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedDefaulters.map((d) => (
                      <tr key={`${d.groupId}-${d.memberId}-${d.ticketNumber}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {d.memberName}
                          <span className="block text-[10px] text-slate-400 font-mono">{d.memberCode}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {d.memberPhone || 'No Phone'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {d.groupName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{d.groupCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          {d.cycleType === 'DAILY' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 inline-flex items-center gap-1">
                              <span>📅 Daily (Today)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60 inline-flex items-center gap-1">
                              <span>🗓️ Monthly (Month)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          Ticket #{d.ticketNumber}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                          ₹{Number(d.dueAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-500 italic max-w-xs">
                          {d.agentNotes ? <ShowMoreText text={d.agentNotes} maxChars={30} /> : <span className="text-slate-400">None</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {d.memberPhone ? (
                            <a
                              href={getWhatsAppReminderUrl(d)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp Reminder</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Phone Required</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={defaultersPage}
              totalItems={filteredDefaulters.length}
              pageSize={defaultersPageSize}
              onPageChange={setDefaultersPage}
              onPageSizeChange={setDefaultersPageSize}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: AUCTION & LIFT HISTORY REPORT (CHITBASE REVERSE AUCTIONS & LIFTS)
          ========================================================================= */}
      {activeTab === 'auctions' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Auction Bids & Prize Lift Disbursements ({filteredAuctions.length} Rounds)
            </span>
            <span className="font-mono text-[11px]">ChitBase Reverse Auction Rules</span>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Cycle #</th>
                  <th className="py-3 px-4">Chit Scheme</th>
                  <th className="py-3 px-4">Winning Member</th>
                  <th className="py-3 px-4">Bid Discount</th>
                  <th className="py-3 px-4">Foreman (5%)</th>
                  <th className="py-3 px-4">Dividend / Member</th>
                  <th className="py-3 px-4">Net Prize Lift</th>
                  <th className="py-3 px-4">Payout Status</th>
                  <th className="py-3 px-4 text-right">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      Loading auction ledger from MySQL...
                    </td>
                  </tr>
                ) : filteredAuctions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-500">
                      No auction rounds recorded yet. Go to "Auctions" to conduct monthly bidding.
                    </td>
                  </tr>
                ) : (
                  paginatedAuctions.map((auc) => (
                    <tr key={auc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          Month #{auc.period_number}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Draw #{auc.draw_number} · {formatDate(auc.auction_date)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {auc.group_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{auc.group_code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {auc.winner_name}
                        </span>
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                          Ticket #{auc.winning_ticket_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        ₹{Number(auc.bid_discount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-purple-600 dark:text-purple-400">
                        ₹{Number(auc.foreman_commission).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(auc.dividend_per_member).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                        ₹{Number(auc.net_payable_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            auc.payout_status === 'DISBURSED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {auc.payout_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAuctionVoucher(auc);
                            scrollToFormOrModal('report-auction-voucher-modal');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                        >
                          Voucher
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={auctionsPage}
            totalItems={filteredAuctions.length}
            pageSize={auctionsPageSize}
            onPageChange={setAuctionsPage}
            onPageSizeChange={setAuctionsPageSize}
          />
        </div>
      )}

      {/* =========================================================================
          TAB 4: MEMBER-WISE STATEMENTS & PASSBOOKS REPORT
          ========================================================================= */}
      {activeTab === 'members' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Subscriber Financial Ledger Dossier ({filteredMembers.length} Members)
            </span>
            <span className="font-mono text-[11px]">Passbook Ledger</span>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Member Code</th>
                  <th className="py-3 px-4">Subscriber Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Chits Enrolled</th>
                  <th className="py-3 px-4">Total Contributed</th>
                  <th className="py-3 px-4">Dividends Received</th>
                  <th className="py-3 px-4">Prize Lifts Won</th>
                  <th className="py-3 px-4 text-right">Passbook Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      Loading subscriber accounts...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-500">
                      No subscriber accounts found.
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {m.member_code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {m.full_name}
                      </td>
                      <td className="py-3 px-4 font-mono">{m.phone}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {m.enrolled_groups_count} Schemes
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{Number(m.total_contributed).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(m.total_dividends_earned).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                        ₹{Number(m.total_prize_won).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenMemberPassbook(m.id, m.full_name)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
                        >
                          View Passbook
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={membersPage}
            totalItems={filteredMembers.length}
            pageSize={membersPageSize}
            onPageChange={setMembersPage}
            onPageSizeChange={setMembersPageSize}
          />
        </div>
      )}

      {/* =========================================================================
          MODAL: AUCTION VOUCHER & DIVIDEND BREAKDOWN
          ========================================================================= */}
      <ModalPortal
        id="report-auction-voucher-modal"
        isOpen={Boolean(selectedAuctionVoucher)}
        onClose={() => setSelectedAuctionVoucher(null)}
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Official Auction Lift Voucher
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAuctionVoucher.group_name} ({selectedAuctionVoucher.group_code}) · Month #{selectedAuctionVoucher.period_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuctionVoucher(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Winning Subscriber:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedAuctionVoucher.winner_name} (Ticket #{selectedAuctionVoucher.winning_ticket_number})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Auction Conducted Date:</span>
                  <span className="font-mono">{formatDate(selectedAuctionVoucher.auction_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Pool Amount:</span>
                  <span className="font-semibold">₹{Number(selectedAuctionVoucher.total_pool_amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                  <span>Winning Bid Discount:</span>
                  <span>- ₹{Number(selectedAuctionVoucher.bid_discount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-purple-600 dark:text-purple-400 font-semibold border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  <span>Foreman Commission (5%):</span>
                  <span>₹{Number(selectedAuctionVoucher.foreman_commission).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Total Dividend Distributed:</span>
                  <span>₹{Number(selectedAuctionVoucher.total_dividend).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Dividend Per Member:</span>
                  <span>₹{Number(selectedAuctionVoucher.dividend_per_member).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-blue-600 dark:text-blue-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>Net Prize Money Disbursed:</span>
                  <span>₹{Number(selectedAuctionVoucher.net_payable_amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-800 dark:text-slate-200 font-semibold">
                  <span>Next Month Installment:</span>
                  <span>₹{Number(selectedAuctionVoucher.next_installment_payable).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedAuctionVoucher(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
      </ModalPortal>

      {/* =========================================================================
          MODAL: MEMBER PASSBOOK STATEMENT (CHITBASE PASSBOOK & INSTALLMENT LEDGER)
          ========================================================================= */}
      <ModalPortal
        id="report-member-passbook-modal"
        isOpen={Boolean(selectedMemberPassbook)}
        onClose={() => {
          setSelectedMemberPassbook(null);
          setMemberPassbookData(null);
        }}
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  ChitBase Member Statement
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {selectedMemberPassbook.name} — Passbook & Ledger
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMemberPassbook(null);
                  setMemberPassbookData(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingPassbook ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Fetching subscriber passbook and dividend statements...</span>
              </div>
            ) : memberPassbookData ? (
              <div className="space-y-4 text-xs">
                {/* 4 KPI summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Paid</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                      ₹{Number(memberPassbookData.summary?.totalPaid || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block uppercase">Dividends Earned</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      ₹{Number(memberPassbookData.summary?.totalDividendsEarned || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block uppercase">Prize Won</span>
                    <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400 block mt-0.5">
                      ₹{Number(memberPassbookData.summary?.totalPrizeMoneyWon || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block uppercase">Net Position</span>
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 block mt-0.5">
                      ₹{Number(memberPassbookData.summary?.netPosition || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Enrolled Groups */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Enrolled Chit Schemes ({memberPassbookData.enrolledGroups?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {memberPassbookData.enrolledGroups?.map((eg) => (
                      <div key={eg.membership_id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{eg.group_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ticket #{eg.ticket_number} · {eg.chit_type}</span>
                        </div>
                        <span className="font-extrabold text-blue-600">₹{Number(eg.installment_amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Installments Ledger Table */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Installment Payment Ledger ({memberPassbookData.collections?.length || 0} Receipts)
                  </h4>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Receipt #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Scheme</th>
                          <th className="py-2 px-3">Method</th>
                          <th className="py-2 px-3 font-bold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {memberPassbookData.collections?.map((col) => (
                          <tr key={col.id}>
                            <td className="py-2 px-3 font-mono font-bold text-blue-600">{col.receipt_number}</td>
                            <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{formatDate(col.collection_date)}</td>
                            <td className="py-2 px-3">{col.group_name}</td>
                            <td className="py-2 px-3">{col.payment_method}</td>
                            <td className="py-2 px-3 font-bold text-emerald-600 text-right">₹{Number(col.amount).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Individual Dividends Credited Ledger */}
                {memberPassbookData.dividendsLedger?.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
                      <span>Dividends Credited ({memberPassbookData.dividendsLedger.length})</span>
                      <span className="text-[10px] text-emerald-600 font-bold">0% Admin Fee</span>
                    </h4>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 max-h-40 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Scheme</th>
                            <th className="py-2 px-3">Round</th>
                            <th className="py-2 px-3 text-right">Dividend Credited</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {memberPassbookData.dividendsLedger.map((div) => (
                            <tr key={div.id}>
                              <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{formatDate(div.credited_date)}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{div.group_name}</td>
                              <td className="py-2 px-3 font-mono">Round #{div.period_number}</td>
                              <td className="py-2 px-3 font-bold text-emerald-600 text-right">₹{Number(div.dividend_amount).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Passbook Statement</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMemberPassbook(null);
                  setMemberPassbookData(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
      </ModalPortal>
    </div>
  );
}
