import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
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
  Sliders,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import { formatDate, getServerYMD } from '../utils/dateUtils';
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
  const [subscriberFilter, setSubscriberFilter] = useState('ALL'); // 'ALL' | 'UNPAID' | 'ADMIN_COVERED' | 'PRIZED'

  // Admin Advance / Covered Due State
  const [adminAdvanceModal, setAdminAdvanceModal] = useState(null);
  const [adminAdvanceForm, setAdminAdvanceForm] = useState({
    group_id: '',
    member_id: '',
    amount: '',
    payment_method: 'CASH',
    notes: '',
  });
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);
  const [advanceSuccess, setAdvanceSuccess] = useState('');

  // Global Auctions Search and Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Auction Form state
  const [form, setForm] = useState({
    group_id: '',
    period_number: '1',
    draw_number: '1',
    auction_type: 'AUCTION',
    pool_source: 'REGULAR',
    include_reserve: false,
    custom_pool_amount: '',
    winning_member_id: '',
    winning_ticket_number: '',
    bid_discount: '',
    auction_date: getServerYMD(),
    commission_percent: '5.0',
    custom_foreman_commission: '',
    custom_net_payable: '',
    custom_total_dividend: '',
    custom_dividend_per_member: '',
    custom_double_chit_reserve: '',
    custom_next_installment: '',
    is_custom_commission_enabled: false,
    is_custom_net_payable_enabled: false,
    is_custom_dividend_enabled: false,
    is_custom_reserve_enabled: false,
    is_custom_due_enabled: false,
    // Double Chit: Optional Draw #2 in the same form
    conduct_draw2: false,
    draw2_pool_amount: '',
    draw2_winning_member_id: '',
    draw2_winning_ticket_number: '',
    draw2_bid_discount: '',
    draw2_commission_percent: '5.0',
    draw2_custom_foreman_commission: '',
    draw2_custom_net_payable: '',
    draw2_custom_double_chit_reserve: '',
    draw2_is_custom_commission_enabled: false,
    draw2_is_custom_net_payable_enabled: false,
    draw2_is_custom_reserve_enabled: false,
    draw2_notes: '',
    notes: '',
  });

  const [groupMembers, setGroupMembers] = useState([]);
  const [availableReserve, setAvailableReserve] = useState(0);
  const [groupTotalCollected, setGroupTotalCollected] = useState(0);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);
  const groupDetailsRequest = useRef(0);
  const [showAuctionGroupPicker, setShowAuctionGroupPicker] = useState(false);
  const [auctionGroupSearch, setAuctionGroupSearch] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setSubscriberPage(1);
  }, [subscriberSearch, subscriberFilter]);

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
        // Include Auction Chit schemes and Daily Double Chit schemes (no double chits for monthly)
        const auctionEligibleGroups = (groupsRes.data.data || []).filter(
          (g) => g.chit_type === 'AUCTION_CHIT' || ((g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE') && g.chit_type === 'DOUBLE_CHIT')
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

  // When group changes in Conduct Auction modal, load its enrolled members, reserve, and total collections
  const handleGroupChange = async (groupId) => {
    const requestId = ++groupDetailsRequest.current;
    const groupObj = groups.find((g) => String(g.id) === String(groupId));
    setGroupMembers([]);
    setAvailableReserve(0);
    setGroupTotalCollected(0);
    setForm((prev) => ({
      ...prev,
      group_id: groupId,
      winning_member_id: '',
      winning_ticket_number: '',
      pool_source: 'REGULAR',
      include_reserve: false,
      custom_pool_amount: '',
      commission_percent: String(groupObj?.foreman_commission_percent || '5.0'),
      custom_foreman_commission: '',
      custom_net_payable: '',
      custom_total_dividend: '',
      custom_dividend_per_member: '',
      custom_double_chit_reserve: '',
      custom_next_installment: '',
      is_custom_commission_enabled: false,
      is_custom_net_payable_enabled: false,
      is_custom_dividend_enabled: false,
      is_custom_reserve_enabled: false,
      is_custom_due_enabled: false,
      conduct_draw2: false,
      draw2_pool_amount: '',
      draw2_winning_member_id: '',
      draw2_winning_ticket_number: '',
      draw2_bid_discount: '',
      draw2_commission_percent: String(groupObj?.foreman_commission_percent || '5.0'),
      draw2_custom_foreman_commission: '',
      draw2_custom_net_payable: '',
      draw2_custom_double_chit_reserve: '',
      draw2_is_custom_commission_enabled: false,
      draw2_is_custom_net_payable_enabled: false,
      draw2_is_custom_reserve_enabled: false,
      draw2_notes: '',
      auction_type: groupObj?.chit_type === 'DOUBLE_CHIT' ? 'DOUBLE_CHIT_DRAW' : 'AUCTION',
    }));

    if (groupId) {
      try {
        setLoadingGroupDetails(true);
        const res = await api.get(`/admin/groups/${groupId}`);
        if (requestId === groupDetailsRequest.current && res.data?.success) {
          setGroupMembers(res.data.data.members || []);
          const auctionsList = res.data.data.auctions || [];
          const nextPeriod = Math.max(0, ...auctionsList.map((auction) => Number(auction.period_number) || 0)) + 1;
          setForm((prev) => prev.group_id === String(groupId) ? { ...prev, period_number: String(nextPeriod) } : prev);
          const reserveSum = auctionsList.reduce((acc, a) => acc + parseFloat(a.double_chit_reserve || 0), 0);
          setAvailableReserve(reserveSum);
          setGroupTotalCollected(parseFloat(res.data.data.financials?.totalCollected || 0));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (requestId === groupDetailsRequest.current) setLoadingGroupDetails(false);
      }
    } else {
      setLoadingGroupDetails(false);
      setGroupMembers([]);
      setAvailableReserve(0);
      setGroupTotalCollected(0);
    }
  };

  // Selected group object in modal form
  const selectedGroup = groups.find((g) => String(g.id) === String(form.group_id));
  const isDoubleChitScheme = selectedGroup?.chit_type === 'DOUBLE_CHIT';
  const isAuctioningReserve = isDoubleChitScheme && (String(form.draw_number) === '2' || form.pool_source === 'SAVED_RESERVE');
  const isDraw1 = String(form.draw_number) === '1';

  // Live Calculations in Modal
  const groupPoolAmount = selectedGroup ? parseFloat(selectedGroup.total_pool_amount) : 0;
  const baseInstallment = selectedGroup ? parseFloat(selectedGroup.installment_amount) : 0;
  const totalMembers = selectedGroup ? parseInt(selectedGroup.total_members_limit || 20, 10) : 20;

  // Regular auction rule: regular pool/collected + saved reserve can be auctioned
  // Double auction rule: only the reserved amount is used to auction
  const regularAuctionablePool = groupPoolAmount + (availableReserve || 0);
  const doubleAuctionablePool = availableReserve || 0;

  // Effective pool being auctioned:
  // - For double auction (Draw #2): strictly the reserved amount (availableReserve or custom <= availableReserve)
  // - For regular auction (Draw #1 or standard): regular pool, or regular pool + reserve if include_reserve is active
  const effectivePool = isAuctioningReserve
    ? (parseFloat(form.custom_pool_amount) || doubleAuctionablePool || 0)
    : (form.include_reserve || form.pool_source === 'REGULAR_PLUS_RESERVE')
      ? (parseFloat(form.custom_pool_amount) || regularAuctionablePool)
      : (parseFloat(form.custom_pool_amount) || groupPoolAmount);

  const bidDiscount = parseFloat(form.bid_discount || 0);

  // 1. Gross Winner Prize = Effective Pool - Bid Discount (Prize before Admin commission deduction)
  const grossWinnerPrize = Math.max(0, parseFloat((effectivePool - bidDiscount).toFixed(2)));

  // 2. Active Commission Percentage (can be edited by Admin directly)
  const activeCommissionPercent = form.commission_percent !== ''
    ? parseFloat(form.commission_percent)
    : (selectedGroup ? parseFloat(selectedGroup.foreman_commission_percent || 5) : 5);

  // 3. Admin Commission: calculated strictly from GROSS WINNER PRIZE (not from full pool!)
  const autoForemanCommission = grossWinnerPrize > 0
    ? parseFloat(((grossWinnerPrize * activeCommissionPercent) / 100).toFixed(2))
    : 0;
  const effectiveForemanCommission = (form.is_custom_commission_enabled && form.custom_foreman_commission !== '')
    ? parseFloat(form.custom_foreman_commission)
    : autoForemanCommission;

  // 4. Net Prize Money Payable to Winning Subscriber = Gross Winner Prize - Admin Commission
  const autoNetPayablePrize = Math.max(0, parseFloat((grossWinnerPrize - effectiveForemanCommission).toFixed(2)));
  const effectiveNetPayablePrize = (form.is_custom_net_payable_enabled && form.custom_net_payable !== '')
    ? parseFloat(form.custom_net_payable)
    : autoNetPayablePrize;

  // 5. Total Dividend & Dividend per member (or Double Chit Reserve)
  const autoDoubleChitReserve = isDoubleChitScheme ? bidDiscount : 0;
  const effectiveDoubleChitReserve = isDoubleChitScheme
    ? ((form.is_custom_reserve_enabled && form.custom_double_chit_reserve !== '') ? parseFloat(form.custom_double_chit_reserve) : autoDoubleChitReserve)
    : 0;

  const autoTotalDividend = isDoubleChitScheme ? 0 : bidDiscount;
  const effectiveTotalDividend = isDoubleChitScheme
    ? 0
    : ((form.is_custom_dividend_enabled && form.custom_total_dividend !== '') ? parseFloat(form.custom_total_dividend) : autoTotalDividend);

  const autoDividendPerMember = (!isDoubleChitScheme && totalMembers > 0)
    ? parseFloat((effectiveTotalDividend / totalMembers).toFixed(2))
    : 0;
  const effectiveDividendPerMember = isDoubleChitScheme
    ? 0
    : ((form.is_custom_dividend_enabled && form.custom_dividend_per_member !== '') ? parseFloat(form.custom_dividend_per_member) : autoDividendPerMember);

  // 6. Next Installment Payable
  const autoNextInstallment = baseInstallment;
  const effectiveNextInstallment = (form.is_custom_due_enabled && form.custom_next_installment !== '')
    ? parseFloat(form.custom_next_installment)
    : autoNextInstallment;

  // 7. Draw #2 Live Calculations (Optional Double Auction of Reversing Amount in same session)
  const draw2EffectivePool = form.draw2_pool_amount !== ''
    ? (parseFloat(form.draw2_pool_amount) || 0)
    : bidDiscount; // Defaults to Draw #1 Reversing / Bid Discount amount!

  const draw2BidDiscount = parseFloat(form.draw2_bid_discount || 0);
  const draw2GrossWinnerPrize = Math.max(0, parseFloat((draw2EffectivePool - draw2BidDiscount).toFixed(2)));

  const draw2ActiveCommissionPercent = form.draw2_commission_percent !== ''
    ? parseFloat(form.draw2_commission_percent)
    : (selectedGroup ? parseFloat(selectedGroup.foreman_commission_percent || 5) : 5);

  const draw2AutoForemanCommission = draw2GrossWinnerPrize > 0
    ? parseFloat(((draw2GrossWinnerPrize * draw2ActiveCommissionPercent) / 100).toFixed(2))
    : 0;
  const draw2EffectiveForemanCommission = (form.draw2_is_custom_commission_enabled && form.draw2_custom_foreman_commission !== '')
    ? parseFloat(form.draw2_custom_foreman_commission)
    : draw2AutoForemanCommission;

  const draw2AutoNetPayablePrize = Math.max(0, parseFloat((draw2GrossWinnerPrize - draw2EffectiveForemanCommission).toFixed(2)));
  const draw2EffectiveNetPayablePrize = (form.draw2_is_custom_net_payable_enabled && form.draw2_custom_net_payable !== '')
    ? parseFloat(form.draw2_custom_net_payable)
    : draw2AutoNetPayablePrize;

  const draw2AutoDoubleChitReserve = draw2BidDiscount;
  const draw2EffectiveDoubleChitReserve = (form.draw2_is_custom_reserve_enabled && form.draw2_custom_double_chit_reserve !== '')
    ? parseFloat(form.draw2_custom_double_chit_reserve)
    : draw2AutoDoubleChitReserve;

  // Has any custom override been applied?
  const hasCustomCommission = form.is_custom_commission_enabled || (selectedGroup && String(form.commission_percent) !== String(selectedGroup.foreman_commission_percent));
  const hasCustomNetPrize = form.is_custom_net_payable_enabled;
  const hasCustomDividend = form.is_custom_dividend_enabled;
  const hasCustomReserve = form.is_custom_reserve_enabled;
  const hasCustomDue = form.is_custom_due_enabled;
  const hasDraw2CustomCommission = form.draw2_is_custom_commission_enabled || (selectedGroup && String(form.draw2_commission_percent) !== String(selectedGroup.foreman_commission_percent));
  const hasDraw2CustomNet = form.draw2_is_custom_net_payable_enabled;
  const hasDraw2CustomReserve = form.draw2_is_custom_reserve_enabled;
  const hasAnyOverrides = hasCustomCommission || hasCustomNetPrize || hasCustomDividend || hasCustomReserve || hasCustomDue || (form.conduct_draw2 && (hasDraw2CustomCommission || hasDraw2CustomNet || hasDraw2CustomReserve));

  // Boundary check flags to avoid mistyped numbers
  const isBidDiscountOverPool = parseFloat(form.bid_discount || 0) > effectivePool && effectivePool > 0;
  const isBidDiscountNegative = parseFloat(form.bid_discount || 0) < 0;
  const isCommissionPercentOver100 = parseFloat(form.commission_percent || 0) > 100 || parseFloat(form.commission_percent || 0) < 0;
  const isForemanCommOverPrize = effectiveForemanCommission > grossWinnerPrize && grossWinnerPrize > 0;
  const isNetPrizeOverPrize = effectiveNetPayablePrize > grossWinnerPrize && grossWinnerPrize > 0;
  const isReserveAuctionOverAvailable = isAuctioningReserve && effectivePool > availableReserve;
  const isDividendOverBid = !isDoubleChitScheme && effectiveTotalDividend > bidDiscount && bidDiscount > 0;
  const isReserveOverBid = isDoubleChitScheme && effectiveDoubleChitReserve > bidDiscount && bidDiscount > 0;
  const isDraw2BidOverPool = form.conduct_draw2 && draw2BidDiscount > draw2EffectivePool && draw2EffectivePool > 0;
  const isDraw2CommOverPrize = form.conduct_draw2 && draw2EffectiveForemanCommission > draw2GrossWinnerPrize && draw2GrossWinnerPrize > 0;
  const isDraw2NetOverPrize = form.conduct_draw2 && draw2EffectiveNetPayablePrize > draw2GrossWinnerPrize && draw2GrossWinnerPrize > 0;

  const isPoolIncomplete = Boolean(selectedGroup && !isAuctioningReserve && groupTotalCollected < groupPoolAmount);
  const poolShortfall = Math.max(0, groupPoolAmount - groupTotalCollected);

  const hasBoundaryErrors = isBidDiscountOverPool || isBidDiscountNegative || isCommissionPercentOver100 ||
    isForemanCommOverPrize || isNetPrizeOverPrize || isReserveAuctionOverAvailable || isDividendOverBid || isReserveOverBid ||
    isDraw2BidOverPool || isDraw2CommOverPrize || isDraw2NetOverPrize;

  const handleResetCalculations = () => {
    setForm((prev) => ({
      ...prev,
      commission_percent: String(selectedGroup?.foreman_commission_percent || '5.0'),
      custom_foreman_commission: '',
      custom_net_payable: '',
      custom_total_dividend: '',
      custom_dividend_per_member: '',
      custom_double_chit_reserve: '',
      custom_next_installment: '',
      is_custom_commission_enabled: false,
      is_custom_net_payable_enabled: false,
      is_custom_dividend_enabled: false,
      is_custom_reserve_enabled: false,
      is_custom_due_enabled: false,
      draw2_commission_percent: String(selectedGroup?.foreman_commission_percent || '5.0'),
      draw2_custom_foreman_commission: '',
      draw2_custom_net_payable: '',
      draw2_custom_double_chit_reserve: '',
      draw2_is_custom_commission_enabled: false,
      draw2_is_custom_net_payable_enabled: false,
      draw2_is_custom_reserve_enabled: false,
    }));
  };

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
    if (subscriberFilter === 'UNPAID' && sub.payment_status !== 'NOT_PAID' && sub.payment_status !== 'PARTIAL') return false;
    if (subscriberFilter === 'ADMIN_COVERED' && sub.payment_status !== 'ADMIN_COVERED') return false;
    if (subscriberFilter === 'PRIZED' && sub.is_prized !== 1) return false;

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

  const handleOpenAdminCoverFromAuctionModal = () => {
    if (!form.group_id) return;
    setAdvanceSuccess('');
    setError('');
    const targetGroup = groups.find((g) => String(g.id) === String(form.group_id));
    const shortfall = Math.max(0, groupPoolAmount - groupTotalCollected);
    const chosenMember = groupMembers[0] || null;

    setAdminAdvanceModal({
      member_id: chosenMember?.member_id || chosenMember?.id,
      ticket_number: chosenMember?.ticket_number || '1',
      full_name: chosenMember?.full_name || 'Group Subscriber',
      phone: chosenMember?.phone || '',
      base_installment: targetGroup?.installment_amount || 0,
      pending_amount: shortfall || targetGroup?.installment_amount || 0,
      group_name: targetGroup?.group_name,
      group_code: targetGroup?.group_code,
      fromAuctionModal: true,
    });

    setAdminAdvanceForm({
      group_id: form.group_id,
      member_id: String(chosenMember?.member_id || chosenMember?.id || ''),
      amount: String(shortfall > 0 ? shortfall : (targetGroup?.installment_amount || 0)),
      payment_method: 'CASH',
      notes: `[ADMIN_FUNDED] Admin cover for ${targetGroup?.group_name || 'scheme'} auction pool deficit - Pending Member Recovery`,
    });
  };

  const handleOpenAdminAdvance = (sub) => {
    setAdvanceSuccess('');
    setError('');
    setAdminAdvanceModal(sub);
    setAdminAdvanceForm({
      group_id: selectedSchemeId,
      member_id: sub.member_id,
      amount: String(sub.pending_amount || sub.base_installment || schemeBreakdown?.group?.installment_amount || 0),
      payment_method: 'CASH',
      notes: `[ADMIN_FUNDED] Covered by Admin on behalf of ${sub.full_name} (Ticket #${sub.ticket_number}) - Pending Member Recovery`,
    });
  };

  const handleSubmitAdminAdvance = async (e) => {
    e.preventDefault();
    setError('');
    setAdvanceSubmitting(true);
    try {
      const res = await api.post('/admin/pending-dues/add-amount', {
        group_id: parseInt(adminAdvanceForm.group_id, 10),
        member_id: parseInt(adminAdvanceForm.member_id, 10),
        amount: parseFloat(adminAdvanceForm.amount),
        payment_method: adminAdvanceForm.payment_method,
        notes: adminAdvanceForm.notes,
      });

      if (res.data?.success) {
        setAdminAdvanceModal(null);
        setAdvanceSuccess(res.data.message || 'Amount added successfully by Admin!');
        if (selectedSchemeId) {
          await loadSchemeBreakdown(selectedSchemeId);
        }
        if (form.group_id) {
          await handleGroupChange(form.group_id);
        }
        await loadData();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to record Admin covered amount.'));
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  const handleSettleAdvance = async (advanceId, memberName, amount) => {
    if (!window.confirm(`Confirm that ${memberName} has repaid ₹${Number(amount).toLocaleString('en-IN')} to Admin? This will settle the pending recovery.`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/admin/pending-dues/recover', {
        advance_id: advanceId,
        recovered_amount: amount,
        notes: 'Repaid by subscriber to admin',
      });
      if (res.data?.success) {
        setAdvanceSuccess(`Successfully recorded repayment of ₹${Number(amount).toLocaleString('en-IN')} from ${memberName}.`);
        if (selectedSchemeId) {
          await loadSchemeBreakdown(selectedSchemeId);
        }
        await loadData();
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to mark advance as settled.'));
    } finally {
      setLoading(false);
    }
  };

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

    // Double Chit: Optional Draw #2 in-session validation
    if (isDoubleChitScheme && form.conduct_draw2) {
      if (!form.draw2_winning_member_id || !form.draw2_winning_ticket_number) {
        setError('Please select the winning subscriber and ticket number for Draw #2 (Double Auction).');
        return;
      }
      if (String(form.draw2_winning_member_id) === String(form.winning_member_id)) {
        setError('Draw #2 winning subscriber must be different from Draw #1 winner. The same subscriber cannot win both prizes in the same round.');
        return;
      }
      const chosenDraw2Member = groupMembers.find((m) => String(m.member_id) === String(form.draw2_winning_member_id));
      if (chosenDraw2Member?.is_prized === 1) {
        setError(`Subscriber ${chosenDraw2Member.full_name} has already won in Round #${chosenDraw2Member.prized_period || 'past'} and is strictly disqualified from winning Draw #2.`);
        return;
      }
    }

    // Strict boundary checks to avoid mistyped numbers
    const bidDiscountNum = parseFloat(form.bid_discount || 0);
    if (isNaN(bidDiscountNum) || bidDiscountNum < 0) {
      setError('Winning bid discount must be a valid non-negative number.');
      return;
    }
    if (bidDiscountNum > effectivePool) {
      setError(`Winning bid discount (₹${bidDiscountNum.toLocaleString('en-IN')}) cannot exceed the auction pool amount (₹${effectivePool.toLocaleString('en-IN')}).`);
      return;
    }
    if (isAuctioningReserve && (effectivePool <= 0 || effectivePool > availableReserve)) {
      setError(`In Double Auction (Draw #2), auction pool cannot exceed available saved reserve of ₹${availableReserve.toLocaleString('en-IN')}.`);
      return;
    }
    if (effectiveForemanCommission > grossWinnerPrize) {
      setError(`Admin commission (₹${effectiveForemanCommission.toLocaleString('en-IN')}) cannot exceed gross winner prize (₹${grossWinnerPrize.toLocaleString('en-IN')}).`);
      return;
    }
    if (effectiveNetPayablePrize > grossWinnerPrize) {
      setError(`Net payable prize (₹${effectiveNetPayablePrize.toLocaleString('en-IN')}) cannot exceed gross winner prize (₹${grossWinnerPrize.toLocaleString('en-IN')}).`);
      return;
    }
    if (parseFloat(form.commission_percent || 0) > 100 || parseFloat(form.commission_percent || 0) < 0) {
      setError('Commission rate (%) must be between 0% and 100%.');
      return;
    }
    if (!isDoubleChitScheme && effectiveTotalDividend > bidDiscountNum) {
      setError(`Total dividend (₹${effectiveTotalDividend.toLocaleString('en-IN')}) cannot exceed winning bid discount (₹${bidDiscountNum.toLocaleString('en-IN')}).`);
      return;
    }
    if (isDoubleChitScheme && effectiveDoubleChitReserve > bidDiscountNum) {
      setError(`Chit reserve (₹${effectiveDoubleChitReserve.toLocaleString('en-IN')}) cannot exceed winning bid discount (₹${bidDiscountNum.toLocaleString('en-IN')}).`);
      return;
    }
    if (isDoubleChitScheme && form.conduct_draw2) {
      const d2Bid = parseFloat(form.draw2_bid_discount || 0);
      if (d2Bid > draw2EffectivePool) {
        setError(`Draw #2 winning bid discount cannot exceed Draw #2 pool amount (₹${draw2EffectivePool.toLocaleString('en-IN')}).`);
        return;
      }
      if (draw2EffectiveForemanCommission > draw2GrossWinnerPrize) {
        setError('Draw #2 admin commission cannot exceed Draw #2 gross winner prize.');
        return;
      }
    }

    setShowAuctionConfirm(true);
  };

  const executeConfirmedAuction = async () => {
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        group_id: parseInt(form.group_id, 10),
        period_number: parseInt(form.period_number, 10),
        draw_number: parseInt(form.draw_number, 10),
        auction_type: form.auction_type,
        pool_source: form.include_reserve ? 'REGULAR_PLUS_RESERVE' : (form.pool_source || 'REGULAR'),
        custom_pool_amount: form.custom_pool_amount ? parseFloat(form.custom_pool_amount) : (form.include_reserve ? effectivePool : (isAuctioningReserve ? effectivePool : null)),
        winning_member_id: parseInt(form.winning_member_id, 10),
        winning_ticket_number: parseInt(form.winning_ticket_number, 10),
        bid_discount: parseFloat(form.bid_discount || 0),
        auction_date: form.auction_date,
        custom_commission_percent: form.commission_percent !== '' ? parseFloat(form.commission_percent) : null,
        custom_foreman_commission: effectiveForemanCommission,
        custom_net_payable: effectiveNetPayablePrize,
        custom_total_dividend: isDoubleChitScheme ? 0 : effectiveTotalDividend,
        custom_dividend_per_member: isDoubleChitScheme ? 0 : effectiveDividendPerMember,
        custom_next_installment: effectiveNextInstallment,
        custom_double_chit_reserve: isDoubleChitScheme ? effectiveDoubleChitReserve : 0,
        conduct_draw2: isDoubleChitScheme && form.conduct_draw2,
        draw2: (isDoubleChitScheme && form.conduct_draw2) ? {
          winning_member_id: parseInt(form.draw2_winning_member_id, 10),
          winning_ticket_number: parseInt(form.draw2_winning_ticket_number, 10),
          pool_amount: draw2EffectivePool,
          bid_discount: draw2BidDiscount,
          custom_commission_percent: form.draw2_commission_percent !== '' ? parseFloat(form.draw2_commission_percent) : null,
          custom_foreman_commission: draw2EffectiveForemanCommission,
          custom_net_payable: draw2EffectiveNetPayablePrize,
          custom_double_chit_reserve: draw2EffectiveDoubleChitReserve,
          notes: form.draw2_notes || null,
        } : null,
        notes: form.notes || null,
      };

      const res = await api.post('/admin/auctions', payload);

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
          auction_date: getServerYMD(),
          commission_percent: '5.0',
          custom_foreman_commission: '',
          custom_net_payable: '',
          custom_total_dividend: '',
          custom_dividend_per_member: '',
          custom_double_chit_reserve: '',
          custom_next_installment: '',
          is_custom_commission_enabled: false,
          is_custom_net_payable_enabled: false,
          is_custom_dividend_enabled: false,
          is_custom_reserve_enabled: false,
          is_custom_due_enabled: false,
          conduct_draw2: false,
          draw2_pool_amount: '',
          draw2_winning_member_id: '',
          draw2_winning_ticket_number: '',
          draw2_bid_discount: '',
          draw2_commission_percent: '5.0',
          draw2_custom_foreman_commission: '',
          draw2_custom_net_payable: '',
          draw2_custom_double_chit_reserve: '',
          draw2_is_custom_commission_enabled: false,
          draw2_is_custom_net_payable_enabled: false,
          draw2_is_custom_reserve_enabled: false,
          draw2_notes: '',
          notes: '',
        });
        setAvailableReserve(0);
        setGroupTotalCollected(0);
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
            const targetGroupId = selectedSchemeId || (groups.length > 0 ? String(groups[0].id) : '');
            if (targetGroupId) {
              handleGroupChange(targetGroupId);
            }
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
              {groups.length === 0 && (
                <option value="">-- No Chit Schemes Available --</option>
              )}
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} · ₹{Number(g.total_pool_amount).toLocaleString('en-IN')} Pool ({g.frequency === 'DAILY' ? 'Daily' : 'Monthly'})
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
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              {groups.length === 0 ? 'No Chit Schemes Created Yet' : 'Please Select a Chit Scheme'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {groups.length === 0
                ? 'Create a Chit Scheme under "Chit Schemes & Routes" to begin conducting reverse auctions and tracking dividend distributions.'
                : 'Choose an active Daily or Monthly Auction Chit scheme from the dropdown above to inspect its real-time reverse auction ledger.'}
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

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 font-heading ${
                    schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                  }`}>
                    {schemeBreakdown?.group?.chit_type === 'DOUBLE_CHIT' ? '🎰 Double Chit (Dual Draw Scheme)' : '🔨 Reverse Auction Chit Scheme'}
                  </span>

                  {schemeBreakdown?.totals && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 font-heading bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Coins className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Collected: ₹{Number(schemeBreakdown.totals.totalCollected || 0).toLocaleString('en-IN')} / ₹{Number(schemeBreakdown.totals.totalPoolAmount || 0).toLocaleString('en-IN')}</span>
                    </span>
                  )}
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
              {advanceSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{advanceSuccess}</span>
                  </div>
                  <button onClick={() => setAdvanceSuccess('')} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pending Dues & Admin Deficit Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-heading">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Subscribers</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">{schemeBreakdown?.totals?.enrolledCount || 0} Members</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase font-bold">Paid Installments</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {Math.max(0, (schemeBreakdown?.totals?.enrolledCount || 0) - (schemeBreakdown?.totals?.adminCoveredCount || 0))} Paid
                  </span>
                  <span className="text-[9px] text-slate-400 block">Directly by subscribers</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60">
                  <span className="text-amber-600 dark:text-amber-400 block text-[10px] uppercase font-bold">Pending Amount to Admin</span>
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    ₹{Number(schemeBreakdown?.totals?.adminCoveredAmount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 block font-semibold">
                    Total pending from chit to Admin
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60">
                  <span className="text-rose-600 dark:text-rose-400 block text-[10px] uppercase font-bold">Pending Members Count</span>
                  <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                    {schemeBreakdown?.totals?.adminCoveredCount || 0} Members
                  </span>
                  <span className="text-[9px] text-rose-600 dark:text-rose-400 block font-semibold">
                    Owe pending amount to Admin
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base font-heading flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Subscriber Payment, Dues & Dividend Ledger ({schemeBreakdown?.subscribers?.length || 0} Members)</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Shows which subscriber has paid and who owes pending amounts to admin
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

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => setSubscriberFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading ${
                    subscriberFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All Members ({schemeSubscribers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriberFilter('UNPAID')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading flex items-center gap-1.5 ${
                    subscriberFilter === 'UNPAID'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Unpaid Deficit ({schemeBreakdown?.totals?.unpaidCount || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriberFilter('ADMIN_COVERED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading flex items-center gap-1.5 ${
                    subscriberFilter === 'ADMIN_COVERED'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900/60'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Admin Covered ({schemeBreakdown?.totals?.adminCoveredCount || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubscriberFilter('PRIZED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-heading flex items-center gap-1.5 ${
                    subscriberFilter === 'PRIZED'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-900/60'
                  }`}
                >
                  🏆 Prized ({schemeBreakdown?.totals?.totalPrizedCount || 0})
                </button>
              </div>

              {filteredSubscribers.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <Users className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">No subscribers match selected filter or search.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto overflow-y-auto max-h-[440px] rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                        <tr className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold font-heading">
                          <th className="py-2.5 px-3">Ticket #</th>
                          <th className="py-2.5 px-3">Subscriber Name & Phone</th>
                          <th className="py-2.5 px-3">Bidding Status</th>
                          <th className="py-2.5 px-3">Installment Due</th>
                          <th className="py-2.5 px-3">Cycle Due / Paid</th>
                          <th className="py-2.5 px-3">Chit Pending Liability</th>
                          <th className="py-2.5 px-3">Dividend Credited</th>
                          <th className="py-2.5 px-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedSubscribers.map((sub) => {
                          const isPrized = sub.is_prized === 1;
                          const baseInst = parseFloat(sub.base_installment || schemeBreakdown?.group?.installment_amount || 0);

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
                                    <span>Prized (Round #{sub.prized_period || '1'})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-heading">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Eligible (Unprized)</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm font-heading">
                                  ₹{baseInst.toLocaleString('en-IN')}
                                </div>
                                <span className="text-[10px] text-slate-400">Fixed standard due</span>
                              </td>

                              <td className="py-2.5 px-3">
                                {sub.payment_status === 'ADMIN_COVERED' ? (
                                  <div>
                                    <div className="font-extrabold text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-heading">
                                      ₹{Number(sub.pending_amount).toLocaleString('en-IN')}
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                      <span>Admin Covered · Owes Admin</span>
                                    </span>
                                  </div>
                                ) : sub.payment_status === 'NOT_PAID' || sub.payment_status === 'PARTIAL' ? (
                                  <div>
                                    <div className="font-extrabold text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-heading">
                                      ₹{Number(sub.pending_amount).toLocaleString('en-IN')}
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                      <Clock className="w-2.5 h-2.5 text-rose-600" />
                                      <span>{sub.payment_status === 'PARTIAL' ? `Paid ₹${sub.cycle_paid}` : 'Not Paid'}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-heading">
                                      ₹{Number(sub.cycle_paid || baseInst).toLocaleString('en-IN')}
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>Paid by Member</span>
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                {isPrized ? (
                                  <div>
                                    <div className="font-extrabold text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-heading">
                                      ₹{Number(sub.scheme_pending_balance !== undefined ? sub.scheme_pending_balance : Math.max(0, (schemeBreakdown?.group?.total_pool_amount || 0) - (sub.total_paid_in_group || 0))).toLocaleString('en-IN')}
                                    </div>
                                    <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-semibold block">
                                      Prized · ₹{Number(sub.total_paid_in_group || 0).toLocaleString('en-IN')} paid to date
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-heading">
                                      ₹0 Pending
                                    </div>
                                    <span className="text-[10px] text-slate-400 block">
                                      Contributed ₹{Number(sub.total_paid_in_group || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-heading">
                                  ₹{Number(sub.total_dividend_credited || 0).toLocaleString('en-IN')}
                                </div>
                                <span className="text-[10px] text-slate-400 block">Saved in member record</span>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                {sub.payment_status === 'ADMIN_COVERED' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSettleAdvance(sub.advance_id, sub.full_name, sub.pending_amount)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-all cursor-pointer font-heading whitespace-nowrap ml-auto"
                                    title="Subscriber has repaid Admin - mark settled"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Mark Repaid</span>
                                  </button>
                                ) : sub.payment_status === 'NOT_PAID' || sub.payment_status === 'PARTIAL' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdminAdvance(sub)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition-all cursor-pointer font-heading whitespace-nowrap ml-auto"
                                    title="Admin adds amount so chit proceeds - recorded under pending recovery"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    <span>Add Amount</span>
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span>Reconciled</span>
                                  </span>
                                )}
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
                        ₹{Number(auc.installment_amount || auc.next_installment_payable || 0).toLocaleString('en-IN')}
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
              {/* Group Selector with Premium Styled Dropdown */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 font-heading flex items-center justify-between">
                  <span>Select Chit Scheme (Daily / Monthly) *</span>
                  <span className="text-xs font-normal text-slate-400">
                    {groups.length} eligible schemes available
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAuctionGroupPicker((open) => !open)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    showAuctionGroupPicker
                      ? 'border-blue-600 ring-2 ring-blue-100 dark:ring-blue-950/80 bg-blue-50/30 dark:bg-blue-950/20'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-blue-400'
                  }`}
                >
                  {selectedGroup ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 flex-1 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                            {selectedGroup.group_name}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300">
                            {selectedGroup.group_code}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedGroup.frequency === 'DAILY' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          }`}>
                            {selectedGroup.frequency === 'DAILY' ? 'Daily Chit' : 'Monthly Chit'}
                          </span>
                          <span>•</span>
                          <span>{selectedGroup.chit_type === 'DOUBLE_CHIT' ? 'Double Chit Draw' : 'Standard Auction'}</span>
                          <span>•</span>
                          <span>Installment: ₹{Number(selectedGroup.installment_amount).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">Total Pool</span>
                        <strong className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Number(selectedGroup.total_pool_amount).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Layers className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-semibold">Click to select chit scheme for reverse auction...</span>
                    </div>
                  )}
                  <ChevronRight className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${showAuctionGroupPicker ? 'rotate-90' : ''}`} />
                </button>

                {showAuctionGroupPicker && (
                  <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-fadeIn z-20">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400 ml-1" />
                      <input
                        autoFocus
                        value={auctionGroupSearch}
                        onChange={(e) => setAuctionGroupSearch(e.target.value)}
                        placeholder="Search by scheme name, code (e.g. M-01), daily, or monthly..."
                        className="w-full bg-transparent border-0 px-2 py-1 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      {auctionGroupSearch && (
                        <button
                          type="button"
                          onClick={() => setAuctionGroupSearch('')}
                          className="text-xs text-slate-400 hover:text-slate-600 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {groups
                        .filter((g) =>
                          `${g.group_name} ${g.group_code} ${g.frequency} ${g.chit_type}`
                            .toLowerCase()
                            .includes(auctionGroupSearch.toLowerCase())
                        )
                        .map((g) => {
                          const isSelected = String(g.id) === String(form.group_id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setShowAuctionGroupPicker(false);
                                setAuctionGroupSearch('');
                                handleGroupChange(String(g.id));
                              }}
                              className={`w-full rounded-xl p-3 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <strong className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                    {g.group_name}
                                  </strong>
                                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                                    {g.group_code}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                                      Selected ✓
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    g.frequency === 'DAILY' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  }`}>
                                    {g.frequency}
                                  </span>
                                  <span>{g.chit_type === 'DOUBLE_CHIT' ? 'Double Chit' : 'Auction Chit'}</span>
                                  <span>·</span>
                                  <span>Installment: ₹{Number(g.installment_amount).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Pool Amount</span>
                                <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  ₹{Number(g.total_pool_amount).toLocaleString('en-IN')}
                                </strong>
                              </div>
                            </button>
                          );
                        })}
                      {groups.filter((g) =>
                        `${g.group_name} ${g.group_code} ${g.frequency} ${g.chit_type}`
                          .toLowerCase()
                          .includes(auctionGroupSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-500">
                          No matching auction chit schemes found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Scheme Details Banner */}
              {selectedGroup && (
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/60 pb-2">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Scheme Model:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1.5 font-heading">
                      {selectedGroup.frequency === 'DAILY' ? '⚡ Daily Chit Route' : '🏛️ Monthly Reverse Auction'} ·{' '}
                      {selectedGroup.chit_type === 'DOUBLE_CHIT' ? '🎰 Double Chit Scheme' : '🔨 Standard Auction Scheme'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 block text-xs">Scheme Base Pool</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">₹{groupPoolAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Total Collected</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base font-heading">₹{groupTotalCollected.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Saved Reserve</span>
                      <strong className="text-purple-600 dark:text-purple-400 font-extrabold text-base font-heading">₹{availableReserve.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Base Installment</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">₹{baseInstallment.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/{selectedGroup.frequency === 'DAILY' ? 'day' : 'month'}</span></strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Foreman Comm.</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">{selectedGroup?.foreman_commission_percent || 5}% <span className="text-xs font-normal text-slate-400">on Prize</span></strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Subscribers</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-base font-heading">{totalMembers} Members</strong>
                    </div>
                  </div>

                  {/* Total Auctionable Pool Information Card */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-100/80 via-indigo-50/90 to-purple-100/80 dark:from-blue-950/40 dark:via-slate-800/80 dark:to-purple-950/40 border border-blue-200 dark:border-blue-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-slate-900 dark:text-white font-heading block">
                          Total Auctionable Pool Information
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {isAuctioningReserve ? (
                            <>Double Auction (Draw #2) Rule: <strong>Only the saved reserve amount (₹{availableReserve.toLocaleString('en-IN')})</strong> is used to auction.</>
                          ) : (
                            <>Regular Auction Rule: <strong>Regular Amount (₹{groupPoolAmount.toLocaleString('en-IN')}) + Saved Reserve (₹{availableReserve.toLocaleString('en-IN')})</strong> can be auctioned (Total Auctionable: <strong>₹{regularAuctionablePool.toLocaleString('en-IN')}</strong>).</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0 pl-6 sm:pl-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block font-heading">
                        {isAuctioningReserve ? 'Reserve Available' : 'Regular Pool + Reserve'}
                      </span>
                      <strong className="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-heading">
                        ₹{(isAuctioningReserve ? doubleAuctionablePool : regularAuctionablePool).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Pool Collection Status Info */}
              {selectedGroup && !isAuctioningReserve && groupTotalCollected < groupPoolAmount && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 space-y-1.5 shadow-xs text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="font-bold text-blue-950 dark:text-blue-100 font-heading">
                      Current Collection: ₹{groupTotalCollected.toLocaleString('en-IN')} of ₹{groupPoolAmount.toLocaleString('en-IN')} pool (Shortfall: ₹{poolShortfall.toLocaleString('en-IN')})
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed pl-6">
                    As per chit fund practice, auction is conducted up to the full chit pool amount. Any subscriber installment shortfall automatically adds as a <strong>Pending Amount to Admin</strong> from respective member(s) once this auction completes.
                  </p>
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
                    onWheel={(e) => e.target.blur()}
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
                          pool_source: val === '2' ? 'SAVED_RESERVE' : (form.include_reserve ? 'REGULAR_PLUS_RESERVE' : 'REGULAR'),
                          custom_pool_amount: val === '2' ? (availableReserve > 0 ? String(availableReserve) : '0') : '',
                        });
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="1">Draw #1 (Regular Scheme Chit Pool)</option>
                      <option value="2">Draw #2 (Double Auction: Saved Chit Reserve Only)</option>
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

              {/* Pool Mode Controls (Replaces the removed section cleanly) */}
              {isAuctioningReserve ? (
                <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200 font-heading flex items-center gap-1.5">
                        <span>⚡</span> Double Auction Mode (Draw #2)
                      </span>
                      <p className="text-[11px] text-purple-700/90 dark:text-purple-300/90 mt-0.5">
                        Rule: For Double Auction, only the accumulated saved reserve is used to auction.
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-purple-500 block">Available Reserve</span>
                      <strong className="text-sm sm:text-base font-black text-purple-700 dark:text-purple-300 font-mono">
                        ₹{availableReserve.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                  {availableReserve <= 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs">
                      ⚠️ Note: No saved reserve is currently accumulated in this chit. Please conduct Draw #1 first to accumulate chit reserve.
                    </div>
                  )}
                </div>
              ) : (
                availableReserve > 0 && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Include Saved Chit Reserve in this Auction (+₹{availableReserve.toLocaleString('en-IN')})?</span>
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Regular Pool (₹{groupPoolAmount.toLocaleString('en-IN')}) + Saved Reserve (₹{availableReserve.toLocaleString('en-IN')}) = <strong>₹{regularAuctionablePool.toLocaleString('en-IN')}</strong> can be auctioned.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 p-2 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 shadow-2xs hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(form.include_reserve)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((prev) => ({
                            ...prev,
                            include_reserve: checked,
                            pool_source: checked ? 'REGULAR_PLUS_RESERVE' : 'REGULAR',
                            custom_pool_amount: '',
                          }));
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 font-heading">
                        {form.include_reserve ? 'Reserve Included ✓' : '+ Include Reserve'}
                      </span>
                    </label>
                  </div>
                )
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
                    min="0"
                    max={effectivePool}
                    onWheel={(e) => e.target.blur()}
                    required
                    value={form.bid_discount}
                    onChange={(e) => setForm({ ...form, bid_discount: e.target.value })}
                    placeholder="e.g. 25000"
                    className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl text-base font-black focus:ring-2 focus:outline-none font-heading ${
                      isBidDiscountOverPool || isBidDiscountNegative
                        ? 'border-red-500 text-red-600 focus:ring-red-500 bg-red-50/20'
                        : 'border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 focus:ring-blue-600'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-400">Boundary: Min ₹0 — Max ₹{effectivePool.toLocaleString('en-IN')} (Pool)</span>
                    {selectedGroup?.max_bid_percent && (
                      <span className="text-slate-400 font-medium">Max cap ({selectedGroup.max_bid_percent}%): ₹{((effectivePool * Number(selectedGroup.max_bid_percent)) / 100).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  {isBidDiscountOverPool && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">
                      ⚠️ Bid discount cannot exceed the auction pool (₹{effectivePool.toLocaleString('en-IN')}).
                    </p>
                  )}
                  {isBidDiscountNegative && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">
                      ⚠️ Bid discount cannot be negative.
                    </p>
                  )}
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

              {/* Admin Financial Controls & Commission Modifications */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-blue-200 dark:border-blue-900/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base font-heading">
                        Admin Financial Controls & Live Modifications
                      </h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Modify commission %, commission in ₹, winner prize money, or dividends directly
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {hasAnyOverrides && (
                      <button
                        type="button"
                        onClick={handleResetCalculations}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 transition-colors flex items-center gap-1 cursor-pointer font-heading"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Auto</span>
                      </button>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-heading">
                      Admin Authority
                    </span>
                  </div>
                </div>

                {/* Formula Explanation Callout */}
                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="font-heading block">Business Calculation Rule:</strong>
                    <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                      Admin Commission is calculated strictly from the <strong>Winner Prize Amount</strong> (Total Pool ₹{effectivePool.toLocaleString('en-IN')} − Bid Discount ₹{bidDiscount.toLocaleString('en-IN')} = <strong>₹{grossWinnerPrize.toLocaleString('en-IN')}</strong>), NOT from the full chit pool amount.
                    </p>
                  </div>
                </div>

                {/* Grid of Editable Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Gross Winner Prize Display */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">
                      Gross Winner Prize (Pool − Bid)
                    </span>
                    <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-heading">
                      ₹{grossWinnerPrize.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      ₹{effectivePool.toLocaleString('en-IN')} Pool − ₹{bidDiscount.toLocaleString('en-IN')} Bid Discount
                    </p>
                  </div>

                  {/* Editable Commission Rate (%) */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                        Foreman Commission Rate (%) *
                      </label>
                      <span className="text-[10px] text-slate-400">Default: {selectedGroup?.foreman_commission_percent || 5}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        onWheel={(e) => e.target.blur()}
                        value={form.commission_percent}
                        onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-base font-bold text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Percentage of Winner Prize (₹{grossWinnerPrize.toLocaleString('en-IN')})
                    </p>
                  </div>

                  {/* Admin Commission Amount (₹) with Override toggle */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                        Admin Commission (₹)
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          is_custom_commission_enabled: !prev.is_custom_commission_enabled,
                          custom_foreman_commission: !prev.is_custom_commission_enabled ? String(autoForemanCommission) : '',
                        }))}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-heading"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{form.is_custom_commission_enabled ? 'Revert to Auto' : 'Custom ₹'}</span>
                      </button>
                    </div>

                    {form.is_custom_commission_enabled ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={grossWinnerPrize}
                          onWheel={(e) => e.target.blur()}
                          value={form.custom_foreman_commission}
                          onChange={(e) => setForm({ ...form, custom_foreman_commission: e.target.value })}
                          placeholder={String(autoForemanCommission)}
                          className="w-full px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg text-base font-bold text-amber-700 dark:text-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                          Custom override active (Auto was ₹{autoForemanCommission.toLocaleString('en-IN')})
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-heading">
                          ₹{autoForemanCommission.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {activeCommissionPercent}% of Winner Prize (₹{grossWinnerPrize.toLocaleString('en-IN')})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Net Prize Money Payable (₹) with Override toggle */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                        Net Prize to Winner (₹)
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          is_custom_net_payable_enabled: !prev.is_custom_net_payable_enabled,
                          custom_net_payable: !prev.is_custom_net_payable_enabled ? String(autoNetPayablePrize) : '',
                        }))}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-heading"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{form.is_custom_net_payable_enabled ? 'Revert to Auto' : 'Custom Net Prize'}</span>
                      </button>
                    </div>

                    {form.is_custom_net_payable_enabled ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={grossWinnerPrize}
                          onWheel={(e) => e.target.blur()}
                          value={form.custom_net_payable}
                          onChange={(e) => setForm({ ...form, custom_net_payable: e.target.value })}
                          placeholder={String(autoNetPayablePrize)}
                          className="w-full px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-lg text-base font-bold text-blue-700 dark:text-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block">
                          Custom net payout override active
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-heading">
                          ₹{autoNetPayablePrize.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Gross Prize (₹{grossWinnerPrize.toLocaleString('en-IN')}) − Comm. (₹{effectiveForemanCommission.toLocaleString('en-IN')})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* If Auction Chit: Total Dividend & Dividend per Member */}
                  {!isDoubleChitScheme && (
                    <>
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                            Total Dividend Distributed (₹)
                          </label>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({
                              ...prev,
                              is_custom_dividend_enabled: !prev.is_custom_dividend_enabled,
                              custom_total_dividend: !prev.is_custom_dividend_enabled ? String(autoTotalDividend) : '',
                              custom_dividend_per_member: !prev.is_custom_dividend_enabled ? String(autoDividendPerMember) : '',
                            }))}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-heading"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{form.is_custom_dividend_enabled ? 'Revert to Auto' : 'Custom Dividend'}</span>
                          </button>
                        </div>

                        {form.is_custom_dividend_enabled ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={bidDiscount}
                            onWheel={(e) => e.target.blur()}
                            value={form.custom_total_dividend}
                            onChange={(e) => {
                              const total = e.target.value;
                              const perMember = total !== '' && totalMembers > 0 ? (parseFloat(total) / totalMembers).toFixed(2) : '';
                              setForm({ ...form, custom_total_dividend: total, custom_dividend_per_member: String(perMember) });
                            }}
                            placeholder={String(autoTotalDividend)}
                            className="w-full px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg text-base font-bold text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        ) : (
                          <div>
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-heading">
                              ₹{autoTotalDividend.toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Full bid discount credited across subscribers
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                            Dividend / Member (₹)
                          </label>
                          <span className="text-[10px] text-slate-400">{totalMembers} Members</span>
                        </div>

                        {form.is_custom_dividend_enabled ? (
                          <input
                            type="number"
                            step="0.01"
                            value={form.custom_dividend_per_member}
                            onChange={(e) => setForm({ ...form, custom_dividend_per_member: e.target.value })}
                            placeholder={String(autoDividendPerMember)}
                            className="w-full px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg text-base font-bold text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        ) : (
                          <div>
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-heading">
                              ₹{autoDividendPerMember.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">/ member</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Credited equally into passbook
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* If Double Chit: Chit Pool Reserve */}
                  {isDoubleChitScheme && (
                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-purple-900 dark:text-purple-200 font-heading">
                          Chit Pool Reserve (₹)
                        </label>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({
                            ...prev,
                            is_custom_reserve_enabled: !prev.is_custom_reserve_enabled,
                            custom_double_chit_reserve: !prev.is_custom_reserve_enabled ? String(autoDoubleChitReserve) : '',
                          }))}
                          className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer font-heading"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{form.is_custom_reserve_enabled ? 'Revert to Auto' : 'Custom Reserve'}</span>
                        </button>
                      </div>

                      {form.is_custom_reserve_enabled ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={bidDiscount}
                          onWheel={(e) => e.target.blur()}
                          value={form.custom_double_chit_reserve}
                          onChange={(e) => setForm({ ...form, custom_double_chit_reserve: e.target.value })}
                          placeholder={String(autoDoubleChitReserve)}
                          className="w-full px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 rounded-lg text-base font-bold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      ) : (
                        <div>
                          <div className="text-lg font-black text-purple-600 dark:text-purple-400 font-heading">
                            ₹{autoDoubleChitReserve.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-purple-500 block mt-0.5">
                            Saved in chit pool reserve (Available to auction in Draw #2)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next Installment Due (₹) */}
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-heading">
                        {selectedGroup?.frequency === 'DAILY' ? 'Next Day Due (₹)' : 'Next Month Due (₹)'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          is_custom_due_enabled: !prev.is_custom_due_enabled,
                          custom_next_installment: !prev.is_custom_due_enabled ? String(autoNextInstallment) : '',
                        }))}
                        className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1 cursor-pointer font-heading"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{form.is_custom_due_enabled ? 'Revert to Auto' : 'Custom Due'}</span>
                      </button>
                    </div>

                    {form.is_custom_due_enabled ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={form.custom_next_installment}
                        onChange={(e) => setForm({ ...form, custom_next_installment: e.target.value })}
                        placeholder={String(autoNextInstallment)}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div>
                        <div className="text-lg font-black text-slate-900 dark:text-white font-heading">
                          ₹{autoNextInstallment.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Full standard chit installment due
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ChitBase Real-Time Financial Calculations Preview */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-slate-50 dark:from-slate-800/90 dark:to-slate-900 border border-blue-200/80 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-extrabold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-xs flex items-center gap-2 font-heading">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {isDoubleChitScheme ? 'Double Chit Final Distribution Summary' : 'Auction Chit Final Financial Summary'}
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 font-heading">
                    Admin Commission: {activeCommissionPercent}% on Winner Prize (₹{grossWinnerPrize.toLocaleString('en-IN')})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-1">
                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">Net Prize (To Winner)</span>
                    <span className="text-base sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-heading">
                      ₹{effectiveNetPayablePrize.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Gross Prize − Comm.</span>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">Admin Commission</span>
                    <span className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 font-heading">
                      ₹{effectiveForemanCommission.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">{activeCommissionPercent}% on Prize</span>
                  </div>

                  {isDoubleChitScheme ? (
                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-purple-200/80 dark:border-purple-800/60">
                      <span className="text-purple-600 dark:text-purple-400 block text-[11px] sm:text-xs font-bold font-heading">
                        Chit Pool Reserve
                      </span>
                      <span className="text-base sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-heading">
                        ₹{effectiveDoubleChitReserve.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-purple-500 block mt-0.5">Saved in chit (Draw #2)</span>
                    </div>
                  ) : (
                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60">
                      <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">Dividend / Member</span>
                      <span className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                        ₹{effectiveDividendPerMember.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">₹{effectiveTotalDividend.toLocaleString('en-IN')} ÷ {totalMembers} mem</span>
                    </div>
                  )}

                  <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[11px] sm:text-xs font-medium">
                      {selectedGroup?.frequency === 'DAILY' ? 'Next Day Due' : 'Next Month Due'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                      ₹{effectiveNextInstallment.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">
                      Full installment due
                    </span>
                  </div>
                </div>
              </div>

              {/* Double Chit: Optional Draw #2 In-Form Double Auction */}
              {isDoubleChitScheme && isDraw1 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 dark:from-purple-950/40 dark:via-slate-800/80 dark:to-slate-900 border-2 border-dashed border-purple-300 dark:border-purple-700/70 space-y-3 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px] tracking-wide uppercase font-heading">
                          Double Chit Special
                        </span>
                        <h4 className="text-sm sm:text-base font-extrabold text-purple-950 dark:text-purple-200 font-heading">
                          Optional Draw #2: Double Auction of Reversing Amount
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Conduct the second auction of this round using the reversing amount (₹{effectiveDoubleChitReserve.toLocaleString('en-IN')}) simultaneously in this single form session.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          conduct_draw2: !prev.conduct_draw2,
                          draw2_pool_amount: !prev.conduct_draw2 ? String(effectiveDoubleChitReserve || bidDiscount) : '',
                        }))
                      }
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer font-heading shadow-sm shrink-0 ${
                        form.conduct_draw2
                          ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'
                          : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {form.conduct_draw2 ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Draw #2 Active (Click to Remove)</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>Enable Draw #2 Double Auction</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Draw #2 Section - Expands when enabled */}
                  {form.conduct_draw2 && (
                    <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800/80 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-800 dark:text-purple-300 font-heading flex items-center gap-1.5">
                          <Gavel className="w-4 h-4 text-purple-600" />
                          Draw #2 Details (Reversing Pool: ₹{draw2EffectivePool.toLocaleString('en-IN')})
                        </span>
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          Winner cannot be Draw #1 winner ({groupMembers.find((m) => String(m.member_id) === String(form.winning_member_id))?.full_name || 'Draw #1 Winner'})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Draw #2 Auction Pool Amount */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                            Draw #2 Auction Pool (Reversing Amount) (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            onWheel={(e) => e.target.blur()}
                            value={form.draw2_pool_amount}
                            onChange={(e) => setForm({ ...form, draw2_pool_amount: e.target.value })}
                            placeholder={String(effectiveDoubleChitReserve || bidDiscount)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl text-sm font-bold text-purple-900 dark:text-purple-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Defaulted from Draw #1 bid discount. Admin can modify if required.
                          </span>
                        </div>

                        {/* Draw #2 Winning Subscriber Dropdown */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                            Draw #2 Winning Subscriber *
                          </label>
                          <select
                            value={form.draw2_winning_member_id}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const member = groupMembers.find((m) => String(m.member_id) === selectedId);
                              setForm({
                                ...form,
                                draw2_winning_member_id: selectedId,
                                draw2_winning_ticket_number: member ? String(member.ticket_number) : '',
                              });
                            }}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
                          >
                            <option value="">-- Choose Draw #2 Winning Subscriber --</option>
                            {groupMembers
                              .filter((m) => String(m.member_id) !== String(form.winning_member_id))
                              .map((m) => {
                                const isDisqualified = m.is_prized === 1;
                                return (
                                  <option
                                    key={m.member_id}
                                    value={m.member_id}
                                    disabled={isDisqualified}
                                  >
                                    #{m.ticket_number} - {m.full_name} ({m.phone})
                                    {isDisqualified ? ` [PRIZED in Round #${m.prized_period || 'past'} - Disqualified]` : ''}
                                  </option>
                                );
                              })}
                          </select>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Draw #1 winner & previously prized subscribers are disqualified.
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Draw #2 Winning Ticket Number */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                            Draw #2 Winning Ticket Number *
                          </label>
                          <input
                            type="number"
                            onWheel={(e) => e.target.blur()}
                            value={form.draw2_winning_ticket_number}
                            onChange={(e) => setForm({ ...form, draw2_winning_ticket_number: e.target.value })}
                            placeholder="Auto-populated from subscriber"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>

                        {/* Draw #2 Bid Discount */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                            Draw #2 Winning Bid Discount (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            onWheel={(e) => e.target.blur()}
                            value={form.draw2_bid_discount}
                            onChange={(e) => setForm({ ...form, draw2_bid_discount: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Amount foregone by Draw #2 winner from reversing pool.
                          </span>
                        </div>
                      </div>

                      {/* Draw #2 Financial Modification & Overrides Controls */}
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-purple-200 dark:border-purple-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-black uppercase text-purple-900 dark:text-purple-300 font-heading flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-purple-600" />
                            Draw #2 Admin Financial Controls & Overrides
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Commission calculated strictly on Draw #2 Winner Prize (₹{draw2GrossWinnerPrize.toLocaleString('en-IN')})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          {/* Draw #2 Commission Rate % */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 font-heading">
                              Comm. Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              onWheel={(e) => e.target.blur()}
                              value={form.draw2_commission_percent}
                              onChange={(e) => setForm({ ...form, draw2_commission_percent: e.target.value })}
                              placeholder={String(selectedGroup?.foreman_commission_percent || 5)}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                            <span className="text-[9px] text-slate-400 block mt-0.5">Applied to winner prize</span>
                          </div>

                          {/* Draw #2 Admin Commission ₹ */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-heading">Admin Comm. (₹)</span>
                              <button
                                type="button"
                                onClick={() => setForm((prev) => ({
                                  ...prev,
                                  draw2_is_custom_commission_enabled: !prev.draw2_is_custom_commission_enabled,
                                  draw2_custom_foreman_commission: !prev.draw2_is_custom_commission_enabled ? String(draw2AutoForemanCommission) : '',
                                }))}
                                className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer font-heading"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>{form.draw2_is_custom_commission_enabled ? 'Revert' : 'Custom ₹'}</span>
                              </button>
                            </div>
                            {form.draw2_is_custom_commission_enabled ? (
                              <input
                                type="number"
                                step="0.01"
                                onWheel={(e) => e.target.blur()}
                                value={form.draw2_custom_foreman_commission}
                                onChange={(e) => setForm({ ...form, draw2_custom_foreman_commission: e.target.value })}
                                placeholder={String(draw2AutoForemanCommission)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-md text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            ) : (
                              <div className="text-sm font-black text-amber-600 dark:text-amber-400 font-heading">
                                ₹{draw2AutoForemanCommission.toLocaleString('en-IN')}
                              </div>
                            )}
                            <span className="text-[9px] text-slate-400 block mt-0.5">{draw2ActiveCommissionPercent}% on ₹{draw2GrossWinnerPrize.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Draw #2 Net Prize Money */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-heading">Net Prize (₹)</span>
                              <button
                                type="button"
                                onClick={() => setForm((prev) => ({
                                  ...prev,
                                  draw2_is_custom_net_payable_enabled: !prev.draw2_is_custom_net_payable_enabled,
                                  draw2_custom_net_payable: !prev.draw2_is_custom_net_payable_enabled ? String(draw2AutoNetPayablePrize) : '',
                                }))}
                                className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer font-heading"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>{form.draw2_is_custom_net_payable_enabled ? 'Revert' : 'Custom Net'}</span>
                              </button>
                            </div>
                            {form.draw2_is_custom_net_payable_enabled ? (
                              <input
                                type="number"
                                step="0.01"
                                onWheel={(e) => e.target.blur()}
                                value={form.draw2_custom_net_payable}
                                onChange={(e) => setForm({ ...form, draw2_custom_net_payable: e.target.value })}
                                placeholder={String(draw2AutoNetPayablePrize)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-md text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            ) : (
                              <div className="text-sm font-black text-purple-600 dark:text-purple-400 font-heading">
                                ₹{draw2AutoNetPayablePrize.toLocaleString('en-IN')}
                              </div>
                            )}
                            <span className="text-[9px] text-slate-400 block mt-0.5">Prize − Comm.</span>
                          </div>

                          {/* Draw #2 Remaining Reserve */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-heading">Surplus Reserve (₹)</span>
                              <button
                                type="button"
                                onClick={() => setForm((prev) => ({
                                  ...prev,
                                  draw2_is_custom_reserve_enabled: !prev.draw2_is_custom_reserve_enabled,
                                  draw2_custom_double_chit_reserve: !prev.draw2_is_custom_reserve_enabled ? String(draw2AutoDoubleChitReserve) : '',
                                }))}
                                className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer font-heading"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>{form.draw2_is_custom_reserve_enabled ? 'Revert' : 'Custom'}</span>
                              </button>
                            </div>
                            {form.draw2_is_custom_reserve_enabled ? (
                              <input
                                type="number"
                                step="0.01"
                                onWheel={(e) => e.target.blur()}
                                value={form.draw2_custom_double_chit_reserve}
                                onChange={(e) => setForm({ ...form, draw2_custom_double_chit_reserve: e.target.value })}
                                placeholder={String(draw2AutoDoubleChitReserve)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-md text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            ) : (
                              <div className="text-sm font-black text-slate-900 dark:text-white font-heading">
                                ₹{draw2AutoDoubleChitReserve.toLocaleString('en-IN')}
                              </div>
                            )}
                            <span className="text-[9px] text-slate-400 block mt-0.5">Carried forward in chit</span>
                          </div>
                        </div>
                      </div>

                      {/* Draw #2 Notes */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                          Draw #2 Notes / Remarks
                        </label>
                        <input
                          type="text"
                          value={form.draw2_notes}
                          onChange={(e) => setForm({ ...form, draw2_notes: e.target.value })}
                          placeholder="e.g. Draw #2 auction of reversing pool conducted in presence of members"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      {/* Dual Auction Combined Overview Banner */}
                      <div className="p-3 bg-purple-100/60 dark:bg-purple-950/60 rounded-xl border border-purple-200 dark:border-purple-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="font-bold text-purple-900 dark:text-purple-200 font-heading">
                            Dual Auction Combined Round Summary:
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-purple-950 dark:text-purple-200 font-medium">
                          <span>
                            Draw #1 Prize: <strong>₹{effectiveNetPayablePrize.toLocaleString('en-IN')}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Draw #2 Prize: <strong>₹{draw2EffectiveNetPayablePrize.toLocaleString('en-IN')}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Total Comm.: <strong>₹{(effectiveForemanCommission + draw2EffectiveForemanCommission).toLocaleString('en-IN')}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Final Reserve: <strong>₹{draw2EffectiveDoubleChitReserve.toLocaleString('en-IN')}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {hasBoundaryErrors && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-300 dark:border-rose-800 text-red-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>Please correct out-of-boundary numbers (e.g. bid discount exceeding pool or commission exceeding prize) before submitting.</span>
                </div>
              )}

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
                  disabled={submitting || hasBoundaryErrors}
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
                  {voucherModal?.frequency === 'DAILY'
                    ? voucherModal?.chit_type === 'DOUBLE_CHIT'
                      ? 'Daily Double Chit Scheme'
                      : 'Daily Reverse Auction'
                    : 'Monthly Reverse Auction'}
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
                <span className="text-slate-700 dark:text-slate-300 font-medium">₹{Number(voucherModal?.foreman_commission || 0).toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-normal">(Deducted from Winner Prize)</span></span>
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
                <span className="font-bold text-slate-900 dark:text-white">₹{Number(voucherModal?.installment_amount || voucherModal?.next_installment_payable || 0).toLocaleString('en-IN')}</span>
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

      {/* Admin Add Amount (Cover Due) Modal */}
      {Boolean(adminAdvanceModal) && (
        <ModalPortal
          id="admin-advance-modal"
          isOpen={Boolean(adminAdvanceModal)}
          onClose={() => setAdminAdvanceModal(null)}
        >
          <div className="w-full max-w-lg p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-heading">
                    Add Amount as Admin (Cover Due)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Fund unpaid installment so chit continues; tracked under Admin Pending Recovery
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminAdvanceModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Chit Scheme:</span>
                <span className="font-extrabold text-blue-900 dark:text-blue-300 font-heading">
                  {adminAdvanceModal.group_name || schemeBreakdown?.group?.group_name || 'Selected Group'} ({adminAdvanceModal.group_code || schemeBreakdown?.group?.group_code})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Subscriber:</span>
                <span className="font-bold text-slate-900 dark:text-white font-heading">
                  #{adminAdvanceModal.ticket_number} - {adminAdvanceModal.full_name} ({adminAdvanceModal.phone})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Standard Installment:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  ₹{Number(adminAdvanceModal.base_installment || schemeBreakdown?.group?.installment_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-blue-200/60 dark:border-blue-900/40 pt-1.5">
                <span className="text-rose-600 dark:text-rose-400 font-bold">Pool Deficit / Amount Due:</span>
                <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                  ₹{Number(adminAdvanceModal.pending_amount || adminAdvanceModal.base_installment || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Tracking Notice */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Tracked in Admin Advance & Member Pending Dues</span>
              </div>
              <p>
                This amount covers the chit fund pool so the auction proceeds. It is recorded as pending member recovery in <strong>Admin Commissions & Advances (/commissions)</strong> and the <strong>Member Installment & Dues Ledger</strong> below for tracking until the subscriber repays Admin.
              </p>
            </div>

            <form onSubmit={handleSubmitAdminAdvance} className="space-y-4">
              {adminAdvanceModal.fromAuctionModal && groupMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                    Assign Recovery Dues to Subscriber *
                  </label>
                  <select
                    value={adminAdvanceForm.member_id}
                    onChange={(e) => {
                      const mem = groupMembers.find((m) => String(m.member_id || m.id) === String(e.target.value));
                      setAdminAdvanceForm({
                        ...adminAdvanceForm,
                        member_id: e.target.value,
                        notes: `[ADMIN_FUNDED] Admin cover on behalf of ${mem?.full_name || 'Member'} (Ticket #${mem?.ticket_number || ''}) - Pending Member Recovery`,
                      });
                      if (mem) {
                        setAdminAdvanceModal((prev) => ({
                          ...prev,
                          member_id: mem.member_id || mem.id,
                          ticket_number: mem.ticket_number,
                          full_name: mem.full_name,
                          phone: mem.phone,
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {groupMembers.map((m) => (
                      <option key={m.member_id || m.id} value={m.member_id || m.id}>
                        #{m.ticket_number} - {m.full_name} ({m.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                  Total Pending Due in Admin Advance (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  onWheel={(e) => e.target.blur()}
                  value={adminAdvanceForm.amount}
                  onChange={(e) => setAdminAdvanceForm({ ...adminAdvanceForm, amount: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Total pending deficit due from member to Admin.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                  Admin Payment Source / Method
                </label>
                <select
                  value={adminAdvanceForm.payment_method}
                  onChange={(e) => setAdminAdvanceForm({ ...adminAdvanceForm, payment_method: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="CASH">Cash (Admin Cash Outlay)</option>
                  <option value="UPI">UPI / Digital (Admin Bank)</option>
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-heading">
                  Remarks / Audit Note
                </label>
                <input
                  type="text"
                  value={adminAdvanceForm.notes}
                  onChange={(e) => setAdminAdvanceForm({ ...adminAdvanceForm, notes: e.target.value })}
                  placeholder="e.g. Covered by Admin on behalf of subscriber"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  This deposit will credit the chit fund ledger and record a pending recovery of ₹{Number(adminAdvanceForm.amount || 0).toLocaleString('en-IN')} against {adminAdvanceModal.full_name}.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdminAdvanceModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={advanceSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer font-heading"
                >
                  {advanceSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding Amount...</span>
                    </>
                  ) : (
                    <span>Confirm & Add Amount</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Confirmation Dialog for Auction Finalization */}
      <ConfirmModal
        isOpen={showAuctionConfirm}
        onClose={() => setShowAuctionConfirm(false)}
        onConfirm={executeConfirmedAuction}
        isLoading={submitting}
        title={
          isDoubleChitScheme && form.conduct_draw2
            ? `Finalize Dual Auctions (Draw #1 + Draw #2) - Round #${form.period_number}`
            : "Finalize Reverse Auction & Disburse Dividends"
        }
        message={
          isDoubleChitScheme && form.conduct_draw2
            ? `Confirm dual auction finalization for Round #${form.period_number} in ${selectedGroup?.group_name || 'selected group'}:\n\n1. Draw #1 Winner: ${groupMembers.find((m) => String(m.member_id) === String(form.winning_member_id))?.full_name || 'Subscriber'} (Ticket #${form.winning_ticket_number}) — Net Prize: ₹${Number(effectiveNetPayablePrize).toLocaleString('en-IN')}\n2. Draw #2 Winner: ${groupMembers.find((m) => String(m.member_id) === String(form.draw2_winning_member_id))?.full_name || 'Subscriber'} (Ticket #${form.draw2_winning_ticket_number}) — Net Prize: ₹${Number(draw2EffectiveNetPayablePrize).toLocaleString('en-IN')}\n\nBoth payout vouchers will be generated simultaneously and both subscribers will be marked as prized.`
            : `Are you sure you want to finalize Auction #${form.draw_number} for ${selectedGroup?.group_name || 'selected group'} with winning subscriber ${groupMembers.find((m) => String(m.member_id) === String(form.winning_member_id))?.full_name || 'member'} at a bid discount of ₹${Number(bidDiscount).toLocaleString('en-IN')}?`
        }
        confirmLabel={
          isDoubleChitScheme && form.conduct_draw2
            ? "Confirm Dual Auctions & Generate Vouchers"
            : "Confirm & Finalize Auction"
        }
        cancelLabel="Review Bids"
        variant="primary"
        icon={Gavel}
        subtext={
          isDoubleChitScheme && form.conduct_draw2
            ? `Draw #1 Prize: ₹${Number(effectiveNetPayablePrize).toLocaleString('en-IN')} | Draw #2 Prize: ₹${Number(draw2EffectiveNetPayablePrize).toLocaleString('en-IN')} | Total Admin Commission: ₹${Number(effectiveForemanCommission + draw2EffectiveForemanCommission).toLocaleString('en-IN')} | Final Chit Reserve: ₹${Number(draw2EffectiveDoubleChitReserve).toLocaleString('en-IN')}`
            : `Net Prize: ₹${Number(effectiveNetPayablePrize).toLocaleString('en-IN')} | Foreman Commission: ₹${Number(effectiveForemanCommission).toLocaleString('en-IN')} (from Winner Prize) | Dividend/Member: ₹${Number(effectiveDividendPerMember).toLocaleString('en-IN')}${effectiveDoubleChitReserve > 0 ? ` | Chit Pool Reserve: ₹${Number(effectiveDoubleChitReserve).toLocaleString('en-IN')}` : ''}`
        }
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
