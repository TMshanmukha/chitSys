import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Gavel,
  Coins,
  Receipt,
  Calendar,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  Search,
  Filter,
  Printer,
  X,
  Loader2,
  Sparkles,
  TrendingDown,
  Building2,
  FileSpreadsheet,
  Trophy,
  ShieldCheck,
  Layers,
  Lock,
  HelpCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import ConfirmModal from '../components/ConfirmModal';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import ModalPortal from '../components/ModalPortal';
import { smoothScrollTo, scrollToFormOrModal } from '../utils/scrollHelper';

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [voucherModal, setVoucherModal] = useState(null);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [showAuctionConfirm, setShowAuctionConfirm] = useState(false);
  const [showDisburseConfirm, setShowDisburseConfirm] = useState(false);
  const [selectedAuctionForDisburse, setSelectedAuctionForDisburse] = useState(null);
  const [disburseForm, setDisburseForm] = useState({
    payment_method: 'NEFT_RTGS',
    payout_reference: '',
  });

  // Dedicated Scheme Selection & Distribution Breakdown state
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [schemeBreakdown, setSchemeBreakdown] = useState(null);
  const [schemeLoading, setSchemeLoading] = useState(false);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [subscriberPageSize, setSubscriberPageSize] = useState(10);

  // Global Auctions Search and Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setSubscriberPage(1);
  }, [subscriberSearch]);

  // Auction Form state
  const [form, setForm] = useState({
    group_id: '',
    period_number: '1',
    draw_number: '1',
    auction_type: 'AUCTION',
    pool_source: 'REGULAR',
    custom_pool_amount: '',
    winning_member_id: '',
    winning_ticket_number: '',
    bid_discount: '',
    auction_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [groupMembers, setGroupMembers] = useState([]);
  const [availableReserve, setAvailableReserve] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [auctionsRes, groupsRes, summaryRes] = await Promise.all([
        api.get('/admin/auctions'),
        api.get('/admin/groups'),
        api.get('/admin/auctions/summary'),
      ]);

      if (auctionsRes.data?.success) setAuctions(auctionsRes.data.data || []);
      if (groupsRes.data?.success) {
        // Include all Auction Chit & Double Chit schemes (both Daily and Monthly)
        const auctionEligibleGroups = (groupsRes.data.data || []).filter(
          (g) => g.chit_type === 'AUCTION_CHIT' || g.chit_type === 'DOUBLE_CHIT'
        );
        setGroups(auctionEligibleGroups);

        // Auto-select first scheme if none selected yet
        if (!selectedSchemeId && auctionEligibleGroups.length > 0) {
          setSelectedSchemeId(String(auctionEligibleGroups[0].id));
        }
      }
      if (summaryRes.data?.success) setSummary(summaryRes.data.data || {});
    } catch (err) {
      console.error('Failed to load auctions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch Scheme Distribution Breakdown whenever selectedSchemeId changes
  const loadSchemeBreakdown = async (groupId) => {
    if (!groupId) {
      setSchemeBreakdown(null);
      return;
    }
    try {
      setSchemeLoading(true);
      const res = await api.get(`/admin/auctions/scheme/${groupId}/breakdown`);
      if (res.data?.success && res.data.data?.group) {
        setSchemeBreakdown(res.data.data);
      } else {
        setSchemeBreakdown(null);
      }
    } catch (err) {
      console.error('Failed to load scheme breakdown:', err);
      setSchemeBreakdown(null);
    } finally {
      setSchemeLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSchemeId) {
      loadSchemeBreakdown(selectedSchemeId);
      smoothScrollTo('scheme-breakdown-details', { offset: 32, behavior: 'smooth', delay: 120 });
    }
  }, [selectedSchemeId]);

  // When group changes in Conduct Auction modal, load its enrolled members
  const handleGroupChange = async (groupId) => {
    const groupObj = groups.find((g) => String(g.id) === String(groupId));
    setForm((prev) => ({
      ...prev,
      group_id: groupId,
      winning_member_id: '',
      winning_ticket_number: '',
      pool_source: 'REGULAR',
      custom_pool_amount: '',
      auction_type: groupObj?.chit_type === 'DOUBLE_CHIT' ? 'DOUBLE_CHIT_DRAW' : 'AUCTION',
    }));

    if (groupId) {
      try {
        const res = await api.get(`/admin/groups/${groupId}`);
        if (res.data?.success) {
          setGroupMembers(res.data.data.members || []);
          const auctionsList = res.data.data.auctions || [];
          const reserveSum = auctionsList.reduce((acc, a) => acc + parseFloat(a.double_chit_reserve || 0), 0);
          setAvailableReserve(reserveSum);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setGroupMembers([]);
      setAvailableReserve(0);
    }
  };

  // Selected group object in modal form
  const selectedGroup = groups.find((g) => String(g.id) === String(form.group_id));
  const isDoubleChitScheme = selectedGroup?.chit_type === 'DOUBLE_CHIT';
  const isAuctioningReserve = isDoubleChitScheme && form.pool_source === 'SAVED_RESERVE';
  const isDraw1 = String(form.draw_number) === '1';

  // Live Calculations in Modal
  const groupPoolAmount = selectedGroup ? parseFloat(selectedGroup.total_pool_amount) : 0;
  const baseInstallment = selectedGroup ? parseFloat(selectedGroup.installment_amount) : 0;
  const totalMembers = selectedGroup ? parseInt(selectedGroup.total_members_limit || 20, 10) : 20;
  const commissionPercent = selectedGroup ? parseFloat(selectedGroup.foreman_commission_percent || 5) : 5;

  // Effective pool being auctioned: either standard group pool or saved chit reserve
  const effectivePool = isAuctioningReserve
    ? (parseFloat(form.custom_pool_amount) || availableReserve || 0)
    : groupPoolAmount;

  const bidDiscount = parseFloat(form.bid_discount || 0);

  // Admin Commission: percentage of effective pool amount, DEDUCTED from winner prize (NOT from bid amount)
  const foremanCommission = parseFloat(((effectivePool * commissionPercent) / 100).toFixed(2));

  // Net prize money payable to winning subscriber = Effective Pool - Bid Discount - Admin Commission
  const netPayablePrize = Math.max(0, parseFloat((effectivePool - bidDiscount - foremanCommission).toFixed(2)));

  // Financial routing:
  // - AUCTION_CHIT: Dividend per member comes directly from the bid amount!
  //   modalTotalDividend = bidDiscount, modalDividendPerMember = bidDiscount / totalMembers
  // - DOUBLE_CHIT: NO dividend distributed to members (0 dividend, full base installment).
  //   The full bid discount is saved into this chit's pool reserve (modalDoubleChitReserve = bidDiscount) so it can be auctioned again!
  const modalDoubleChitReserve = isDoubleChitScheme ? bidDiscount : 0;
  const modalTotalDividend = isDoubleChitScheme ? 0 : bidDiscount;
  const modalDividendPerMember = (!isDoubleChitScheme && totalMembers > 0) ? parseFloat((modalTotalDividend / totalMembers).toFixed(2)) : 0;
  const modalNextInstallment = isDoubleChitScheme ? baseInstallment : Math.max(0, parseFloat((baseInstallment - modalDividendPerMember).toFixed(2)));

  const filteredAuctions = auctions.filter((auc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (auc.winner_name || '').toLowerCase().includes(q) ||
      (auc.group_name || '').toLowerCase().includes(q) ||
      (auc.group_code || '').toLowerCase().includes(q) ||
      String(auc.period_number).includes(q) ||
      String(auc.winning_ticket_number).includes(q) ||
      (auc.winner_phone || '').includes(q)
    );
  });

  const paginatedAuctions = filteredAuctions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filtered subscribers for the dedicated Scheme Breakdown table
  const schemeSubscribers = schemeBreakdown?.subscribers || [];
  const filteredSubscribers = schemeSubscribers.filter((sub) => {
    if (!subscriberSearch.trim()) return true;
    const q = subscriberSearch.toLowerCase();
    return (
      (sub.full_name || '').toLowerCase().includes(q) ||
      (sub.phone || '').includes(q) ||
      (sub.member_code || '').toLowerCase().includes(q) ||
      String(sub.ticket_number).includes(q)
    );
  });

  const paginatedSubscribers = filteredSubscribers.slice(
    (subscriberPage - 1) * subscriberPageSize,
    subscriberPage * subscriberPageSize
  );

  const handleConductAuction = (e) => {
    e.preventDefault();
    setError('');
    if (!form.group_id || !form.winning_member_id || !form.winning_ticket_number) {
      setError('Please select a Chit Scheme, winning subscriber, and ticket number.');
      return;
    }

    // Disqualification validation: ensure member has not won in this scheme already
    const chosenMember = groupMembers.find((m) => String(m.member_id) === String(form.winning_member_id));
    if (chosenMember?.is_prized === 1) {
      setError(
        `Subscriber ${chosenMember.full_name} has already won a prize in Round #${chosenMember.prized_period || 'past'} and cannot participate or bid in any further auctions for this chit scheme.`
      );
      return;
    }

    setShowAuctionConfirm(true);
  };

  const executeConfirmedAuction = async () => {
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/admin/auctions', {
        group_id: parseInt(form.group_id, 10),
        period_number: parseInt(form.period_number, 10),
        draw_number: parseInt(form.draw_number, 10),
        auction_type: form.auction_type,
        pool_source: form.pool_source || 'REGULAR',
        custom_pool_amount: form.custom_pool_amount ? parseFloat(form.custom_pool_amount) : null,
        winning_member_id: parseInt(form.winning_member_id, 10),
        winning_ticket_number: parseInt(form.winning_ticket_number, 10),
        bid_discount: parseFloat(form.bid_discount || 0),
        auction_date: form.auction_date,
        notes: form.notes || null,
      });

      if (res.data?.success) {
        setShowAuctionConfirm(false);
        setShowModal(false);
        setForm({
          group_id: '',
          period_number: '1',
          draw_number: '1',
          auction_type: 'AUCTION',
          pool_source: 'REGULAR',
          custom_pool_amount: '',
          winning_member_id: '',
          winning_ticket_number: '',
          bid_discount: '',
          auction_date: new Date().toISOString().slice(0, 10),
          notes: '',
        });
        setAvailableReserve(0);
        await loadData();
        if (selectedSchemeId) {
          await loadSchemeBreakdown(selectedSchemeId);
        }
      }
    } catch (err) {
      setShowAuctionConfirm(false);
      setError(getFriendlyErrorMessage(err, 'Failed to finalize auction. Please verify details and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburseSubmit = (e) => {
    e.preventDefault();
    if (!selectedAuctionForDisburse) return;
    setShowDisburseConfirm(true);
  };

  const executeConfirmedDisbursement = async () => {
    if (!selectedAuctionForDisburse) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/auctions/${selectedAuctionForDisburse.id}/payout`, {
        payout_status: 'DISBURSED',
        payout_reference: disburseForm.payout_reference,
        payment_method: disburseForm.payment_method,
      });
      setShowDisburseConfirm(false);
      setShowDisburseModal(false);
      setSelectedAuctionForDisburse(null);
      setDisburseForm({ payment_method: 'NEFT_RTGS', payout_reference: '' });
      await loadData();
      if (selectedSchemeId) {
        await loadSchemeBreakdown(selectedSchemeId);
      }
    } catch (err) {
      setShowDisburseConfirm(false);
      alert(getFriendlyErrorMessage(err, 'Failed to disburse prize money. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Top Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-heading">
            <Gavel className="w-4 h-4" />
            <span>ChitBase Reverse Auctions & Double Chit Operations</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 font-heading">
            Auctions & Dividends Distribution Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time subscriber reverse auctions, Double Chit reserve pools, transparent dividend splits, and member ledgers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('');
            scrollToFormOrModal('conduct-auction-modal');
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer font-heading"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Conduct Auction / Draw</span>
        </button>
      </div>

      {/* Global Financial Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-heading">
            Auctions Conducted
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-heading">
            {summary.totalAuctionsCount || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Monthly & Double Chit rounds</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-heading">
            Dividends Distributed
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-heading">
            ₹{Number(summary.totalDividendsGenerated || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Credited equally to subscribers</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-heading">
            Prize Money Awarded
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-heading">
            ₹{Number(summary.totalPrizeMoneyDisbursed || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Filled & paid to round winners</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block font-heading">
            Double Chit Pool Reserve
          </span>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-heading">
            ₹{Number(summary.totalDoubleChitReserve || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Retained for remaining subscriber auctions</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DEDICATED SCHEME BREAKDOWN & SUBSCRIBER DISTRIBUTION HUB                  */}
      {/* User requirement: When one chit is selected, show all clear information: */}
      {/* what is happening, what amount is distributed and where is distributed,   */}
      {/* saved in every member's information, 0% admin commission on dividends,    */}
      {/* double chit pool reserve retention, and strict winner disqualification.   */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 border border-blue-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Scheme Selector Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider font-heading">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Chit Scheme Transparency & Distribution Ledger</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-heading">
              Select Chit Scheme to View Detailed Auction & Dividend Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an individual chit scheme to view what amount was distributed, where it was credited, and subscriber eligibility
            </p>
          </div>

          <div className="w-full md:w-80">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-heading">
              Active Chit Scheme
            </label>
            <select
              value={selectedSchemeId}
              onChange={(e) => setSelectedSchemeId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-xs"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} ({g.group_code}) — ₹{Number(g.total_pool_amount).toLocaleString('en-IN')} [{g.frequency === 'DAILY' ? 'Daily' : 'Monthly'}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {schemeLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Loading scheme distribution breakdown & member ledgers...</p>
          </div>
        ) : !schemeBreakdown || !schemeBreakdown.group ? (
          <div className="p-12 text-center border border-dashed border-blue-200 dark:border-slate-800 rounded-2xl space-y-2">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Please Select a Chit Scheme</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Choose an active Daily or Monthly Auction Chit scheme from the dropdown above to inspect its real-time reverse auction ledger.
            </p>
          </div>
        ) : (
          <div id="scheme-breakdown-details" className="space-y-6">
            {/* Scheme Anatomy & Transparency Notice Box */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                      {schemeBreakdown?.group?.group_name || 'Chit Scheme'}
                    </h4>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                      {schemeBreakdown?.group?.group_code || ''}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Location: {schemeBreakdown?.group?.location_name || 'Branch'} · Frequency: {schemeBreakdown?.group?.frequency === 'DAILY' ? 'Daily Route' : 'Monthly Reverse Auction'} · Duration: {schemeBreakdown?.group?.duration_periods || 0} Periods
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 font-heading ${
                    schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                  }`}>
                    {schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT' ? '🎰 Double Chit (Dual Draw Scheme)' : '🔨 Reverse Auction Chit Scheme'}
                  </span>
                </div>
              </div>

              {/* Verified Chit Rules & Clarity Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 space-y-1">
                  <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 font-heading">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Reverse Auction Prize & Admin Commission Calculation</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Winner receives (<strong>Pool Amount − Bid Discount − Admin Commission</strong>).
                    Admin receives <strong>5% commission on the chit value</strong>, which is deducted directly from the winner's prize.
                    For Auction Chits, the full bid discount is divided equally among members and credited to their passbooks (reducing next installment).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/40 space-y-1">
                  <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 font-heading">
                    {schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT' ? (
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                    <span>
                      {schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT'
                        ? 'Double Chit Pool Reserve & Option to Auction'
                        : 'Strict Winner Disqualification Rule'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    {schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT' ? (
                      <>
                        In Double Chit, there is no member dividend distribution. The full bid discount is <strong>saved in this chit's pool reserve</strong>, and you have the <strong>option to auction that saved pool</strong> in Draw #2!
                        Any member who has won an auction in this chit is <strong>strictly disqualified from participating in subsequent auctions</strong>.
                      </>
                    ) : (
                      <>
                        Once a member wins an auction in this chit scheme, their ticket is permanently marked as <strong>Prized</strong>.
                        They <strong>cannot and must not participate or bid in any future auctions</strong> in this chit scheme.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* 5-Card Scheme Financial Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">Total Chit Pool</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 font-heading">
                    ₹{Number(schemeBreakdown?.totals?.totalPoolAmount || 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">₹{Number(schemeBreakdown?.totals?.baseInstallmentAmount || 0).toLocaleString('en-IN')} × {schemeBreakdown?.totals?.totalMembersLimit || 0} mem</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">Foreman Comm. Earned</span>
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5 font-heading">
                    ₹{Number(schemeBreakdown?.totals?.totalForemanCommissionEarned || 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Deducted from winner prize</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">Dividends Distributed</span>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-heading">
                    ₹{Number(schemeBreakdown?.totals?.totalDividendsDistributed || 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400">Full bid amount distributed</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">Chit Pool Reserve</span>
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5 font-heading">
                    ₹{Number(schemeBreakdown?.totals?.totalDoubleChitReserve || 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400">Saved to auction again in Draw #2</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">Subscribers Status</span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 font-heading">
                    {schemeBreakdown?.totals?.totalPrizedCount || 0} <span className="text-xs font-normal text-slate-400">Prized /</span> {schemeBreakdown?.totals?.totalEligibleCount || 0} <span className="text-xs font-normal text-emerald-600 font-bold">Eligible</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{schemeBreakdown?.totals?.enrolledCount || 0} enrolled subscribers</span>
                </div>
              </div>
            </div>

            {/* SUBSCRIBERS & DIVIDEND DISTRIBUTION LEDGER TABLE */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base font-heading flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Subscriber Dividend Distribution Ledger ({schemeBreakdown?.subscribers?.length || 0} Members)</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Individual breakdown showing where payments were distributed, credited dividend totals, and eligibility to bid
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    placeholder="Search subscriber, ticket #..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {filteredSubscribers.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <Users className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">No subscribers match search filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto overflow-y-auto max-h-[420px] rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                        <tr className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold font-heading">
                          <th className="py-2.5 px-3">Ticket #</th>
                          <th className="py-2.5 px-3">Subscriber Name & Phone</th>
                          <th className="py-2.5 px-3">Auction Bidding Status</th>
                          <th className="py-2.5 px-3">Total Dividend Credited</th>
                          <th className="py-2.5 px-3">Base Installment</th>
                          <th className="py-2.5 px-3">Next Due Amount</th>
                          <th className="py-2.5 px-3">Payment Record</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedSubscribers.map((sub) => {
                          const isPrized = sub.is_prized === 1;
                          const baseInst = parseFloat(schemeBreakdown?.group?.installment_amount || 0);
                          const lastDiv = parseFloat(schemeBreakdown?.totals?.latestDividendPerMember || 0);
                          const netDue = Math.max(0, baseInst - lastDiv);

                          return (
                            <tr
                              key={sub.membership_id}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                                isPrized ? 'bg-purple-50/20 dark:bg-purple-950/10' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                                  #{String(sub.ticket_number).padStart(2, '0')}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-heading">
                                  {sub.full_name}
                                  {isPrized && (
                                    <span title="Prized Subscriber - Disqualified from bidding" className="text-purple-600">
                                      🏆
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {sub.phone} · {sub.member_code}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                {isPrized ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-heading">
                                    <Lock className="w-3 h-3 text-purple-600" />
                                    <span>Prized (Round #{sub.prized_period || '1'}) — Cannot Bid</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-heading">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Eligible to Bid (Unprized)</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-heading">
                                  ₹{Number(sub.total_dividend_credited || 0).toLocaleString('en-IN')}
                                </div>
                                <span className="text-[10px] text-slate-400 block">Saved in member record</span>
                              </td>

                              <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                                ₹{baseInst.toLocaleString('en-IN')}
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm font-heading">
                                  ₹{netDue.toLocaleString('en-IN')}
                                </div>
                                <span className="text-[10px] text-slate-400">After latest dividend split</span>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                  <Check className="w-3 h-3" />
                                  <span>Ledger Synchronized</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={subscriberPage}
                    totalItems={filteredSubscribers.length}
                    pageSize={subscriberPageSize}
                    onPageChange={setSubscriberPage}
                    onPageSizeChange={setSubscriberPageSize}
                  />
                </div>
              )}
            </div>

            {/* AUCTION ROUNDS HISTORY FOR THIS SCHEME */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base font-heading flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-blue-600" />
                    <span>Conducted Rounds & Prize Settlements for this Scheme ({schemeBreakdown?.auctions?.length || 0})</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Chronological history of winning bids, discounts, and payouts
                  </span>
                </div>
              </div>

              {(schemeBreakdown?.auctions || []).length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <Gavel className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">No auctions conducted for this scheme yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        group_id: String(schemeBreakdown?.group?.id || ''),
                        auction_type: schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT' ? 'DOUBLE_CHIT_DRAW' : 'AUCTION',
                      }));
                      handleGroupChange(schemeBreakdown?.group?.id);
                      scrollToFormOrModal('conduct-auction-modal');
                      setShowModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Conduct Round #1 Now</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold font-heading">
                        <th className="py-2.5 px-3">Round</th>
                        <th className="py-2.5 px-3">Winner (Prized Subscriber)</th>
                        <th className="py-2.5 px-3">Winning Bid Discount</th>
                        <th className="py-2.5 px-3">Net Prize Disbursed</th>
                        <th className="py-2.5 px-3">Foreman Commission</th>
                        <th className="py-2.5 px-3">Distributed Dividend</th>
                        <th className="py-2.5 px-3">Chit Pool Reserve</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(schemeBreakdown?.auctions || []).map((auc) => (
                        <tr key={auc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white font-heading">
                              Round #{auc.period_number}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Draw #{auc.draw_number} · {formatDate(auc.auction_date)}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white font-heading">
                              {auc.winner_name}
                            </div>
                            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                              Ticket #{auc.winning_ticket_number} · {auc.winner_phone}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                            ₹{Number(auc.bid_discount).toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3 font-black text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-heading">
                            ₹{Number(auc.net_payable_amount).toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                            ₹{Number(auc.foreman_commission).toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(auc.dividend_per_member).toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-400">/member</span>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-purple-600 dark:text-purple-400">
                            ₹{Number(auc.double_chit_reserve || 0).toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              auc.payout_status === 'DISBURSED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : auc.payout_status === 'APPROVED'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {auc.payout_status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setVoucherModal(auc);
                                  scrollToFormOrModal('voucher-modal');
                                }}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                Voucher
                              </button>
                              {auc.payout_status !== 'DISBURSED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAuctionForDisburse(auc);
                                    scrollToFormOrModal('disburse-prize-modal');
                                    setShowDisburseModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  Disburse
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL ALL AUCTIONS LEDGER (Cross-Scheme Audit View)                      */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-heading">
              Global Auctions & Draws Ledger ({filteredAuctions.length})
            </h3>
            <span className="text-xs text-slate-500">Comprehensive audit record of all conducted reverse auctions across schemes</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scheme, winner, ticket..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading auctions ledger...</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl space-y-2">
            <Gavel className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">No Auctions Match Filter</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? 'Try clearing your search query to see all records.' : 'Click "Conduct Auction / Draw" to record the first monthly auction, calculate dividend splits, and disburse prize money.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto overflow-y-auto max-h-[460px] rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                  <tr className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold font-heading">
                    <th className="py-2.5 px-3">Period / Draw</th>
                    <th className="py-2.5 px-3">Chit Scheme</th>
                    <th className="py-2.5 px-3">Prize Winner</th>
                    <th className="py-2.5 px-3">Winning Bid</th>
                    <th className="py-2.5 px-3">Dividend / Member</th>
                    <th className="py-2.5 px-3">Net Prize Amount</th>
                    <th className="py-2.5 px-3">Next Due</th>
                    <th className="py-2.5 px-3">Payout Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedAuctions.map((auc) => (
                    <tr key={auc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white font-heading">
                          {auc.frequency === 'DAILY' ? 'Day' : 'Period'} #{auc.period_number}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Draw #{auc.draw_number} · {formatDate(auc.auction_date)}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white font-heading">{auc.group_name}</div>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          auc.chit_type === 'DOUBLE_CHIT'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                        }`}>
                          {auc.frequency === 'DAILY' ? '⚡ Daily' : '🏛️ Monthly'}{' '}
                          {auc.chit_type === 'DOUBLE_CHIT' ? 'Double Chit' : 'Auction Chit'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white font-heading">
                          {auc.winner_name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">Ticket #{auc.winning_ticket_number}</span>
                          <span>· {auc.winner_phone}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        ₹{Number(auc.bid_discount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(auc.dividend_per_member).toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3 font-black text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-heading">
                        ₹{Number(auc.net_payable_amount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        ₹{Number(auc.next_installment_payable).toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          auc.payout_status === 'DISBURSED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : auc.payout_status === 'APPROVED'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {auc.payout_status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setVoucherModal(auc)}
                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Voucher
                          </button>
                          {auc.payout_status !== 'DISBURSED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAuctionForDisburse(auc);
                                setShowDisburseModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              Disburse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredAuctions.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CONDUCT AUCTION / DRAW MODAL                                              */}
      {/* ========================================================================= */}
      <ModalPortal
        id="conduct-auction-modal"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl p-4 sm:p-7 md:p-8 space-y-4 sm:space-y-6 my-auto sm:my-8 max-h-[94vh] sm:max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                  <Gavel className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-xl font-heading leading-tight truncate">
                    Conduct Reverse Auction / Double Chit Round
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Select eligible winner, calculate discount surplus, and persist dividend splits
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleConductAuction} className="space-y-5">
              {/* Group Selector */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 font-heading">
                  Select Chit Scheme (Daily / Monthly) *
                </label>
                <select
                  required
                  value={form.group_id}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Choose Auction Chit or Double Chit Group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} [{g.frequency === 'DAILY' ? '⚡ Daily' : '🏛️ Monthly'} {g.chit_type === 'DOUBLE_CHIT' ? 'Double Chit' : 'Auction Chit'}] — Pool: ₹{Number(g.total_pool_amount).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheme Details Banner */}
              {selectedGroup && (
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/60 pb-2">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Scheme Model:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1.5 font-heading">
                      {selectedGroup.frequency === 'DAILY' ? '⚡ Daily Chit Route' : '🏛️ Monthly Reverse Auction'} ·{' '}
                      {selectedGroup.chit_type === 'DOUBLE_CHIT' ? '🎰 Double Chit Scheme' : '🔨 Standard Auction Scheme'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 block text-xs">Total Pool Value</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">₹{effectivePool.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Base Installment</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">₹{baseInstallment.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/{selectedGroup.frequency === 'DAILY' ? 'day' : 'month'}</span></strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Foreman Comm.</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">{commissionPercent}% <span className="text-xs font-normal text-slate-400">(₹{foremanCommission.toLocaleString('en-IN')})</span></strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Subscribers</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">{totalMembers} Members</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Month / Period & Draw Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                    {selectedGroup?.frequency === 'DAILY' ? 'Day / Round Number *' : 'Month / Period Number *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.period_number}
                    onChange={(e) => setForm({ ...form, period_number: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {isDoubleChitScheme ? (
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                      Draw / Slot Type *
                    </label>
                    <select
                      value={form.draw_number}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({
                          ...form,
                          draw_number: val,
                          pool_source: val === '2' ? 'SAVED_RESERVE' : 'REGULAR',
                          custom_pool_amount: val === '2' ? (form.custom_pool_amount || (availableReserve > 0 ? String(availableReserve) : '0')) : '',
                        });
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="1">Draw #1 (Regular Scheme Chit Pool)</option>
                      <option value="2">Draw #2 (Auction Saved Chit Pool Reserve)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                      Auction Format
                    </label>
                    <div className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <span>🔨</span> Standard Reverse Auction
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                        Fixed 1 Draw / Cycle
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Double Chit Auction Pool Source Selection */}
              {isDoubleChitScheme && (
                <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-1.5 font-heading">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Double Chit Pool Mode & Saved Reserve
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 font-mono">
                      Accumulated Saved Chit Reserve: ₹{availableReserve.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, pool_source: 'REGULAR', draw_number: 1 }))}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        form.pool_source !== 'SAVED_RESERVE'
                          ? 'border-purple-600 bg-white dark:bg-slate-800 shadow-xs ring-2 ring-purple-600/30'
                          : 'border-slate-200 dark:border-slate-700 bg-purple-50/40 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5 font-heading">
                        <span>🎯</span> Regular Scheme Chit Pool (Draw #1)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Auctioning full scheme pool of ₹{groupPoolAmount.toLocaleString('en-IN')}. Bid discount is saved to chit reserve.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        pool_source: 'SAVED_RESERVE',
                        draw_number: 2,
                        custom_pool_amount: prev.custom_pool_amount || (availableReserve > 0 ? String(availableReserve) : '0'),
                      }))}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        form.pool_source === 'SAVED_RESERVE'
                          ? 'border-purple-600 bg-white dark:bg-slate-800 shadow-xs ring-2 ring-purple-600/30'
                          : 'border-slate-200 dark:border-slate-700 bg-purple-50/40 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-heading">
                        <span>⚡</span> Option to Auction Saved Chit Reserve (Draw #2)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Auction the accumulated saved reserve in this chit scheme.
                      </p>
                    </button>
                  </div>

                  {form.pool_source === 'SAVED_RESERVE' && (
                    <div className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-xs font-bold text-purple-900 dark:text-purple-200 font-heading">
                          Reserve Pool Amount to Auction (₹) *
                        </label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Specify reserve amount to put up for bidding (Defaults to total accumulated reserve)
                        </p>
                      </div>
                      <input
                        type="number"
                        step="any"
                        required
                        value={form.custom_pool_amount}
                        onChange={(e) => setForm({ ...form, custom_pool_amount: e.target.value })}
                        placeholder={String(availableReserve)}
                        className="w-full sm:w-56 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-base font-black text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-600 focus:outline-none font-heading"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Winner Selection (Strict Disqualification of Previous Winners) */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                  Prize Winning Subscriber (Eligible Unprized Subscribers Only) *
                </label>
                <select
                  required
                  value={form.winning_member_id}
                  onChange={(e) => {
                    const memberId = e.target.value;
                    const mem = groupMembers.find((m) => String(m.member_id) === String(memberId));
                    if (mem?.is_prized === 1) {
                      setError(`Subscriber ${mem.full_name} has already won in Round #${mem.prized_period || 'past'} and cannot participate or bid again in this chit.`);
                      return;
                    }
                    setError('');
                    setForm({
                      ...form,
                      winning_member_id: memberId,
                      winning_ticket_number: mem ? String(mem.ticket_number) : '',
                    });
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Select Eligible Subscriber --</option>
                  {groupMembers.map((m) => {
                    const isPrized = m.is_prized === 1;
                    return (
                      <option key={m.member_id} value={m.member_id} disabled={isPrized}>
                        {isPrized
                          ? `🔒 [ALREADY PRIZED - Round #${m.prized_period || 'Past'} - DISQUALIFIED] Ticket #${m.ticket_number} — ${m.full_name}`
                          : `⭐ Ticket #${m.ticket_number} — ${m.full_name} (${m.phone})`}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Subscribers who have already won in previous rounds are automatically disqualified from participating again.
                </p>
              </div>

              {/* Bid Discount & Auction Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                    Winning Bid Discount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.bid_discount}
                    onChange={(e) => setForm({ ...form, bid_discount: e.target.value })}
                    placeholder="e.g. 25000"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-black text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-600 focus:outline-none font-heading"
                  />
                  <p className="text-xs text-slate-400 mt-1">Discount sacrificed by winner from total pool</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                    Auction / Draw Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.auction_date}
                    onChange={(e) => setForm({ ...form, auction_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* ChitBase Real-Time Financial Calculations Preview */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-slate-50 dark:from-slate-800/90 dark:to-slate-900 border border-blue-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-xs flex items-center gap-2 font-heading">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {isDoubleChitScheme ? 'Double Chit Financial Distribution Preview' : 'Auction Chit Financial Breakdown'}
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 font-heading">
                    Admin Commission: {commissionPercent}% of Pool Value (Deducted from Winner Prize)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-1">
                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">Net Prize (To Winner)</span>
                    <span className="text-base sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-heading">
                      ₹{netPayablePrize.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Pool − Bid − Comm.</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">Admin Commission (5%)</span>
                    <span className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 font-heading">
                      ₹{foremanCommission.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">{commissionPercent}% of Pool (From Prize)</span>
                  </div>

                  {isDoubleChitScheme ? (
                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-purple-200/80 dark:border-purple-800/60">
                      <span className="text-purple-600 dark:text-purple-400 block text-[11px] sm:text-xs font-bold font-heading">
                        Chit Pool Reserve
                      </span>
                      <span className="text-base sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-heading">
                        ₹{modalDoubleChitReserve.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-purple-500 block mt-0.5">Saved in chit (Auction in Draw #2)</span>
                    </div>
                  ) : (
                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60">
                      <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">Dividend / Member</span>
                      <span className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                        ₹{modalDividendPerMember.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">₹{modalTotalDividend.toLocaleString('en-IN')} ÷ {totalMembers} mem</span>
                    </div>
                  )}

                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">
                      {selectedGroup?.frequency === 'DAILY' ? 'Next Day Due' : 'Next Month Due'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                      ₹{modalNextInstallment.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">
                      {isDoubleChitScheme ? 'Full base installment' : 'Base − Dividend'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                  Auction Notes / Remarks
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Conducted in presence of foreman and subscribers"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer font-heading"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Auction...</span>
                    </>
                  ) : (
                    <span>Submit Auction & Generate Voucher</span>
                  )}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* Disburse Modal */}
      {Boolean(showDisburseModal && selectedAuctionForDisburse) && (
        <ModalPortal
          id="disburse-prize-modal"
          isOpen={Boolean(showDisburseModal && selectedAuctionForDisburse)}
          onClose={() => setShowDisburseModal(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-7 space-y-5 my-auto sm:my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg font-heading">
                    Disburse Prize Money
                  </h3>
                  <p className="text-xs text-slate-500">Record payout settlement reference</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider font-heading">Net Amount Payable to Winner</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-heading">
                ₹{Number(selectedAuctionForDisburse?.net_payable_amount || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 font-heading">
                {selectedAuctionForDisburse?.winner_name || 'Winning Subscriber'} <span className="text-xs font-normal text-slate-500">(Ticket #{selectedAuctionForDisburse?.winning_ticket_number || ''})</span>
              </div>
            </div>

            <form onSubmit={handleDisburseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                  Payment Method *
                </label>
                <select
                  value={disburseForm.payment_method}
                  onChange={(e) => setDisburseForm({ ...disburseForm, payment_method: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="NEFT_RTGS">Bank Transfer / NEFT / RTGS</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="CASH">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 font-heading">
                  UTR Reference / Cheque # *
                </label>
                <input
                  type="text"
                  required
                  value={disburseForm.payout_reference}
                  onChange={(e) => setDisburseForm({ ...disburseForm, payout_reference: e.target.value })}
                  placeholder="e.g. UTR-9382019482 or CHQ-001294"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDisburseModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer font-heading"
                >
                  Confirm Disbursement
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Printable Auction Voucher Modal */}
      {Boolean(voucherModal) && (
        <ModalPortal
          id="voucher-modal"
          isOpen={Boolean(voucherModal)}
          onClose={() => setVoucherModal(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl p-6 sm:p-8 space-y-5 my-auto sm:my-8 max-h-[92vh] overflow-y-auto">
            <div className="text-center space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                <Gavel className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xl font-heading">
                Auction Dividend Voucher
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {voucherModal?.group_name || 'Chit Scheme'} · {voucherModal?.frequency === 'DAILY' ? 'Day' : 'Period'} #{voucherModal?.period_number} (Draw #{voucherModal?.draw_number})
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Auction Date:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{formatDate(voucherModal?.auction_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Prize Winner:</span>
                <span className="font-bold text-slate-900 dark:text-white">{voucherModal?.winner_name} (Ticket #{voucherModal?.winning_ticket_number})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Scheme Type:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {voucherModal?.frequency === 'DAILY' ? 'Daily' : 'Monthly'}{' '}
                  {voucherModal?.chit_type === 'DOUBLE_CHIT' ? 'Double Chit Scheme' : 'Standard Reverse Auction'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Pool Value:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₹{Number(voucherModal?.total_pool_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Winning Bid Discount:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">₹{Number(voucherModal?.bid_discount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Foreman Commission:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">₹{Number(voucherModal?.foreman_commission || 0).toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-normal">(Deducted from Prize)</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Net Dividend / Member:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-base font-heading">₹{Number(voucherModal?.dividend_per_member || 0).toLocaleString('en-IN')} <span className="text-xs text-emerald-500 font-normal">(From Bid Amount)</span></span>
              </div>
              {parseFloat(voucherModal?.double_chit_reserve || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-purple-600 font-medium">Chit Pool Reserve:</span>
                  <span className="font-black text-purple-600 dark:text-purple-400 text-base font-heading">₹{Number(voucherModal?.double_chit_reserve || 0).toLocaleString('en-IN')} <span className="text-xs text-purple-400 font-normal">(Saved in Chit)</span></span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-900 dark:text-white font-extrabold text-base font-heading">Net Prize Money:</span>
                <span className="font-black text-blue-600 dark:text-blue-400 text-xl font-heading">₹{Number(voucherModal?.net_payable_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Next Due Payable:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{Number(voucherModal?.next_installment_payable || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{voucherModal?.payout_status}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setVoucherModal(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer font-heading"
              >
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirmation Dialog for Auction Finalization */}
      <ConfirmModal
        isOpen={showAuctionConfirm}
        onClose={() => setShowAuctionConfirm(false)}
        onConfirm={executeConfirmedAuction}
        isLoading={submitting}
        title="Finalize Reverse Auction & Disburse Dividends"
        message={`Are you sure you want to finalize Auction #${form.draw_number} for ${selectedGroup?.group_name || 'selected group'} with winning subscriber ${groupMembers.find((m) => String(m.member_id) === String(form.winning_member_id))?.full_name || 'member'} at a bid discount of ₹${Number(bidDiscount).toLocaleString('en-IN')}?`}
        confirmLabel="Confirm & Finalize Auction"
        cancelLabel="Review Bids"
        variant="primary"
        icon={Gavel}
        subtext={`Net Prize: ₹${Number(netPayablePrize).toLocaleString('en-IN')} | Foreman Commission: ₹${Number(foremanCommission).toLocaleString('en-IN')} | Dividend/Member: ₹${Number(modalDividendPerMember).toLocaleString('en-IN')}${modalDoubleChitReserve > 0 ? ` | Chit Pool Reserve: ₹${Number(modalDoubleChitReserve).toLocaleString('en-IN')}` : ''}`}
      />

      {/* Confirmation Dialog for Prize Disbursement */}
      <ConfirmModal
        isOpen={showDisburseConfirm}
        onClose={() => setShowDisburseConfirm(false)}
        onConfirm={executeConfirmedDisbursement}
        isLoading={submitting}
        title="Confirm Prize Disbursement"
        message={`Confirm disbursement of prize money to ${selectedAuctionForDisburse?.winner_name || 'winning subscriber'} via ${disburseForm.payment_method}?`}
        confirmLabel="Confirm Disbursement"
        cancelLabel="Cancel"
        variant="success"
        icon={Coins}
        subtext="This will mark the auction prize status as DISBURSED in official records."
      />
    </div>
  );
}
