import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import {
  UserCheck,
  LogOut,
  MapPin,
  Calendar,
  Building2,
  Clock,
  Smartphone,
  Info,
  Sun,
  Moon,
  Wallet,
  Receipt,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ArrowRight,
  Printer,
  X,
  MessageSquare,
  Sparkles,
  ChevronRight,
  CheckSquare,
  Compass,
  PhoneCall,
  Phone,
  ShieldCheck,
  Layers,
  Award,
  User,
  ExternalLink,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Users,
  Filter,
  CreditCard,
  QrCode,
  PackageCheck,
  Send,
  Banknote,
  LayoutGrid,
  List,
  Target,
} from 'lucide-react';
import { formatDate, formatTime, formatDateTime, getServerDate, getServerYMD } from '../utils/dateUtils';
import ConfirmModal from '../components/ConfirmModal';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import NotificationBell from '../components/NotificationBell';
import AnimatedChitBackground from '../components/AnimatedChitBackground';
import WelcomeCelebrationModal from '../components/WelcomeCelebrationModal';
import { smoothScrollTo, scrollToFormOrModal } from '../utils/scrollHelper';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ModalPortal from '../components/ModalPortal';

export default function AgentDashboard({ defaultTab = 'tasks' }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routesData, setRoutesData] = useState({ groups: [], members: [], summary: {} });
  const [recentCollections, setRecentCollections] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(() => {
    if (location.pathname.includes('/agent/routes')) return 'routes';
    if (location.pathname.includes('/agent/pending-dues')) return 'pending-dues';
    if (location.pathname.includes('/agent/history')) return 'history';
    if (location.pathname.includes('/agent/profile')) return 'profile';
    if (location.pathname.includes('/agent/tasks')) return 'tasks';
    return defaultTab || 'tasks';
  }, [location.pathname, defaultTab]);

  const handleTabSwitch = (tab) => {
    navigate(`/agent/${tab}`);
  };

  // Day Submit & Shift Closing Handover State
  const [showDaySubmitModal, setShowDaySubmitModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [unsubmittedDays, setUnsubmittedDays] = useState([]);
  const [submittingAllDays, setSubmittingAllDays] = useState(false);
  const [daySubmitDate, setDaySubmitDate] = useState(getServerYMD());
  const [daySubmitNotes, setDaySubmitNotes] = useState('');
  const [submittingDayWork, setSubmittingDayWork] = useState(false);
  const [daySubmitSuccess, setDaySubmitSuccess] = useState('');
  const [daySubmitError, setDaySubmitError] = useState('');
  const [currentDaySubmission, setCurrentDaySubmission] = useState(null);
  const isTodayShiftSubmitted = currentDaySubmission?.status === 'PENDING_APPROVAL' || currentDaySubmission?.status === 'APPROVED';
  const [loadingDaySubmission, setLoadingDaySubmission] = useState(false);
  const [expandedChitSubmitId, setExpandedChitSubmitId] = useState(null);

  // Task Planner State (Ensures agent never forgets a collection stop)
  const [taskFilter, setTaskFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED' | 'REMARKS'
  const [taskFrequencyFilter, setTaskFrequencyFilter] = useState('ALL'); // 'ALL' | 'DAILY' | 'MONTHLY'
  const [taskSearch, setTaskSearch] = useState('');
  const [taskChitFilter, setTaskChitFilter] = useState('ALL'); // 'ALL' | groupId
  const [scheduleViewMode, setScheduleViewMode] = useState('ALL');

  // Pagination for Recent Collections history tab
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // Separation of Daily vs Monthly Chits
  const [routeCategoryFilter, setRouteCategoryFilter] = useState('ALL'); // 'ALL' | 'DAILY_CHIT' | 'MONTHLY_CHIT'

  // Optimization for 100+ Chit Schemes: Pagination, Accordion Collapsing & View Mode
  const [tasksGroupPage, setTasksGroupPage] = useState(1);
  const [tasksGroupPageSize, setTasksGroupPageSize] = useState(5);
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState(new Set());
  const [tasksViewMode, setTasksViewMode] = useState('cards'); // 'cards' | 'table'

  // Optimization for Assigned Routes Tab
  const [routesPage, setRoutesPage] = useState(1);
  const [routesPageSize, setRoutesPageSize] = useState(4);
  const [collapsedRoutes, setCollapsedRoutes] = useState(new Set());

  // Per-Chit Separation States (Ensures every chit differs and is never mixed)
  const [profileChitFilter, setProfileChitFilter] = useState('ALL'); // 'ALL' | 'DAILY' | 'AUCTION' | 'DOUBLE'
  const [expandedProfileChitId, setExpandedProfileChitId] = useState(null);

  // Monthly Chit Schedule:
  // Monthly chits can be collected anytime during their monthly cycle (anchored to start_date).
  // All assigned routes and members are visible and available for collection at all times.
  const isActualFirstDayOfMonth = getServerDate().getDate() === 1;
  const [simulateFirstOfMonth, setSimulateFirstOfMonth] = useState(false);
  const isCollectionDayForMonthly = true; // All assigned monthly chits are visible and collectible anytime

  // Confirmation Modals
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCollectConfirm, setShowCollectConfirm] = useState(false);

  // Collection Modal
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [collectError, setCollectError] = useState('');
  const [receiptModal, setReceiptModal] = useState(null);

  const [collectForm, setCollectForm] = useState({
    group_id: '',
    member_id: '',
    amount: '',
    collection_date: getServerYMD(),
    payment_method: 'CASH',
    payment_reference: '',
    notes: '',
  });

  // Unpaid Note / Remark Modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedMemberForNote, setSelectedMemberForNote] = useState(null);
  const [agentNoteText, setAgentNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  // Member Information Form Modal (Triggered by pressing a member node)
  const [showMemberInfoModal, setShowMemberInfoModal] = useState(false);
  const [selectedMemberForInfo, setSelectedMemberForInfo] = useState(null);

  // Member Pending Amount Tab States (Overdue Dues Tracker)
  const [pendingChitSearch, setPendingChitSearch] = useState('');
  const [pendingFrequencyFilter, setPendingFrequencyFilter] = useState('ALL'); // 'ALL' | 'DAILY' | 'MONTHLY'
  const [pendingSort, setPendingSort] = useState('HIGHEST_DUE'); // 'HIGHEST_DUE' | 'MOST_MEMBERS' | 'NAME_ASC'
  const [pendingChitsPage, setPendingChitsPage] = useState(1);
  const [pendingChitsPageSize, setPendingChitsPageSize] = useState(6);

  // Modal 1: Selected Chit Scheme -> Relative Members Roster
  const [selectedPendingGroup, setSelectedPendingGroup] = useState(null);
  const [memberSearchInChit, setMemberSearchInChit] = useState('');
  const [memberStatusFilterInChit, setMemberStatusFilterInChit] = useState('ALL'); // 'ALL' | 'NOT_PAID' | 'PARTIAL'

  // Modal 2: Selected Member -> Itemized Pending Dates Breakdown & Direct Collection Form
  const [selectedPendingMember, setSelectedPendingMember] = useState(null);
  const [memberPendingBreakdown, setMemberPendingBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [pendingCollectAmount, setPendingCollectAmount] = useState('');
  const [pendingCollectMethod, setPendingCollectMethod] = useState('CASH');
  const [pendingCollectRef, setPendingCollectRef] = useState('');
  const [pendingCollectDate, setPendingCollectDate] = useState(getServerYMD());
  const [pendingCollectNotes, setPendingCollectNotes] = useState('');
  const [submittingPendingCollect, setSubmittingPendingCollect] = useState(false);
  const [pendingCollectError, setPendingCollectError] = useState('');

  // Effects: declared safely after all state declarations
  useEffect(() => {
    setTasksGroupPage(1);
  }, [taskFilter, taskSearch, taskFrequencyFilter, taskChitFilter, scheduleViewMode]);

  useEffect(() => {
    setRoutesPage(1);
  }, [routeCategoryFilter]);

  useEffect(() => {
    setPendingChitsPage(1);
  }, [pendingChitSearch, pendingFrequencyFilter, pendingSort]);

  const toggleTaskGroup = (groupId) => {
    setCollapsedTaskGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleAllTaskGroups = () => {
    if (collapsedTaskGroups.size > 0) {
      setCollapsedTaskGroups(new Set());
    } else {
      setCollapsedTaskGroups(new Set((routesData.groups || []).map((g) => g.id)));
    }
  };

  const toggleRouteCollapse = (groupId) => {
    setCollapsedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleAllRoutes = () => {
    if (collapsedRoutes.size > 0) {
      setCollapsedRoutes(new Set());
    } else {
      setCollapsedRoutes(new Set((routesData.groups || []).map((g) => g.id)));
    }
  };

  const openMemberInfo = (group, member) => {
    setSelectedMemberForInfo({ group, member });
    setShowMemberInfoModal(true);
    scrollToFormOrModal('agent-member-info-modal');
  };

  // Pending Dues across all assigned chits
  const pendingChitsData = useMemo(() => {
    const list = [];
    (routesData.groups || []).forEach((group) => {
      const gMembers = (routesData.members || []).filter((m) => m.group_id === group.id);
      const overdueMembers = gMembers.filter((m) => {
        const rem = m.remaining_balance !== undefined && m.remaining_balance !== null ? Number(m.remaining_balance) : 0;
        return rem > 0 || !m.is_paid;
      });
      const totalPending = overdueMembers.reduce((sum, m) => {
        const rem = m.remaining_balance !== undefined && m.remaining_balance !== null ? Number(m.remaining_balance) : 0;
        return sum + (rem > 0 ? rem : Number(group.installment_amount || 0));
      }, 0);

      list.push({
        group,
        overdueMembers,
        totalPending,
        totalMembersCount: gMembers.length,
        hasPending: overdueMembers.length > 0 && totalPending > 0,
      });
    });
    return list;
  }, [routesData.groups, routesData.members]);

  const chitsWithPending = useMemo(() => {
    return pendingChitsData.filter((item) => item.hasPending);
  }, [pendingChitsData]);

  const totalAllPendingAmount = useMemo(() => {
    return chitsWithPending.reduce((sum, item) => sum + item.totalPending, 0);
  }, [chitsWithPending]);

  const totalPendingMembersCount = useMemo(() => {
    return chitsWithPending.reduce((sum, item) => sum + item.overdueMembers.length, 0);
  }, [chitsWithPending]);

  const filteredPendingChits = useMemo(() => {
    let result = chitsWithPending;

    if (pendingChitSearch.trim()) {
      const q = pendingChitSearch.toLowerCase();
      result = result.filter(
        (item) =>
          (item.group.group_name || '').toLowerCase().includes(q) ||
          (item.group.group_code || '').toLowerCase().includes(q) ||
          (item.group.location_name || '').toLowerCase().includes(q)
      );
    }

    if (pendingFrequencyFilter !== 'ALL') {
      result = result.filter((item) => item.group.frequency === pendingFrequencyFilter);
    }

    if (pendingSort === 'HIGHEST_DUE') {
      result = [...result].sort((a, b) => b.totalPending - a.totalPending);
    } else if (pendingSort === 'MOST_MEMBERS') {
      result = [...result].sort((a, b) => b.overdueMembers.length - a.overdueMembers.length);
    } else if (pendingSort === 'NAME_ASC') {
      result = [...result].sort((a, b) => (a.group.group_name || '').localeCompare(b.group.group_name || ''));
    }

    return result;
  }, [chitsWithPending, pendingChitSearch, pendingFrequencyFilter, pendingSort]);

  const membersInSelectedPendingGroup = useMemo(() => {
    if (!selectedPendingGroup) return [];
    const gMembers = (routesData.members || []).filter((m) => m.group_id === selectedPendingGroup.id);
    let result = gMembers.filter((m) => {
      const rem = m.remaining_balance !== undefined && m.remaining_balance !== null ? Number(m.remaining_balance) : 0;
      return rem > 0 || !m.is_paid;
    });

    if (memberSearchInChit.trim()) {
      const q = memberSearchInChit.toLowerCase();
      result = result.filter(
        (m) =>
          (m.full_name || '').toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q) ||
          String(m.ticket_number || '').includes(q)
      );
    }

    if (memberStatusFilterInChit === 'NOT_PAID') {
      result = result.filter((m) => Number(m.collected_amount || 0) === 0);
    } else if (memberStatusFilterInChit === 'PARTIAL') {
      result = result.filter((m) => Number(m.collected_amount || 0) > 0);
    }

    return result;
  }, [selectedPendingGroup, routesData.members, memberSearchInChit, memberStatusFilterInChit]);

  // Open itemized pending dates breakdown & collection form
  const handleOpenPendingMember = async (group, member) => {
    setSelectedPendingMember(member);
    setPendingCollectError('');
    setLoadingBreakdown(true);
    setMemberPendingBreakdown(null);

    const defaultAmt = (member.remaining_balance !== undefined && Number(member.remaining_balance) > 0)
      ? String(member.remaining_balance)
      : String(group.installment_amount || '');
    setPendingCollectAmount(defaultAmt);
    setPendingCollectDate(getServerYMD());
    setPendingCollectMethod('CASH');
    setPendingCollectRef('');
    setPendingCollectNotes('');

    try {
      const res = await api.get(`/agent/members/${member.member_id}/pending-dues?group_id=${group.id}`);
      if (res.data?.success) {
        setMemberPendingBreakdown(res.data.data);
        if (res.data.data.total_pending > 0) {
          setPendingCollectAmount(String(res.data.data.total_pending));
        }
      }
    } catch (err) {
      setMemberPendingBreakdown({
        member,
        group,
        pending_dates: [
          {
            date: getServerYMD(),
            due_amount: Number(group.installment_amount || 0),
            paid_amount: Number(member.collected_amount || 0),
            pending_amount: Number(member.remaining_balance || group.installment_amount || 0),
            status: Number(member.collected_amount || 0) > 0 ? 'PARTIAL' : 'NOT_PAID',
            label: group.frequency === 'DAILY' ? "Current Day Due" : "Current Cycle Due",
          }
        ],
        total_pending: Number(member.remaining_balance || group.installment_amount || 0),
        installment_amount: Number(group.installment_amount || 0),
      });
    } finally {
      setLoadingBreakdown(false);
    }
  };

  // Direct collection submit for pending member
  const handleExecutePendingCollection = async (e) => {
    e.preventDefault();
    // Real-life field operations: agent can always record collections, re-submittal will update day handover
    const amt = parseFloat(pendingCollectAmount);
    if (isNaN(amt) || amt <= 0) {
      setPendingCollectError('Please enter a valid positive collection amount.');
      return;
    }

    setSubmittingPendingCollect(true);
    setPendingCollectError('');

    try {
      const res = await api.post('/agent/collections', {
        group_id: parseInt(selectedPendingGroup.id, 10),
        member_id: parseInt(selectedPendingMember.member_id, 10),
        amount: amt,
        payment_method: pendingCollectMethod,
        payment_reference: pendingCollectRef || null,
        collection_date: pendingCollectDate || getServerYMD(),
        notes: pendingCollectNotes ? `[PENDING_RECOVERY] ${pendingCollectNotes}` : '[PENDING_RECOVERY] Overdue settlement',
        allow_off_cycle: true,
        allow_advance: true,
      });

      if (res.data?.success) {
        const recordedReceipt = res.data.receipt;
        setReceiptModal({
          ...recordedReceipt,
          groupName: selectedPendingGroup?.group_name || 'Chit Group',
          groupCode: selectedPendingGroup?.group_code || '',
          memberName: selectedPendingMember?.full_name || 'Member',
          memberPhone: selectedPendingMember?.phone || '',
          agentName: user?.full_name || 'Field Agent',
        });

        setSelectedPendingMember(null);
        setMemberPendingBreakdown(null);

        await loadAgentData();
      }
    } catch (err) {
      setPendingCollectError(getFriendlyErrorMessage(err, 'Failed to record collection. Please check details and try again.'));
    } finally {
      setSubmittingPendingCollect(false);
    }
  };

  // Today's Tasks calculations across all assigned routes and members:
  // - Daily chits are collected day-by-day (every day).
  // - Monthly chits: 'ALL' mode allows collecting anytime/any day; 'TODAY_SCHEDULED' filters to 1st of month.
  const tasksList = useMemo(() => {
    const list = [];
    (routesData.groups || []).forEach((group) => {
      const isDaily = group.frequency === 'DAILY';

      // If strict today filter is selected, monthly chits only appear if today is their cycle deadline
      if (scheduleViewMode === 'TODAY_SCHEDULED' && !isDaily && !group.is_due_today && !group.is_deadline_today) {
        return;
      }

      const groupMembers = (routesData.members || []).filter((m) => m.group_id === group.id);
      groupMembers.forEach((m) => {
        const expectedAmount = Number(group.installment_amount || 0);
        // STRICT: only mark as paid if backend confirmed actual collections meet installment
        // Never derive isPaid from status strings or 0-amount comparisons
        const isPaid = Boolean(m.is_paid) && expectedAmount > 0;
        const collectedAmount = Number(m.total_cycle_collected || m.collected_amount || 0);
        const isPartial = !isPaid && collectedAmount > 0;
        const remainingBalance = isPaid
          ? 0
          : expectedAmount > 0
            ? Math.max(0, expectedAmount - collectedAmount)
            : 0;

        const hasCustomRemark =
          Boolean(m.today_notes) &&
          m.today_notes !== 'Awaiting payment' &&
          m.today_notes !== 'Pending today' &&
          m.today_notes !== 'Pending this month';

        list.push({
          memberId: m.member_id,
          memberCode: m.member_code,
          fullName: m.full_name,
          phone: m.phone,
          alternatePhone: m.alternate_phone,
          address: m.address,
          ticketNumber: m.ticket_number,
          groupId: group.id,
          groupName: group.group_name,
          groupCode: group.group_code,
          frequency: group.frequency,
          chitType: group.chit_type,
          locationName: group.location_name,
          expectedAmount,
          collectedAmount,
          remainingBalance,
          isPaid,
          isPartial,
          nodeColor: m.node_color || (isPaid ? 'GREEN' : (isPartial ? 'YELLOW' : 'RED')),
          statusLabel: isPaid ? 'Paid' : (isPartial ? 'Partial' : (m.status_label || 'Unpaid')),
          notes: m.today_notes,
          hasCustomRemark,
          receiptNumber: m.receipt_number,
          paymentMethod: m.payment_method,
          collectionTime: m.collection_time,
          cycleDue: m.cycle_due || group.cycle_due || null,
          cycleDaysRemaining: m.cycle_days_remaining !== undefined ? m.cycle_days_remaining : (group.cycle_days_remaining ?? 0),
          isDeadlineToday: Boolean(m.is_deadline_today || group.is_due_today || group.is_deadline_today),
          hasTimeRemaining: Boolean(m.has_time_remaining !== undefined ? m.has_time_remaining : (group.has_time_remaining ?? false)),
          cycleStatusNotice: m.cycle_status_notice || group.collection_schedule_note || '',
          rawMember: m,
          rawGroup: group,
          isTemporaryCoverage: Boolean(group.temporary_coverage || m.is_temporary_coverage),
          absentAgentName: group.absent_agent_name || m.absent_agent_name || null,
          completedByName: m.completed_by_name || null,
        });
      });
    });
    return list;
  }, [routesData.groups, routesData.members, scheduleViewMode]);

  // Routes visible on the Agent Profile:
  // All assigned schemes (both Daily and Monthly) are visible and collectible at all times!
  const activeProfileRoutes = useMemo(() => {
    return routesData.groups || [];
  }, [routesData.groups]);

  const totalAssignedMonthlyRoutesCount = useMemo(() => {
    return (routesData.groups || []).filter((group) => group.frequency === 'MONTHLY').length;
  }, [routesData.groups]);

  // Dynamically recalculate base tasks matching active Scheme & Frequency filters
  const baseSchemeTasks = useMemo(() => {
    return tasksList.filter((t) => {
      if (taskFrequencyFilter !== 'ALL' && t.frequency !== taskFrequencyFilter) return false;
      if (taskChitFilter !== 'ALL' && String(t.groupId) !== String(taskChitFilter)) return false;
      return true;
    });
  }, [tasksList, taskFrequencyFilter, taskChitFilter]);

  const totalTasksCount = baseSchemeTasks.length;
  const completedTasksCount = baseSchemeTasks.filter((t) => t.isPaid).length;
  const pendingTasksCount = baseSchemeTasks.filter((t) => !t.isPaid).length;
  const remarksTasksCount = baseSchemeTasks.filter((t) => t.hasCustomRemark).length;
  const taskProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const totalTargetExpected = useMemo(() => {
    return baseSchemeTasks.reduce((sum, t) => sum + t.expectedAmount, 0);
  }, [baseSchemeTasks]);

  const filteredTasks = useMemo(() => {
    return baseSchemeTasks.filter((t) => {
      if (taskFilter === 'PENDING' && t.isPaid) return false;
      if (taskFilter === 'COMPLETED' && !t.isPaid) return false;
      if (taskFilter === 'REMARKS' && !t.hasCustomRemark) return false;

      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase().trim();
        const matchesName = (t.fullName || '').toLowerCase().includes(q);
        const matchesPhone = (t.phone || '').toLowerCase().includes(q);
        const matchesCode = (t.memberCode || '').toLowerCase().includes(q);
        const matchesTicket = String(t.ticketNumber).includes(q);
        const matchesGroup =
          (t.groupName || '').toLowerCase().includes(q) ||
          (t.groupCode || '').toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesCode || matchesTicket || matchesGroup;
      }

      return true;
    });
  }, [baseSchemeTasks, taskFilter, taskSearch]);

  // Group tasks strictly by Chit Scheme so the agent never gets confused
  const tasksByGroup = useMemo(() => {
    const groupsMap = {};
    (routesData.groups || []).forEach((g) => {
      const isDaily = g.frequency === 'DAILY';
      if (!isDaily && !isCollectionDayForMonthly) return;

      groupsMap[g.id] = {
        group: g,
        tasks: [],
      };
    });

    filteredTasks.forEach((t) => {
      if (groupsMap[t.groupId]) {
        groupsMap[t.groupId].tasks.push(t);
      }
    });

    return Object.values(groupsMap).filter((item) => {
      if (taskChitFilter !== 'ALL' && String(item?.group?.id || '') !== String(taskChitFilter)) {
        return false;
      }
      return (item?.tasks?.length || 0) > 0;
    });
  }, [routesData.groups, filteredTasks, taskChitFilter, isCollectionDayForMonthly]);

  const paginatedTasksByGroup = useMemo(() => {
    return tasksByGroup.slice(
      (tasksGroupPage - 1) * tasksGroupPageSize,
      tasksGroupPage * tasksGroupPageSize
    );
  }, [tasksByGroup, tasksGroupPage, tasksGroupPageSize]);

  // Calculate distinct financial stats for any single chit scheme
  const getGroupStats = (group) => {
    const groupMembers = (routesData.members || []).filter((m) => m.group_id === group.id);
    const installmentAmt = Number(group.installment_amount || 0);
    // STRICT: only count as fully paid if backend confirmed it AND installment > 0
    const fullyPaidMembers = groupMembers.filter(
      (m) => Boolean(m.is_paid) && installmentAmt > 0
    );
    const partialMembers = groupMembers.filter(
      (m) => !Boolean(m.is_paid) && Number(m.total_cycle_collected || 0) > 0
    );
    const paidMembers = fullyPaidMembers;
    const unpaidMembers = groupMembers.filter(
      (m) => !Boolean(m.is_paid) && Number(m.total_cycle_collected || 0) === 0
    );
    const isDaily = group.frequency === 'DAILY';
    const isDue = isDaily || isCollectionDayForMonthly;

    const targetExpected = isDue ? groupMembers.length * installmentAmt : 0;

    const cashCollected = groupMembers
      .filter((m) => m.payment_method === 'CASH')
      .reduce((sum, m) => sum + Number(m.total_cycle_collected || m.collected_amount || 0), 0);

    const upiCollected = groupMembers
      .filter((m) => m.payment_method === 'UPI' || (m.payment_method && m.payment_method.toUpperCase().includes('UPI')))
      .reduce((sum, m) => sum + Number(m.total_cycle_collected || m.collected_amount || 0), 0);

    const onlineCollected = groupMembers
      .filter((m) => m.payment_method && m.payment_method !== 'CASH')
      .reduce((sum, m) => sum + Number(m.total_cycle_collected || m.collected_amount || 0), 0);

    const totalCollected = groupMembers.reduce((sum, m) => sum + Number(m.total_cycle_collected || m.collected_amount || 0), 0);
    const pendingAmount = isDue ? Math.max(0, targetExpected - totalCollected) : 0;
    const progressPercent = targetExpected > 0 ? Math.round((totalCollected / targetExpected) * 100) : (totalCollected > 0 ? 100 : 0);

    const isAuction = !isDaily || group.chit_type === 'AUCTION_CHIT';
    const isDouble = isDaily && group.chit_type === 'DOUBLE_CHIT';

    return {
      groupMembers,
      paidMembers,
      fullyPaidMembers,
      partialMembers,
      unpaidMembers,
      isDaily,
      isAuction,
      isDouble,
      isDue,
      targetExpected,
      cashCollected,
      upiCollected,
      onlineCollected,
      totalCollected,
      pendingAmount,
      progressPercent,
    };
  };

  const dailyChitsList = useMemo(() => {
    return (routesData.groups || []).filter((g) => g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE');
  }, [routesData.groups]);

  const dailyDoubleChitsList = useMemo(() => {
    return (routesData.groups || []).filter((g) => (g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE') && g.chit_type === 'DOUBLE_CHIT');
  }, [routesData.groups]);

  const monthlyAuctionChitsList = useMemo(() => {
    return (routesData.groups || []).filter((g) => g.frequency === 'MONTHLY' || g.route_category === 'MONTHLY_ROUTE');
  }, [routesData.groups]);

  const monthlyDoubleChitsList = useMemo(() => [], []);

  // Calculate total route target expected across all assigned schemes
  const totalRouteTargetExpected = useMemo(() => {
    return (routesData.groups || []).reduce((sum, g) => {
      const stats = getGroupStats(g);
      return sum + (stats.targetExpected || 0);
    }, 0);
  }, [routesData.groups, routesData.members, isCollectionDayForMonthly]);

  // Overall agent daily target (prefers group target, or task target, or agent profile target)
  const agentDailyTarget = useMemo(() => {
    if (totalRouteTargetExpected > 0) return totalRouteTargetExpected;
    if (totalTargetExpected > 0) return totalTargetExpected;
    const profileTarget = Number(user?.daily_target || user?.target_amount || 0);
    if (profileTarget > 0) return profileTarget;
    // Fallback: sum of all installment amounts * member count
    return (routesData.groups || []).reduce((sum, g) => {
      const mCount = (routesData.members || []).filter((m) => m.group_id === g.id).length;
      return sum + (mCount * Number(g.installment_amount || 0));
    }, 0);
  }, [totalRouteTargetExpected, totalTargetExpected, user, routesData.groups, routesData.members]);

  const todayCollectedTotal = Number(routesData.summary?.todayTotal || 0);
  const targetProgressPercent = agentDailyTarget > 0 
    ? Math.min(100, Math.round((todayCollectedTotal / agentDailyTarget) * 100))
    : (todayCollectedTotal > 0 ? 100 : 0);
  const targetRemainingAmount = Math.max(0, agentDailyTarget - todayCollectedTotal);

  // Differentiated Chit filter for Agent Profile (Never mix different chits together)
  const displayedProfileRoutes = useMemo(() => {
    return activeProfileRoutes.filter((group) => {
      const isDaily = group.frequency === 'DAILY' || group.route_category === 'DAILY_ROUTE';
      if (profileChitFilter === 'ALL') return true;
      if (profileChitFilter === 'DAILY') return isDaily;
      if (profileChitFilter === 'DOUBLE') {
        return isDaily && group.chit_type === 'DOUBLE_CHIT';
      }
      if (profileChitFilter === 'AUCTION') {
        return !isDaily;
      }
      return true;
    });
  }, [activeProfileRoutes, profileChitFilter]);

  const loadAgentData = async () => {
    try {
      const [routesRes, collRes] = await Promise.all([
        api.get('/agent/my-routes'),
        api.get('/agent/collections'),
      ]);

      if (routesRes.data?.success && routesRes.data.data) {
        setRoutesData({
          groups: Array.isArray(routesRes.data.data.groups) ? routesRes.data.data.groups : [],
          members: Array.isArray(routesRes.data.data.members) ? routesRes.data.data.members : [],
          summary: routesRes.data.data.summary || {},
        });
      }
      if (collRes.data?.success) {
        setRecentCollections(Array.isArray(collRes.data.data) ? collRes.data.data : []);
      }
      fetchDaySubmissionStatus(daySubmitDate);
    } catch (err) {
      console.error('Failed to load agent route data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnsubmittedDays = async () => {
    try {
      const res = await api.get('/agent/day-unsubmitted');
      if (res.data?.success) {
        setUnsubmittedDays(res.data.unsubmitted || []);
      }
    } catch (_) {
      setUnsubmittedDays([]);
    }
  };

  const fetchDaySubmissionStatus = async (date) => {
    try {
      setLoadingDaySubmission(true);
      const targetDate = date || daySubmitDate;
      const res = await api.get(`/agent/day-submissions?date=${targetDate}`);
      if (res.data?.success && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        setCurrentDaySubmission(res.data.data[0]);
        if (res.data.data[0]?.agent_notes) {
          setDaySubmitNotes(res.data.data[0].agent_notes);
        }
      } else {
        setCurrentDaySubmission(null);
      }
    } catch (_) {
      setCurrentDaySubmission(null);
    } finally {
      setLoadingDaySubmission(false);
    }
  };

  const handleSubmitDayWork = (e) => {
    if (e) e.preventDefault();
    setShowSubmitConfirmModal(true);
  };

  const executeSubmitDayWork = async () => {
    setShowSubmitConfirmModal(false);
    setSubmittingDayWork(true);
    setDaySubmitError('');
    setDaySubmitSuccess('');
    try {
      const res = await api.post('/agent/day-submit', {
        work_date: daySubmitDate,
        agent_notes: daySubmitNotes,
      });
      if (res.data?.success) {
        setDaySubmitSuccess(res.data.message || 'Day work submitted successfully for Admin counting and closing.');
        await fetchDaySubmissionStatus(daySubmitDate);
        fetchUnsubmittedDays();
        loadAgentData();
      }
    } catch (err) {
      setDaySubmitError(getFriendlyErrorMessage(err, 'Failed to submit day work. Please try again.'));
    } finally {
      setSubmittingDayWork(false);
    }
  };

  const handleSubmitAllUnsubmittedDays = async () => {
    if (!unsubmittedDays.length || submittingAllDays) return;
    setSubmittingAllDays(true);
    setDaySubmitError('');
    setDaySubmitSuccess('');
    try {
      let count = 0;
      for (const item of unsubmittedDays) {
        await api.post('/agent/day-submit', {
          work_date: item.work_date,
          agent_notes: `Submitted in batch for ${formatDate(item.work_date)}. Separate verified accounting ledger.`,
        });
        count++;
      }
      setDaySubmitSuccess(`Successfully submitted ${count} previous day shifts for Admin verification.`);
      await fetchDaySubmissionStatus(daySubmitDate);
      fetchUnsubmittedDays();
      loadAgentData();
    } catch (err) {
      setDaySubmitError(getFriendlyErrorMessage(err, 'Failed submitting past shifts. Please retry individually.'));
    } finally {
      setSubmittingAllDays(false);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAgentData();
  };

  // Pre-fill modal for a specific member to collect (flexible for partial, full, off-cycle & advance)
  const openCollectForMember = (groupId, memberId, defaultAmount) => {
    const group = routesData.groups.find((g) => String(g.id) === String(groupId));
    const member = routesData.members.find((m) => String(m.member_id) === String(memberId) && String(m.group_id) === String(groupId));

    const isAlreadyPaid = Boolean(member?.is_paid);
    const prefillAmt = (member?.remaining_balance !== undefined && member?.remaining_balance !== null && Number(member.remaining_balance) > 0)
      ? member.remaining_balance
      : (defaultAmount || group?.installment_amount || '');

    setCollectForm({
      group_id: String(groupId),
      member_id: String(memberId),
      amount: String(prefillAmt || ''),
      collection_date: getServerYMD(),
      payment_method: 'CASH',
      payment_reference: '',
      notes: isAlreadyPaid ? 'Advance collection for upcoming cycle' : '',
    });
    setCollectError('');
    setShowCollectModal(true);
    scrollToFormOrModal('agent-collect-modal');
  };

  // Pre-fill collection modal specifically for a single chit scheme
  const openCollectForChitScheme = (group) => {
    setCollectForm({
      group_id: String(group.id),
      member_id: '',
      amount: String(group.installment_amount || ''),
      collection_date: getServerYMD(),
      payment_method: 'CASH',
      payment_reference: '',
      notes: '',
    });
    setCollectError('');
    setShowCollectModal(true);
    scrollToFormOrModal('agent-collect-modal');
  };

  // Group selection changes default installment amount
  const handleGroupSelectChange = (groupId) => {
    const selectedGroup = routesData.groups.find((g) => String(g.id) === String(groupId));
    setCollectForm((prev) => ({
      ...prev,
      group_id: groupId,
      member_id: '',
      amount: selectedGroup ? String(selectedGroup.installment_amount) : prev.amount,
    }));
  };

  // Member selection auto-adjusts to remaining balance due
  const handleMemberSelectChange = (memberId) => {
    const selectedGroup = routesData.groups.find((g) => String(g.id) === String(collectForm.group_id));
    const selectedMember = routesData.members.find((m) => String(m.member_id) === String(memberId) && String(m.group_id) === String(collectForm.group_id));

    let defaultAmt = selectedGroup?.installment_amount || '';
    if (selectedMember) {
      if (selectedMember.remaining_balance !== undefined && selectedMember.remaining_balance !== null && Number(selectedMember.remaining_balance) > 0) {
        defaultAmt = selectedMember.remaining_balance;
      }
    }

    setCollectForm((prev) => ({
      ...prev,
      member_id: memberId,
      amount: defaultAmt ? String(defaultAmt) : prev.amount,
    }));
  };

  // Request Confirmation before recording collection (maximum real-life flexibility)
  const handleRecordCollection = (e) => {
    e.preventDefault();
    setCollectError('');
    // Allow agent collection regardless of shift status, re-handover updates submission
    if (!collectForm.group_id || !collectForm.member_id || !collectForm.amount) {
      setCollectError('Please select both the Chit Group, Member, and enter an amount.');
      return;
    }

    const enteredAmt = parseFloat(collectForm.amount);
    if (isNaN(enteredAmt) || enteredAmt <= 0) {
      setCollectError('Please enter a valid positive collection amount.');
      return;
    }

    setShowCollectConfirm(true);
  };

  // Execute Confirmed Collection
  const executeConfirmedCollection = async () => {
    setCollectError('');
    // Allow agent collection regardless of shift status
    setSubmitting(true);

    try {
      const res = await api.post('/agent/collections', {
        group_id: parseInt(collectForm.group_id, 10),
        member_id: parseInt(collectForm.member_id, 10),
        amount: parseFloat(collectForm.amount),
        payment_method: collectForm.payment_method,
        payment_reference: collectForm.payment_reference || null,
        collection_date: collectForm.collection_date || getServerYMD(),
        notes: collectForm.notes || null,
        allow_off_cycle: true,
        allow_advance: true,
      });

      if (res.data?.success) {
        const recordedReceipt = res.data.receipt;
        const selectedGroup = routesData.groups.find((g) => String(g.id) === String(collectForm.group_id));
        const selectedMember = routesData.members.find((m) => String(m.member_id) === String(collectForm.member_id));

        setReceiptModal({
          ...recordedReceipt,
          groupName: selectedGroup?.group_name || 'Chit Group',
          groupCode: selectedGroup?.group_code || '',
          memberName: selectedMember?.full_name || 'Member',
          memberPhone: selectedMember?.phone || '',
          agentName: user?.full_name || 'Field Agent',
        });

        setShowCollectConfirm(false);
        setShowCollectModal(false);
        await loadAgentData();
      }
    } catch (err) {
      setShowCollectConfirm(false);
      setCollectError(getFriendlyErrorMessage(err, 'Failed to record collection. Please check details and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open note modal for a member who hasn't paid
  const openNoteForMember = (group, member) => {
    setSelectedMemberForNote({ group, member });
    const existingNote = member.today_notes && member.today_notes !== 'Awaiting payment'
      ? member.today_notes
      : '';
    setAgentNoteText(existingNote);
    setNoteError('');
    setShowNoteModal(true);
    scrollToFormOrModal('agent-note-modal');
  };

  // Save unpaid remark (reflects as NOT PAID with note in admin and agent screens synchronously)
  const handleSaveUnpaidNote = async (e) => {
    e.preventDefault();
    if (!selectedMemberForNote) return;
    setSubmittingNote(true);
    setNoteError('');

    try {
      const noteToSave = agentNoteText.trim() || 'Awaiting payment';
      await api.post('/agent/tracking/log-activity', {
        groupId: selectedMemberForNote?.group?.id,
        memberId: selectedMemberForNote?.member?.member_id,
        stopId: selectedMemberForNote?.member?.ticket_number,
        status: 'NOT_PAID',
        notes: noteToSave,
      });

      setShowNoteModal(false);
      setSelectedMemberForNote(null);
      setAgentNoteText('');
      await loadAgentData();
    } catch (err) {
      setNoteError(getFriendlyErrorMessage(err, 'Failed to update member remark. Please check connection and try again.'));
    } finally {
      setSubmittingNote(false);
    }
  };

  // View receipt for an already paid member
  const openReceiptForPaidMember = (group, member) => {
    setReceiptModal({
      receiptNumber: member.receipt_number || 'REC-ISSUED',
      amount: member.collected_amount || group.installment_amount,
      paymentMethod: member.payment_method || 'CASH',
      date: member.collection_time ? member.collection_time.slice(0, 10) : getServerYMD(),
      time: member.collection_time,
      groupName: group.group_name,
      groupCode: group.group_code,
      memberName: member.full_name,
      memberPhone: member.phone,
      agentName: user?.full_name || 'Field Agent',
    });
  };

  // Filter members belonging to selected group in modal
  const eligibleMembers = collectForm.group_id
    ? (routesData.members || []).filter((m) => String(m.group_id) === String(collectForm.group_id))
    : (routesData.members || []);

  // Separate Groups by Daily Chit vs Monthly Chit Schemes
  const dailyGroups = (routesData.groups || []).filter(
    (g) => g.chit_type === 'DAILY_CHIT' || g.route_category === 'DAILY_ROUTE'
  );
  const monthlyGroups = (routesData.groups || []).filter(
    (g) => g.chit_type === 'AUCTION_CHIT' || g.chit_type === 'DOUBLE_CHIT' || g.route_category === 'MONTHLY_ROUTE'
  );

  const displayedGroups = (routesData.groups || []).filter((g) => {
    if (routeCategoryFilter === 'ALL') return true;
    if (routeCategoryFilter === 'DAILY_CHIT') {
      return g.chit_type === 'DAILY_CHIT' || g.route_category === 'DAILY_ROUTE';
    }
    if (routeCategoryFilter === 'MONTHLY_CHIT') {
      return g.chit_type === 'AUCTION_CHIT' || g.chit_type === 'DOUBLE_CHIT' || g.route_category === 'MONTHLY_ROUTE';
    }
    return true;
  });

  const paginatedRoutes = useMemo(() => {
    return displayedGroups.slice(
      (routesPage - 1) * routesPageSize,
      routesPage * routesPageSize
    );
  }, [displayedGroups, routesPage, routesPageSize]);

  const paginatedHistory = recentCollections.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );

  return (
    <div className="w-full space-y-5">
        {/* Clean FinLend Pro Style Agent Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm font-heading">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
                  {user?.full_name || 'Agent'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                  Agent
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Staff ID: AGT-{String(user?.id || '360001').padStart(4, '0')} · @{user?.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setCollectForm({
                  group_id: routesData.groups[0]?.id ? String(routesData.groups[0].id) : '',
                  member_id: '',
                  amount: routesData.groups[0]?.installment_amount ? String(routesData.groups[0].installment_amount) : '',
                  payment_method: 'CASH',
                  payment_reference: '',
                  notes: '',
                });
                setCollectError('');
                setShowCollectModal(true);
                scrollToFormOrModal('agent-collect-modal');
              }}
              disabled={routesData.groups.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer font-heading"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Collection</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/agent/day-closing')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer font-heading"
            >
              <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Day Closing</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Metrics Grid - 6 Cards in Standard Financial Order: Today's Target, Today's Collections, Pending Amount, Today's Tasks, Cash on Hand, UPI / Digital */}
        {(activeTab === 'tasks' || activeTab === 'routes') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="flex items-center gap-1.5 font-heading text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
              <Calendar className="w-3.5 h-3.5" />
              Today's Field Operations · {formatDate(getServerDate())}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">
              Resets daily at 12:00 AM midnight
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Today's Target */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/20 border border-indigo-200/90 dark:border-indigo-800/70 shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider truncate flex items-center gap-1 font-heading">
                <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Today's Target</span>
              </span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 shrink-0">
                {targetProgressPercent}%
              </span>
            </div>
            <div
              className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate font-mono tracking-tight"
              title={`₹${agentDailyTarget.toLocaleString('en-IN')}`}
            >
              ₹{agentDailyTarget.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate gap-1">
                <span className="truncate">
                  {targetRemainingAmount === 0 && agentDailyTarget > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Target Reached!</span>
                  ) : (
                    `₹${targetRemainingAmount.toLocaleString('en-IN')} to goal`
                  )}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {agentDailyTarget > 0 ? `${targetProgressPercent}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${targetProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Today's Collections */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider truncate font-heading">
              Today's Collections
            </span>
            <div
              className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 truncate font-mono tracking-tight"
              title={`₹${Number(routesData.summary?.todayTotal || 0).toLocaleString('en-IN')}`}
            >
              ₹{Number(routesData.summary?.todayTotal || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
              <Receipt className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{routesData.summary?.totalCollectionsCount || 0} receipts issued</span>
            </div>
          </div>

          {/* 3. Pending Amount */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block uppercase tracking-wider truncate font-heading">
              Pending Amount
            </span>
            <div
              className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 truncate font-mono tracking-tight"
              title={`₹${targetRemainingAmount.toLocaleString('en-IN')}`}
            >
              ₹{targetRemainingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{pendingTasksCount} collections pending</span>
            </div>
          </div>

          {/* 4. Today's Tasks (Work Volume) */}
          <div
            onClick={() => {
              handleTabSwitch('tasks');
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-blue-400 transition-colors min-w-0 overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider truncate font-heading">
                Today's Tasks
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                {taskProgressPercent}%
              </span>
            </div>
            <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate font-mono">
              {completedTasksCount} / {totalTasksCount}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${taskProgressPercent}%` }}
              />
            </div>
          </div>

          {/* 5. Cash on Hand */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider truncate font-heading">
              Cash on Hand
            </span>
            <div
              className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 truncate font-mono tracking-tight"
              title={`₹${Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}`}
            >
              ₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block truncate">To reconcile with admin</span>
          </div>

          {/* 6. UPI / Digital Collected */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 block uppercase tracking-wider truncate font-heading">
              UPI / Digital Collected
            </span>
            <div
              className="text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 truncate font-mono tracking-tight"
              title={`₹${Number(routesData.summary?.todayUpi ?? routesData.summary?.todayOnline ?? 0).toLocaleString('en-IN')}`}
            >
              ₹{Number(routesData.summary?.todayUpi ?? routesData.summary?.todayOnline ?? 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
              <CreditCard className="w-3 h-3 text-purple-500 shrink-0" />
              <span className="truncate">GPay, PhonePe & Netbanking</span>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading assigned routes and member dues...</p>
          </div>
        ) : activeTab === 'tasks' ? (
          /* =========================================================================
             TAB 1: TODAY'S TASKS & COLLECTION STOPS (Planner so agent never forgets)
             ========================================================================= */
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
{/* Quick Filter Strip & Search */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => setTaskFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      taskFilter === 'ALL'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All Stops ({totalTasksCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('PENDING')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      taskFilter === 'PENDING'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Pending ({pendingTasksCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('COMPLETED')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      taskFilter === 'COMPLETED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Collected ({completedTasksCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('REMARKS')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      taskFilter === 'REMARKS'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    With Remarks ({remarksTasksCount})
                  </button>

                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

                  {/* Schedule Mode: Flexible Any-Time vs Strict Today Only */}
                  <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setScheduleViewMode('ALL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        scheduleViewMode === 'ALL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Collect from any assigned subscriber anytime (Flexible real-life mode)"
                    >
                      🌐 All Assigned ({routesData.members?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleViewMode('TODAY_SCHEDULED')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        scheduleViewMode === 'TODAY_SCHEDULED'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Show strictly today's calendar scheduled stops"
                    >
                      📅 Strict Due Today
                    </button>
                  </div>

                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

                  {/* Frequency Toggle */}
                  <select
                    value={taskFrequencyFilter}
                    onChange={(e) => setTaskFrequencyFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="ALL">All Frequencies</option>
                    <option value="DAILY">Daily Chits Only</option>
                    <option value="MONTHLY">Monthly Chits Only</option>
                  </select>
                </div>

                {/* Search Box */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search name, phone, ticket..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {taskSearch && (
                    <button
                      type="button"
                      onClick={() => setTaskSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Per-Chit Scheme Filter Pills so agent never confuses stops */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Chit Scheme:
              </span>
              <button
                type="button"
                onClick={() => setTaskChitFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  taskChitFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                All Schemes ({routesData.groups.length})
              </button>
              {routesData.groups.map((grp) => {
                const isDaily = grp.frequency === 'DAILY';
                const isDouble = grp.chit_type === 'DOUBLE_CHIT' || (grp.group_name || '').toLowerCase().includes('double');
                const isSelected = String(taskChitFilter) === String(grp.id);

                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setTaskChitFilter(isSelected ? 'ALL' : String(grp.id))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? isDaily
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : isDouble
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <span>{isDaily ? '🚚' : isDouble ? '💎' : '🏛️'}</span>
                    <span>{grp.group_name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({grp.group_code})</span>
                  </button>
                );
              })}
            </div>

            {/* Task Management Control Toolbar for 100+ Chits */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAllTaskGroups}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {collapsedTaskGroups.size > 0 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  <span>{collapsedTaskGroups.size > 0 ? 'Expand All Chits' : 'Collapse All Chits'}</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  Showing <strong className="text-slate-800 dark:text-slate-200">{paginatedTasksByGroup.length}</strong> of{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{tasksByGroup.length}</strong> Chit Schemes
                </span>
              </div>

              {/* View Switcher: Detailed Cards vs Compact Waypoint Table */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTasksViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    tasksViewMode === 'cards'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Detailed Stop Cards View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTasksViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    tasksViewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Compact Waypoint Table View (Zero Scroll Fatigue)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task Items List Partitioned Strictly by Chit Scheme */}
            {tasksByGroup.length === 0 ? (
              <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {taskSearch
                    ? 'No subscriber stops match your search'
                    : taskFilter === 'PENDING'
                    ? 'No pending collections remaining! Fantastic job!'
                    : 'No tasks found for the selected filter.'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {taskSearch
                    ? 'Try adjusting your search query or reset the filter.'
                    : 'All assigned stops on this route have been addressed.'}
                </p>
              </div>
            ) : tasksViewMode === 'table' ? (
              /* High-Density Compact Waypoints Table */
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Stop #</th>
                        <th className="py-3 px-4">Subscriber Member</th>
                        <th className="py-3 px-4">Chit Scheme</th>
                        <th className="py-3 px-4 text-right">Target / Due</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedTasksByGroup.flatMap(({ group, tasks: groupTasks }) => groupTasks).map((task) => {
                        const remainingDue = task.rawMember?.remaining_balance !== undefined && task.rawMember?.remaining_balance !== null
                          ? Number(task.rawMember.remaining_balance)
                          : task.expectedAmount;
                        return (
                          <tr key={`${task.groupId}-${task.memberId}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">
                              #{task.stopOrder}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white font-heading">{task.memberName}</div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                <span>Ticket #{task.ticketNumber}</span>
                                {task.memberPhone && (
                                  <a href={`tel:${task.memberPhone}`} className="hover:text-blue-600 transition-colors">
                                    · {task.memberPhone}
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 block">{task.groupName}</span>
                              <span className="text-[10px] font-mono text-slate-400">{task.groupCode}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              {task.isPaid ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  ₹{Number(task.rawMember?.total_cycle_collected || task.expectedAmount).toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400">
                                  ₹{remainingDue.toLocaleString('en-IN')}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {task.isPaid ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                  ✓ PAID
                                </span>
                              ) : task.isPartial ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                  🟡 PARTIAL
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                  NOT PAID
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!task.isPaid && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openCollectForMember(task.groupId, task.memberId, remainingDue)}
                                      className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer"
                                    >
                                      Collect
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openNoteForMember(task.rawGroup, task.rawMember)}
                                      className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-all cursor-pointer"
                                      title="Add Unpaid Remark"
                                    >
                                      Remark
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openMemberInfo(task.rawGroup, task.rawMember)}
                                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="View Member Profile"
                                >
                                  <User className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedTasksByGroup.map(({ group, tasks: groupTasks }) => {
                  const isCollapsed = collapsedTaskGroups.has(group.id);
                  const isDaily = group.frequency === 'DAILY';
                  const isDouble =
                    group.chit_type === 'DOUBLE_CHIT' ||
                    (group.group_name || '').toLowerCase().includes('double');
                  const groupPaidCount = groupTasks.filter((t) => t.isPaid).length;
                  const groupTotalCount = groupTasks.length;
                  const groupPercent =
                    groupTotalCount > 0 ? Math.round((groupPaidCount / groupTotalCount) * 100) : 0;
                  const groupCollectedAmt = groupTasks
                    .filter((t) => t.isPaid)
                    .reduce((sum, t) => sum + (t.rawMember?.collected_amount || t.expectedAmount), 0);
                  const groupTargetAmt = groupTasks.reduce((sum, t) => sum + t.expectedAmount, 0);

                  return (
                    <div
                      key={group.id}
                      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
                    >
                      {/* Distinct Chit Scheme Header Bar (Interactive Accordion) */}
                      <div
                        onClick={() => toggleTaskGroup(group.id)}
                        className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-all hover:brightness-95 ${
                          isDaily
                            ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/10 border-emerald-200/80 dark:border-emerald-900/40'
                            : isDouble
                            ? 'bg-gradient-to-r from-purple-50/80 to-pink-50/40 dark:from-purple-950/30 dark:to-pink-950/10 border-purple-200/80 dark:border-purple-900/40'
                            : 'bg-gradient-to-r from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/10 border-blue-200/80 dark:border-blue-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-xs ${
                              isDaily
                                ? 'bg-emerald-600 text-white'
                                : isDouble
                                ? 'bg-purple-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {isDaily ? '🚚' : isDouble ? '💎' : '🏛️'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                                {group.group_name}
                              </h4>
                              <span className="font-mono text-xs text-slate-500 font-semibold">
                                ({group.group_code})
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  isDaily
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                    : isDouble
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                }`}
                              >
                                {isDaily
                                  ? '🚚 Daily Chit Scheme'
                                  : isDouble
                                  ? '💎 Monthly Double Scheme'
                                  : '🏛️ Monthly Auction Scheme'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                              <span>
                                Installment:{' '}
                                <strong className="text-slate-700 dark:text-slate-200">
                                  ₹{Number(group.installment_amount).toLocaleString('en-IN')}
                                </strong>
                              </span>
                              <span>·</span>
                              <span>Area: {group.location_name || 'Assigned Territory'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Chit specific mini progress */}
                        <div className="flex items-center gap-4 self-end sm:self-center">
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                              Collected:{' '}
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                ₹{groupCollectedAmt.toLocaleString('en-IN')}
                              </span>{' '}
                              / ₹{groupTargetAmt.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {groupPaidCount} of {groupTotalCount} stops ({groupPercent}%)
                            </span>
                          </div>
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                isDaily ? 'bg-emerald-500' : isDouble ? 'bg-purple-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${groupPercent}%` }}
                            />
                          </div>

                          <div className="w-7 h-7 rounded-lg bg-white/70 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-2xs">
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Stops under this Chit (Collapsible) */}
                      {!isCollapsed && (
                      <div className="p-3 sm:p-4 space-y-2.5 animate-fadeIn">
                        {groupTasks.map((task) => (
                          <div
                            key={`${task.groupId}-${task.memberId}`}
                            className={`p-4 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              task.isPaid
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                                : task.isPartial
                                ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                : task.hasCustomRemark
                                ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900'
                            }`}
                          >
                            {/* Left: Stop #, Subscriber Info & Contact */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs ${
                                  task.isPaid
                                    ? 'bg-emerald-600 text-white'
                                    : task.isPartial
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {task.isPaid ? '✓' : task.isPartial ? '½' : `#${task.ticketNumber}`}
                              </div>

                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                                    {task.fullName}
                                  </span>
                                  <span className="font-mono text-xs text-slate-400">({task.memberCode})</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      task.frequency === 'DAILY'
                                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                                        : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                    }`}
                                  >
                                    Ticket #{task.ticketNumber} · {task.groupCode}
                                  </span>
                                  {task.isTemporaryCoverage && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Covering {task.absentAgentName || 'absent agent'}</span>}
                                  {task.isPaid && task.completedByName && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Completed by {task.completedByName}</span>}
                                  {task.isPartial && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400/60">
                                      PARTIAL PAID
                                    </span>
                                  )}
                                </div>

                                {/* Address & Phone */}
                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                  {task.address && (
                                    <span className="flex items-center gap-1 truncate max-w-xs">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{task.address}</span>
                                    </span>
                                  )}

                                  {task.phone && (
                                    <a
                                      href={`tel:${task.phone}`}
                                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      <PhoneCall className="w-3 h-3 shrink-0" />
                                      <span>{task.phone}</span>
                                    </a>
                                  )}
                                </div>

                                {/* Status / Remark banner */}
                                {task.isPaid ? (
                                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 mt-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                      Paid Today · Receipt #{task.receiptNumber || 'REC-ISSUED'} ({task.paymentMethod})
                                    </span>
                                  </div>
                                ) : task.isPartial ? (
                                  <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5 mt-1 bg-amber-100/70 dark:bg-amber-950/50 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>
                                      Paid so far: <strong>₹{task.collectedAmount.toLocaleString('en-IN')}</strong> · Balance Deficit: <strong className="text-amber-900 dark:text-amber-200">₹{task.remainingBalance.toLocaleString('en-IN')}</strong>
                                    </span>
                                  </div>
                                ) : task.hasCustomRemark ? (
                                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1 mt-1 bg-amber-100/60 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>
                                      Remark: <strong>{task.notes}</strong>
                                    </span>
                                  </div>
                                ) : task.frequency === 'MONTHLY' && task.hasTimeRemaining ? (
                                  <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5 mt-1 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>
                                      This month there is time to collect (Due: <strong>{task.cycleDue}</strong> · {task.cycleDaysRemaining}d remaining) · No worry
                                    </span>
                                  </div>
                                ) : task.frequency === 'MONTHLY' && task.isDeadlineToday ? (
                                  <div className="text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5 mt-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Cycle Deadline Today ({task.cycleDue}) · Last day of monthly cycle!</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 mt-1">
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    <span>{task.frequency === 'DAILY' ? 'Pending today' : `Cycle Overdue (Deadline was ${task.cycleDue || 'due date'}) · Not completed`}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Due Amount & Action Buttons */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                  {task.isPartial ? 'Remaining Balance' : 'Due Amount'}
                                </span>
                                <span className={`text-base font-extrabold ${task.isPartial ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  ₹{(task.isPartial ? task.remainingBalance : task.expectedAmount).toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {task.isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => openReceiptForPaidMember(task.rawGroup, task.rawMember)}
                                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Receipt</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openNoteForMember(task.rawGroup, task.rawMember)}
                                      className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                                      title="Add or update visit note"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openCollectForMember(task.groupId, task.memberId, task.remainingBalance || task.expectedAmount)
                                      }
                                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{task.isPartial ? 'Collect Due' : 'Collect'}</span>
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openMemberInfo(task.rawGroup, task.rawMember)}
                                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                                  title="View customer profile"
                                >
                                  <User className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination for Tasks Chit Groups */}
            {tasksByGroup.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <Pagination
                  currentPage={tasksGroupPage}
                  totalItems={tasksByGroup.length}
                  pageSize={tasksGroupPageSize}
                  onPageChange={setTasksGroupPage}
                  onPageSizeChange={setTasksGroupPageSize}
                  pageSizeOptions={[3, 5, 10, 20]}
                />
              </div>
            )}

            {/* End of Day Handover Reminder Banner */}
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                <span className="font-bold block">Daily Route Handover Reminder</span>
                <p className="leading-relaxed text-amber-800 dark:text-amber-300">
                  Ensure all physical cash on hand (<strong>₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}</strong>) is reconciled and deposited at the head office desk. Check any pending remarks for tomorrow's follow-up.
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'routes' ? (
          /* Routes Tab */
          /* Routes Tab */
          routesData.groups.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Route Assigned Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your business administrator has not yet assigned active chit group routes to this terminal. Once assigned, members and dues will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily vs Monthly Category Filter Pill Buttons with Automatic Window Move */}
              <div id="agent-routes-list" className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 flex-wrap scroll-mt-6">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Chit Type:</span>
                <button
                  type="button"
                  onClick={() => {
                    setRouteCategoryFilter('ALL');
                    smoothScrollTo('agent-routes-list', { offset: 32, behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    routeCategoryFilter === 'ALL'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  All Assigned ({routesData.groups.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRouteCategoryFilter('DAILY_CHIT');
                    smoothScrollTo('agent-routes-list', { offset: 32, behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    routeCategoryFilter === 'DAILY_CHIT'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  🚚 Daily Chits ({dailyGroups.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRouteCategoryFilter('MONTHLY_CHIT');
                    smoothScrollTo('agent-routes-list', { offset: 32, behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    routeCategoryFilter === 'MONTHLY_CHIT'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  🏛️ Monthly Chits ({monthlyGroups.length})
                </button>
              </div>

              {/* Toolbar for Assigned Routes (100+ Chits) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={toggleAllRoutes}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {collapsedRoutes.size > 0 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  <span>{collapsedRoutes.size > 0 ? 'Expand All Routes' : 'Collapse All Routes'}</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  Showing <strong className="text-slate-800 dark:text-slate-200">{paginatedRoutes.length}</strong> of{' '}
                  <strong className="text-slate-800 dark:text-slate-200">{displayedGroups.length}</strong> Assigned Routes
                </span>
              </div>

              {/* Displayed Chit Group Routes */}
              {displayedGroups.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">No chit groups found in this category.</p>
                </div>
              ) : (
                paginatedRoutes.map((group) => {
                  const isRouteCollapsed = collapsedRoutes.has(group.id);
                  const groupMembers = routesData.members.filter((m) => m.group_id === group.id);
                  const installmentAmt = Number(group.installment_amount || 0);
                  const paidCount = groupMembers.filter((m) => Boolean(m.is_paid) && installmentAmt > 0).length;
                  const progressPct = groupMembers.length > 0 ? Math.round((paidCount / groupMembers.length) * 100) : 0;
                  const isDaily = group.chit_type === 'DAILY_CHIT' || group.route_category === 'DAILY_ROUTE';

                  return (
                    <div
                      key={group.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                    >
                      {/* Chit Route Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase border flex items-center gap-1.5 ${
                              isDaily
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            }`}>
                              {isDaily ? '📅 Day-by-Day Daily Chit' : '🗓️ Month-by-Month Monthly Chit'}
                            </span>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                              {group.group_name}
                            </h3>
                            <span className="font-mono text-xs text-slate-400">({group.group_code})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              {group.location_name}
                            </span>
                            <span>·</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {isDaily ? `📅 Today's Collection Round (${formatDate(getServerDate())})` : '🗓️ Current Monthly Cycle Collection'}
                            </span>
                          </div>
                        </div>

                        {/* Progress and Due Amount */}
                        <div className="flex items-center sm:items-end justify-between sm:flex-col gap-2">
                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-slate-400 block">
                              {isDaily ? 'Daily Installment Due' : 'Monthly Installment Due'}
                            </span>
                            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                              ₹{Number(group.installment_amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-xs flex items-center gap-2">
                            <span className="text-slate-400 font-mono text-[11px]">
                              {paidCount}/{groupMembers.length} Paid ({progressPct}%)
                            </span>
                            <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Route Nodes Roster (Each member represents a node) */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Route Member Nodes</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({groupMembers.length} Waypoints)
                            </span>
                          </h4>
                          <span className="text-[11px] text-slate-400 italic">
                            {isDaily ? 'Day-by-Day Tracking · Synchronous with Admin Map' : 'Month-by-Month Tracking · Synchronous with Admin Map'}
                          </span>
                        </div>

                        {groupMembers.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">No members enrolled in this group yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                            {groupMembers.map((member) => {
                              const installmentAmt = Number(group.installment_amount || 0);
                              const collectedAmt = Number(member.total_cycle_collected || member.collected_amount || 0);
                              // STRICT: isPaid only when backend confirmed AND actual collections meet installment
                              const isPaid = Boolean(member.is_paid) && installmentAmt > 0;
                              const isPartialMember = !isPaid && collectedAmt > 0;

                              return (
                                <div
                                  key={member.member_id}
                                  className={`p-4 rounded-xl border transition-all ${
                                    isPaid
                                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                                      : 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 hover:border-rose-300'
                                  }`}
                                >
                                  {/* Member Node Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => openMemberInfo(group, member)}
                                          className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity cursor-pointer ${
                                            isPaid
                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200'
                                          }`}
                                          title="View Member Information Form"
                                        >
                                          #{member.ticket_number}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openMemberInfo(group, member)}
                                          className="font-bold text-sm text-slate-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                                          title="View Member Information Form"
                                        >
                                          {member.full_name}
                                        </button>

                                        {/* Prominent Synchronous Status Badge with Cycle Label */}
                                        {isPaid ? (
                                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-700 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span>{isDaily ? 'PAID TODAY' : 'PAID FOR MONTH'}</span>
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                            <span>{isDaily ? 'NOT PAID TODAY' : 'NOT PAID FOR MONTH'}</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Sub-info */}
                                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                                          Ticket #{member.ticket_number}
                                        </span>
                                        {member.phone && (
                                          <a
                                            href={`tel:${member.phone}`}
                                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                          >
                                            <Smartphone className="w-3 h-3 text-slate-400" />
                                            <span>{member.phone}</span>
                                          </a>
                                        )}
                                        <span>·</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                          {isDaily ? 'Due Today' : 'Due This Month'}: ₹{Number(group.installment_amount).toLocaleString('en-IN')}
                                        </span>
                                      </div>

                                      {/* Synchronous Note / Receipt details */}
                                      <div className="mt-2 text-xs">
                                        {isPaid ? (
                                          <div className="p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300 font-mono text-[11px] flex items-center justify-between gap-2 flex-wrap">
                                            <span>
                                              Receipt: <strong>{member.receipt_number || 'REC-VERIFIED'}</strong> · ₹
                                              {Number(member.collected_amount || group.installment_amount).toLocaleString('en-IN')} (
                                              {member.payment_method || 'CASH'})
                                            </span>
                                            {member.collection_time && (
                                              <span>{formatTime(member.collection_time)}</span>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                            <span className="font-medium flex-1">
                                              Note:{' '}
                                              <ShowMoreText
                                                text={member.cycle_notes || member.today_notes || (isDaily ? 'Pending today' : 'Pending this month')}
                                                maxChars={45}
                                              />
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Buttons for this Member Node */}
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => openMemberInfo(group, member)}
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Member Form</span>
                                    </button>

                                    <div className="flex items-center gap-2 ml-auto">
                                      {isPaid ? (
                                        <button
                                          type="button"
                                          onClick={() => openReceiptForPaidMember(group, member)}
                                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                          <span>View Receipt</span>
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => openNoteForMember(group, member)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Add Note</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openCollectForMember(group.id, member.member_id, group.installment_amount)
                                            }
                                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Collect / Paid</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {displayedGroups.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <Pagination
                    currentPage={routesPage}
                    totalItems={displayedGroups.length}
                    pageSize={routesPageSize}
                    onPageChange={setRoutesPage}
                    onPageSizeChange={setRoutesPageSize}
                    pageSizeOptions={[4, 8, 16]}
                  />
                </div>
              )}
            </div>
          )
        ) : activeTab === 'pending-dues' ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Header & Quick Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-heading flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>Member Pending Amount Portal</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track overdue subscriber amounts scheme-by-scheme, review itemized missed dates, and collect with flexible amounts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Balances</span>
                </button>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 shadow-2xs">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">Total Unpaid Overdue</span>
                <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block font-mono">
                  ₹{totalAllPendingAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5 block">
                  Sum of all pending member balances
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">Overdue Subscribers</span>
                <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block font-mono">
                  {totalPendingMembersCount} Members
                </span>
                <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 block">
                  Subscribers with remaining installment deficit
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 shadow-2xs">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 block">Chit Schemes with Deficit</span>
                <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block font-mono">
                  {chitsWithPending.length} of {routesData.groups?.length || 0} Schemes
                </span>
                <span className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-0.5 block">
                  Assigned groups requiring payment follow-up
                </span>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Chit */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pendingChitSearch}
                    onChange={(e) => setPendingChitSearch(e.target.value)}
                    placeholder="Search chit name, code, or area location..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  {pendingChitSearch && (
                    <button
                      type="button"
                      onClick={() => setPendingChitSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Frequency Filter */}
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                  {['ALL', 'DAILY', 'MONTHLY'].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setPendingFrequencyFilter(freq)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        pendingFrequencyFilter === freq
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {freq === 'ALL' ? 'All Schemes' : freq === 'DAILY' ? '⚡ Daily Chits' : '🏛️ Monthly Chits'}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="shrink-0">
                  <select
                    value={pendingSort}
                    onChange={(e) => setPendingSort(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="HIGHEST_DUE">Highest Overdue First</option>
                    <option value="MOST_MEMBERS">Most Overdue Members</option>
                    <option value="NAME_ASC">Chit Scheme (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Chit Scheme Cards Grid */}
            {filteredPendingChits.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {pendingChitSearch ? 'No Matching Schemes Found' : 'No Pending Dues!'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {pendingChitSearch
                    ? 'Try adjusting your search query or frequency filter.'
                    : 'All subscribers in your assigned chit schemes have cleared their installments in full. Great job!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPendingChits
                    .slice((pendingChitsPage - 1) * pendingChitsPageSize, pendingChitsPage * pendingChitsPageSize)
                    .map((item) => {
                      const { group, overdueMembers, totalPending, totalMembersCount } = item;
                      const isDaily = group.frequency === 'DAILY';

                      return (
                        <div
                          key={group.id}
                          onClick={() => {
                            setSelectedPendingGroup(group);
                            setMemberSearchInChit('');
                            setMemberStatusFilterInChit('ALL');
                          }}
                          className="group relative p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
                        >
                          {/* Card Top */}
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {group.group_code}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDaily
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                }`}
                              >
                                {isDaily ? '⚡ Daily Route' : '🏛️ Monthly Chit'}
                              </span>
                            </div>

                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors font-heading truncate">
                              {group.group_name}
                            </h3>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{group.location_name || 'General Field Area'}</span>
                              <span>·</span>
                              <span>₹{Number(group.installment_amount).toLocaleString('en-IN')}/installment</span>
                            </div>
                          </div>

                          {/* Card Middle: Dues Highlight */}
                          <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block font-heading">
                                Total Scheme Overdue
                              </span>
                              <strong className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                                ₹{totalPending.toLocaleString('en-IN')}
                              </strong>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-heading">
                                Pending Subs
                              </span>
                              <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                                {overdueMembers.length} / {totalMembersCount}
                              </strong>
                            </div>
                          </div>

                          {/* Card Footer Button */}
                          <button
                            type="button"
                            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-rose-600 dark:hover:bg-rose-500 text-white dark:text-slate-900 hover:text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-heading"
                          >
                            <span>View Pending Subscribers ({overdueMembers.length})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                </div>

                <Pagination
                  currentPage={pendingChitsPage}
                  totalItems={filteredPendingChits.length}
                  pageSize={pendingChitsPageSize}
                  onPageChange={setPendingChitsPage}
                  onPageSizeChange={setPendingChitsPageSize}
                  pageSizeOptions={[6, 12, 24]}
                />
              </div>
            )}
          </div>
        ) : activeTab === 'profile' ? (
          /* =========================================================================
             TAB 3: AGENT PROFILE & ROUTE HUB (Directory of routes & useful tools)
             ========================================================================= */
          <div className="space-y-5">
            {/* 1. Agent Identity Dossier (Luxury ChitFund Pro Theme) */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm text-slate-900 dark:text-white">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-1 shadow-md flex items-center justify-center">
                      <div className="w-full h-full rounded-[20px] bg-slate-900 flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl tracking-wider font-heading">
                        {(user?.full_name || 'Agent')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-xl text-white shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-heading">
                        Agent
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-heading">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Staff ID: AGT-{String(user?.id || '1').padStart(4, '0')}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                      {user?.full_name || 'Collection Agent'}
                    </h1>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-sans">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-mono">@{user?.username || 'agent'}</span>
                      </span>
                      {user?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{user.phone}</span>
                        </span>
                      )}
                      <span className="text-slate-400">· </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  <a
                    href="tel:+919876543210"
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5 font-heading shadow-2xs"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Head Office Helpline</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-heading shadow-2xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Day Sheet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Agent Today's Collection & Target Performance Dossier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Today's Collections Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Today's Collection</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    Live Total
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                    ₹{todayCollectedTotal.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>{routesData.summary?.totalCollectionsCount || 0} receipts issued</span>
                    <span>·</span>
                    <span>Cash: ₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Digital / UPI:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    ₹{Number(routesData.summary?.todayUpi ?? routesData.summary?.todayOnline ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Target Card - BESIDE Today's Collection */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/20 border border-indigo-200 dark:border-indigo-800/70 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Target Card</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                    {targetProgressPercent}% Done
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                    ₹{agentDailyTarget.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                    <span>
                      {targetRemainingAmount === 0 && agentDailyTarget > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Daily Target Reached!</span>
                      ) : (
                        <span>Remaining: <strong className="text-rose-600 dark:text-rose-400">₹{targetRemainingAmount.toLocaleString('en-IN')}</strong></span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${targetProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Cash On Hand */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Cash on Hand</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Custodian
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                    ₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    To reconcile with admin at day handover
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Shift Status:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {currentDaySubmission?.status === 'APPROVED' ? 'Approved ✓' : currentDaySubmission?.status === 'PENDING_APPROVAL' ? 'Submitted' : 'Open'}
                  </span>
                </div>
              </div>

              {/* Assigned Routes Overview */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Assigned Schemes</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    Active
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                    {activeProfileRoutes.length} <span className="text-sm font-semibold text-slate-400">Chits</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {(routesData.summary?.dailyGroupsCount || 0)} Daily · {(routesData.summary?.monthlyGroupsCount || 0)} Monthly
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Subscribers:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {(routesData.members || []).length} Members
                  </span>
                </div>
              </div>
            </div>

              {/* Per-Chit Cash & Inflow Ledger (Separated so funds and dues are never mixed) */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Today's Per-Chit Cash & Inflow Ledger (Separated Ledgers)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clear accounting breakdown per chit — physical cash, online inflows, and pending balances are tracked individually so chits never mix.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeProfileRoutes.map((group) => {
                    const stats = getGroupStats(group);
                    return (
                      <div
                        key={group.id}
                        className="p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{stats.isDaily ? '🚚' : stats.isDouble ? '💎' : '🏛️'}</span>
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                {group.group_name}
                              </span>
                              
                            </div>
                            <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {stats.isDaily ? 'Daily Chit' : stats.isDouble ? 'Double Chit' : 'Monthly Auction'} · ₹{Number(group.installment_amount).toLocaleString('en-IN')}/sub
                            </span>
                          </div>
                        </div>

                        {/* Financial Ledger Tiles */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-semibold">Expected Target</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">
                              ₹{stats.targetExpected.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">Cash on Hand</span>
                            <span className="font-black text-emerald-700 dark:text-emerald-300">
                              ₹{stats.cashCollected.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                            <span className="text-[10px] text-purple-700 dark:text-purple-300 block font-bold flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5 text-purple-500" />
                              <span>UPI / Online</span>
                            </span>
                            <span className="font-extrabold text-purple-600 dark:text-purple-400">
                              ₹{(stats.upiCollected || stats.onlineCollected).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-semibold">Pending Amount</span>
                            <span className="font-extrabold text-rose-600 dark:text-rose-400">
                              ₹{stats.pendingAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span>Progress</span>
                            <span>{stats.paidMembers.length}/{stats.groupMembers.length} Paid ({stats.progressPercent}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${stats.isDaily ? 'bg-emerald-500' : stats.isDouble ? 'bg-purple-500' : 'bg-blue-500'}`}
                              style={{ width: `${stats.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Quick actions for this Chit */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedProfileChitId(expandedProfileChitId === group.id ? null : group.id);
                              smoothScrollTo(`chit-scheme-card-${group.id}`, { offset: 32, behavior: 'smooth' });
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Users className="w-3 h-3 text-blue-500" />
                            <span>{expandedProfileChitId === group.id ? 'Hide Roster' : `Subscribers (${stats.groupMembers.length})`}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openCollectForChitScheme(group)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Collect</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            {/* 2. Assigned Chit Schemes Directory & Subscriber Management */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      Assigned Chit Schemes Directory ({activeProfileRoutes.length} Active Today)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Every chit scheme operates under its own distinct financial cycle and rules. View schedules, financial specifications, and manage subscribers per chit.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    {routesData.summary?.dailyGroupsCount || 0} Daily (Everyday) · {routesData.summary?.monthlyGroupsCount || 0} Monthly (Collect Anytime)
                  </span>
                </div>
              </div>

              {/* Flexible Real-Life Schedule Banner */}
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block font-bold">
                      ⚡ Flexible Real-Life Collections (All Assigned Schemes Visible Anytime)
                    </strong>
                    <span className="text-[11px] opacity-80 block mt-0.5 leading-relaxed">
                      Daily chits are collected everyday. Monthly chits can be collected on any date and any time during their monthly cycle (limit: cycle anchor day). No restrictive 1st-of-month blocks!
                    </span>
                  </div>
                </div>
              </div>

              {/* Chit Scheme Category Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Chit Category:
                </span>
                <button
                  type="button"
                  onClick={() => setProfileChitFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    profileChitFilter === 'ALL'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All Active Chits ({activeProfileRoutes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProfileChitFilter('DAILY')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                    profileChitFilter === 'DAILY'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <span>🚚 Daily Chits</span>
                  <span className="text-[10px] opacity-80">({dailyChitsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileChitFilter('DOUBLE')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                    profileChitFilter === 'DOUBLE'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                  }`}
                >
                  <span>⚡ Daily Double Chits</span>
                  <span className="text-[10px] opacity-80">({dailyDoubleChitsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileChitFilter('AUCTION')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                    profileChitFilter === 'AUCTION'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  <span>🏛️ Monthly Auction Chits</span>
                  <span className="text-[10px] opacity-80">({monthlyAuctionChitsList.length})</span>
                </button>
              </div>

              {/* Differentiated Chit Scheme Cards */}
              {displayedProfileRoutes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No chit schemes found for the selected category.
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedProfileRoutes.map((group) => {
                    const stats = getGroupStats(group);
                    const isExpanded = expandedProfileChitId === group.id;

                    return (
                      <div
                        id={`chit-scheme-card-${group.id}`}
                        key={group.id}
                        className="rounded-3xl border transition-all duration-200 shadow-2xs overflow-hidden scroll-mt-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      >
                        {/* Scheme Card Header with Unique Identity Branding */}
                        <div className="p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {stats.isDaily ? (stats.isDouble ? '⚡' : '🚚') : '🏛️'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                                  {group.group_name}
                                </h4>
                                <span className="font-mono text-xs text-slate-500 font-semibold">({group.group_code})</span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                  {stats.isDaily
                                    ? stats.isDouble
                                      ? '⚡ DAILY DOUBLE CHIT SCHEME · EVERYDAY COLLECTION'
                                      : '🚚 DAILY AUCTION CHIT SCHEME · EVERYDAY COLLECTION'
                                    : '🏛️ MONTHLY AUCTION SCHEME · COLLECT ANYTIME'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {stats.isDaily
                                  ? stats.isDouble
                                    ? 'Daily 50-day double chit dual-draw scheme collected during route rounds'
                                    : 'Daily 100-day reverse auction installment collected day-by-day during route field rounds'
                                  : `Monthly reverse auction scheme (Due: ${group.cycle_due || 'Cycle Anchor Date'}) · Area: `}<strong>{group.location_name || 'Assigned Territory'}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                            <button
                              type="button"
                              onClick={() => openCollectForChitScheme(group)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Record Collection</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('routes');
                                smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
                              }}
                              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>2D Map</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Granular Financial Ledger (6-Metric Strip for this specific Chit) */}
                        <div className="p-4 sm:p-5 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Installment</span>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                ₹{Number(group.installment_amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Pool</span>
                              <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400">
                                ₹{Number(group.total_pool_amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Subscribers</span>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {stats.groupMembers.length} Members
                              </span>
                            </div>
                            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1">
                              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider block">Cash Collected</span>
                              <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                                ₹{stats.cashCollected.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 space-y-1">
                              <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold uppercase tracking-wider block flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-purple-600" />
                                <span>UPI / Online</span>
                              </span>
                              <span className="font-black text-sm text-purple-700 dark:text-purple-300">
                                ₹{(stats.upiCollected || stats.onlineCollected).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-1">
                              <span className="text-[10px] text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider block">Pending Amount</span>
                              <span className="font-black text-sm text-rose-600 dark:text-rose-400">
                                ₹{stats.pendingAmount.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar & Toggle Accordion */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                            <div className="flex-1 space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <span>Cycle Collection Progress</span>
                                <span>
                                  <strong>{stats.paidMembers.length}</strong> of {stats.groupMembers.length} Subscribers Paid ({stats.progressPercent}%) · Total Collected: <strong>₹{stats.totalCollected.toLocaleString('en-IN')}</strong>
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    stats.isDaily ? 'bg-emerald-500' : stats.isDouble ? 'bg-purple-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${stats.progressPercent}%` }}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedProfileChitId(isExpanded ? null : group.id)}
                              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                            >
                              <Users className="w-4 h-4 text-blue-500" />
                              <span>{isExpanded ? 'Hide Subscribers Roster' : `View Enrolled Subscribers (${stats.groupMembers.length})`}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Expandable Enrolled Subscribers Roster for this Chit */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <h5 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>👥</span>
                                  <span>Enrolled Subscribers Roster for {group.group_name}</span>
                                </h5>
                                <span className="text-[11px] text-slate-400">
                                  {stats.paidMembers.length} Collected · {stats.unpaidMembers.length} Pending
                                </span>
                              </div>

                              <div className="space-y-2">
                                {stats.groupMembers.map((member) => {
                                  const installmentAmt = Number(group.installment_amount || 0);
                                  const collectedAmt = Number(member.total_cycle_collected || member.collected_amount || 0);
                                  // STRICT: only mark paid if backend confirmed AND installment > 0
                                  const isPaid = Boolean(member.is_paid) && installmentAmt > 0;

                                  return (
                                    <div
                                      key={`${group.id}-${member.member_id}`}
                                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                                        isPaid
                                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      {/* Left: Member info */}
                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div
                                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                            isPaid
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          {isPaid ? '✓' : `#${member.ticket_number}`}
                                        </div>

                                        <div className="space-y-0.5 flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                                              {member.full_name}
                                            </span>
                                            <span className="font-mono text-[11px] text-slate-400">
                                              ({member.member_code})
                                            </span>
                                            <span className="font-semibold text-[10px] text-slate-500">
                                              Ticket #{member.ticket_number}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                            {member.phone && (
                                              <a
                                                href={`tel:${member.phone}`}
                                                className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                              >
                                                <PhoneCall className="w-3 h-3" />
                                                <span>{member.phone}</span>
                                              </a>
                                            )}
                                            {member.address && (
                                              <span className="truncate max-w-xs">
                                                📍 {member.address}
                                              </span>
                                            )}
                                          </div>

                                          {/* Status Banner */}
                                          {isPaid ? (
                                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 pt-0.5">
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                              <span>
                                                Paid Today · ₹{Number(member.collected_amount || group.installment_amount).toLocaleString('en-IN')} ({member.payment_method}) · Receipt #{member.receipt_number || 'REC-ISSUED'}{member.collection_time ? ` · ${formatTime(member.collection_time)}` : ''}
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 pt-0.5">
                                              <Clock className="w-3.5 h-3.5 shrink-0" />
                                              <span>
                                                Pending · {member.cycle_notes || member.today_notes || (stats.isDaily ? 'Pending today' : 'Pending this month')}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right: Actions */}
                                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => openMemberInfo(group, member)}
                                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                                          title="View customer profile"
                                        >
                                          <User className="w-3.5 h-3.5" />
                                        </button>

                                        {isPaid ? (
                                          <button
                                            type="button"
                                            onClick={() => openReceiptForPaidMember(group, member)}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>Receipt</span>
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => openNoteForMember(group, member)}
                                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                                              title="Add or update visit note"
                                            >
                                              <MessageSquare className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                openCollectForMember(group.id, member.member_id, group.installment_amount)
                                              }
                                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                              <span>Collect</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Daily Handover & End-of-Day Checklist */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  End-of-Day Field Handover Protocol
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reconciliation Responsibilities</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 leading-relaxed list-disc list-inside">
                    <li>Count physical cash: must equal <strong>₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}</strong>.</li>
                    <li>Verify all UPI & digital receipts: must equal <strong>₹{Number(routesData.summary?.todayUpi ?? routesData.summary?.todayOnline ?? 0).toLocaleString('en-IN')}</strong> (cross-check UPI UTR numbers).</li>
                    <li>Gross collections combined: <strong>₹{Number(routesData.summary?.todayTotal || 0).toLocaleString('en-IN')}</strong> across {routesData.summary?.totalCollectionsCount || 0} issued receipts.</li>
                    <li>Submit collected cash to the admin cashier desk prior to shift closing.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Emergency Escalations & Branch Desk</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    If any subscriber disputes payment or requests schedule adjustments, enter a note using <strong>"Add Note"</strong> so the admin terminal updates instantly.
                  </p>
                  <div className="pt-2">
                    <a
                      href="tel:+919876543210"
                      className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Admin Desk Contact: +91 98765 43210</span>
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Day Submit & Cash Handover Action Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Field Day Submission & Cash Handover to Admin
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      currentDaySubmission?.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                        : currentDaySubmission?.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {currentDaySubmission?.status === 'APPROVED'
                        ? '✓ Day Approved & Closed'
                        : currentDaySubmission?.status === 'PENDING_APPROVAL'
                        ? 'Awaiting Admin Count'
                        : 'Shift Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Submit your total collections (Cash: <strong>₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}</strong>, UPI: <strong>₹{Number(routesData.summary?.todayUpi ?? routesData.summary?.todayOnline ?? 0).toLocaleString('en-IN')}</strong>) and chit-by-chit breakdown so Admin can physically count the cash and approve day closing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDaySubmitModal(true);
                    fetchDaySubmissionStatus(daySubmitDate);
                    scrollToFormOrModal('agent-day-submit-modal');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>
                    {currentDaySubmission?.status === 'APPROVED'
                      ? 'View Approved Handover'
                      : currentDaySubmission?.status === 'PENDING_APPROVAL'
                      ? 'View Submitted Handover'
                      : 'Submit Day Work to Admin'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Recent Collections History Tab */
          recentCollections.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">No Collections Recorded Today</h3>
              <p className="text-xs text-slate-500">Collected dues will appear here with immediate receipt issuance.</p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium">Cash Collected</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                  <span className="text-purple-800 dark:text-purple-300 font-medium flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    <span>UPI / Digital Receipts</span>
                  </span>
                  <span className="font-extrabold text-purple-700 dark:text-purple-400 font-mono">₹{Number(routesData.summary?.todayUpi ?? routesData.summary?.todayOnline ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                  <span className="text-blue-800 dark:text-blue-300 font-medium">Total Day Inflow</span>
                  <span className="font-extrabold text-blue-700 dark:text-blue-400 font-mono">₹{Number(routesData.summary?.todayTotal || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] shadow-xs">
                    <tr>
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Member</th>
                      <th className="py-2.5 px-3">Group</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Date / Time</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedHistory.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {col.receipt_number}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {col.member_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{col.group_name}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          ₹{Number(col.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              col.payment_method === 'CASH'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            }`}
                          >
                            {col.payment_method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatDate(col.collection_date)}{' '}
                          {col.collection_time ? `· ${formatTime(col.collection_time)}` : ''}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            {col.verification_status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={historyPage}
                totalItems={recentCollections.length}
                pageSize={historyPageSize}
                onPageChange={(page) => {
                  setHistoryPage(page);
                  smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
                }}
                onPageSizeChange={setHistoryPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          )
        )}

      {/* Collect Modal (Synchronous Payment Entry) */}
      <ModalPortal
        id="agent-collect-modal"
        isOpen={showCollectModal}
        onClose={() => setShowCollectModal(false)}
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto max-h-[88vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Record Member Collection (Paid)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordCollection} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto overscroll-contain">
              {collectError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{collectError}</span>
                </div>
              )}

              <div className="space-y-3.5">

              {/* Group Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chit Group Route *
                </label>
                <select
                  required
                  value={collectForm.group_id}
                  onChange={(e) => handleGroupSelectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">Select Chit Group Route</option>
                  {routesData.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} · ₹{g.installment_amount} / {g.frequency === 'DAILY' ? 'Day' : 'Month'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enrolled Member *
                </label>
                <select
                  required
                  value={collectForm.member_id}
                  onChange={(e) => handleMemberSelectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">Select Member</option>
                  {eligibleMembers.map((m) => {
                    const selectedGrp = routesData.groups.find((g) => String(g.id) === String(collectForm.group_id));
                    const isMonthly = selectedGrp?.frequency === 'MONTHLY';
                    const isFullyPaidThisMonth = isMonthly && m.is_paid;
                    const isPartialThisMonth = isMonthly && (m.is_partial || (!m.is_paid && Number(m.total_cycle_collected || 0) > 0));

                    return (
                      <option
                        key={m.member_id}
                        value={m.member_id}
                      >
                        #{m.ticket_number} - {m.full_name} ({m.phone}) {
                          isFullyPaidThisMonth
                            ? `✓ [CURRENT CYCLE CLEARED - ₹${Number(m.total_cycle_collected || selectedGrp?.installment_amount).toLocaleString('en-IN')}] · Advance Payment Eligible`
                            : isPartialThisMonth
                            ? `🟡 [PARTIAL - Paid ₹${Number(m.total_cycle_collected || 0).toLocaleString('en-IN')} · Balance Due ₹${Number(m.remaining_balance || 0).toLocaleString('en-IN')}]`
                            : (m.is_paid ? '✓ Already Paid' : '')
                        }
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Collection Date Selector (Real-Life Flexibility for Backdated / Exact Date Collections) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Date (Today or Backdated) *
                </label>
                <input
                  type="date"
                  required
                  value={collectForm.collection_date || getServerYMD()}
                  onChange={(e) => setCollectForm({ ...collectForm, collection_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Amount and Live Balance Computation */}
              {(() => {
                const selectedGrp = routesData.groups.find((g) => String(g.id) === String(collectForm.group_id));
                const selectedMem = routesData.members.find((m) => String(m.member_id) === String(collectForm.member_id) && String(m.group_id) === String(collectForm.group_id));
                const fullTargetAmt = Number(selectedGrp?.installment_amount || 0);
                const currentPaidInCycle = Number(selectedMem?.total_cycle_collected || 0);
                const currentRemainingDue = selectedMem?.remaining_balance !== undefined && selectedMem?.remaining_balance !== null
                  ? Number(selectedMem.remaining_balance)
                  : Math.max(0, fullTargetAmt - currentPaidInCycle);
                const enteredAmt = Number(collectForm.amount || 0);
                const totalPaidAfter = currentPaidInCycle + enteredAmt;
                const balanceAfter = Math.max(0, fullTargetAmt - totalPaidAfter);
                const isAdvancePayment = currentPaidInCycle >= fullTargetAmt;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Collection Amount (₹) *
                      </label>
                      {currentRemainingDue > 0 && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                          Due: ₹{currentRemainingDue.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={collectForm.amount}
                      onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })}
                      placeholder="e.g. 500 (Enter any custom amount)"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />

                    {/* Quick Amount Chips */}
                    {selectedGrp && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-medium">Quick Sets:</span>
                        {currentRemainingDue > 0 && (
                          <button
                            type="button"
                            onClick={() => setCollectForm({ ...collectForm, amount: String(currentRemainingDue) })}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                          >
                            Full Due (₹{currentRemainingDue.toLocaleString('en-IN')})
                          </button>
                        )}
                        {currentRemainingDue > 200 && (
                          <button
                            type="button"
                            onClick={() => setCollectForm({ ...collectForm, amount: String(Math.round(currentRemainingDue / 2)) })}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 cursor-pointer"
                          >
                            Half (₹{Math.round(currentRemainingDue / 2).toLocaleString('en-IN')})
                          </button>
                        )}
                        {[100, 200, 500, 1000, 2000].filter((a) => a <= fullTargetAmt && a !== currentRemainingDue).slice(0, 3).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setCollectForm({ ...collectForm, amount: String(val) })}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            ₹{val}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Dynamic Real-time Balance Calculation Display */}
                    {selectedMem && enteredAmt > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Cycle Target: ₹{fullTargetAmt.toLocaleString('en-IN')}</span>
                          <span>Already Paid: ₹{currentPaidInCycle.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pt-0.5 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span>Amount Now Collecting:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">₹{enteredAmt.toLocaleString('en-IN')}</span>
                        </div>

                        {isAdvancePayment ? (
                          <div className="mt-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              <strong>Advance Collection:</strong> Subscriber has already cleared this cycle's installment. This ₹{enteredAmt.toLocaleString('en-IN')} payment will be saved as advance credit for upcoming cycles.
                            </span>
                          </div>
                        ) : balanceAfter > 0 ? (
                          <div className="mt-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] font-semibold flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Partial Payment:</strong> Remaining balance of <span className="underline font-bold">₹{balanceAfter.toLocaleString('en-IN')}</span> will stay as Pending Due on this subscriber and chit.
                            </span>
                          </div>
                        ) : totalPaidAfter === fullTargetAmt ? (
                          <div className="mt-1 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              <strong>Full Settlement:</strong> This payment clears the cycle installment in full. Node will turn GREEN.
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              <strong>Advance / Excess:</strong> ₹{(totalPaidAfter - fullTargetAmt).toLocaleString('en-IN')} paid in excess of standard installment.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={collectForm.payment_method}
                    onChange={(e) => setCollectForm({ ...collectForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ref # / UPI UTR
                  </label>
                  <input
                    type="text"
                    value={collectForm.payment_reference}
                    onChange={(e) => setCollectForm({ ...collectForm, payment_reference: e.target.value })}
                    placeholder="e.g. 329048293"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Note / Location
                </label>
                <input
                  type="text"
                  value={collectForm.notes}
                  onChange={(e) => setCollectForm({ ...collectForm, notes: e.target.value })}
                  placeholder="e.g. Collected at member shop"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {isTodayShiftSubmitted && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium hidden sm:inline-flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Shift submitted. You can re-submit updated handover in Day Closings.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Submit & Mark Paid</span>
                  )}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* Unpaid Remark / Note Modal (Synchronous Not-Paid Entry) */}
      {showNoteModal && selectedMemberForNote && (
        <ModalPortal
          id="agent-note-modal"
          isOpen={showNoteModal && Boolean(selectedMemberForNote)}
          onClose={() => setShowNoteModal(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    Record Unpaid Remark
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Synchronizes node as NOT PAID (Red) with agent note in Admin Route Tracking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Chit Group:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedMemberForNote?.group?.group_name || 'Chit Scheme'} ({selectedMemberForNote?.group?.group_code || ''})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subscriber Member:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  #{selectedMemberForNote?.member?.ticket_number || ''} - {selectedMemberForNote?.member?.full_name || ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Installment Due:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  ₹{Number(selectedMemberForNote?.group?.installment_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveUnpaidNote} className="space-y-3">
              {noteError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  {noteError}
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quick Reason Presets
                </label>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    'Shop was closed',
                    'Member not at home',
                    'Promised to pay tomorrow',
                    'Asked to come back at 6 PM',
                    'Out of station',
                    'Bank transfer initiated',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAgentNoteText(preset)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        agentNoteText === preset
                          ? 'bg-rose-50 border-rose-400 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Note Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agent Remark / Specific Note *
                </label>
                <textarea
                  required
                  rows="3"
                  value={agentNoteText}
                  onChange={(e) => setAgentNoteText(e.target.value)}
                  placeholder="e.g. Shop shutter closed, called member and promised cash payment tomorrow at 4 PM"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingNote ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Unpaid Remark</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}


      {/* ========================================================================= */}
      {/* MODAL 1: Relative Members of Selected Chit Scheme with Search              */}
      {/* ========================================================================= */}
      {selectedPendingGroup && (
        <ModalPortal
          id="pending-chit-members-modal"
          isOpen={Boolean(selectedPendingGroup)}
          onClose={() => setSelectedPendingGroup(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-heading">
                    Pending Subscribers · {selectedPendingGroup.group_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPendingGroup.group_code} · ₹{Number(selectedPendingGroup.installment_amount).toLocaleString('en-IN')}/installment · {membersInSelectedPendingGroup.length} Overdue
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPendingGroup(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter Controls */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearchInChit}
                  onChange={(e) => setMemberSearchInChit(e.target.value)}
                  placeholder="Search member name, phone number, or ticket #..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                {memberSearchInChit && (
                  <button
                    type="button"
                    onClick={() => setMemberSearchInChit('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setMemberStatusFilterInChit('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    memberStatusFilterInChit === 'ALL'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Overdue ({membersInSelectedPendingGroup.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberStatusFilterInChit('NOT_PAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    memberStatusFilterInChit === 'NOT_PAID'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Unpaid (₹0 Paid)
                </button>
                <button
                  type="button"
                  onClick={() => setMemberStatusFilterInChit('PARTIAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    memberStatusFilterInChit === 'PARTIAL'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Partially Paid
                </button>
              </div>
            </div>

            {/* Subscribers List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {membersInSelectedPendingGroup.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No matching overdue subscribers found.
                </div>
              ) : (
                membersInSelectedPendingGroup.map((mem) => {
                  const rem = mem.remaining_balance !== undefined && mem.remaining_balance !== null
                    ? Number(mem.remaining_balance)
                    : Number(selectedPendingGroup.installment_amount || 0);

                  return (
                    <div
                      key={mem.member_id}
                      className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-400 dark:hover:border-rose-700 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-center font-black font-mono text-xs shrink-0">
                          #{mem.ticket_number}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm font-heading flex items-center gap-2">
                            <span>{mem.full_name}</span>
                            {Number(mem.collected_amount || 0) > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Partial (Paid ₹{Number(mem.collected_amount).toLocaleString('en-IN')})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                Unpaid
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <a
                              href={`tel:${mem.phone}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>{mem.phone}</span>
                            </a>
                            {mem.address && <span className="truncate max-w-[200px]">· {mem.address}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-heading">
                            Pending Due
                          </span>
                          <strong className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                            ₹{rem.toLocaleString('en-IN')}
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenPendingMember(selectedPendingGroup, mem)}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer font-heading"
                        >
                          <span>View Dates & Collect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPendingGroup(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Scheme Roster
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Itemized Pending Dates Breakdown & Direct Collection Form         */}
      {/* ========================================================================= */}
      {selectedPendingMember && (
        <ModalPortal
          id="pending-member-detail-modal"
          isOpen={Boolean(selectedPendingMember)}
          onClose={() => {
            setSelectedPendingMember(null);
            setMemberPendingBreakdown(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-heading">
                    #{selectedPendingMember.ticket_number} - {selectedPendingMember.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPendingGroup?.group_name} ({selectedPendingGroup?.group_code}) · {selectedPendingMember.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPendingMember(null);
                  setMemberPendingBreakdown(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pendingCollectError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{pendingCollectError}</span>
                </div>
              )}

              {/* Itemized Pending Dates Table Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-heading flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>Itemized Pending Dates & Missed Amounts</span>
                  </span>
                  {memberPendingBreakdown && (
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {memberPendingBreakdown.pending_dates?.length || 0} Unpaid Cycle(s)
                    </span>
                  )}
                </div>

                {loadingBreakdown ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    <span>Auditing pending dates from server database...</span>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-heading text-slate-600 dark:text-slate-400">
                        <tr>
                          <th className="py-2 px-3">Pending Date</th>
                          <th className="py-2 px-3">Target</th>
                          <th className="py-2 px-3">Paid</th>
                          <th className="py-2 px-3 text-right">Pending Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(memberPendingBreakdown?.pending_dates || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              <div>{formatDate(item.date)}</div>
                              <span className="text-[10px] text-slate-400 font-sans block">{item.label}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">
                              ₹{Number(item.due_amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-mono">
                              ₹{Number(item.paid_amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                              ₹{Number(item.pending_amount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Summary Row */}
                    <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-rose-900 dark:text-rose-200 font-heading">
                        Total Amount Member Should Pay Now:
                      </span>
                      <strong className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                        ₹{Number(memberPendingBreakdown?.total_pending || selectedPendingMember.remaining_balance || selectedPendingGroup?.installment_amount || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Collection Form */}
              <form onSubmit={handleExecutePendingCollection} className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-3.5">
                  {/* Amount to Collect (Fully Editable) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-heading">
                        Collection Amount (₹) *
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Editable — Subscriber can pay any amount
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      onWheel={(e) => e.target.blur()}
                      value={pendingCollectAmount}
                      onChange={(e) => setPendingCollectAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />

                    {/* Quick sets */}
                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPendingCollectAmount(
                            String(
                              memberPendingBreakdown?.total_pending ||
                              selectedPendingMember.remaining_balance ||
                              selectedPendingGroup?.installment_amount ||
                              ''
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[11px] font-bold hover:bg-rose-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Full Due (₹{Number(memberPendingBreakdown?.total_pending || selectedPendingMember.remaining_balance || 0).toLocaleString('en-IN')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingCollectAmount(String(selectedPendingGroup?.installment_amount || ''))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        1 Installment (₹{Number(selectedPendingGroup?.installment_amount || 0).toLocaleString('en-IN')})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingCollectAmount(
                            String(Math.round(Number(selectedPendingGroup?.installment_amount || 0) / 2))
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Half (₹{Math.round(Number(selectedPendingGroup?.installment_amount || 0) / 2).toLocaleString('en-IN')})
                      </button>
                    </div>

                    {/* Live Balance Computation Box */}
                    {(() => {
                      const totalDue = Number(
                        memberPendingBreakdown?.total_pending ||
                        selectedPendingMember.remaining_balance ||
                        selectedPendingGroup?.installment_amount ||
                        0
                      );
                      const entered = Number(pendingCollectAmount || 0);
                      const remAfter = Math.max(0, totalDue - entered);

                      return (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            Balance After This Collection:
                          </span>
                          <strong className={`font-mono font-bold ${remAfter === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {remAfter === 0 ? '✓ Cleared in Full' : `₹${remAfter.toLocaleString('en-IN')} remaining`}
                          </strong>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Payment Method & Reference */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={pendingCollectMethod}
                        onChange={(e) => setPendingCollectMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ref # / UPI UTR
                      </label>
                      <input
                        type="text"
                        value={pendingCollectRef}
                        onChange={(e) => setPendingCollectRef(e.target.value)}
                        placeholder="e.g. 329048293"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Collection Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Collection Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={pendingCollectDate}
                      onChange={(e) => setPendingCollectDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Collection Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={pendingCollectNotes}
                      onChange={(e) => setPendingCollectNotes(e.target.value)}
                      placeholder="e.g. Cleared 2 pending days at subscriber house"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPendingMember(null);
                      setMemberPendingBreakdown(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingPendingCollect}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer font-heading"
                  >
                    {submittingPendingCollect ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit & Mark Paid</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Printable Receipt Modal with Final Success Animation */}
      {receiptModal && (
        <ModalPortal
          id="agent-receipt-modal"
          isOpen={Boolean(receiptModal)}
          onClose={() => setReceiptModal(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-confirmScale">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-successPop shadow-md shadow-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Payment Receipt</h3>
              <p className="text-xs text-slate-400 font-mono">{receiptModal?.receiptNumber}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-900 dark:text-white">{receiptModal?.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Group:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{receiptModal?.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{Number(receiptModal?.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{receiptModal?.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agent:</span>
                <span className="text-slate-700 dark:text-slate-300">{receiptModal?.agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">{formatDate(receiptModal?.date)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Member Information Form Modal */}
      {showMemberInfoModal && selectedMemberForInfo && (() => {
        const group = selectedMemberForInfo?.group || {};
        const member = selectedMemberForInfo?.member || {};
        const isPaid = member?.is_paid || member?.today_status === 'PAID';
        const isPartial = member?.is_partial || (!isPaid && Number(member?.total_cycle_collected || 0) > 0);
        const installmentAmt = Number(group?.installment_amount || 0);
        const cyclePaidAmt = Number(member?.total_cycle_collected || member?.collected_amount || 0);
        const remainingDueAmt = member?.remaining_balance !== undefined && member?.remaining_balance !== null
          ? Number(member.remaining_balance)
          : (isPaid ? 0 : Math.max(0, installmentAmt - cyclePaidAmt));

        return (
          <ModalPortal
            id="agent-member-info-modal"
            isOpen={showMemberInfoModal && Boolean(selectedMemberForInfo)}
            onClose={() => setShowMemberInfoModal(false)}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-xs ${
                      isPaid ? 'bg-emerald-600' : (isPartial ? 'bg-amber-500' : 'bg-rose-600')
                    }`}
                  >
                    #{member.ticket_number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                        Member Information Form
                      </h3>
                      {isPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>PAID</span>
                        </span>
                      ) : isPartial ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400 dark:border-amber-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>PARTIAL (Due: ₹{remainingDueAmt.toLocaleString('en-IN')})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>NOT PAID</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ticket #{member?.ticket_number || ''} · {group?.group_name || 'Chit Scheme'} ({group?.group_code || ''})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMemberInfoModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={member?.full_name || ''}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Member ID Code
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={member?.member_code || (member?.member_id ? `MEM-${member.member_id}` : '')}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Contact Phone
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={member?.phone || 'None'}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                      />
                      {member?.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors shrink-0"
                        >
                          <Smartphone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Alternate Phone
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={member?.alternate_phone || 'None Registered'}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Physical Address
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={member?.address || `${group?.location_name || 'Field Route'} (Route Stop #${member?.ticket_number || ''})`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      KYC Document
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${member?.kyc_type || 'Aadhaar Card'}: ${member?.kyc_number || 'Verified'}`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Cycle Installment Target
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${installmentAmt.toLocaleString('en-IN')}`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Paid in Current Cycle
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${cyclePaidAmt.toLocaleString('en-IN')}`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Remaining Balance Due
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${remainingDueAmt.toLocaleString('en-IN')}`}
                      className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-extrabold ${
                        remainingDueAmt > 0
                          ? 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400'
                          : 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Status Box */}
                {isPaid ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Payment Fully Collected & Reconciled</span>
                    </div>
                    <div className="font-mono text-[11px]">
                      Receipt: <strong>{member?.receipt_number || 'REC-TODAY'}</strong> · ₹
                      {Number(member?.collected_amount || group?.installment_amount || 0).toLocaleString('en-IN')} (
                      {member?.payment_method || 'CASH'})
                      {member?.collection_time && ` at ${formatTime(member.collection_time)}`}
                    </div>
                  </div>
                ) : isPartial ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Partial Payment Collected (₹{cyclePaidAmt.toLocaleString('en-IN')})</span>
                    </div>
                    <div>
                      Remaining deficit of <strong className="text-amber-900 dark:text-amber-200">₹{remainingDueAmt.toLocaleString('en-IN')}</strong> remains pending due on this subscriber and chit.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Payment Awaiting Collection</span>
                    </div>
                    <div>Agent Remark: <strong>{member?.today_notes || 'Awaiting payment'}</strong></div>
                  </div>
                )}
              </div>

              {/* Form Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/40">
                {!isPaid && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemberInfoModal(false);
                        openNoteForMember(group, member);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Add Note
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemberInfoModal(false);
                        openCollectForMember(group.id, member.member_id, remainingDueAmt);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isPartial ? `Collect Remaining (₹${remainingDueAmt.toLocaleString('en-IN')})` : 'Collect / Paid'}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowMemberInfoModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Close Form
                </button>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* Field Day Submission & Cash Handover Modal */}
      {showDaySubmitModal && (
        <ModalPortal id="agent-day-submit-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Field Day Submission & Cash Handover</span>
                    {currentDaySubmission?.status === 'APPROVED' ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        ✓ APPROVED & CLOSED
                      </span>
                    ) : currentDaySubmission?.status === 'PENDING_APPROVAL' ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        ⏳ AWAITING ADMIN COUNT
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                        OPEN / READY TO SUBMIT
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Submit today's collected cash & UPI breakdown to Admin for physical cash counting and formal day closing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDaySubmitModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date Selector Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Collection Work Date:
                </span>
                <input
                  type="date"
                  value={daySubmitDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setDaySubmitDate(newDate);
                    fetchDaySubmissionStatus(newDate);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Agent: <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.full_name || user?.name || 'Agent'}</span> (ID: #{user?.id})
              </div>
            </div>

            {/* Status Alert Banner */}
            {currentDaySubmission?.status === 'APPROVED' ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    Day Closed & Formally Approved by Admin
                  </p>
                  <p className="text-emerald-800 dark:text-emerald-300">
                    Approved by <span className="font-bold">{currentDaySubmission.approved_by_name || 'Admin'}</span> on{' '}
                    <span className="font-bold">{formatDateTime(currentDaySubmission.approved_at || currentDaySubmission.approval_date)}</span>.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 pt-1.5 border-t border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold">
                    <span>Verified Cash Counted: ₹{Number(currentDaySubmission.verified_cash_amount || 0).toLocaleString('en-IN')}</span>
                    <span>•</span>
                    <span>Verified UPI: ₹{Number(currentDaySubmission.verified_upi_amount || 0).toLocaleString('en-IN')}</span>
                    {currentDaySubmission.admin_notes && (
                      <span className="w-full text-slate-600 dark:text-slate-300 font-normal italic">
                        Admin Note: "{currentDaySubmission.admin_notes}"
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : currentDaySubmission?.status === 'PENDING_APPROVAL' ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Submitted to Admin — Awaiting Physical Cash Count & Approval
                  </p>
                  <p className="text-amber-800 dark:text-amber-300">
                    Your collection report was submitted on <span className="font-semibold">{formatDateTime(currentDaySubmission.submitted_at)}</span>.
                    Please hand over ₹{Number(currentDaySubmission.cash_collected || 0).toLocaleString('en-IN')} in physical cash to Admin.
                  </p>
                  <p className="text-amber-700 dark:text-amber-400">
                    Admin can count and approve your day closing at any time or any subsequent day. You may re-submit notes if cash denominations change.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-indigo-900 dark:text-indigo-200">
                    Daily Shift Closing & Handover Preview
                  </p>
                  <p className="text-indigo-800 dark:text-indigo-300">
                    Review your collected amounts, chit-by-chit distribution, and subscriber pending dues. When you are done with your rounds, click "Submit Day Work to Admin" to transfer cash responsibility.
                  </p>
                </div>
              </div>
            )}

            {/* Unsubmitted Past Shifts Warning Banner (Separated by Date) */}
            {unsubmittedDays && unsubmittedDays.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200 font-heading">
                        Unsubmitted Past Shifts Detected ({unsubmittedDays.length} Days Pending)
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Amounts for previous dates and today remain completely segregated.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitAllUnsubmittedDays}
                    disabled={submittingAllDays}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingAllDays ? 'Submitting All...' : 'Submit All Separately'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {unsubmittedDays.map((unsub) => (
                    <div
                      key={unsub.work_date}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white font-heading">
                        <span>{formatDate(unsub.work_date)}</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400">Cash: ₹{unsub.cash_collected.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>UPI: ₹{unsub.upi_collected.toLocaleString('en-IN')}</span>
                        <span>Total: ₹{unsub.total_collected.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDaySubmitDate(unsub.work_date);
                            fetchDaySubmissionStatus(unsub.work_date);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Review & Submit Date →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPI Summary Cards */}
            {(() => {
              const liveCash = (routesData.members || [])
                .filter((m) => (m.is_paid || m.today_status === 'PAID') && m.payment_method === 'CASH')
                .reduce((s, m) => s + Number(m.collected_amount || 0), 0);
              const liveUpi = (routesData.members || [])
                .filter((m) => (m.is_paid || m.today_status === 'PAID') && m.payment_method !== 'CASH')
                .reduce((s, m) => s + Number(m.collected_amount || 0), 0);
              const liveTotal = liveCash + liveUpi;
              const liveReceipts = (routesData.members || []).filter((m) => m.is_paid || m.today_status === 'PAID').length;

              const totalCol = currentDaySubmission ? Number(currentDaySubmission.total_collected || 0) : liveTotal;
              const cashCol = currentDaySubmission ? Number(currentDaySubmission.cash_collected || 0) : liveCash;
              const upiCol = currentDaySubmission ? Number(currentDaySubmission.upi_collected || 0) : liveUpi;
              const recCount = currentDaySubmission ? Number(currentDaySubmission.total_receipts || 0) : liveReceipts;
              const visitedStops = currentDaySubmission ? Number(currentDaySubmission.total_stops_visited || 0) : completedTasksCount;
              const pendingStops = currentDaySubmission ? Number(currentDaySubmission.total_stops_pending || 0) : pendingTasksCount;

              const cashPct = totalCol > 0 ? Math.round((cashCol / totalCol) * 100) : 0;
              const upiPct = totalCol > 0 ? 100 - cashPct : 0;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Collected</div>
                      <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                        ₹{totalCol.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {recCount} receipts issued
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Banknote className="w-3 h-3" />
                        <span>Cash Handover</span>
                      </div>
                      <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        ₹{cashCol.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        Physical Cash to Admin
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <QrCode className="w-3 h-3" />
                        <span>UPI / Online</span>
                      </div>
                      <div className="text-xl font-black text-purple-700 dark:text-purple-300 mt-1">
                        ₹{upiCol.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                        Bank Verified UPI
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Route Progress</div>
                      <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
                        {visitedStops} / {visitedStops + pendingStops}
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                        {pendingStops} stops remaining
                      </div>
                    </div>
                  </div>

                  {/* Cash vs UPI Analysis Graph Bar */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        Payment Split & Route Analysis
                      </span>
                      <span>Total: ₹{totalCol.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${cashPct}%` }}
                        title={`Cash: ₹${cashCol.toLocaleString('en-IN')} (${cashPct}%)`}
                      />
                      <div
                        className="bg-purple-500 h-full transition-all duration-500"
                        style={{ width: `${upiPct}%` }}
                        title={`UPI: ₹${upiCol.toLocaleString('en-IN')} (${upiPct}%)`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Cash: ₹{cashCol.toLocaleString('en-IN')} ({cashPct}%)
                      </span>
                      <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                        UPI: ₹{upiCol.toLocaleString('en-IN')} ({upiPct}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Chit-by-Chit Breakdown Accordion */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Chit-by-Chit Collected & Pending Dues Roster</span>
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Click any chit scheme to view paid vs unpaid members
                </span>
              </div>

              {(() => {
                let breakdownItems = [];
                if (currentDaySubmission?.chit_breakdown_json) {
                  try {
                    breakdownItems = typeof currentDaySubmission.chit_breakdown_json === 'string'
                      ? JSON.parse(currentDaySubmission.chit_breakdown_json)
                      : currentDaySubmission.chit_breakdown_json;
                  } catch (_) {
                    breakdownItems = [];
                  }
                } else {
                  // Generate preview live from routesData
                  breakdownItems = (routesData.groups || []).map((g) => {
                    const gMembers = (routesData.members || []).filter((m) => m.group_id === g.id);
                    const pMembers = gMembers.filter((m) => m.is_paid || m.today_status === 'PAID');
                    const uMembers = gMembers.filter((m) => !m.is_paid && m.today_status !== 'PAID');
                    const cash = pMembers.filter((m) => m.payment_method === 'CASH').reduce((s, m) => s + Number(m.collected_amount || 0), 0);
                    const upi = pMembers.filter((m) => m.payment_method !== 'CASH').reduce((s, m) => s + Number(m.collected_amount || 0), 0);
                    return {
                      group_id: g.id,
                      group_name: g.group_name,
                      group_code: g.group_code,
                      frequency: g.frequency,
                      chit_type: g.chit_type,
                      installment_amount: Number(g.installment_amount || 0),
                      total_members: gMembers.length,
                      paid_members_count: pMembers.length,
                      unpaid_members_count: uMembers.length,
                      cash_collected: cash,
                      upi_collected: upi,
                      total_collected: cash + upi,
                      receipts_count: pMembers.length,
                      paid_roster: pMembers.map((m) => ({
                        member_id: m.member_id,
                        member_code: m.member_code,
                        full_name: m.full_name,
                        ticket_number: m.ticket_number,
                        phone: m.phone,
                        amount_paid: Number(m.collected_amount || g.installment_amount || 0),
                        payment_method: m.payment_method || 'CASH',
                        receipt_number: m.receipt_number || null,
                        collection_time: m.collection_time || null,
                      })),
                      unpaid_roster: uMembers.map((m) => ({
                        member_id: m.member_id,
                        member_code: m.member_code,
                        full_name: m.full_name,
                        ticket_number: m.ticket_number,
                        phone: m.phone,
                        pending_amount: Number(m.pending_amount || g.installment_amount || 0),
                        notes: m.today_notes || null,
                      })),
                    };
                  });
                }

                if (!Array.isArray(breakdownItems) || breakdownItems.length === 0) {
                  return (
                    <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                      No active chits assigned for this date.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {breakdownItems.map((chit) => {
                      const chitGid = chit.group_id || chit.groupId;
                      const isExpanded = expandedChitSubmitId === chitGid;
                      const totalAmt = Number(chit.total_collected ?? chit.totalCollected ?? 0);
                      const cashAmt = Number(chit.cash_collected ?? chit.cashCollected ?? 0);
                      const upiAmt = Number(chit.upi_collected ?? chit.upiCollected ?? 0);
                      const paidList = Array.isArray(chit.paid_roster || chit.paidMembers) ? (chit.paid_roster || chit.paidMembers) : [];
                      const unpaidList = Array.isArray(chit.unpaid_roster || chit.unpaidMembers) ? (chit.unpaid_roster || chit.unpaidMembers) : [];
                      const hasCollections = totalAmt > 0;
                      return (
                        <div
                          key={chitGid}
                          className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden"
                        >
                          <div
                            onClick={() => setExpandedChitSubmitId(isExpanded ? null : chitGid)}
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                  chit.frequency === 'DAILY'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                                    : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700'
                                }`}
                              >
                                {chit.frequency}
                              </span>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{chit.group_name || chit.groupName}</span>
                                  <span className="text-xs text-slate-400 font-mono">({chit.group_code || chit.groupCode})</span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  Installment: ₹{Number(chit.installment_amount || 0).toLocaleString('en-IN')} • Paid: {chit.paid_members_count ?? paidList.length} / {chit.total_members ?? (paidList.length + unpaidList.length)} subscribers
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                  ₹{totalAmt.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Cash: ₹{cashAmt.toLocaleString('en-IN')} | UPI: ₹{upiAmt.toLocaleString('en-IN')}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Chit Roster: Paid & Unpaid Members */}
                          {isExpanded && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                              {/* Paid Members Section */}
                              <div>
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Paid Subscribers ({paidList.length})</span>
                                </div>
                                {(!paidList || paidList.length === 0) ? (
                                  <div className="text-xs text-slate-400 italic py-1">No payments collected for this chit today yet.</div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {paidList.map((p, idx) => (
                                      <div
                                        key={idx}
                                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <span>{p.full_name || p.memberName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">T#{p.ticket_number || p.ticketNumber}</span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">{p.payment_method || p.paymentMethod || 'CASH'}</span>
                                            {(p.receipt_number || p.receiptNumber) && <span>• Rcpt #{p.receipt_number || p.receiptNumber}</span>}
                                          </div>
                                        </div>
                                        <div className="text-right font-black text-emerald-600 dark:text-emerald-400">
                                          ₹{Number(p.amount_paid ?? p.amount ?? 0).toLocaleString('en-IN')}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Unpaid / Active Cycle Members Section */}
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    {chit.frequency === 'MONTHLY' ? (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-blue-700 dark:text-blue-400">
                                          Monthly Cycle Subscribers & Status ({unpaidList.length})
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                        <span className="text-rose-700 dark:text-rose-400">
                                          Unpaid Subscribers Today ({unpaidList.length})
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {chit.frequency === 'MONTHLY' && (
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 normal-case">
                                      {chit.statusNotice || 'Collected anytime during monthly cycle'}
                                    </span>
                                  )}
                                </div>
                                {(!unpaidList || unpaidList.length === 0) ? (
                                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1">
                                    ✓ All subscribers in this chit scheme have cleared their installments!
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {unpaidList.map((u, idx) => {
                                      const isMonthlyTimeLeft = chit.frequency === 'MONTHLY' && (u.hasTimeRemaining || u.statusType === 'TIME_REMAINING_NO_WORRY');
                                      return (
                                        <div
                                          key={idx}
                                          className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 border flex items-center justify-between text-xs ${
                                            isMonthlyTimeLeft
                                              ? 'border-blue-200 dark:border-blue-800/40'
                                              : 'border-rose-200 dark:border-rose-800/40'
                                          }`}
                                        >
                                          <div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                              <span>{u.full_name || u.memberName}</span>
                                              <span className="text-[10px] text-slate-400 font-mono">T#{u.ticket_number || u.ticketNumber}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                              {u.phone && <span>Ph: {u.phone}</span>}
                                              {u.notes && <span className="italic text-amber-600 dark:text-amber-400">"{u.notes}"</span>}
                                            </div>
                                            {isMonthlyTimeLeft && (
                                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                                ⏳ Time remaining this month (Due: {u.cycleDue || chit.cycle_due || 'Anchor Date'}) · No worry
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className={`text-xs font-black ${isMonthlyTimeLeft ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                              ₹{Number(u.pending_amount ?? u.amount ?? 0).toLocaleString('en-IN')}
                                            </div>
                                            <div className={`text-[10px] font-semibold uppercase ${isMonthlyTimeLeft ? 'text-blue-500' : 'text-rose-500'}`}>
                                              {isMonthlyTimeLeft ? 'Cycle Target' : (u.isDeadlineToday ? 'Deadline Today' : 'Pending Due')}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Handover Notes & Cash Denominations */}
            <form onSubmit={handleSubmitDayWork} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cash Denominations & Handover Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  disabled={currentDaySubmission?.status === 'APPROVED'}
                  value={daySubmitNotes}
                  onChange={(e) => setDaySubmitNotes(e.target.value)}
                  placeholder="e.g., Cash Count: ₹500x12, ₹200x5 = ₹7,000 in physical cash envelope. 2 members promised to clear dues tomorrow."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden disabled:opacity-60"
                />
              </div>

              {daySubmitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{daySubmitError}</span>
                </div>
              )}

              {daySubmitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{daySubmitSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDaySubmitModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                {currentDaySubmission?.status === 'APPROVED' ? (
                  <button
                    type="button"
                    disabled
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 opacity-80 cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Day Work Approved & Closed by Admin</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submittingDayWork}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {submittingDayWork ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Day Work...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{currentDaySubmission ? 'Re-Submit / Update Handover' : 'Submit Day Work to Admin'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Confirmation Dialog for Agent Logout */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Confirm Sign Out"
        message="Are you sure you want to log out from your Collection Agent account? Any unsaved notes will be cleared."
        confirmLabel="Yes, Sign Out"
        cancelLabel="Stay Logged In"
        variant="danger"
        icon={LogOut}
        subtext="Tip: All recorded cash collections are already safely stored in the MySQL database."
      />

      {/* Confirmation Dialog for Cash/Digital Collection */}
      {(() => {
        const selectedGrp = routesData.groups.find((g) => String(g.id) === String(collectForm.group_id));
        const selectedMem = routesData.members.find((m) => String(m.member_id) === String(collectForm.member_id) && String(m.group_id) === String(collectForm.group_id));
        const fullTargetAmt = Number(selectedGrp?.installment_amount || 0);
        const currentPaidInCycle = Number(selectedMem?.total_cycle_collected || 0);
        const enteredAmt = Number(collectForm.amount || 0);
        const totalPaidAfter = currentPaidInCycle + enteredAmt;
        const balanceAfter = Math.max(0, fullTargetAmt - totalPaidAfter);
        const isAdvancePayment = currentPaidInCycle >= fullTargetAmt;
        const isPartial = !isAdvancePayment && balanceAfter > 0;

        return (
          <ConfirmModal
            isOpen={showCollectConfirm}
            onClose={() => setShowCollectConfirm(false)}
            onConfirm={executeConfirmedCollection}
            isLoading={submitting}
            title={
              isAdvancePayment
                ? "Confirm Advance Payment Collection"
                : isPartial
                ? "Confirm Partial Payment Collection"
                : "Confirm Payment Collection"
            }
            message={`Are you sure you want to record ₹${enteredAmt.toLocaleString('en-IN')} via ${collectForm.payment_method} for ${
              selectedMem?.full_name || 'the selected subscriber'
            }?`}
            confirmLabel="Confirm & Issue Receipt"
            cancelLabel="Review Details"
            variant={isAdvancePayment ? "info" : isPartial ? "warning" : "success"}
            icon={Receipt}
            subtext={
              isAdvancePayment
                ? `Advance Payment Notice: ₹${enteredAmt.toLocaleString('en-IN')} will be safely recorded as advance payment credit for ${selectedMem?.full_name || 'this subscriber'} on date ${formatDate(collectForm.collection_date) || 'today'}.`
                : isPartial
                ? `Partial Payment Notice: ₹${enteredAmt.toLocaleString('en-IN')} will be recorded. The remaining deficit balance of ₹${balanceAfter.toLocaleString('en-IN')} will remain as Pending Due on this subscriber and chit scheme.`
                : "This action will issue an official collection receipt and immediately update the member's node to PAID (Green) across the entire system."
            }
          />
        );
      })()}
    </div>
  );
}
