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
} from 'lucide-react';
import { formatDate, formatTime } from '../utils/dateUtils';
import ConfirmModal from '../components/ConfirmModal';
import { getFriendlyErrorMessage } from '../utils/friendlyError';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import NotificationBell from '../components/NotificationBell';
import AnimatedChitBackground from '../components/AnimatedChitBackground';
import WelcomeCelebrationModal from '../components/WelcomeCelebrationModal';
import { smoothScrollTo } from '../utils/scrollHelper';

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routesData, setRoutesData] = useState({ groups: [], members: [], summary: {} });
  const [recentCollections, setRecentCollections] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'routes' | 'profile' | 'history'

  // Task Planner State (Ensures agent never forgets a collection stop)
  const [taskFilter, setTaskFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED' | 'REMARKS'
  const [taskFrequencyFilter, setTaskFrequencyFilter] = useState('ALL'); // 'ALL' | 'DAILY' | 'MONTHLY'
  const [taskSearch, setTaskSearch] = useState('');

  // Pagination for Recent Collections history tab
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // Separation of Daily vs Monthly Chits
  const [routeCategoryFilter, setRouteCategoryFilter] = useState('ALL'); // 'ALL' | 'DAILY_CHIT' | 'MONTHLY_CHIT'

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

  const openMemberInfo = (group, member) => {
    setSelectedMemberForInfo({ group, member });
    setShowMemberInfoModal(true);
  };

  // Today's Tasks calculations across all assigned routes and members
  const tasksList = useMemo(() => {
    const list = [];
    (routesData.groups || []).forEach((group) => {
      const groupMembers = (routesData.members || []).filter((m) => m.group_id === group.id);
      groupMembers.forEach((m) => {
        const expectedAmount = Number(group.installment_amount || 0);
        const hasCustomRemark =
          Boolean(m.today_notes) &&
          m.today_notes !== 'Awaiting payment' &&
          m.today_notes !== 'Awaiting today installment' &&
          m.today_notes !== 'Awaiting monthly installment';

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
          isPaid: Boolean(m.is_paid),
          statusLabel: m.status_label,
          notes: m.today_notes,
          hasCustomRemark,
          receiptNumber: m.receipt_number,
          paymentMethod: m.payment_method,
          collectionTime: m.collection_time,
          rawMember: m,
          rawGroup: group,
        });
      });
    });
    return list;
  }, [routesData.groups, routesData.members]);

  const totalTasksCount = tasksList.length;
  const completedTasksCount = tasksList.filter((t) => t.isPaid).length;
  const pendingTasksCount = tasksList.filter((t) => !t.isPaid).length;
  const remarksTasksCount = tasksList.filter((t) => t.hasCustomRemark).length;
  const taskProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const totalTargetExpected = useMemo(() => {
    return tasksList.reduce((sum, t) => sum + t.expectedAmount, 0);
  }, [tasksList]);

  const filteredTasks = useMemo(() => {
    return tasksList.filter((t) => {
      if (taskFrequencyFilter !== 'ALL' && t.frequency !== taskFrequencyFilter) return false;
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
  }, [tasksList, taskFilter, taskFrequencyFilter, taskSearch]);

  const loadAgentData = async () => {
    try {
      const [routesRes, collRes] = await Promise.all([
        api.get('/agent/my-routes'),
        api.get('/agent/collections'),
      ]);

      if (routesRes.data?.success) {
        setRoutesData(routesRes.data.data);
      }
      if (collRes.data?.success) {
        setRecentCollections(collRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load agent route data:', err);
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

  // Pre-fill modal for a specific member to collect
  const openCollectForMember = (groupId, memberId, defaultAmount) => {
    setCollectForm({
      group_id: String(groupId),
      member_id: String(memberId),
      amount: String(defaultAmount || ''),
      payment_method: 'CASH',
      payment_reference: '',
      notes: '',
    });
    setCollectError('');
    setShowCollectModal(true);
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

  // Request Confirmation before recording collection
  const handleRecordCollection = (e) => {
    e.preventDefault();
    setCollectError('');
    if (!collectForm.group_id || !collectForm.member_id || !collectForm.amount) {
      setCollectError('Please select both the Chit Group, Member, and enter an amount.');
      return;
    }
    setShowCollectConfirm(true);
  };

  // Execute Confirmed Collection
  const executeConfirmedCollection = async () => {
    setCollectError('');
    setSubmitting(true);

    try {
      const res = await api.post('/agent/collections', {
        group_id: parseInt(collectForm.group_id, 10),
        member_id: parseInt(collectForm.member_id, 10),
        amount: parseFloat(collectForm.amount),
        payment_method: collectForm.payment_method,
        payment_reference: collectForm.payment_reference || null,
        notes: collectForm.notes || null,
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
        groupId: selectedMemberForNote.group.id,
        memberId: selectedMemberForNote.member.member_id,
        stopId: selectedMemberForNote.member.ticket_number,
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
      date: new Date().toISOString().slice(0, 10),
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
    ? routesData.members.filter((m) => String(m.group_id) === String(collectForm.group_id))
    : routesData.members;

  // Separate Groups by Daily Chit vs Monthly Chit Schemes
  const dailyGroups = routesData.groups.filter(
    (g) => g.chit_type === 'DAILY_CHIT' || g.route_category === 'DAILY_ROUTE'
  );
  const monthlyGroups = routesData.groups.filter(
    (g) => g.chit_type === 'AUCTION_CHIT' || g.chit_type === 'DOUBLE_CHIT' || g.route_category === 'MONTHLY_ROUTE'
  );

  const displayedGroups = routesData.groups.filter((g) => {
    if (routeCategoryFilter === 'ALL') return true;
    if (routeCategoryFilter === 'DAILY_CHIT') {
      return g.chit_type === 'DAILY_CHIT' || g.route_category === 'DAILY_ROUTE';
    }
    if (routeCategoryFilter === 'MONTHLY_CHIT') {
      return g.chit_type === 'AUCTION_CHIT' || g.chit_type === 'DOUBLE_CHIT' || g.route_category === 'MONTHLY_ROUTE';
    }
    return true;
  });

  const paginatedHistory = recentCollections.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors relative overflow-x-hidden">
      {/* Lightly Animated Floating Chit Fund Motifs Background */}
      <AnimatedChitBackground />

      {/* Login Welcome Celebration with Ribbon & Smile Emoji 😊 */}
      <WelcomeCelebrationModal />

      {/* Floating Translucent Header Island (Separated from Body Page) */}
      <header className="sticky top-3 z-30 mx-3 sm:mx-6 flex items-center justify-between h-16 px-4 sm:px-6 rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-4 relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>ChitFund Pro</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                Agent
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Field Route Collection Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Notification Center */}
          <NotificationBell />

          {/* Refresh Data */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh routes"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
            title="Refresh routes & live status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            id="agent-theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Logout */}
          <button
            type="button"
            id="agent-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 border border-red-200 dark:border-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 px-3 sm:px-6 max-w-5xl w-full mx-auto space-y-5 animate-pageSlideIn pb-12">
        {/* Agent Profile & Quick Action Bar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {user?.full_name || 'Collection Agent'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Authorized Route Agent
                </span>
                <span className="text-xs text-slate-500 font-mono">@{user?.username}</span>
                {user?.phone && <span className="text-xs text-slate-400">· 📞 {user.phone}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Agent Profile</span>
            </button>

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
              }}
              disabled={routesData.groups.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Field Collection</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Today's Collections
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              ₹{Number(routesData.summary?.todayTotal || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Receipt className="w-3 h-3 text-slate-400" />
              <span>{routesData.summary?.totalCollectionsCount || 0} receipts issued</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Cash on Hand
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">To reconcile with admin</span>
          </div>

          <div
            onClick={() => {
              setActiveTab('tasks');
              smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
            }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Today's Tasks
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {taskProgressPercent}%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {completedTasksCount} / {totalTasksCount}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${taskProgressPercent}%` }}
              />
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab('profile');
              smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
            }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-purple-400 transition-colors"
          >
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Assigned Routes
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {routesData.groups?.length || 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {routesData.members?.length || 0} subscriber nodes · View Hub →
            </span>
          </div>
        </div>

        {/* View Switcher Tabs with Automatic Window Move */}
        <div id="agent-view-content" className="flex border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold scroll-mt-6 overflow-x-auto gap-1">
          {/* Tab 1: Today's Tasks */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('tasks');
              smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Today's Tasks & Stops</span>
            {pendingTasksCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                {pendingTasksCount} Pending
              </span>
            ) : totalTasksCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                All Done ✓
              </span>
            ) : null}
          </button>

          {/* Tab 2: Assigned Routes & 2D Map */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('routes');
              smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'routes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Assigned Routes & Map ({routesData.groups?.length || 0})</span>
          </button>

          {/* Tab 3: Agent Profile & Route Hub */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Agent Profile & Route Hub</span>
          </button>

          {/* Tab 4: Collection Receipts History */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Receipts & History ({recentCollections?.length || 0})</span>
          </button>
        </div>

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
            {/* Top Task Progress & Summary Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                      Today's Task Planner & Collection Stops
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live stop checklist for all assigned daily & monthly subscribers so no collection is missed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-500">Target:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    ₹{totalTargetExpected.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(routesData.summary?.todayTotal || 0).toLocaleString('en-IN')} Collected
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">
                    {completedTasksCount} of {totalTasksCount} stops completed
                  </span>
                  <span className={pendingTasksCount === 0 && totalTasksCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}>
                    {taskProgressPercent}% Completed {pendingTasksCount === 0 && totalTasksCount > 0 ? '🎉 All Done!' : ''}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      pendingTasksCount === 0 && totalTasksCount > 0
                        ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    }`}
                    style={{ width: `${taskProgressPercent}%` }}
                  />
                </div>
              </div>

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

            {/* Task Items List */}
            {filteredTasks.length === 0 ? (
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
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div
                    key={`${task.groupId}-${task.memberId}`}
                    className={`p-4 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      task.isPaid
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
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
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {task.isPaid ? '✓' : `#${task.ticketNumber}`}
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
                            {task.groupName} · {task.frequency === 'DAILY' ? 'Daily Chit' : 'Monthly Chit'}
                          </span>
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
                            <span>Paid Today · Receipt #{task.receiptNumber || 'REC-ISSUED'} ({task.paymentMethod})</span>
                          </div>
                        ) : task.hasCustomRemark ? (
                          <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1 mt-1 bg-amber-100/60 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Remark: <strong>{task.notes}</strong></span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Awaiting installment payment</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Due Amount & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Due Amount</span>
                        <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                          ₹{task.expectedAmount.toLocaleString('en-IN')}
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
                              onClick={() => openCollectForMember(task.groupId, task.memberId, task.expectedAmount)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Collect</span>
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

              {/* Displayed Chit Group Routes */}
              {displayedGroups.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400">No chit groups found in this category.</p>
                </div>
              ) : (
                displayedGroups.map((group) => {
                  const groupMembers = routesData.members.filter((m) => m.group_id === group.id);
                  const paidCount = groupMembers.filter((m) => m.is_paid || m.today_status === 'PAID').length;
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
                              {isDaily ? `📅 Today's Collection Round (${formatDate(new Date())})` : '🗓️ Current Monthly Cycle Collection'}
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
                              const isPaid = member.is_paid || member.today_status === 'PAID';

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
                                                text={member.cycle_notes || member.today_notes || (isDaily ? 'Awaiting today installment' : 'Awaiting monthly installment')}
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
            </div>
          )
        ) : activeTab === 'profile' ? (
          /* =========================================================================
             TAB 3: AGENT PROFILE & ROUTE HUB (Directory of routes & useful tools)
             ========================================================================= */
          <div className="space-y-5">
            {/* 1. Agent Identity Dossier */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-[0_8px_20px_-4px_rgba(59,130,246,0.5)]">
                    {user?.full_name?.charAt(0) || 'A'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                        {user?.full_name || 'Collection Agent'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
                        ● Active Status
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Username: @{user?.username} · Staff ID: AGT-{String(user?.id || '1').padStart(4, '0')}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium flex-wrap">
                      <span>📞 {user?.phone || 'Phone on file'}</span>
                      <span>·</span>
                      <span>🛡️ Field Route Cash Custodian</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href="tel:+919876543210"
                    className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call Head Office Helpline</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Day Sheet</span>
                  </button>
                </div>
              </div>

              {/* Quick Credential Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Routes</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{routesData.groups.length} Active Routes</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Subscribers</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">{routesData.members.length} Members</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cash on Hand</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{Number(routesData.summary?.todayCash || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Receipts Today</span>
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400">{routesData.summary?.totalCollectionsCount || 0} Issued</span>
                </div>
              </div>
            </div>

            {/* 2. Route Directory: How Many Routes Are There */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Assigned Routes Directory ({routesData.groups.length} Routes)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {routesData.summary?.dailyGroupsCount || 0} Daily · {routesData.summary?.monthlyGroupsCount || 0} Monthly
                </span>
              </div>

              {routesData.groups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No active chit group routes currently assigned.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {routesData.groups.map((group) => {
                    const groupMembers = routesData.members.filter((m) => m.group_id === group.id);
                    const paidCount = groupMembers.filter((m) => m.is_paid).length;
                    const percent = groupMembers.length > 0 ? Math.round((paidCount / groupMembers.length) * 100) : 0;

                    return (
                      <div
                        key={group.id}
                        className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-blue-400 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {group.group_name}
                              </span>
                              <span className="font-mono text-xs text-slate-400">({group.group_code})</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{group.location_name || 'Standard Coverage Area'}</span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              group.frequency === 'DAILY'
                                ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            }`}
                          >
                            {group.frequency === 'DAILY' ? 'Daily Chit' : 'Monthly Chit'}
                          </span>
                        </div>

                        {/* Financial specs */}
                        <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-slate-200/50 dark:border-slate-700/50">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Installment</span>
                            <span className="font-bold text-slate-900 dark:text-white">₹{Number(group.installment_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Subscribers</span>
                            <span className="font-bold text-slate-900 dark:text-white">{groupMembers.length} Members</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Total Pool</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">₹{Number(group.total_pool_amount).toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-slate-500">
                            <span>Cycle Progress</span>
                            <span>{paidCount} of {groupMembers.length} Collected ({percent}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Switch to 2D trajectory view */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('routes');
                            smoothScrollTo('agent-view-content', { offset: 32, behavior: 'smooth' });
                          }}
                          className="w-full py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Open in 2D Route Trajectory</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
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
                    <li>Verify all UPI receipts have matching reference numbers.</li>
                    <li>Ensure every collected subscriber was issued an official receipt.</li>
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
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
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
      </main>

      {/* Collect Modal (Synchronous Payment Entry) */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
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

            <form onSubmit={handleRecordCollection} className="p-4 sm:p-5 space-y-3.5">
              {collectError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{collectError}</span>
                </div>
              )}

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
                      {g.group_name} ({g.group_code}) — ₹{g.installment_amount}
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
                  onChange={(e) => setCollectForm({ ...collectForm, member_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">Select Member</option>
                  {eligibleMembers.map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      #{m.ticket_number} - {m.full_name} ({m.phone}) {m.is_paid ? '✓ Already Paid' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={collectForm.amount}
                  onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

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

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
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
        </div>
      )}

      {/* Unpaid Remark / Note Modal (Synchronous Not-Paid Entry) */}
      {showNoteModal && selectedMemberForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
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
                  {selectedMemberForNote.group.group_name} ({selectedMemberForNote.group.group_code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subscriber Member:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  #{selectedMemberForNote.member.ticket_number} - {selectedMemberForNote.member.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Installment Due:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  ₹{Number(selectedMemberForNote.group.installment_amount).toLocaleString('en-IN')}
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
        </div>
      )}

      {/* Printable Receipt Modal with Final Success Animation */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-confirmScale">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-successPop shadow-md shadow-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Payment Receipt</h3>
              <p className="text-xs text-slate-400 font-mono">{receiptModal.receiptNumber}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-900 dark:text-white">{receiptModal.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Group:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{receiptModal.groupName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{Number(receiptModal.amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{receiptModal.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agent:</span>
                <span className="text-slate-700 dark:text-slate-300">{receiptModal.agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">{receiptModal.date}</span>
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
        </div>
      )}

      {/* Member Information Form Modal */}
      {showMemberInfoModal && selectedMemberForInfo && (() => {
        const { group, member } = selectedMemberForInfo;
        const isPaid = member.is_paid || member.today_status === 'PAID';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-xs ${
                      isPaid ? 'bg-emerald-600' : 'bg-rose-600'
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
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>NOT PAID</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ticket #{member.ticket_number} · {group.group_name} ({group.group_code})
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
                      value={member.full_name}
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
                      value={member.member_code || `MEM-${member.member_id}`}
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
                        value={member.phone || 'None'}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                      />
                      {member.phone && (
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
                      value={member.alternate_phone || 'None Registered'}
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
                      value={member.address || `${group.location_name} (Route Stop #${member.ticket_number})`}
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
                      value={`${member.kyc_type || 'Aadhaar Card'}: ${member.kyc_number || 'Verified'}`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Installment Due
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${Number(group.installment_amount).toLocaleString('en-IN')}`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400"
                    />
                  </div>
                </div>

                {/* Status Box */}
                {isPaid ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Payment Collected & Reconciled</span>
                    </div>
                    <div className="font-mono text-[11px]">
                      Receipt: <strong>{member.receipt_number || 'REC-TODAY'}</strong> · ₹
                      {Number(member.collected_amount || group.installment_amount).toLocaleString('en-IN')} (
                      {member.payment_method || 'CASH'})
                      {member.collection_time && ` at ${formatTime(member.collection_time)}`}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Payment Awaiting Collection</span>
                    </div>
                    <div>Agent Remark: <strong>{member.today_notes || 'Awaiting payment'}</strong></div>
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
                        openCollectForMember(group.id, member.member_id, group.installment_amount);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Collect / Paid</span>
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
          </div>
        );
      })()}

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
      <ConfirmModal
        isOpen={showCollectConfirm}
        onClose={() => setShowCollectConfirm(false)}
        onConfirm={executeConfirmedCollection}
        isLoading={submitting}
        title="Confirm Payment Collection"
        message={`Are you sure you want to record ₹${Number(collectForm.amount || 0).toLocaleString('en-IN')} via ${collectForm.payment_method} for ${
          routesData.members.find((m) => String(m.member_id) === String(collectForm.member_id))?.full_name || 'the selected subscriber'
        }?`}
        confirmLabel="Confirm & Issue Receipt"
        cancelLabel="Review Details"
        variant="success"
        icon={Receipt}
        subtext="This action will issue an official collection receipt and immediately update the member's node to PAID (Green) across the entire system."
      />
    </div>
  );
}
