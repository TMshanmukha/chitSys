import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRealtimeSync } from '../context/RealtimeContext';
import api from '../api/client';
import {
  Layers,
  Users,
  UserCheck,
  Receipt,
  PlusCircle,
  Search,
  MapPin,
  Calendar,
  Wallet,
  Smartphone,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  Printer,
  Download,
  TrendingUp,
  Filter,
  Clock,
  Save,
  Building2,
  Sparkles,
  RefreshCw,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Gavel,
  UserPlus,
  AlertTriangle,
  Info,
  ArrowLeft,
  MessageSquare,
  Phone,
  Edit3,
  PowerOff,
  Power,
  PauseCircle,
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime, getServerYMD, getServerDate } from '../utils/dateUtils';
import ChitHistoryModal from '../components/ChitHistoryModal';
import ChitCompletionModal from '../components/ChitCompletionModal';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import { smoothScrollTo, scrollToFormOrModal } from '../utils/scrollHelper';
import ModalPortal from '../components/ModalPortal';
import { sendWhatsAppMessage, getReceiptWhatsAppText, getPassbookWhatsAppText, getPaymentReminderWhatsAppText } from '../utils/whatsappUtils';


/* Helper to dynamically generate guaranteed collision-free unique chit scheme codes */
export const generateNextGroupCode = (frequency = 'DAILY', chitType = 'AUCTION_CHIT', existingGroups = []) => {
  const isDaily = frequency === 'DAILY';
  const typeCode = chitType === 'DOUBLE_CHIT' ? 'DBL' : 'AUC';
  const prefix = `${isDaily ? 'DLY' : 'MTH'}-${typeCode}`;

  const usedCodes = new Set(
    (existingGroups || []).map((g) => (g.group_code || '').trim().toUpperCase())
  );

  let num = 101;
  while (usedCodes.has(`${prefix}-${num}`)) {
    num++;
  }
  return `${prefix}-${num}`;
};

/* =========================================================================
   1. CHIT GROUPS & SCHEMES MANAGEMENT (ChitBase Flow)
   ========================================================================= */
export function ChitGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [agents, setAgents] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Scheme Config, 2: Select Members, 3: Pre-flight Verification & Launch
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schemeTab, setSchemeTab] = useState('ALL'); // 'ALL' | 'DAILY_ALL' | 'DAILY_AUC' | 'DAILY_DBL' | 'MONTHLY_AUC' | 'MONTHLY_DBL'
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ACTIVE' | 'INACTIVE' | 'ALL'
  const [selectedHistoryGroupId, setSelectedHistoryGroupId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Chit Completion Modal State
  const [closingGroup, setClosingGroup] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Chit Status Inactive / Active Confirmation Modal State
  const [statusTargetGroup, setStatusTargetGroup] = useState(null);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Chit Scheme Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);

  // Quick Add Agent Modal state
  const [showQuickAgentModal, setShowQuickAgentModal] = useState(false);
  const [quickAgentForm, setQuickAgentForm] = useState({
    full_name: '',
    username: '',
    password: '',
    phone: '',
  });
  const [quickAgentSubmitting, setQuickAgentSubmitting] = useState(false);
  const [quickAgentError, setQuickAgentError] = useState('');

  // Quick Add Member Modal state
  const [showQuickMemberModal, setShowQuickMemberModal] = useState(false);
  const [quickMemberForm, setQuickMemberForm] = useState({
    full_name: '',
    phone: '',
    address: '',
  });
  const [quickMemberSubmitting, setQuickMemberSubmitting] = useState(false);
  const [quickMemberError, setQuickMemberError] = useState('');

  // Pagination for Chit Scheme Cards Grid
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsPageSize, setGroupsPageSize] = useState(6);
  const [groupsViewMode, setGroupsViewMode] = useState('grid'); // 'grid' | 'table'
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  const [form, setForm] = useState({
    group_code: 'DLY-DBL-101',
    group_name: '',
    chit_type: 'DOUBLE_CHIT', // Strictly DOUBLE_CHIT for daily routes
    route_category: 'DAILY_ROUTE', // 'DAILY_ROUTE' | 'MONTHLY_ROUTE'
    frequency: 'DAILY', // 'DAILY' | 'MONTHLY'
    location_name: '',
    installment_amount: '500',
    total_pool_amount: '10000', // Auto-calculated = 500 * 20
    duration_periods: '50',
    total_members_limit: '20',
    foreman_commission_percent: '5.0',
    max_bid_percent: '35.0',
    start_date: getServerYMD(),
    assigned_agent_id: '',
  });

  useEffect(() => {
    setGroupsPage(1);
  }, [schemeTab, statusFilter]);

  const loadData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [groupsRes, agentsRes, membersRes] = await Promise.all([
        api.get('/admin/groups'),
        api.get('/admin/agents'),
        api.get('/admin/members'),
      ]);
      if (groupsRes.data?.success) {
        const loadedGroups = groupsRes.data.data || [];
        setGroups(loadedGroups);
        setForm((prev) => ({
          ...prev,
          group_code: generateNextGroupCode(prev.frequency, prev.chit_type, loadedGroups),
        }));
      }
      if (agentsRes.data?.success) setAgents(agentsRes.data.data || []);
      if (membersRes.data?.success) setAllMembers(membersRes.data.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeSync(['groups', 'agents', 'members'], () => {
    loadData(true);
  });

  const handleFrequencySelect = (freq) => {
    const isDaily = freq === 'DAILY';
    setForm((prev) => {
      // Daily chits strictly run as DOUBLE_CHIT (Auction Chit blocked for daily)
      // Monthly chits strictly run as AUCTION_CHIT (Double Chit blocked for monthly)
      const nextType = isDaily ? 'DOUBLE_CHIT' : 'AUCTION_CHIT';
      const dur = isDaily ? '50' : '20';
      const inst = isDaily ? (parseFloat(prev.installment_amount || '0') < 5000 && parseFloat(prev.installment_amount || '0') > 0 ? prev.installment_amount : '500') : (parseFloat(prev.installment_amount || '0') >= 5000 ? prev.installment_amount : '25000');
      const members = parseInt(prev.total_members_limit || '20', 10);
      const pool = String(Math.round(parseFloat(inst || '0') * members));
      const nextCode = generateNextGroupCode(freq, nextType, groups);
      return {
        ...prev,
        frequency: freq,
        chit_type: nextType,
        route_category: isDaily ? 'DAILY_ROUTE' : 'MONTHLY_ROUTE',
        duration_periods: dur,
        installment_amount: inst,
        total_pool_amount: pool,
        group_code: nextCode,
      };
    });
  };

  const handleSchemeTypeSelect = (type) => {
    setForm((prev) => {
      // Daily strictly uses DOUBLE_CHIT; Monthly strictly uses AUCTION_CHIT
      if (prev.frequency === 'DAILY' && type === 'AUCTION_CHIT') {
        return prev; // Blocked for daily
      }
      if (prev.frequency === 'MONTHLY' && type === 'DOUBLE_CHIT') {
        return prev; // Blocked for monthly
      }
      const effectiveType = prev.frequency === 'DAILY' ? 'DOUBLE_CHIT' : 'AUCTION_CHIT';
      const isDaily = prev.frequency === 'DAILY';
      const dur = isDaily ? '50' : '20';
      const inst = prev.installment_amount || (isDaily ? '500' : '25000');
      const members = parseInt(prev.total_members_limit || '20', 10);
      const pool = String(Math.round(parseFloat(inst || '0') * members));
      const nextCode = generateNextGroupCode(prev.frequency, effectiveType, groups);
      return {
        ...prev,
        chit_type: effectiveType,
        duration_periods: dur,
        installment_amount: inst,
        total_pool_amount: pool,
        group_code: nextCode,
      };
    });
  };

  const handleFinancialFieldChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      const inst = parseFloat(field === 'installment_amount' ? value : prev.installment_amount) || 0;
      const members = parseInt(field === 'total_members_limit' ? value : prev.total_members_limit, 10) || 0;
      // Auto-compute total pool: installment * total_members
      if (inst > 0 && members > 0) {
        updated.total_pool_amount = String(Math.round(inst * members));
      }
      return updated;
    });
  };

  const handleStep1Next = () => {
    setError('');
    if (!form.group_code || !form.group_code.trim()) {
      setError('Please provide or generate a valid Scheme Code before proceeding.');
      return;
    }
    if (!form.group_name.trim()) {
      setError('Please provide a Scheme Name (e.g. Market Daily Auction Pool) before proceeding.');
      return;
    }
    if (!form.location_name.trim()) {
      setError('Please specify the Route Location / Geographic Track before proceeding.');
      return;
    }
    if (!form.assigned_agent_id) {
      setError('⚠️ Collection Agent Required: You must assign this chit scheme to a collection agent before proceeding.');
      return;
    }
    if (parseFloat(form.installment_amount || '0') <= 0) {
      setError('Installment amount must be greater than ₹0.');
      return;
    }
    if (parseInt(form.total_members_limit || '0', 10) <= 0) {
      setError('Subscribers limit must be at least 1.');
      return;
    }
    setWizardStep(2);
  };

  const toggleMemberSelection = (memberId) => {
    setError('');
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        const target = parseInt(form.total_members_limit || '20', 10);
        if (prev.length >= target) {
          setError(`You have already selected the required capacity of ${target} subscribers. Deselect a member or proceed to Step 3.`);
          return prev;
        }
        return [...prev, memberId];
      }
    });
  };

  const handleAutoSelectMembers = () => {
    setError('');
    const target = parseInt(form.total_members_limit || '20', 10);
    const available = allMembers.slice(0, target).map((m) => m.id);
    setSelectedMemberIds(available);
    if (available.length < target) {
      setError(`Auto-selected all ${available.length} registered subscribers. You still need ${target - available.length} more subscriber(s). Use "+ Quick Add Member" below.`);
    }
  };

  const handleDeselectAllMembers = () => {
    setSelectedMemberIds([]);
    setError('');
  };

  const handleQuickAddAgent = async (e) => {
    e.preventDefault();
    setQuickAgentError('');
    setQuickAgentSubmitting(true);
    try {
      const res = await api.post('/admin/agents', {
        ...quickAgentForm,
        role: 'COLLECTION_AGENT',
        assigned_business: 'CHITFUND',
      });
      const newAgentId = res.data?.agentId || res.data?.userId;
      // Refresh agents list
      const agentsRes = await api.get('/admin/agents');
      if (agentsRes.data?.success) {
        setAgents(agentsRes.data.data || []);
      }
      // Auto-assign newly created agent to this scheme
      if (newAgentId) {
        setForm((prev) => ({ ...prev, assigned_agent_id: String(newAgentId) }));
      }
      setShowQuickAgentModal(false);
      setQuickAgentForm({ full_name: '', username: '', password: '', phone: '' });
    } catch (err) {
      setQuickAgentError(err.response?.data?.message || err.message || 'Failed to create collection agent');
    } finally {
      setQuickAgentSubmitting(false);
    }
  };

  const handleQuickAddMember = async (e) => {
    e.preventDefault();
    setQuickMemberError('');
    setQuickMemberSubmitting(true);
    try {
      const res = await api.post('/admin/members', {
        full_name: quickMemberForm.full_name,
        phone: quickMemberForm.phone,
        address: quickMemberForm.address,
      });
      const newMemberId = res.data?.memberId;
      // Refresh members list
      const membersRes = await api.get('/admin/members');
      if (membersRes.data?.success) {
        setAllMembers(membersRes.data.data || []);
      }
      // Auto-select this newly registered subscriber
      if (newMemberId) {
        setSelectedMemberIds((prev) => (prev.includes(newMemberId) ? prev : [...prev, newMemberId]));
      }
      setShowQuickMemberModal(false);
      setQuickMemberForm({ full_name: '', phone: '', address: '' });
    } catch (err) {
      setQuickMemberError(err.response?.data?.message || err.message || 'Failed to register subscriber');
    } finally {
      setQuickMemberSubmitting(false);
    }
  };

  const handleOpenEditGroup = async (group) => {
    try {
      setError('');
      setSuccess('');
      setIsEditMode(true);
      setEditingGroupId(group.id);

      // Fetch group details to get enrolled members and assigned agent
      const res = await api.get(`/admin/groups/${group.id}`);
      const detail = res.data?.data || group;
      const enrolledMembers = detail.members || [];
      const assignedAgents = detail.agents || [];
      const firstAgentId = assignedAgents[0]?.agent_id || (group.assigned_agent_ids ? String(group.assigned_agent_ids).split(',')[0]?.trim() : '');

      setForm({
        group_code: detail.group_code || group.group_code || '',
        group_name: detail.group_name || group.group_name || '',
        chit_type: detail.chit_type || group.chit_type || 'DOUBLE_CHIT',
        route_category: detail.route_category || group.route_category || 'DAILY_ROUTE',
        frequency: detail.frequency || group.frequency || 'DAILY',
        location_name: detail.location_name || group.location_name || '',
        installment_amount: String(detail.installment_amount || group.installment_amount || '500'),
        total_pool_amount: String(detail.total_pool_amount || group.total_pool_amount || '10000'),
        duration_periods: String(detail.duration_periods || group.duration_periods || '50'),
        total_members_limit: String(detail.total_members_limit || group.total_members_limit || '20'),
        foreman_commission_percent: String(detail.foreman_commission_percent || group.foreman_commission_percent || '5.0'),
        max_bid_percent: String(detail.max_bid_percent || group.max_bid_percent || '35.0'),
        start_date: detail.start_date ? String(detail.start_date).slice(0, 10) : getServerYMD(),
        assigned_agent_id: String(firstAgentId || ''),
      });

      setSelectedMemberIds(enrolledMembers.map((m) => m.member_id));
      setWizardStep(1);
      setShowModal(true);
      scrollToFormOrModal('chit-scheme-modal');
    } catch (err) {
      console.error('Failed to open group for edit:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load chit scheme details for editing.');
    }
  };

  const handleCreateGroup = async () => {
    setError('');
    setSuccess('');
    if (!form.assigned_agent_id) {
      setError('⚠️ Collection Agent Required: You must assign this chit scheme to a collection agent before saving.');
      setWizardStep(1);
      return;
    }
    const targetMembers = parseInt(form.total_members_limit || '20', 10);
    if (selectedMemberIds.length !== targetMembers) {
      setError(`Cannot save chit scheme: Scheme requires exactly ${targetMembers} subscribers, but you have selected ${selectedMemberIds.length} members.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        installment_amount: parseFloat(form.installment_amount),
        total_pool_amount: parseFloat(form.total_pool_amount),
        duration_periods: parseInt(form.duration_periods, 10),
        total_members_limit: targetMembers,
        foreman_commission_percent: parseFloat(form.foreman_commission_percent || 5),
        max_bid_percent: parseFloat(form.max_bid_percent || 35),
        assigned_agent_id: parseInt(form.assigned_agent_id, 10),
        member_ids: selectedMemberIds,
      };

      let res;
      if (isEditMode && editingGroupId) {
        res = await api.put(`/admin/groups/${editingGroupId}`, payload);
        setSuccess(res.data?.message || 'Chit scheme updated successfully.');
      } else {
        res = await api.post('/admin/groups', payload);
        setSuccess(res.data?.message || 'Chit group and route stops created successfully with all enrolled subscribers.');
      }

      setShowModal(false);
      setIsEditMode(false);
      setEditingGroupId(null);
      setWizardStep(1);
      setSelectedMemberIds([]);
      setForm({
        group_code: generateNextGroupCode('DAILY', 'DOUBLE_CHIT', groups),
        group_name: '',
        chit_type: 'DOUBLE_CHIT',
        route_category: 'DAILY_ROUTE',
        frequency: 'DAILY',
        location_name: '',
        installment_amount: '500',
        total_pool_amount: '10000',
        duration_periods: '50',
        total_members_limit: '20',
        foreman_commission_percent: '5.0',
        max_bid_percent: '35.0',
        start_date: getServerYMD(),
        assigned_agent_id: '',
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || (isEditMode ? 'Failed to update chit group' : 'Failed to create chit group'));
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusConfirmModal = (group) => {
    setStatusTargetGroup(group);
    setShowStatusConfirmModal(true);
    scrollToFormOrModal('chit-status-confirm-modal');
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusTargetGroup) return;
    setStatusUpdating(true);
    setError('');
    setSuccess('');
    try {
      const targetStatus = statusTargetGroup.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
      const res = await api.put(`/admin/chit-groups/${statusTargetGroup.id}/status`, {
        status: targetStatus,
      });
      if (res.data?.success) {
        setSuccess(res.data.message || `Chit scheme marked as ${targetStatus}.`);
        setShowStatusConfirmModal(false);
        setStatusTargetGroup(null);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update chit scheme status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    // 1. Status Filter (Active Schemes vs Completed / Inactive Schemes)
    if (statusFilter === 'ACTIVE') {
      if (g.status && g.status !== 'ACTIVE') return false;
    } else if (statusFilter === 'INACTIVE') {
      if (g.status !== 'COMPLETED' && g.status !== 'INACTIVE') return false;
    }

    if (groupSearchQuery.trim()) {
      const q = groupSearchQuery.toLowerCase();
      const match =
        (g.group_name || '').toLowerCase().includes(q) ||
        (g.group_code || '').toLowerCase().includes(q) ||
        (g.location_name || '').toLowerCase().includes(q) ||
        (g.assigned_agents || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (schemeTab === 'ALL') return true;
    const isDaily = g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE';
    const isMonthly = g.frequency === 'MONTHLY' || g.route_category === 'MONTHLY_ROUTE';

    if (schemeTab === 'DAILY_ALL') return isDaily;
    if (schemeTab === 'MONTHLY_ALL') return isMonthly;
    if (schemeTab === 'DAILY_AUC') return isDaily && g.chit_type === 'AUCTION_CHIT';
    if (schemeTab === 'DAILY_DBL') return isDaily && g.chit_type === 'DOUBLE_CHIT';
    if (schemeTab === 'MONTHLY_AUC') return isMonthly;
    return g.chit_type === schemeTab;
  });

  const paginatedGroups = filteredGroups.slice(
    (groupsPage - 1) * groupsPageSize,
    groupsPage * groupsPageSize
  );

  const filteredMembersList = allMembers.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const query = memberSearchQuery.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(query) ||
      m.phone?.toLowerCase().includes(query) ||
      m.member_code?.toLowerCase().includes(query) ||
      m.address?.toLowerCase().includes(query)
    );
  });

  const targetMembersCount = parseInt(form.total_members_limit || '20', 10);
  const selectedCount = selectedMemberIds.length;
  const isMismatch = selectedCount !== targetMembersCount;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>ChitBase Route & Scheme Portfolio</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Chit Schemes & Routes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage Daily Auction Chits, Daily Double Chits, and Monthly Auction Chits
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsEditMode(false);
            setEditingGroupId(null);
            setSelectedMemberIds([]);
            const nextCode = generateNextGroupCode(form.frequency, form.chit_type, groups);
            setForm({
              group_code: nextCode,
              group_name: '',
              chit_type: 'DOUBLE_CHIT',
              route_category: 'DAILY_ROUTE',
              frequency: 'DAILY',
              location_name: '',
              installment_amount: '500',
              total_pool_amount: '10000',
              duration_periods: '50',
              total_members_limit: '20',
              foreman_commission_percent: '5.0',
              max_bid_percent: '35.0',
              start_date: getServerYMD(),
              assigned_agent_id: '',
            });
            setShowModal(true);
            setWizardStep(1);
            setError('');
            scrollToFormOrModal('chit-scheme-modal');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Chit Scheme / Route</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search & View Switcher Toolbar for 100+ Chit Schemes */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search scheme name, code, territory, or agent..."
            value={groupSearchQuery}
            onChange={(e) => {
              setGroupSearchQuery(e.target.value);
              setGroupsPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          <span className="text-slate-400 font-medium">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredGroups.length}</strong> schemes
          </span>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setGroupsViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                groupsViewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setGroupsViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                groupsViewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Compact Table View (Optimal for 100+ Schemes)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs (Active vs Completed / Inactive) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ACTIVE');
              setGroupsPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>Active Schemes ({groups.filter((g) => g.status === 'ACTIVE' || !g.status).length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('INACTIVE');
              setGroupsPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 ${
              statusFilter === 'INACTIVE'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🏁</span>
            <span>Completed / Inactive ({groups.filter((g) => g.status === 'COMPLETED' || g.status === 'INACTIVE').length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setGroupsPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Schemes ({groups.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2">
          Displaying <strong>{filteredGroups.length}</strong> {statusFilter === 'ACTIVE' ? 'active' : statusFilter === 'INACTIVE' ? 'completed' : ''} schemes
        </div>
      </div>

      {/* Filter Tabs with Automatic Window Move */}
      <div id="chit-groups-list" className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scroll-mt-6">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1 shrink-0">Scheme View:</span>
        <button
          type="button"
          onClick={() => {
            setSchemeTab('ALL');
            smoothScrollTo('chit-groups-list', { offset: 32, behavior: 'smooth' });
          }}
          className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
            schemeTab === 'ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          All Schemes ({groups.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSchemeTab('DAILY_ALL');
            smoothScrollTo('chit-groups-list', { offset: 32, behavior: 'smooth' });
          }}
          className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
            schemeTab === 'DAILY_ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          🚚 All Daily Chits ({groups.filter((g) => g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE').length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSchemeTab('DAILY_AUC');
            smoothScrollTo('chit-groups-list', { offset: 32, behavior: 'smooth' });
          }}
          className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
            schemeTab === 'DAILY_AUC'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          🔨 Daily Auction ({groups.filter((g) => (g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE') && g.chit_type === 'AUCTION_CHIT').length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSchemeTab('DAILY_DBL');
            smoothScrollTo('chit-groups-list', { offset: 32, behavior: 'smooth' });
          }}
          className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
            schemeTab === 'DAILY_DBL'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          ⚡ Daily Double ({groups.filter((g) => (g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE') && g.chit_type === 'DOUBLE_CHIT').length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSchemeTab('MONTHLY_AUC');
            smoothScrollTo('chit-groups-list', { offset: 32, behavior: 'smooth' });
          }}
          className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
            schemeTab === 'MONTHLY_AUC'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          🏛️ Monthly Auction ({groups.filter((g) => (g.frequency === 'MONTHLY' || g.route_category === 'MONTHLY_ROUTE')).length})
        </button>
      </div>

      {/* Groups Grid or High-Density Compact Table */}
      {groupsViewMode === 'table' ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Scheme Code</th>
                  <th className="py-3 px-4">Group Name & Area</th>
                  <th className="py-3 px-4">Type & Frequency</th>
                  <th className="py-3 px-4 text-right">Installment</th>
                  <th className="py-3 px-4 text-right">Total Pool</th>
                  <th className="py-3 px-4 text-center">Members</th>
                  <th className="py-3 px-4">Custodian Agent</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">Loading chit schemes...</td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">No chit schemes match the filter or search criteria.</td>
                  </tr>
                ) : (
                  paginatedGroups.map((g) => {
                    const isDaily = g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE';
                    return (
                      <tr
                        key={g.id}
                        onClick={() => {
                          setSelectedHistoryGroupId(g.id);
                          setShowHistoryModal(true);
                          scrollToFormOrModal('chit-history-modal');
                        }}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          <div className="flex items-center gap-1.5">
                            <span>{g.group_code}</span>
                            {g.status === 'INACTIVE' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <div>{g.group_name}</div>
                          <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{g.location_name || 'Main Area'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isDaily
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
                          }`}>
                            {isDaily ? '🚚 Daily' : '🏛️ Monthly'} · {g.chit_type === 'DOUBLE_CHIT' ? 'Double' : 'Auction'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          <div>₹{parseFloat(g.installment_amount).toLocaleString('en-IN')}</div>
                          <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                            Pending: ₹{Number(g.total_pending_amount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          <div>₹{parseFloat(g.total_pool_amount).toLocaleString('en-IN')}</div>
                          {isDaily && (
                            <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-0.5" title="Sum of bid amounts (Reserved Pool)">
                              Reserve: ₹{parseFloat(g.reserved_amount || g.total_bid_discount || 0).toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="font-bold text-slate-900 dark:text-white">{g.enrolled_members}</span> / {g.total_members_limit}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                          {g.assigned_agents || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/collections?group_id=${g.id}`)}
                              className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white transition-colors text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Record payment for this chit scheme"
                            >
                              <span>💰</span>
                              <span>Collect</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditGroup(g)}
                              className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-800 transition-colors text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Edit chit scheme details"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {g.status === 'COMPLETED' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                                🏁 Closed
                              </span>
                            ) : g.status === 'INACTIVE' ? (
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                                  ⏸️ Inactive
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openStatusConfirmModal(g)}
                                  className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 transition-colors cursor-pointer"
                                  title="Reactivate chit scheme"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClosingGroup(g);
                                    setShowCompletionModal(true);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-300 dark:border-amber-700 transition-colors text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Check prerequisites and complete chit"
                                >
                                  <span>🏁</span>
                                  <span>Complete</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openStatusConfirmModal(g)}
                                  className="p-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                                  title="Mark chit as Inactive (pause collections)"
                                >
                                  <PowerOff className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <span
                              onClick={() => {
                                setSelectedHistoryGroupId(g.id);
                                setShowHistoryModal(true);
                                scrollToFormOrModal('chit-history-modal');
                              }}
                              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer pl-1"
                            >
                              Ledger →
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading chit schemes...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
            <Layers className="w-10 h-10 mx-auto text-slate-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Chit Schemes Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "New Chit Scheme / Route" above to create Auction Chit or Double Chit schemes with direct subscriber enrolment.
            </p>
          </div>
        ) : (
          paginatedGroups.map((g) => {
            const isDaily = g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE';
            const schemeLabel = isDaily
              ? g.chit_type === 'DOUBLE_CHIT'
                ? 'Daily Double Chit'
                : 'Daily Auction Chit'
              : 'Monthly Auction Chit';

            const badgeColor = isDaily
              ? g.chit_type === 'DOUBLE_CHIT'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';

            return (
              <div
                key={g.id}
                onClick={() => {
                  setSelectedHistoryGroupId(g.id);
                  setShowHistoryModal(true);
                  scrollToFormOrModal('chit-history-modal');
                }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-500 hover:shadow-md dark:hover:border-blue-500 transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                          {g.group_code}
                        </span>
                        {g.status === 'INACTIVE' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {g.group_name}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${badgeColor}`}>
                      {schemeLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{g.location_name}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {isDaily ? '📅 Daily Route' : '🗓️ Monthly Route'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Installment</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(g.installment_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Total Pool</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(g.total_pool_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Unified Stats Box: Total Pending & Reserved Amount */}
                  <div className="mt-3 px-3 py-2 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                        <span>⏳</span>
                        <span>Total Pending:</span>
                      </div>
                      <span className="font-extrabold text-purple-900 dark:text-purple-200 font-mono text-xs">
                        ₹{Number(g.total_pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {isDaily && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-purple-200/60 dark:border-purple-800/40">
                        <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                          <span>⚡</span>
                          <span>Reserved Amount:</span>
                        </div>
                        <span className="font-extrabold text-purple-900 dark:text-purple-200 font-mono text-xs">
                          ₹{parseFloat(g.reserved_amount || g.total_bid_discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">{g.enrolled_members}</strong> / {g.total_members_limit} Members
                    </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400 truncate max-w-[140px]">
                      {g.assigned_agents ? `Agent: ${g.assigned_agents}` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-dashed border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/collections?group_id=${g.id}`)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Record collections for this chit scheme"
                    >
                      <span>💰</span>
                      <span>Collect</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditGroup(g)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Edit chit scheme details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {g.status === 'COMPLETED' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                        <span>🏁</span> Closed
                      </span>
                    ) : g.status === 'INACTIVE' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1">
                          <span>⏸️</span> Inactive
                        </span>
                        <button
                          type="button"
                          onClick={() => openStatusConfirmModal(g)}
                          className="px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Reactivate this chit scheme"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setClosingGroup(g);
                            setShowCompletionModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Check completion prerequisites and close chit"
                        >
                          <span>🏁</span>
                          <span>Complete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusConfirmModal(g)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer shadow-2xs"
                          title="Inactivate chit scheme (pause collections)"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <span
                      onClick={() => {
                        setSelectedHistoryGroupId(g.id);
                        setShowHistoryModal(true);
                        scrollToFormOrModal('chit-history-modal');
                      }}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>Ledger</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {filteredGroups.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <Pagination
            currentPage={groupsPage}
            totalItems={filteredGroups.length}
            pageSize={groupsPageSize}
            onPageChange={(page) => {
              setGroupsPage(page);
              smoothScrollTo('chit-groups-list', { offset: 32, behavior: 'smooth' });
            }}
            onPageSizeChange={setGroupsPageSize}
            pageSizeOptions={[6, 9, 12, 24]}
          />
        </div>
      )}

      {/* =========================================================================
         MULTI-STEP CREATION WIZARD: Step 1 (Config) -> Step 2 (Members) -> Step 3 (Review & Confirm)
         ========================================================================= */}
      <ModalPortal
        id="chit-scheme-modal"
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setIsEditMode(false);
          setEditingGroupId(null);
        }}
      >
        <div className="modal-card w-full max-w-4xl rounded-2xl sm:rounded-3xl !bg-white dark:!bg-[#0c1427] border-2 border-slate-200/90 dark:border-slate-800 shadow-[0_30px_90px_rgba(0,0,0,0.35)] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 my-auto sm:my-8 max-h-[95vh] sm:max-h-[94vh] overflow-y-auto transition-all animate-confirmScale ring-1 ring-black/5">
            
            {/* Wizard Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/25 shrink-0 ring-2 ring-white/20">
                  {isEditMode ? <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" /> : <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 dark:from-blue-300 dark:via-indigo-200 dark:to-purple-200 text-base sm:text-xl font-heading leading-tight truncate">
                    {isEditMode ? 'Edit Chit Scheme & Subscriber Allocation' : 'Chit Scheme Creation & Direct Enrolment Wizard'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Step {wizardStep} of 3: {wizardStep === 1 ? (isEditMode ? 'Update Scheme Rules' : 'Configure Scheme Rules') : wizardStep === 2 ? 'Select Required Subscribers' : (isEditMode ? 'Pre-Flight Verification & Update' : 'Pre-Flight Verification & Launch')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setIsEditMode(false);
                  setEditingGroupId(null);
                }}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar (Mobile Responsive Pills) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center sm:text-left transition-all cursor-pointer ${
                  wizardStep === 1
                    ? 'border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 hover:bg-blue-50/40 text-slate-700 dark:text-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${wizardStep === 1 ? 'bg-white text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>1</span>
                  <span className="font-bold text-xs sm:text-sm truncate">
                    <span className="sm:hidden">Rules</span>
                    <span className="hidden sm:inline">Configuration</span>
                  </span>
                </div>
                <p className={`hidden sm:block text-[11px] truncate mt-1 ${wizardStep === 1 ? 'text-blue-100' : 'text-slate-400'}`}>Rules, Pool, Date & Agent</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (form.group_name.trim()) setWizardStep(2);
                }}
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center sm:text-left transition-all cursor-pointer ${
                  wizardStep === 2
                    ? 'border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 hover:bg-blue-50/40 text-slate-700 dark:text-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${wizardStep === 2 ? 'bg-white text-blue-600' : selectedMemberIds.length === targetMembersCount ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                    {selectedMemberIds.length === targetMembersCount ? '✓' : '2'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm truncate">
                    <span className="sm:hidden">Members ({selectedMemberIds.length}/{targetMembersCount})</span>
                    <span className="hidden sm:inline">Subscribers ({selectedMemberIds.length}/{targetMembersCount})</span>
                  </span>
                </div>
                <p className={`hidden sm:block text-[11px] truncate mt-1 ${wizardStep === 2 ? 'text-blue-100' : 'text-slate-400'}`}>Direct Member Allocation</p>
              </button>

              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center sm:text-left transition-all cursor-pointer ${
                  wizardStep === 3
                    ? 'border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 hover:bg-blue-50/40 text-slate-700 dark:text-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${wizardStep === 3 ? 'bg-white text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>3</span>
                  <span className="font-bold text-xs sm:text-sm truncate">
                    <span className="sm:hidden">Launch</span>
                    <span className="hidden sm:inline">Verify & Launch</span>
                  </span>
                </div>
                <p className={`hidden sm:block text-[11px] truncate mt-1 ${wizardStep === 3 ? 'text-blue-100' : 'text-slate-400'}`}>Pre-flight Diagnostics</p>
              </button>
            </div>

            {error && (
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 sm:gap-3 border border-rose-200 dark:border-rose-900/50 shadow-xs">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold block">Action Required</span>
                  <span className="break-words">{error}</span>
                </div>
              </div>
            )}

            {/* STEP 1: SCHEME CONFIGURATION */}
            {wizardStep === 1 && (
              <div className="space-y-4 sm:space-y-6 animate-fadeIn">
                {/* Billing Frequency */}
                <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#10192e] border-2 border-slate-100 dark:border-slate-800 space-y-2.5 sm:space-y-3 shadow-xs">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Select Billing Frequency & Route Track *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handleFrequencySelect('DAILY')}
                      className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        form.frequency === 'DAILY'
                          ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/40 dark:to-slate-900 text-amber-950 dark:text-amber-100 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-amber-700 dark:text-amber-300">
                        <span className="text-lg">🚚</span>
                        <span>Daily Chit (Day-by-Day Route)</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        Installments collected daily by field agents with mobile waypoint tracking
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFrequencySelect('MONTHLY')}
                      className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        form.frequency === 'MONTHLY'
                          ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/40 dark:to-slate-900 text-blue-950 dark:text-blue-100 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-blue-700 dark:text-blue-300">
                        <span className="text-lg">🗓️</span>
                        <span>Monthly Chit (Month-by-Month)</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        Installments collected monthly with formal reverse auction sessions
                      </p>
                    </button>
                  </div>
                </div>

                {/* Scheme Mechanism: Daily Strictly Double Auction (Auction Chit Blocked) · Monthly Strictly Auction Chit */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#10192e] border-2 border-slate-100 dark:border-slate-800 space-y-2 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Scheme Mechanism *
                    </label>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60">
                      {form.frequency === 'DAILY' ? 'Daily Route · Double Auction Only' : 'Monthly Cycle · Auction Chit Only'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {/* Auction Chit (Blocked for Daily Chit) */}
                    <button
                      type="button"
                      disabled={form.frequency === 'DAILY'}
                      onClick={() => {
                        if (form.frequency !== 'DAILY') {
                          handleSchemeTypeSelect('AUCTION_CHIT');
                        }
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all ${
                        form.frequency === 'DAILY'
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 select-none'
                          : form.chit_type === 'AUCTION_CHIT'
                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/40 dark:to-slate-900 text-emerald-950 dark:text-emerald-100 shadow-md shadow-emerald-500/15 ring-2 ring-emerald-500/30 cursor-pointer'
                            : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer'
                      }`}
                      title={form.frequency === 'DAILY' ? 'Daily chits strictly use Double Auction' : 'Standard Auction Chit'}
                    >
                      <div className="font-bold text-xs sm:text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>🔨</span>
                          <span className={form.frequency === 'DAILY' ? 'line-through text-slate-400' : 'text-emerald-700 dark:text-emerald-300'}>
                            Auction Chit
                          </span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          form.frequency === 'DAILY'
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {form.frequency === 'DAILY' ? 'Blocked for Daily' : 'Single Draw'}
                        </span>
                      </div>
                    </button>

                    {/* Double Chit (Required for Daily Chit) */}
                    <button
                      type="button"
                      disabled={form.frequency === 'MONTHLY'}
                      onClick={() => {
                        if (form.frequency === 'DAILY') {
                          handleSchemeTypeSelect('DOUBLE_CHIT');
                        }
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all ${
                        form.frequency === 'MONTHLY'
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 select-none'
                          : form.chit_type === 'DOUBLE_CHIT'
                            ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-violet-50/40 dark:from-purple-950/40 dark:to-slate-900 text-purple-950 dark:text-purple-100 shadow-md shadow-purple-500/15 ring-2 ring-purple-500/30 cursor-pointer'
                            : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs cursor-pointer'
                      }`}
                      title={form.frequency === 'MONTHLY' ? 'Double Chit is exclusive to Daily schemes' : 'Daily Double Chit (Dual Draw)'}
                    >
                      <div className="font-bold text-xs sm:text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>⚡</span>
                          <span className={form.frequency === 'MONTHLY' ? 'line-through text-slate-400' : 'text-purple-700 dark:text-purple-300'}>
                            Daily Double Chit
                          </span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          form.frequency === 'MONTHLY'
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                            : 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300'
                        }`}>
                          {form.frequency === 'MONTHLY' ? 'Blocked for Monthly' : 'Double Auction'}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Core Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#10192e] border-2 border-slate-100 dark:border-slate-800 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Scheme Code (Auto-Generated) *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextCode = generateNextGroupCode(form.frequency, form.chit_type, groups);
                          setForm((prev) => ({ ...prev, group_code: nextCode }));
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Generate next available collision-free code"
                      >
                        <span>🔄 Refresh ID</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={form.group_code}
                        onChange={(e) => setForm({ ...form, group_code: e.target.value.toUpperCase() })}
                        placeholder="e.g. DLY-AUC-101"
                        className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 pointer-events-none">
                        Unique
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Scheme Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Market Daily Auction Pool"
                      value={form.group_name}
                      onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Route Location / Geographic Track *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Main Bazaar & Sector 4"
                      value={form.location_name}
                      onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Assign Collection Agent * <span className="text-rose-500 font-extrabold">(Required)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAgentError('');
                          setShowQuickAgentModal(true);
                          scrollToFormOrModal('quick-agent-modal');
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add New Agent</span>
                      </button>
                    </div>
                    <select
                      required
                      value={form.assigned_agent_id}
                      onChange={(e) => {
                        setForm({ ...form, assigned_agent_id: e.target.value });
                        if (error && error.includes('Collection Agent Required')) setError('');
                      }}
                      className={`w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs font-medium transition-all ${
                        !form.assigned_agent_id
                          ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <option value="">-- Select Collection Agent (Required) --</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.full_name} ({ag.phone})
                        </option>
                      ))}
                    </select>
                    {!form.assigned_agent_id && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                        <span>⚠️</span> You must assign this chit to an agent before proceeding.
                      </p>
                    )}
                    {agents.length === 0 && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                        No agents registered yet. Click "+ Add New Agent" above to create one right now.
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial Configuration with Auto-Calculated Total Pool (No Manual Typing) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Installment (₹) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.installment_amount}
                      onChange={(e) => handleFinancialFieldChange('installment_amount', e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-black text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Subscribers Limit *
                    </label>
                    <input
                      type="number"
                      required
                      value={form.total_members_limit}
                      onChange={(e) => handleFinancialFieldChange('total_members_limit', e.target.value)}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-black text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Duration ({form.frequency === 'DAILY' ? 'Days' : 'Months'}) *
                    </label>
                    <input
                      type="number"
                      required
                      value={form.duration_periods}
                      onChange={(e) => handleFinancialFieldChange('duration_periods', e.target.value)}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-black text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none shadow-2xs"
                    />
                  </div>

                  {/* AUTO CALCULATED TOTAL POOL BOX - VIBRANT LUXURY ACCENT */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-lg shadow-blue-500/30 flex flex-col justify-between ring-1 ring-white/20">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100 block font-heading">
                        Total Chit Pool (Auto)
                      </span>
                      <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-0.5 tracking-tight drop-shadow-xs">
                        ₹{parseFloat(form.total_pool_amount || '0').toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-[10px] text-blue-100/90 font-medium mt-1">
                      ₹{form.installment_amount} × {form.total_members_limit} subscribers
                    </span>
                  </div>
                </div>

                {/* Auction / Double Chit Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#10192e] border-2 border-slate-100 dark:border-slate-800 shadow-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Foreman Commission (%) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={form.foreman_commission_percent}
                      onChange={(e) => setForm({ ...form, foreman_commission_percent: e.target.value })}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Standard statutory commission: 5.0%</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Max Permissible Bid Discount (%) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={form.max_bid_percent}
                      onChange={(e) => setForm({ ...form, max_bid_percent: e.target.value })}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Cap on subscriber reverse bidding: 35.0%</p>
                  </div>
                </div>

                {/* Scheme Commencement Date */}
                <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#10192e] border-2 border-slate-100 dark:border-slate-800 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Scheme Commencement Date *
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Flexible: Any past, current, or future date allowed</span>
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Chits can be backdated for ledger import, initialized today, or scheduled for future launch.
                  </p>
                </div>

                {/* Step 1 Actions (Responsive for mobile) */}
                <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setIsEditMode(false);
                      setEditingGroupId(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer text-center justify-center"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Next: Select Members ({selectedMemberIds.length}/{targetMembersCount})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT ENROLLED MEMBERS */}
            {wizardStep === 2 && (
              <div className="space-y-4 sm:space-y-5 animate-fadeIn">
                {/* Capacity Counter & Progress Alert */}
                <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                  selectedCount === targetMembersCount
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : selectedCount < targetMembersCount
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-base min-w-0">
                      {selectedCount === targetMembersCount ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span className="truncate">Exact Capacity Met: {selectedCount} / {targetMembersCount} Enrolled</span>
                        </>
                      ) : selectedCount < targetMembersCount ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span className="truncate">Need {targetMembersCount - selectedCount} More Subscriber(s) ({selectedCount} / {targetMembersCount})</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span className="truncate">{selectedCount - targetMembersCount} Extra Members Selected ({selectedCount} / {targetMembersCount})</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 shadow-2xs self-start sm:self-auto">
                      {Math.round((selectedCount / Math.max(1, targetMembersCount)) * 100)}% Filled
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-2.5 sm:mt-3">
                    <div
                      className={`h-full transition-all duration-300 ${
                        selectedCount === targetMembersCount
                          ? 'bg-emerald-500'
                          : selectedCount > targetMembersCount
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (selectedCount / Math.max(1, targetMembersCount)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Action Bar: Search, Quick Add, Auto Select */}
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search registered members by name, phone, code..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoSelectMembers}
                        className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Quickly fill first available members"
                      >
                        ⚡ Auto-Select {targetMembersCount}
                      </button>

                      {selectedCount > 0 && (
                        <button
                          type="button"
                          onClick={handleDeselectAllMembers}
                          className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {/* Inline Quick Add Member */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMemberError('');
                        setShowQuickMemberModal(true);
                        scrollToFormOrModal('quick-member-modal');
                      }}
                      className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Quick Add Member</span>
                    </button>
                  </div>
                </div>

                {/* Members Selection List */}
                <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl overflow-hidden max-h-[300px] sm:max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {allMembers.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-slate-400 space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-sm font-semibold">No registered members found in the system</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowQuickMemberModal(true);
                          scrollToFormOrModal('quick-member-modal');
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        + Register First Subscriber Now
                      </button>
                    </div>
                  ) : filteredMembersList.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-slate-400 text-xs sm:text-sm">
                      No members match "{memberSearchQuery}".
                    </div>
                  ) : (
                    filteredMembersList.map((m) => {
                      const isSelected = selectedMemberIds.includes(m.id);
                      const ticketIndex = selectedMemberIds.indexOf(m.id);

                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMemberSelection(m.id)}
                          className={`p-2.5 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer transition-all active:scale-[0.99] rounded-xl ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100/60 animate-selectPop border-l-4 border-blue-600 shadow-xs'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer pointer-events-none shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {m.full_name}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                                  {m.member_code}
                                </span>
                              </div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 truncate">
                                <span>📞 {m.phone}</span>
                                {m.address && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate max-w-[120px] sm:max-w-[200px]">📍 {m.address}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="text-xs font-bold px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-blue-600 text-white font-mono shrink-0 shadow-2xs">
                              Ticket #{ticketIndex + 1}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 hover:text-blue-600 font-semibold shrink-0">
                              + Select
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Step 2 Actions */}
                <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setWizardStep(1);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Config</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setWizardStep(3);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next: Pre-Flight Verification & Launch</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PRE-FLIGHT VERIFICATION & LAUNCH */}
            {wizardStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Diagnostic Check Alert Box */}
                {isMismatch ? (
                  <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 space-y-3">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-amber-900 dark:text-amber-200 text-base">
                          Pre-Flight Validation Alert: Subscriber Count Mismatch
                        </h4>
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          {selectedCount < targetMembersCount
                            ? `This chit scheme is configured for exactly ${targetMembersCount} subscribers, but you currently have ${selectedCount} subscriber(s) selected (${targetMembersCount - selectedCount} missing).`
                            : `This chit scheme is configured for ${targetMembersCount} subscribers, but you currently have ${selectedCount} members selected (${selectedCount - targetMembersCount} extra).`}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                      <strong className="block text-slate-800 dark:text-slate-200 font-semibold">
                        💡 How to fix this mismatch:
                      </strong>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                        {selectedCount < targetMembersCount ? (
                          <>
                            <li>
                              Click{' '}
                              <button
                                type="button"
                                onClick={() => setWizardStep(2)}
                                className="font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                              >
                                Step 2: Select Members
                              </button>{' '}
                              and select {targetMembersCount - selectedCount} more subscriber(s).
                            </li>
                            <li>
                              Or click{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowQuickMemberModal(true);
                                  scrollToFormOrModal('quick-member-modal');
                                }}
                                className="font-bold text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
                              >
                                + Quick Add Member
                              </button>{' '}
                              to register new subscribers directly without losing this setup.
                            </li>
                            <li>
                              Or click{' '}
                              <button
                                type="button"
                                onClick={() => setWizardStep(1)}
                                className="font-bold text-purple-600 dark:text-purple-400 underline cursor-pointer"
                              >
                                Step 1: Configuration
                              </button>{' '}
                              and adjust the Subscribers Limit to {selectedCount}.
                            </li>
                          </>
                        ) : (
                          <>
                            <li>
                              Click{' '}
                              <button
                                type="button"
                                onClick={() => setWizardStep(2)}
                                className="font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                              >
                                Step 2: Select Members
                              </button>{' '}
                              and uncheck {selectedCount - targetMembersCount} subscriber(s).
                            </li>
                            <li>
                              Or click{' '}
                              <button
                                type="button"
                                onClick={() => setWizardStep(1)}
                                className="font-bold text-purple-600 dark:text-purple-400 underline cursor-pointer"
                              >
                                Step 1: Configuration
                              </button>{' '}
                              and increase the Subscribers Limit to {selectedCount}.
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : !form.assigned_agent_id ? (
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
                      <div className="text-xs sm:text-sm">
                        <span className="font-bold block">⚠️ Collection Agent Assignment Required</span>
                        <span>Please assign this chit scheme to an agent before launching.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-all shadow-xs"
                    >
                      Assign in Step 1
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-center gap-2.5 sm:gap-3">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold block">✓ All Pre-Flight Validations Passed!</span>
                      <span>
                        Exactly {targetMembersCount} subscribers verified and allocated to Tickets #1 through #{targetMembersCount}. Ledger accounts and agent route stops will be initialized automatically upon confirmation.
                      </span>
                    </div>
                  </div>
                )}

                {/* Scheme Blueprint Summary - Luxury Vibrant Glass Card */}
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1631] via-[#112046] to-[#070d1d] text-white border border-blue-500/30 shadow-2xl space-y-4 ring-1 ring-blue-400/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-900/60 pb-3 gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-amber-300 text-xs px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-800/80 shadow-xs">
                        {form.group_code}
                      </span>
                      <h4 className="font-black text-white text-base sm:text-lg tracking-tight">
                        {form.group_name}
                      </h4>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto shadow-xs">
                      {form.frequency === 'DAILY' ? 'Daily Route' : 'Monthly Cycle'} · {form.chit_type === 'DOUBLE_CHIT' ? 'Double Chit' : 'Auction Chit'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-blue-200/80 block text-[11px] font-medium">Installment</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">
                        ₹{parseFloat(form.installment_amount || '0').toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <span className="text-blue-200 block text-[11px] font-medium">Total Chit Pool</span>
                      <strong className="text-amber-300 font-mono text-sm sm:text-base font-black">
                        ₹{parseFloat(form.total_pool_amount || '0').toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-blue-200/80 block text-[11px] font-medium">Subscribers</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">
                        {selectedCount} / {targetMembersCount}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-blue-200/80 block text-[11px] font-medium">Start Date</span>
                      <strong className="text-white font-mono text-sm sm:text-base font-bold">
                        {formatDate(form.start_date)}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-blue-200/80 block text-[11px] font-medium">Commission</span>
                      <strong className="text-emerald-300 font-mono text-sm sm:text-base font-bold">
                        {form.foreman_commission_percent}%
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-blue-200/80 block text-[11px] font-medium">Max Bid Cap</span>
                      <strong className="text-purple-300 font-mono text-sm sm:text-base font-bold">
                        {form.max_bid_percent}%
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-blue-200/80 block text-[11px] font-medium">Location</span>
                      <strong className="text-white truncate block text-xs sm:text-sm font-semibold">
                        {form.location_name}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-blue-200/80 block text-[11px] font-medium">Field Agent</span>
                      <strong className={`truncate block text-xs sm:text-sm font-semibold ${!form.assigned_agent_id ? 'text-amber-300 font-bold' : 'text-white'}`}>
                        {agents.find((a) => String(a.id) === String(form.assigned_agent_id))?.full_name || '⚠️ Unassigned (Required)'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Enrolled Subscribers Ticket Allocation Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Sequential Ticket Allocations ({selectedMemberIds.length} Members)
                    </label>
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Edit Member Selection
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl max-h-[180px] sm:max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedMemberIds.map((mId, idx) => {
                      const member = allMembers.find((m) => m.id === mId);
                      return (
                        <div key={mId} className="p-2 sm:p-2.5 px-3 sm:px-4 flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className="font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0 text-[11px] sm:text-xs">
                              Ticket #{idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {member?.full_name || `Member #${mId}`}
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono shrink-0 text-[11px] sm:text-xs">
                            {member?.phone || 'No Phone'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 Actions (Mobile Responsive) */}
                <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setWizardStep(2);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Select Members</span>
                  </button>

                  <button
                    type="button"
                    disabled={isMismatch || !form.assigned_agent_id || submitting}
                    onClick={handleCreateGroup}
                    className={`w-full sm:w-auto px-6 sm:px-7 py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                      isMismatch || !form.assigned_agent_id || submitting
                        ? 'bg-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer ring-2 ring-emerald-500/30'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isEditMode ? 'Updating Scheme & Route Stops...' : 'Launching Scheme & Generating Stops...'}</span>
                      </>
                    ) : !form.assigned_agent_id ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Assign Agent in Step 1 to {isEditMode ? 'Update' : 'Launch'}</span>
                      </>
                    ) : isMismatch ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Fix Member Mismatch to {isEditMode ? 'Update' : 'Launch'} ({selectedCount}/{targetMembersCount})</span>
                      </>
                    ) : (
                      <>
                        {isEditMode ? <Save className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        <span>{isEditMode ? 'Update Chit Scheme' : 'Confirm & Launch Chit Group'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
      </ModalPortal>

      {/* =========================================================================
         INLINE MODAL: QUICK ADD COLLECTION AGENT (Zero Navigation Loss)
         ========================================================================= */}
      <ModalPortal
        id="quick-agent-modal"
        isOpen={showQuickAgentModal}
        onClose={() => setShowQuickAgentModal(false)}
      >
        <div className="modal-card w-full max-w-md rounded-2xl sm:rounded-3xl !bg-white dark:!bg-[#0c1427] border-2 border-slate-200/90 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 my-auto sm:my-8 max-h-[92vh] overflow-y-auto animate-confirmScale ring-1 ring-blue-500/20">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-950 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Quick Add Collection Agent
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAgentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickAgentError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900 shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{quickAgentError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddAgent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={quickAgentForm.full_name}
                  onChange={(e) => setQuickAgentForm({ ...quickAgentForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Phone Number (10 digits) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={quickAgentForm.phone}
                  onChange={(e) => setQuickAgentForm({ ...quickAgentForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Login Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ramesh_agent"
                  value={quickAgentForm.username}
                  onChange={(e) => setQuickAgentForm({ ...quickAgentForm, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={quickAgentForm.password}
                  onChange={(e) => setQuickAgentForm({ ...quickAgentForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none shadow-2xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowQuickAgentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAgentSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
                >
                  {quickAgentSubmitting ? 'Creating...' : 'Create & Select Agent'}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* =========================================================================
         INLINE MODAL: QUICK REGISTER MEMBER / SUBSCRIBER (Zero Navigation Loss)
         ========================================================================= */}
      <ModalPortal
        id="quick-member-modal"
        isOpen={showQuickMemberModal}
        onClose={() => setShowQuickMemberModal(false)}
      >
        <div className="modal-card w-full max-w-md rounded-2xl sm:rounded-3xl !bg-white dark:!bg-[#0c1427] border-2 border-slate-200/90 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 my-auto sm:my-8 max-h-[92vh] overflow-y-auto animate-confirmScale ring-1 ring-emerald-500/20">
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-950 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/25">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Quick Register New Subscriber
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickMemberModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickMemberError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900 shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{quickMemberError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Subscriber Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Varma"
                  value={quickMemberForm.full_name}
                  onChange={(e) => setQuickMemberForm({ ...quickMemberForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Phone Number (10 digits) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9848012345"
                  value={quickMemberForm.phone}
                  onChange={(e) => setQuickMemberForm({ ...quickMemberForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Address / Collection Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop #12, Market Road"
                  value={quickMemberForm.address}
                  onChange={(e) => setQuickMemberForm({ ...quickMemberForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none shadow-2xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowQuickMemberModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickMemberSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
                >
                  {quickMemberSubmitting ? 'Registering...' : 'Register & Select Member'}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* Modal: Chit Group Complete History & Audit Dossier */}
      <ChitHistoryModal
        groupId={selectedHistoryGroupId}
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedHistoryGroupId(null);
        }}
      />

      {/* Modal: Chit Group Closure & Completion Audit */}
      {closingGroup && (
        <ChitCompletionModal
          group={closingGroup}
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            setClosingGroup(null);
          }}
          onCompleted={(msg) => {
            setSuccess(msg);
            loadData();
          }}
        />
      )}

      {/* Modal: Inactivate / Activate Chit Scheme Confirmation Dialog */}
      {statusTargetGroup && (
        <ModalPortal
          id="chit-status-confirm-modal"
          isOpen={showStatusConfirmModal && Boolean(statusTargetGroup)}
          onClose={() => {
            if (!statusUpdating) {
              setShowStatusConfirmModal(false);
              setStatusTargetGroup(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl ${
                    statusTargetGroup.status === 'INACTIVE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {statusTargetGroup.status === 'INACTIVE' ? (
                    <Power className="w-6 h-6" />
                  ) : (
                    <PowerOff className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                    {statusTargetGroup.status === 'INACTIVE'
                      ? 'Reactivate Chit Scheme?'
                      : 'Inactivate Chit Scheme?'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {statusTargetGroup.status === 'INACTIVE'
                      ? 'Resume active route operations and member collections'
                      : 'Pause this chit scheme in the middle of operation'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => {
                  setShowStatusConfirmModal(false);
                  setStatusTargetGroup(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scheme Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Scheme Name:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {statusTargetGroup.group_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Group Code:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {statusTargetGroup.group_code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Installment:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{parseFloat(statusTargetGroup.installment_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Pool:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{parseFloat(statusTargetGroup.total_pool_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Enrolled Members:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {statusTargetGroup.enrolled_members || 0} / {statusTargetGroup.total_members_limit || 20}
                </span>
              </div>
            </div>

            {/* Warning Message */}
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                statusTargetGroup.status === 'INACTIVE'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                {statusTargetGroup.status === 'INACTIVE' ? (
                  <span>
                    When reactivated, this chit scheme will immediately resume appearing in field agent tasks, route waypoints, and active collections.
                  </span>
                ) : (
                  <span>
                    When marked as <strong>Inactive</strong>, this chit scheme will be temporarily paused. It will stop appearing in field agent daily collection tasks until you reactivate it.
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => {
                  setShowStatusConfirmModal(false);
                  setStatusTargetGroup(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusUpdating}
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  statusTargetGroup.status === 'INACTIVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {statusUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : statusTargetGroup.status === 'INACTIVE' ? (
                  <Power className="w-3.5 h-3.5" />
                ) : (
                  <PowerOff className="w-3.5 h-3.5" />
                )}
                <span>
                  {statusTargetGroup.status === 'INACTIVE'
                    ? 'Confirm Activate'
                    : 'Confirm Inactive'}
                </span>
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

/* =========================================================================
   2. COLLECTION AGENTS MANAGEMENT
   ========================================================================= */
export function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination for Agents Table
  const [agentsPage, setAgentsPage] = useState(1);
  const [agentsPageSize, setAgentsPageSize] = useState(10);

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    password: '',
    phone: '',
  });

  const loadData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [agRes, grRes] = await Promise.all([
        api.get('/admin/agents'),
        api.get('/admin/groups'),
      ]);
      if (agRes.data?.success) setAgents(agRes.data.data || []);
      if (grRes.data?.success) setGroups(grRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeSync(['agents', 'groups'], () => {
    loadData(true);
  });

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/admin/agents', {
        ...form,
        role: 'COLLECTION_AGENT',
        assigned_business: 'CHITFUND',
      });
      setSuccess('Collection Agent account created in MySQL.');
      setShowCreateModal(false);
      setForm({ full_name: '', username: '', password: '', phone: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignAgent = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/agents/assign', {
        agentId: selectedAgent.id,
        groupId: parseInt(selectedGroupId, 10),
      });
      setSuccess(`Assigned ${selectedAgent.full_name} to route successfully.`);
      setShowAssignModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent) => {
    try {
      await api.put(`/admin/agents/${agent.id}/status`, { is_active: !agent.is_active });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Field Collection Agents</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authorized field agents and assign collection route locations
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setError('');
            scrollToFormOrModal('create-agent-modal');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Agent</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Agents Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Agent Name</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Assigned Routes / Groups</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading agents...</td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No collection agents registered yet. Click "Add New Agent" to create field accounts.
                  </td>
                </tr>
              ) : (
                agents
                  .slice((agentsPage - 1) * agentsPageSize, agentsPage * agentsPageSize)
                  .map((ag) => (
                    <tr key={ag.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {ag.full_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-blue-600 dark:text-blue-400">
                        @{ag.username}
                      </td>
                      <td className="py-3.5 px-4">{ag.phone}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                        {ag.assigned_group_names ? (
                          <ShowMoreText text={ag.assigned_group_names} maxChars={32} />
                        ) : (
                          <span className="italic text-slate-400">None assigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ag.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ag.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {ag.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAgent(ag);
                            setShowAssignModal(true);
                            setError('');
                            scrollToFormOrModal('assign-agent-modal');
                          }}
                          className="px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-semibold cursor-pointer"
                        >
                          Assign Route
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(ag)}
                          className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          {ag.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={agentsPage}
          totalItems={agents.length}
          pageSize={agentsPageSize}
          onPageChange={setAgentsPage}
          onPageSizeChange={setAgentsPageSize}
        />
      </div>

      {/* Modal: Create Agent */}
      <ModalPortal
        id="create-agent-modal"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl font-heading">
                    Register Collection Agent
                  </h3>
                  <p className="text-xs text-slate-500">Create login credentials for field collection staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-300 text-sm flex items-center gap-3 border border-red-200 dark:border-rose-900/50">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateAgent} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Agent Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Username (Login ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh01"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Password / Secure PIN *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter login password or 6-digit PIN"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Contact Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Agent Account'}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* Modal: Assign Agent to Route */}
      {selectedAgent && (
        <ModalPortal
          id="assign-agent-modal"
          isOpen={showAssignModal && Boolean(selectedAgent)}
          onClose={() => setShowAssignModal(false)}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                    Assign Agent to Route
                  </h3>
                  <p className="text-xs text-slate-500">{selectedAgent?.full_name || 'Agent'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAssignAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Select Chit Scheme / Route *
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Choose Chit Scheme Group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} · ₹{parseFloat(g.installment_amount).toLocaleString('en-IN')} / {g.frequency === 'DAILY' ? 'Day' : 'Month'} ({g.location_name || 'All Stops'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedGroupId}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

/* =========================================================================
   3. MEMBERS DIRECTORY
   ========================================================================= */
export function MembersPage() {
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination for Members Table
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);

  // Passbook state
  const [showPassbookModal, setShowPassbookModal] = useState(false);
  const [passbookData, setPassbookData] = useState(null);
  const [loadingPassbook, setLoadingPassbook] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    alternate_phone: '',
    address: '',
    kyc_type: 'Aadhaar',
    kyc_number: '',
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    alternate_phone: '',
    address: '',
    kyc_type: 'Aadhaar',
    kyc_number: '',
    is_active: 1,
  });

  useEffect(() => {
    setMembersPage(1);
  }, [search]);

  const loadData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [mRes, gRes] = await Promise.all([
        api.get(`/admin/members${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        api.get('/admin/groups'),
      ]);
      if (mRes.data?.success) setMembers(mRes.data.data || []);
      if (gRes.data?.success) setGroups(gRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  useRealtimeSync(['members', 'groups', 'collections'], () => {
    loadData(true);
  });

  const openPassbook = async (member) => {
    setSelectedMember(member);
    setLoadingPassbook(true);
    setShowPassbookModal(true);
    scrollToFormOrModal('member-passbook-modal');
    try {
      const res = await api.get(`/admin/members/${member.id}/passbook`);
      if (res.data?.success) {
        setPassbookData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load passbook:', err);
    } finally {
      setLoadingPassbook(false);
    }
  };

  const handleRegisterMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/admin/members', form);
      setSuccess('Member participant registered in MySQL.');
      setShowRegisterModal(false);
      setForm({
        full_name: '',
        phone: '',
        alternate_phone: '',
        address: '',
        kyc_type: 'Aadhaar',
        kyc_number: '',
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollInGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/members/enroll', {
        memberId: selectedMember.id,
        groupId: parseInt(selectedGroupId, 10),
      });
      setSuccess(`Enrolled ${selectedMember.full_name} into chit group.`);
      setShowEnrollModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setEditMember(member);
    setEditForm({
      full_name: member.full_name || '',
      phone: member.phone || '',
      alternate_phone: member.alternate_phone || '',
      address: member.address || '',
      kyc_type: member.kyc_type || 'Aadhaar',
      kyc_number: member.kyc_number || '',
      is_active: member.is_active !== undefined ? member.is_active : 1,
    });
    setError('');
    setSuccess('');
    setShowEditModal(true);
    scrollToFormOrModal('member-edit-modal');
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editMember) return;
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await api.put(`/admin/members/${editMember.id}`, editForm);
      if (res.data?.success) {
        setSuccess(res.data.message || `Member ${editForm.full_name} updated successfully.`);
        setShowEditModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chit Participants Directory</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registered members participating in daily and monthly chit schemes
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowRegisterModal(true);
            setError('');
            scrollToFormOrModal('member-register-modal');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Member</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by member name, phone, or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Members Table with Automatic Window Move */}
      <div id="members-table-container" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden scroll-mt-6">
        <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Member Code</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4">KYC Record</th>
                <th className="py-3.5 px-4">Enrolled Schemes</th>
                <th className="py-3.5 px-4">Total Paid</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading members...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No members enrolled yet. Click "Register Member" to add participants.
                  </td>
                </tr>
              ) : (
                members
                  .slice((membersPage - 1) * membersPageSize, membersPage * membersPageSize)
                  .map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {m.member_code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {m.full_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{m.phone}</td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {m.kyc_type}: {m.kyc_number || 'On File'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {m.total_groups} Groups
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{parseFloat(m.total_paid).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold cursor-pointer inline-flex items-center gap-1"
                          title="Edit Member Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPassbook(m)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                        >
                          Passbook
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(m);
                            setShowEnrollModal(true);
                            setError('');
                            scrollToFormOrModal('member-enroll-modal');
                          }}
                          className="px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-semibold cursor-pointer"
                        >
                          Enroll
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
          totalItems={members.length}
          pageSize={membersPageSize}
          onPageChange={(page) => {
            setMembersPage(page);
            smoothScrollTo('members-table-container', { offset: 32, behavior: 'smooth' });
          }}
          onPageSizeChange={setMembersPageSize}
        />
      </div>

      {/* Modal: Register Member */}
      <ModalPortal
        id="member-register-modal"
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      >
        <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl font-heading">
                    Register Chit Participant
                  </h3>
                  <p className="text-xs text-slate-500">Add a new subscriber profile with contact and KYC details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-300 text-sm flex items-center gap-3 border border-red-200 dark:border-rose-900/50">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegisterMember} className="space-y-5">
              {/* Section 1: Personal Details */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  1. Subscriber Identity & Contact
                </span>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Subscriber Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anjaneyulu K."
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Primary Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Alternate Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="Secondary or emergency contact"
                      value={form.alternate_phone}
                      onChange={(e) => setForm({ ...form, alternate_phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Address */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  2. Collection Address
                </span>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Physical / Shop Address
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Shop number, Street, Landmark, Village or City"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Section 3: KYC Details */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  3. KYC & Document Proof
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      KYC Document Type
                    </label>
                    <select
                      value={form.kyc_type}
                      onChange={(e) => setForm({ ...form, kyc_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Document Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1234 5678 9012"
                      value={form.kyc_number}
                      onChange={(e) => setForm({ ...form, kyc_number: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* Modal: Edit Member Details */}
      {editMember && (
        <ModalPortal
          id="member-edit-modal"
          isOpen={showEditModal && Boolean(editMember)}
          onClose={() => setShowEditModal(false)}
        >
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl font-heading">
                    Edit Chit Participant Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {editMember.member_code} • {editMember.full_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-300 text-sm flex items-center gap-3 border border-red-200 dark:border-rose-900/50">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdateMember} className="space-y-5">
              {/* Section 1: Personal Details */}
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  1. Subscriber Identity & Contact
                </span>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Subscriber Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anjaneyulu K."
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Primary Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Alternate Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="Secondary or emergency contact"
                      value={editForm.alternate_phone}
                      onChange={(e) => setEditForm({ ...editForm, alternate_phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Address */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  2. Collection Address
                </span>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Physical / Shop Address
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Shop number, Street, Landmark, Village or City"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Section 3: KYC Details */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  3. KYC & Document Proof
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      KYC Document Type
                    </label>
                    <select
                      value={editForm.kyc_type}
                      onChange={(e) => setEditForm({ ...editForm, kyc_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Document Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1234 5678 9012"
                      value={editForm.kyc_number}
                      onChange={(e) => setEditForm({ ...editForm, kyc_number: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Membership Status */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  4. Membership Status
                </span>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: parseInt(e.target.value, 10) })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value={1}>Active Subscriber</option>
                    <option value={0}>Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Enroll in Group */}
      {selectedMember && (
        <ModalPortal
          id="member-enroll-modal"
          isOpen={showEnrollModal && Boolean(selectedMember)}
          onClose={() => setShowEnrollModal(false)}
        >
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg font-heading">
                    Enroll Subscriber into Chit Scheme
                  </h3>
                  <p className="text-xs text-slate-500">{selectedMember?.full_name || 'Subscriber'} ({selectedMember?.phone || 'No phone'})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEnrollInGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Select Chit Scheme *
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Choose Chit Scheme --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} · ₹{parseFloat(g.installment_amount).toLocaleString('en-IN')} / {g.frequency === 'DAILY' ? 'Day' : 'Month'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedGroupId}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Enrollment & Assign Ticket'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* Modal: ChitBase Member Passbook / Statement of Account */}
      {selectedMember && (
        <ModalPortal
          id="member-passbook-modal"
          isOpen={showPassbookModal && Boolean(selectedMember)}
          onClose={() => setShowPassbookModal(false)}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            {/* Passbook Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                  {selectedMember?.full_name?.charAt(0) || 'M'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                      {selectedMember?.full_name}
                    </h3>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      {selectedMember?.member_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    📞 {selectedMember?.phone} · {selectedMember?.address || 'Address on file'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {passbookData && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = getPassbookWhatsAppText(selectedMember, passbookData);
                      sendWhatsAppMessage(selectedMember?.phone, text);
                    }}
                    disabled={!selectedMember?.phone}
                    className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    title="Send Full Passbook Statement on WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp Passbook</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Print Passbook</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassbookModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingPassbook ? (
              <div className="py-12 text-center">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading subscriber passbook & dividend ledger...</p>
              </div>
            ) : passbookData ? (
              <div className="space-y-4">
                {/* 4 Financial Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Contributed</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                      ₹{Number(passbookData.summary?.totalPaid || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Dividends Earned</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      ₹{Number(passbookData.summary?.totalDividendsEarned || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Prize Money Won</span>
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block">
                      ₹{Number(passbookData.summary?.totalPrizeMoneyWon || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Net Account Balance</span>
                    <span className={`text-sm font-extrabold mt-0.5 block ${
                      (passbookData.summary?.netPosition || 0) >= 0 ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      ₹{Number(passbookData.summary?.netPosition || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Enrolled Chits */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Enrolled Chit Groups ({passbookData.enrolledGroups?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {passbookData.enrolledGroups?.map((eg) => (
                      <div key={eg.membership_id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{eg.group_name}</div>
                            <div className="text-[11px] text-slate-500">{eg.chit_type?.replace('_', ' ')} · Ticket #{eg.ticket_number}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400">₹{Number(eg.installment_amount).toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-slate-400 block">{eg.frequency}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Contributed to Date:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">₹{Number(eg.total_paid_in_group || 0).toLocaleString('en-IN')}</span>
                        </div>
                        {eg.is_prized ? (
                          <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/60 font-heading">
                            <span className="text-amber-800 dark:text-amber-300 font-bold">Pending Chit Liability:</span>
                            <span className="font-black text-amber-700 dark:text-amber-400 text-sm">₹{Number(eg.pending_scheme_balance || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>Subscriber Status:</span>
                            <span className="font-semibold">Unprized Contributor (₹0 Pending)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collections Ledger */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Installment Collection Ledger ({passbookData.collections?.length || 0} Receipts)
                  </h4>
                  {passbookData.collections?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No collections recorded yet for this member.</p>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Receipt #</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Scheme</th>
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {passbookData.collections?.map((col) => (
                            <tr key={col.id}>
                              <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 font-semibold">{col.receipt_number}</td>
                              <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{formatDate(col.collection_date)}</td>
                              <td className="py-2 px-3">{col.group_name}</td>
                              <td className="py-2 px-3 font-semibold">{col.payment_method}</td>
                              <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                                <div>₹{Number(col.amount).toLocaleString('en-IN')}</div>
                                {Number(col.advance_amount || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block font-heading">
                                    ⚡ Advance: ₹{Number(col.advance_amount).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Individual Dividends Credited Ledger */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
                    <span>Subscriber Dividends Credited ({passbookData.dividendsLedger?.length || 0} Distributions)</span>
                    <span className="text-[10px] text-emerald-600 font-bold">0% Admin Fee Taken</span>
                  </h4>
                  {passbookData.dividendsLedger?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No auction dividends credited yet for this subscriber.</p>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Scheme</th>
                            <th className="py-2 px-3">Round</th>
                            <th className="py-2 px-3">Dividend Credited</th>
                            <th className="py-2 px-3">Next Installment Due</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {passbookData.dividendsLedger?.map((div) => (
                            <tr key={div.id}>
                              <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{formatDate(div.credited_date)}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{div.group_name}</td>
                              <td className="py-2 px-3 font-mono">Round #{div.period_number}</td>
                              <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">₹{Number(div.dividend_amount).toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">₹{Number(div.installment_amount || div.net_installment_due).toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                  {div.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Auctions Won */}
                {passbookData.auctionsWon?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Auction Prize Lifts ({passbookData.auctionsWon.length})
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {passbookData.auctionsWon.map((auc) => (
                        <div key={auc.id} className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{auc.group_name} (Month #{auc.period_number})</span>
                            <span className="text-[11px] text-slate-500 block">Bid Discount: ₹{Number(auc.bid_discount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">₹{Number(auc.net_payable_amount).toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-emerald-600 font-bold block">{auc.payout_status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

/* =========================================================================
   4. COLLECTIONS & RECEIPT MANAGEMENT
   ========================================================================= */
export function CollectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedReceipt, setGeneratedReceipt] = useState(null);

  // View Section: 'tasks' (Today's Tasks & Stops) vs 'ledger' (Collections History)
  const [activeSection, setActiveSection] = useState('tasks');
  const [adminTasks, setAdminTasks] = useState([]);
  const [tasksSummary, setTasksSummary] = useState({ totalTarget: 0, totalCollected: 0, pendingCount: 0, completedCount: 0, progressPct: 0 });
  const [taskFilter, setTaskFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COLLECTED' | 'DAILY' | 'MONTHLY' | 'COVERED'
  const [taskSearch, setTaskSearch] = useState('');

  // Pagination for Collections Table
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionsPageSize, setCollectionsPageSize] = useState(10);

  // Pagination & View Mode for Chit Schemes in Collections
  const [chitsPage, setChitsPage] = useState(1);
  const [chitsPageSize, setChitsPageSize] = useState(6);
  const [chitsViewMode, setChitsViewMode] = useState('grid'); // 'grid' | 'table'

  const [form, setForm] = useState({
    group_id: '',
    member_id: '',
    amount: '',
    payment_method: 'CASH',
    payment_reference: '',
    notes: '',
    collection_date: getServerYMD(),
    allow_advance: true,
    allow_off_cycle: true,
  });

  useEffect(() => {
    setChitsPage(1);
  }, [taskFilter, taskSearch]);

  const loadData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [colRes, grpRes, memRes, taskRes] = await Promise.all([
        api.get('/admin/collections'),
        api.get('/admin/groups'),
        api.get('/admin/members'),
        api.get('/admin/collections/tasks').catch(() => ({ data: { tasks: [], summary: {} } })),
      ]);
      if (colRes.data?.success) setCollections(colRes.data.data || []);
      if (grpRes.data?.success) setGroups(grpRes.data.data || []);
      if (memRes.data?.success) setMembers(memRes.data.data || []);
      if (taskRes.data?.success) {
        setAdminTasks(taskRes.data.tasks || []);
        setTasksSummary(taskRes.data.summary || { totalTarget: 0, totalCollected: 0, pendingCount: 0, completedCount: 0, progressPct: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeSync(['collections', 'groups', 'members'], () => {
    loadData(true);
  });

  useEffect(() => {
    const groupId = searchParams.get('group_id');
    const memberId = searchParams.get('member_id');
    const date = searchParams.get('collection_date');
    const amount = searchParams.get('amount');
    if (!groupId || !groups.length) return;
    const group = groups.find((item) => String(item.id) === String(groupId));
    if (!group) return;

    let targetMemberId = memberId;
    let targetAmount = amount;
    if (!targetMemberId && adminTasks.length > 0) {
      const tasksForGroup = adminTasks.filter((t) => String(t.group_id) === String(groupId));
      const unpaid = tasksForGroup.find((t) => !t.is_paid && Number(t.remaining_due || t.installment_amount) > 0);
      if (unpaid) {
        targetMemberId = String(unpaid.member_id);
        targetAmount = String(unpaid.remaining_due > 0 ? unpaid.remaining_due : (unpaid.installment_amount || group.installment_amount));
      }
    }

    setForm((current) => ({
      ...current,
      group_id: String(groupId),
      member_id: targetMemberId ? String(targetMemberId) : current.member_id,
      amount: targetAmount || String(group.installment_amount || ''),
      collection_date: date || current.collection_date,
      notes: searchParams.get('absent_agent') ? `Admin collection for absent agent ${searchParams.get('absent_agent')}` : current.notes,
    }));
    setShowModal(true);
    setSearchParams({}, { replace: true });
  }, [groups, members, adminTasks, searchParams, setSearchParams]);

  const handleGroupSelect = (groupId) => {
    setForm((prev) => ({ ...prev, group_id: groupId }));
    const selectedGroup = groups.find((g) => String(g.id) === String(groupId));
    if (selectedGroup) {
      setForm((prev) => ({ ...prev, amount: selectedGroup.installment_amount }));
    }
  };

  const handleRecordCollection = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await api.post('/admin/collections', form);
      if (res.data?.success) {
        const memberObj = members.find((m) => String(m.id) === String(form.member_id));
        const groupObj = groups.find((g) => String(g.id) === String(form.group_id));
        const receiptNum = res.data?.receipt?.receiptNumber ? ` (Receipt: ${res.data.receipt.receiptNumber})` : '';
        setSuccess(`Payment of ₹${Number(form.amount || 0).toLocaleString('en-IN')} for ${memberObj?.full_name || 'subscriber'} in ${groupObj?.group_name || 'chit'} recorded successfully!${receiptNum}`);
        setGeneratedReceipt(res.data.receipt);
        // Automatically close modal and reset form
        setShowModal(false);
        setSearchParams({}, { replace: true });
        setForm({
          group_id: '',
          member_id: '',
          amount: '',
          payment_method: 'CASH',
          payment_reference: '',
          notes: '',
          collection_date: getServerYMD(),
          allow_advance: true,
          allow_off_cycle: true,
        });
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Collection recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const [expandedChitId, setExpandedChitId] = useState(null);

  // Group collection tasks by Chit Scheme so chits are displayed cleanly instead of all members mixed together
  const chitsSummary = useMemo(() => {
    return groups.map((g) => {
      const tasksForGroup = adminTasks.filter((t) => String(t.group_id) === String(g.id));
      const totalMembers = tasksForGroup.length;
      const paidTasks = tasksForGroup.filter((t) => t.is_paid);
      const pendingTasks = tasksForGroup.filter((t) => !t.is_paid);
      const chitTarget = Number(g.installment_amount || 0) * totalMembers;
      // Daily target collection considers payments towards today's installment. Advances belong to future dues.
      const chitCollected = tasksForGroup.reduce(
        (sum, t) => sum + (t.normal_paid_amount != null ? Number(t.normal_paid_amount) : Math.min(Number(t.paid_amount || 0), Number(g.installment_amount || 0))),
        0
      );
      const chitAdvance = tasksForGroup.reduce(
        (sum, t) => sum + (t.advance_paid_amount != null ? Number(t.advance_paid_amount) : Math.max(0, Number(t.paid_amount || 0) - Number(g.installment_amount || 0))),
        0
      );
      const progressPct = chitTarget > 0 ? Math.min(100, Math.round((chitCollected / chitTarget) * 100)) : 0;
      const isCovered = tasksForGroup.some((t) => t.is_covered_today);
      const handlerName = tasksForGroup[0]?.current_handler_name || (g.agent_name || 'Admin / Office');

      return {
        ...g,
        totalMembers,
        paidCount: paidTasks.length,
        pendingCount: pendingTasks.length,
        chitTarget,
        chitCollected,
        chitAdvance,
        progressPct,
        isCovered,
        handlerName,
        tasks: tasksForGroup,
      };
    });
  }, [groups, adminTasks]);

  // Filtered chits by frequency, status, or search
  const filteredChits = useMemo(() => {
    return chitsSummary.filter((chit) => {
      if (taskFilter === 'PENDING' && chit.pendingCount === 0) return false;
      if (taskFilter === 'COLLECTED' && chit.pendingCount > 0) return false;
      if (taskFilter === 'DAILY' && chit.frequency !== 'DAILY') return false;
      if (taskFilter === 'MONTHLY' && chit.frequency !== 'MONTHLY') return false;
      if (taskFilter === 'COVERED' && !chit.isCovered) return false;
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        const matchName = (chit.group_name || '').toLowerCase().includes(q);
        const matchCode = (chit.group_code || '').toLowerCase().includes(q);
        const matchHandler = (chit.handlerName || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchHandler) return false;
      }
      return true;
    });
  }, [chitsSummary, taskFilter, taskSearch]);

  const paginatedChits = useMemo(() => {
    return filteredChits.slice((chitsPage - 1) * chitsPageSize, chitsPage * chitsPageSize);
  }, [filteredChits, chitsPage, chitsPageSize]);

  const handleOpenChitCollection = (chit, member = null) => {
    let targetMember = member;
    if (!targetMember) {
      const tasksForGroup = adminTasks.filter((t) => String(t.group_id) === String(chit.id));
      const unpaidTask = tasksForGroup.find((t) => !t.is_paid && Number(t.remaining_due || t.installment_amount) > 0);
      if (unpaidTask) {
        targetMember = unpaidTask;
      }
    }

    const defaultAmount = targetMember
      ? String(targetMember.remaining_due > 0 ? targetMember.remaining_due : (targetMember.installment_amount || chit.installment_amount))
      : String(chit.installment_amount || '');

    setForm({
      group_id: String(chit.id),
      member_id: targetMember ? String(targetMember.member_id) : '',
      amount: defaultAmount,
      payment_method: 'CASH',
      payment_reference: '',
      notes: targetMember?.is_covered_today ? `Office collection covering for ${targetMember.absent_agent_name || 'agent on leave'}` : '',
      collection_date: getServerYMD(),
      allow_advance: true,
      allow_off_cycle: true,
    });
    setError('');
    setShowModal(true);
    scrollToFormOrModal('record-payment-modal');
  };

  const handleQuickCollect = (task) => {
    const parentGroup = groups.find((g) => String(g.id) === String(task.group_id));
    handleOpenChitCollection(parentGroup || { id: task.group_id, installment_amount: task.installment_amount }, task);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar with Navigation Tabs */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
              Collections Terminal & Field Tasks
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Collect daily & monthly member dues, manage absent agent coverage tasks, and audit live receipts
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              setError('');
              scrollToFormOrModal('record-payment-modal');
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer font-heading"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Direct Payment</span>
          </button>
        </div>

        {/* Dual Section Navigation Island */}
        <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setActiveSection('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer font-heading ${
              activeSection === 'tasks'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active Chit Schemes & Collections (${chitsSummary.length} Schemes)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer font-heading ${
              activeSection === 'ledger'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Collections History & Receipts (${collections.length})</span>
          </button>
        </div>
      </div>

      {/* Generated Receipt WhatsApp Notification Banner (Universal across tabs) */}
      {generatedReceipt && (
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-sm sm:text-base text-emerald-950 dark:text-emerald-100 font-heading">
                Payment Recorded · Receipt #{generatedReceipt.receiptNumber}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                ₹{parseFloat(generatedReceipt.amount).toLocaleString('en-IN')} collected via {generatedReceipt.paymentMethod}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const text = getReceiptWhatsAppText(generatedReceipt);
                const mem = members.find((m) => String(m.id) === String(generatedReceipt.memberId));
                sendWhatsAppMessage(generatedReceipt.memberPhone || mem?.phone, text);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md text-xs font-heading"
              title="Send Receipt via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share Receipt on WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setGeneratedReceipt(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white px-2 py-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: CHIT SCHEMES GRID (Clicking any Chit opens its specific Collection Form) */}
      {activeSection === 'tasks' && (
        <section className="space-y-4 animate-fadeIn">
          {/* Target & Progress Island */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Collections Target</span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading">
                  ₹{Number(tasksSummary.totalCollected || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  collected of ₹{Number(tasksSummary.totalTarget || 0).toLocaleString('en-IN')} target
                </span>
                {Number(tasksSummary.totalAdvanceCollected || 0) > 0 && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 px-2 py-0.5 rounded-full">
                    +₹{Number(tasksSummary.totalAdvanceCollected).toLocaleString('en-IN')} Advance
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-32 sm:w-48 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${tasksSummary.progressPct || 0}%` }}
                />
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {tasksSummary.progressPct || 0}%
              </span>
            </div>
          </div>

          {/* Scheme Filters & Search Row */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `All Schemes (${chitsSummary.length})` },
                { id: 'PENDING', label: `Pending Dues (${chitsSummary.filter(c => c.pendingCount > 0).length})` },
                { id: 'COLLECTED', label: `Fully Cleared (${chitsSummary.filter(c => c.pendingCount === 0 && c.totalMembers > 0).length})` },
                { id: 'DAILY', label: `Daily Route (${chitsSummary.filter(c => c.frequency === 'DAILY').length})` },
                { id: 'MONTHLY', label: `Monthly Auction (${chitsSummary.filter(c => c.frequency === 'MONTHLY').length})` },
                { id: 'COVERED', label: `Covered on Leave (${chitsSummary.filter(c => c.isCovered).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTaskFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === f.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chit scheme name, code..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* View Mode Toggle: Grid Cards vs Compact Table */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setChitsViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    chitsViewMode === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Grid View (Cards)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setChitsViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    chitsViewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title="Compact Table View (Optimal for 100+ Schemes)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Chit Schemes: Cards Grid or Compact Table (Optimized for 100+ Schemes) */}
          {filteredChits.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              No chit schemes match the selected filter criteria.
            </div>
          ) : chitsViewMode === 'table' ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Chit Scheme</th>
                      <th className="py-3 px-4">Frequency</th>
                      <th className="py-3 px-4">Route Custodian</th>
                      <th className="py-3 px-4">Subscribers Cleared</th>
                      <th className="py-3 px-4">Collections / Target</th>
                      <th className="py-3 px-4 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedChits.map((chit) => {
                      return (
                        <tr key={chit.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white font-heading">{chit.group_name}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {chit.group_code} · ₹{parseFloat(chit.installment_amount || 0).toLocaleString('en-IN')}/{chit.frequency === 'DAILY' ? 'day' : 'month'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                              chit.frequency === 'DAILY'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            }`}>
                              {chit.frequency === 'DAILY' ? 'Daily' : 'Monthly'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {chit.isCovered ? `🛡️ Covering (${chit.handlerName})` : chit.handlerName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${chit.progressPct}%` }} />
                              </div>
                              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {chit.paidCount}/{chit.totalMembers} ({chit.progressPct}%)
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{chit.chitCollected.toLocaleString('en-IN')}{' '}
                            <span className="text-slate-400 font-normal">/ ₹{chit.chitTarget.toLocaleString('en-IN')}</span>
                            {chit.chitAdvance > 0 && (
                              <span className="ml-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 px-1.5 py-0.5 rounded-full inline-block">
                                +₹{chit.chitAdvance.toLocaleString('en-IN')} Adv
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {chit.pendingCount === 0 && chit.totalMembers > 0 ? (
                              <span className="py-1 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>All Paid</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenChitCollection(chit)}
                                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer font-heading"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Collect</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedChits.map((chit) => {
                const isExpanded = expandedChitId === chit.id;
                const isFullyCollected = chit.pendingCount === 0 && chit.totalMembers > 0;

                return (
                  <article
                    key={chit.id}
                    className={`rounded-3xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs ${
                      isFullyCollected
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                    }`}
                  >
                    {/* Chit Card Header */}
                    <div className="p-5 space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-base text-slate-900 dark:text-white font-heading">
                              {chit.group_name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">· {chit.group_code}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            ₹{parseFloat(chit.installment_amount || 0).toLocaleString('en-IN')} / {chit.frequency === 'DAILY' ? 'Day' : 'Month'}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shrink-0 flex items-center gap-1 ${
                            chit.frequency === 'DAILY'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900'
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900'
                          }`}
                        >
                          {chit.frequency === 'DAILY' ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> : <Gavel className="w-3 h-3 text-purple-500" />}
                          <span>{chit.frequency === 'DAILY' ? 'Daily Route' : 'Monthly Auction'}</span>
                        </span>
                      </div>

                      {/* Handler & Progress Stats */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Route Custodian:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {chit.isCovered ? `🛡️ Covering (${chit.handlerName})` : chit.handlerName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Subscribers Cleared:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {chit.paidCount} of {chit.totalMembers} Paid ({chit.pendingCount} Pending)
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Collections:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹{chit.chitCollected.toLocaleString('en-IN')} / ₹{chit.chitTarget.toLocaleString('en-IN')}
                            {chit.chitAdvance > 0 && (
                              <span className="ml-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 px-1.5 py-0.5 rounded-full inline-block">
                                +₹{chit.chitAdvance.toLocaleString('en-IN')} Adv
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${chit.progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Bar: Collect Payment & Toggle Subscribers List */}
                    <div className="p-4 pt-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {isFullyCollected ? (
                          <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 font-heading">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>All Subscribers Paid ✓</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenChitCollection(chit)}
                            className="flex-1 py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-heading"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>Collect Payment</span>
                          </button>
                        )}

                        {chit.tasks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedChitId(isExpanded ? null : chit.id)}
                            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="View subscribers enrolled in this chit"
                          >
                            <span>Subscribers ({chit.tasks.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Inline Expanded Subscribers for this Chit Scheme */}
                      {isExpanded && chit.tasks.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-fadeIn max-h-56 overflow-y-auto">
                          {chit.tasks.map((task) => (
                            <div
                              key={`${task.group_id}:${task.member_id}`}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {task.member_name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  #{task.ticket_number} {task.member_phone ? `· ${task.member_phone}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    task.is_paid
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {task.is_paid
                                    ? (Number(task.advance_paid_amount || 0) > 0
                                        ? `Paid (+₹${Number(task.advance_paid_amount).toLocaleString('en-IN')} Adv)`
                                        : 'Paid')
                                    : `Due: ₹${task.remaining_due.toLocaleString('en-IN')}`}
                                </span>
                                {(() => {
                                  const phone = task.member_phone || members.find((m) => String(m.id) === String(task.member_id))?.phone;
                                  if (!phone) return null;
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = task.is_paid
                                          ? `*CHITFUND PRO - PAYMENT ACKNOWLEDGEMENT*\nHello ${task.member_name}, your installment of ₹${chit.installment_amount} for chit '${chit.group_name}' is received and marked Paid. Thank you!`
                                          : getPaymentReminderWhatsAppText({
                                              memberName: task.member_name,
                                              groupName: chit.group_name,
                                              groupCode: chit.group_code,
                                              ticketNumber: task.ticket_number,
                                              amount: task.remaining_due || chit.installment_amount,
                                              date: getServerYMD(),
                                            });
                                        sendWhatsAppMessage(phone, text);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                      title={task.is_paid ? 'Share WhatsApp Confirmation' : 'Send WhatsApp Payment Reminder'}
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </button>
                                  );
                                })()}
                                {!task.is_paid && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenChitCollection(chit, task)}
                                    className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                                    title="Record payment for this subscriber"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {filteredChits.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <Pagination
                currentPage={chitsPage}
                totalItems={filteredChits.length}
                pageSize={chitsPageSize}
                onPageChange={setChitsPage}
                onPageSizeChange={setChitsPageSize}
                pageSizeOptions={[6, 9, 12, 24, 48]}
              />
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: COLLECTIONS HISTORY LEDGER TABLE */}
      {activeSection === 'ledger' && (
        <section className="space-y-4 animate-fadeIn">

      {/* Collections Ledger Table with Automatic Window Move */}
      <div id="collections-table-container" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden scroll-mt-6">
        <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Receipt No.</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Member Name</th>
                <th className="py-3.5 px-4">Chit Group</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Recorded By</th>
                <th className="py-3.5 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading collections ledger...</td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No payment records yet. Click "Record Payment" to enter cash or UPI collections.
                  </td>
                </tr>
              ) : (
                collections
                  .slice((collectionsPage - 1) * collectionsPageSize, collectionsPage * collectionsPageSize)
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {c.receipt_number}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(c.collection_date)} {c.collection_time ? `· ${formatTime(c.collection_time)}` : ''}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {c.member_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {c.group_name} ({c.group_code})
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                        ₹{parseFloat(c.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            c.payment_method === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {c.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {c.agent_name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const text = getReceiptWhatsAppText(c);
                            const mem = members.find((m) => String(m.id) === String(c.member_id) || m.full_name === c.member_name);
                            sendWhatsAppMessage(c.member_phone || mem?.phone, text);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                          title="Share Receipt on WhatsApp"
                          aria-label="Share Receipt on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={collectionsPage}
          totalItems={collections.length}
          pageSize={collectionsPageSize}
          onPageChange={(page) => {
            setCollectionsPage(page);
            smoothScrollTo('collections-table-container', { offset: 32, behavior: 'smooth' });
          }}
          onPageSizeChange={setCollectionsPageSize}
        />
      </div>
      </section>
      )}

      {/* Modal: Record Collection */}
      <ModalPortal
        id="record-payment-modal"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl font-heading">
                    Record Payment Collection
                  </h3>
                  <p className="text-xs text-slate-500">Log subscriber installment payment and generate verified receipt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-300 text-sm flex items-center gap-3 border border-red-200 dark:border-rose-900/50">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Selected Chit Scheme Highlight Banner */}
            {(() => {
              const selectedGroup = groups.find((g) => String(g.id) === String(form.group_id));
              if (!selectedGroup) return null;
              return (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Selected Chit Scheme
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {selectedGroup.group_name}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedGroup.frequency === 'DAILY' ? 'Daily Route Scheme' : 'Monthly Auction Scheme'} · Code: {selectedGroup.group_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Installment Due</span>
                      <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                        ₹{parseFloat(selectedGroup.installment_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, group_id: '', member_id: '' }))}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      title="Choose a different chit scheme"
                    >
                      Change
                    </button>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleRecordCollection} className="space-y-5">
              {/* If group is NOT selected, show scheme dropdown */}
              {!form.group_id && (
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Chit Scheme *
                  </label>
                  <select
                    required
                    value={form.group_id}
                    onChange={(e) => {
                      handleGroupSelect(e.target.value);
                      setForm((prev) => ({ ...prev, member_id: '' }));
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">-- Choose Chit Scheme Group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name} · ₹{parseFloat(g.installment_amount).toLocaleString('en-IN')} / {g.frequency === 'DAILY' ? 'Day' : 'Month'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subscriber Selection: If already selected, show verified card with Change option; otherwise show dropdown */}
              {(() => {
                if (!form.group_id) return null;
                const tasksForGroup = adminTasks.filter((t) => String(t.group_id) === String(form.group_id));
                const chosenTask = tasksForGroup.find((t) => String(t.member_id) === String(form.member_id));
                const chosenMember = members.find((m) => String(m.id) === String(form.member_id));

                if (form.member_id && (chosenTask || chosenMember)) {
                  const mName = chosenTask?.member_name || chosenMember?.full_name || 'Subscriber';
                  const mPhone = chosenTask?.member_phone || chosenMember?.phone;
                  const mTicket = chosenTask?.ticket_number;
                  const mDue = chosenTask?.remaining_due > 0 ? chosenTask.remaining_due : (chosenTask?.installment_amount || '');

                  return (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Selected Subscriber
                        </span>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {mName} {mTicket ? <span className="font-mono text-xs text-slate-500">· Ticket #{mTicket}</span> : null}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          {mPhone && <span>📞 {mPhone}</span>}
                          {mDue ? <span className="font-bold text-emerald-600 dark:text-emerald-400">· Remaining Due: ₹{Number(mDue).toLocaleString('en-IN')}</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, member_id: '' }))}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                      >
                        Change Member
                      </button>
                    </div>
                  );
                }

                const unpaidTasksForGroup = tasksForGroup.filter((t) => !t.is_paid && Number(t.remaining_due || t.installment_amount) > 0);
                const allPaidForGroup = tasksForGroup.length > 0 && unpaidTasksForGroup.length === 0;

                return (
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Subscriber Participant (Enrolled in Selected Chit) *
                    </label>
                    <div className="space-y-3">
                      {allPaidForGroup && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>✓ All {tasksForGroup.length} members in this chit scheme have already paid for this cycle! No pending dues.</span>
                        </div>
                      )}

                      <select
                        required
                        disabled={allPaidForGroup}
                        value={form.member_id}
                        onChange={(e) => {
                          const chosenId = e.target.value;
                          const chosenTask = tasksForGroup.find((t) => String(t.member_id) === String(chosenId));
                          const selectedGroup = groups.find((g) => String(g.id) === String(form.group_id));
                          setForm((prev) => ({
                            ...prev,
                            member_id: chosenId,
                            amount: chosenTask ? String(chosenTask.remaining_due > 0 ? chosenTask.remaining_due : chosenTask.installment_amount) : (selectedGroup ? String(selectedGroup.installment_amount) : prev.amount),
                          }));
                        }}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all ${
                          allPaidForGroup
                            ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-75'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                        }`}
                      >
                        <option value="">
                          {allPaidForGroup
                            ? '✓ All members have already paid'
                            : `-- Choose Subscriber (${unpaidTasksForGroup.length} pending dues) --`}
                        </option>
                        {tasksForGroup.length > 0
                          ? unpaidTasksForGroup.map((t) => (
                              <option key={t.member_id} value={t.member_id}>
                                {t.member_name} · Ticket #{t.ticket_number} {t.member_phone ? `· 📞 ${t.member_phone}` : ''} · (Due: ₹{Number(t.remaining_due || t.installment_amount).toLocaleString('en-IN')})
                              </option>
                            ))
                          : members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name} {m.phone ? `· ${m.phone}` : ''}
                              </option>
                            ))}
                      </select>
                    </div>
                  </div>
                );
              })()}

              {/* Selected Subscriber Details & WhatsApp Message Island */}
              {(() => {
                if (!form.group_id || !form.member_id) return null;
                const tasksForGroup = adminTasks.filter((t) => String(t.group_id) === String(form.group_id));
                const chosenTask = tasksForGroup.find((t) => String(t.member_id) === String(form.member_id));
                const chosenMember = members.find((m) => String(m.id) === String(form.member_id));
                const name = chosenTask?.member_name || chosenMember?.full_name || 'Subscriber';
                const phone = chosenTask?.member_phone || chosenMember?.phone;
                const ticket = chosenTask?.ticket_number;
                const isPaid = chosenTask?.is_paid || (chosenTask && Number(chosenTask.remaining_due || 0) <= 0);
                const selectedGroup = groups.find((g) => String(g.id) === String(form.group_id));

                if (isPaid) {
                  return (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>⚠️ {name} has already paid their installment for this cycle. Duplicate collection is restricted.</span>
                    </div>
                  );
                }

                return (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
                          {name}
                        </span>
                        {ticket && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Ticket #{ticket}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        {phone ? `📞 ${phone}` : 'No phone number available'} · Installment: ₹{Number(chosenTask?.remaining_due || selectedGroup?.installment_amount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={!phone}
                        onClick={() => {
                          const text = getPaymentReminderWhatsAppText({
                            memberName: name,
                            groupName: selectedGroup?.group_name,
                            groupCode: selectedGroup?.group_code,
                            ticketNumber: ticket,
                            amount: form.amount || chosenTask?.remaining_due || selectedGroup?.installment_amount,
                            date: form.collection_date || getServerYMD(),
                          });
                          sendWhatsAppMessage(phone, text);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer font-heading"
                        title="Send WhatsApp payment reminder & UPI QR to subscriber"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Send WhatsApp Reminder</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Amount Collected (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 500"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base font-extrabold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Collection Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.collection_date || getServerYMD()}
                    onChange={(e) => setForm({ ...form, collection_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="CASH">Physical Cash</option>
                    <option value="UPI">Digital UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Bank Cheque</option>
                  </select>
                </div>
              </div>

              {form.payment_method !== 'CASH' && (
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    UPI Reference / Transaction UTR
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 12-digit UPI UTR or bank reference"
                    value={form.payment_reference}
                    onChange={(e) => setForm({ ...form, payment_reference: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="Optional collection notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Submit Action Buttons with Protection */}
              {(() => {
                const tasksForGroup = form.group_id ? adminTasks.filter((t) => String(t.group_id) === String(form.group_id)) : [];
                const unpaidTasksForGroup = tasksForGroup.filter((t) => !t.is_paid && Number(t.remaining_due || t.installment_amount) > 0);
                const allPaidForGroup = form.group_id && tasksForGroup.length > 0 && unpaidTasksForGroup.length === 0;
                const chosenTask = tasksForGroup.find((t) => String(t.member_id) === String(form.member_id));
                const isPaid = chosenTask?.is_paid || (chosenTask && Number(chosenTask.remaining_due || 0) <= 0);
                const isDisabled = submitting || allPaidForGroup || isPaid || !form.group_id || !form.member_id || !form.amount;

                return (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isDisabled}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : allPaidForGroup ? (
                          'All Members Paid ✓'
                        ) : isPaid ? (
                          'Already Paid (Restricted)'
                        ) : (
                          'Confirm Payment & Issue Receipt'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </form>
          </div>
        </ModalPortal>
    </div>
  );
}

/* =========================================================================
   5. REPORTS & FINANCIAL AUDIT SUITE (ChitBase Flow)
   ========================================================================= */
export { default as ReportsPage } from './ReportsPage';


/* =========================================================================
   6. USER MANAGEMENT & AUDIT LOGS (Re-exports of dedicated full pages)
   ========================================================================= */
export { default as UsersPage } from './UsersPage';
export { default as AuditLogsPage } from './AuditLogsPage';

/* =========================================================================
   7. SYSTEM SETTINGS
   ========================================================================= */
export function SettingsPage() {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem('chitfund_company_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      companyName: 'ChitFund Pro Private Limited',
      branchOffice: 'Main Head Office, Station Road',
      contactPhone: '+91 98765 43210',
      supportEmail: 'support@chitfundpro.internal',
      registrationNumber: 'AP/CHIT/2026/8842',
      defaultForemanCommission: '5.0',
      defaultMaxBidDiscount: '35.0',
      defaultDailyDuration: '100',
      defaultMonthlyDuration: '20',
      enableWhatsAppAlerts: true,
      autoReceiptNumbering: true,
    };
  });

  const handleSave = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('chitfund_company_config', JSON.stringify(config));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Control Panel & System Parameters
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              ● All Systems Operational
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            System Configuration & Company Profile
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure company registration details, official contact info, and default chit scheme operating rules
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save System Settings</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">Company settings and default rules updated successfully.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Organization & Business Profile */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Business & Organization Profile
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Legal Entity Name *
              </label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch Office / Head Office Location
              </label>
              <input
                type="text"
                value={config.branchOffice}
                onChange={(e) => setConfig({ ...config, branchOffice: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Helpline / Phone
                </label>
                <input
                  type="text"
                  value={config.contactPhone}
                  onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chit Registration #
                </label>
                <input
                  type="text"
                  value={config.registrationNumber}
                  onChange={(e) => setConfig({ ...config, registrationNumber: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Support Email
              </label>
              <input
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Chit Fund Scheme Rule Defaults */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Default Chit Scheme Operating Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Foreman Commission (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.defaultForemanCommission}
                onChange={(e) => setConfig({ ...config, defaultForemanCommission: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default standard is 5.0%</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Bid Discount (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.defaultMaxBidDiscount}
                onChange={(e) => setConfig({ ...config, defaultMaxBidDiscount: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Auction ceiling cap (e.g. 35.0%)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Daily Chit Duration (Days)
              </label>
              <input
                type="number"
                value={config.defaultDailyDuration}
                onChange={(e) => setConfig({ ...config, defaultDailyDuration: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Typical daily route cycle (100 days)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Monthly Chit Duration (Months)
              </label>
              <input
                type="number"
                value={config.defaultMonthlyDuration}
                onChange={(e) => setConfig({ ...config, defaultMonthlyDuration: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Typical monthly tenure (20 months)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Receipt & Numbering Standard */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Receipt & Numbering Standard
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-600 dark:text-slate-400">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] block font-medium">Receipt Format</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">REC-YYYYMMDD-XXXX</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] block font-medium">Member Identifier Format</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">MEM-XXXX</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] block font-medium">Display Date Standard</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">DD/MM/YYYY</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] block font-medium">Daily Reconciliation</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Synchronous Active</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
