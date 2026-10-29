import React, { useState, useEffect } from 'react';
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
  UserPlus,
  AlertTriangle,
  Info,
  ArrowLeft,
} from 'lucide-react';
import { formatDate, formatDateTime, formatTime } from '../utils/dateUtils';
import ChitHistoryModal from '../components/ChitHistoryModal';
import Pagination from '../components/Pagination';
import ShowMoreText from '../components/ShowMoreText';
import { smoothScrollTo } from '../utils/scrollHelper';


/* =========================================================================
   1. CHIT GROUPS & SCHEMES MANAGEMENT (ChitBase Flow)
   ========================================================================= */
export function ChitGroupsPage() {
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
  const [selectedHistoryGroupId, setSelectedHistoryGroupId] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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

  useEffect(() => {
    setGroupsPage(1);
  }, [schemeTab]);

  const [form, setForm] = useState({
    group_code: 'DLY-AUC-101',
    group_name: '',
    chit_type: 'AUCTION_CHIT', // Strictly 'AUCTION_CHIT' | 'DOUBLE_CHIT' (no standard chit)
    route_category: 'DAILY_ROUTE', // 'DAILY_ROUTE' | 'MONTHLY_ROUTE'
    frequency: 'DAILY', // 'DAILY' | 'MONTHLY'
    location_name: '',
    installment_amount: '500',
    total_pool_amount: '10000', // Auto-calculated = 500 * 20
    duration_periods: '100',
    total_members_limit: '20',
    foreman_commission_percent: '5.0',
    max_bid_percent: '35.0',
    start_date: new Date().toISOString().slice(0, 10),
    assigned_agent_id: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, agentsRes, membersRes] = await Promise.all([
        api.get('/admin/groups'),
        api.get('/admin/agents'),
        api.get('/admin/members'),
      ]);
      if (groupsRes.data?.success) setGroups(groupsRes.data.data || []);
      if (agentsRes.data?.success) setAgents(agentsRes.data.data || []);
      if (membersRes.data?.success) setAllMembers(membersRes.data.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFrequencySelect = (freq) => {
    const isDaily = freq === 'DAILY';
    setForm((prev) => {
      const dur = isDaily ? (prev.chit_type === 'DOUBLE_CHIT' ? '50' : '100') : (prev.chit_type === 'DOUBLE_CHIT' ? '10' : '20');
      const inst = isDaily ? (parseFloat(prev.installment_amount || '0') < 5000 && parseFloat(prev.installment_amount || '0') > 0 ? prev.installment_amount : '500') : (parseFloat(prev.installment_amount || '0') >= 5000 ? prev.installment_amount : '25000');
      const members = parseInt(prev.total_members_limit || '20', 10);
      const pool = String(Math.round(parseFloat(inst || '0') * members));
      const typeCode = prev.chit_type === 'DOUBLE_CHIT' ? 'DBL' : 'AUC';
      const prefix = isDaily ? `DLY-${typeCode}` : `MTH-${typeCode}`;
      return {
        ...prev,
        frequency: freq,
        route_category: isDaily ? 'DAILY_ROUTE' : 'MONTHLY_ROUTE',
        duration_periods: dur,
        installment_amount: inst,
        total_pool_amount: pool,
        group_code: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
      };
    });
  };

  const handleSchemeTypeSelect = (type) => {
    setForm((prev) => {
      const isDaily = prev.frequency === 'DAILY';
      const dur = isDaily ? (type === 'DOUBLE_CHIT' ? '50' : '100') : (type === 'DOUBLE_CHIT' ? '10' : '20');
      const inst = prev.installment_amount || (isDaily ? '500' : '25000');
      const members = parseInt(prev.total_members_limit || '20', 10);
      const pool = String(Math.round(parseFloat(inst || '0') * members));
      const typeCode = type === 'DOUBLE_CHIT' ? 'DBL' : 'AUC';
      const prefix = isDaily ? `DLY-${typeCode}` : `MTH-${typeCode}`;
      return {
        ...prev,
        chit_type: type,
        duration_periods: dur,
        installment_amount: inst,
        total_pool_amount: pool,
        group_code: `${prefix}-${Math.floor(100 + Math.random() * 900)}`,
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
    if (!form.group_name.trim()) {
      setError('Please provide a Scheme Name (e.g. Market Daily Auction Pool) before proceeding.');
      return;
    }
    if (!form.location_name.trim()) {
      setError('Please specify the Route Location / Geographic Track before proceeding.');
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

  const handleCreateGroup = async () => {
    setError('');
    setSuccess('');
    const targetMembers = parseInt(form.total_members_limit || '20', 10);
    if (selectedMemberIds.length !== targetMembers) {
      setError(`Cannot create chit group: Scheme requires exactly ${targetMembers} subscribers, but you have selected ${selectedMemberIds.length} members.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/groups', {
        ...form,
        installment_amount: parseFloat(form.installment_amount),
        total_pool_amount: parseFloat(form.total_pool_amount),
        duration_periods: parseInt(form.duration_periods, 10),
        total_members_limit: targetMembers,
        foreman_commission_percent: parseFloat(form.foreman_commission_percent || 5),
        max_bid_percent: parseFloat(form.max_bid_percent || 35),
        assigned_agent_id: form.assigned_agent_id ? parseInt(form.assigned_agent_id, 10) : null,
        member_ids: selectedMemberIds,
      });

      setSuccess(res.data?.message || 'Chit group and route stops created successfully with all enrolled subscribers.');
      setShowModal(false);
      setWizardStep(1);
      setSelectedMemberIds([]);
      setForm({
        group_code: 'DLY-AUC-101',
        group_name: '',
        chit_type: 'AUCTION_CHIT',
        route_category: 'DAILY_ROUTE',
        frequency: 'DAILY',
        location_name: '',
        installment_amount: '500',
        total_pool_amount: '10000',
        duration_periods: '100',
        total_members_limit: '20',
        foreman_commission_percent: '5.0',
        max_bid_percent: '35.0',
        start_date: new Date().toISOString().slice(0, 10),
        assigned_agent_id: '',
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create chit group');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (schemeTab === 'ALL') return true;
    const isDaily = g.frequency === 'DAILY' || g.route_category === 'DAILY_ROUTE';
    const isMonthly = g.frequency === 'MONTHLY' || g.route_category === 'MONTHLY_ROUTE';

    if (schemeTab === 'DAILY_ALL') return isDaily;
    if (schemeTab === 'MONTHLY_ALL') return isMonthly;
    if (schemeTab === 'DAILY_AUC') return isDaily && g.chit_type === 'AUCTION_CHIT';
    if (schemeTab === 'DAILY_DBL') return isDaily && g.chit_type === 'DOUBLE_CHIT';
    if (schemeTab === 'MONTHLY_AUC') return isMonthly && g.chit_type === 'AUCTION_CHIT';
    if (schemeTab === 'MONTHLY_DBL') return isMonthly && g.chit_type === 'DOUBLE_CHIT';
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
            Manage Daily Auction Chits, Daily Double Chits, Monthly Auction Chits, and Monthly Double Chits
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowModal(true);
            setWizardStep(1);
            setError('');
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
          🏛️ Monthly Auction ({groups.filter((g) => (g.frequency === 'MONTHLY' || g.route_category === 'MONTHLY_ROUTE') && g.chit_type === 'AUCTION_CHIT').length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSchemeTab('MONTHLY_DBL');
            smoothScrollTo('chit-groups-list', { offset: 32, behavior: 'smooth' });
          }}
          className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium shrink-0 ${
            schemeTab === 'MONTHLY_DBL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          🎰 Monthly Double ({groups.filter((g) => (g.frequency === 'MONTHLY' || g.route_category === 'MONTHLY_ROUTE') && g.chit_type === 'DOUBLE_CHIT').length})
        </button>
      </div>

      {/* Groups Grid */}
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
              : g.chit_type === 'DOUBLE_CHIT'
              ? 'Monthly Double Chit'
              : 'Monthly Auction Chit';

            const badgeColor = isDaily
              ? g.chit_type === 'DOUBLE_CHIT'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : g.chit_type === 'DOUBLE_CHIT'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';

            return (
              <div
                key={g.id}
                onClick={() => {
                  setSelectedHistoryGroupId(g.id);
                  setShowHistoryModal(true);
                }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-500 hover:shadow-md dark:hover:border-blue-500 transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                        {g.group_code}
                      </span>
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

                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Foreman Commission: <strong>{g.foreman_commission_percent}%</strong></span>
                    <span>Max Bid Discount: <strong>{g.max_bid_percent}%</strong></span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">{g.enrolled_members}</strong> / {g.total_members_limit} Members
                    </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400 truncate max-w-[140px]">
                      {g.assigned_agents ? `Agent: ${g.assigned_agents}` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="pt-1.5 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform border-t border-dashed border-slate-100 dark:border-slate-800">
                    <span>View Total History & Ledger</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-800/80 shadow-2xl p-6 sm:p-8 space-y-6 my-auto max-h-[94vh] overflow-y-auto transition-all animate-confirmScale">
            
            {/* Wizard Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg sm:text-xl font-heading">
                    Chit Scheme Creation & Direct Enrolment Wizard
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Step {wizardStep} of 3: {wizardStep === 1 ? 'Configure Scheme Rules' : wizardStep === 2 ? 'Select Required Subscribers' : 'Pre-Flight Verification & Launch'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  wizardStep === 1
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${wizardStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>1</span>
                  <span className="font-bold text-xs sm:text-sm">Configuration</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-1">Rules, Pool, Date & Agent</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (form.group_name.trim()) setWizardStep(2);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  wizardStep === 2
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${wizardStep === 2 ? 'bg-blue-600 text-white' : selectedMemberIds.length === targetMembersCount ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    {selectedMemberIds.length === targetMembersCount ? '✓' : '2'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm">Subscribers ({selectedMemberIds.length}/{targetMembersCount})</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-1">Direct Member Allocation</p>
              </button>

              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  wizardStep === 3
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${wizardStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>3</span>
                  <span className="font-bold text-xs sm:text-sm">Verify & Launch</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-1">Pre-flight Diagnostics</p>
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3 border border-rose-200 dark:border-rose-900/50">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Action Required</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* STEP 1: SCHEME CONFIGURATION */}
            {wizardStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Billing Frequency */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Select Billing Frequency & Route Track *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleFrequencySelect('DAILY')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        form.frequency === 'DAILY'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 shadow-sm ring-2 ring-blue-600/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                        <span>🚚</span>
                        <span>Daily Chit (Day-by-Day Route)</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Installments collected daily by field agents with mobile waypoint tracking
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFrequencySelect('MONTHLY')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        form.frequency === 'MONTHLY'
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 shadow-sm ring-2 ring-blue-600/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                        <span>🗓️</span>
                        <span>Monthly Chit (Month-by-Month)</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Installments collected monthly with formal reverse auction sessions
                      </p>
                    </button>
                  </div>
                </div>

                {/* Scheme Mechanism: STRICTLY Auction Chit or Double Chit (Standard Chit Removed) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Scheme Mechanism (Enabled for {form.frequency === 'DAILY' ? 'Daily Route' : 'Monthly Cycle'}) *
                    </label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold font-mono">
                      {form.frequency === 'DAILY' ? 'Daily Collection' : 'Monthly Collection'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSchemeTypeSelect('AUCTION_CHIT')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        form.chit_type === 'AUCTION_CHIT'
                          ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 shadow-xs ring-2 ring-emerald-600/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm sm:text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <span>🔨</span>
                        <span>Auction Chit</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Competitive reverse bidding auction every cycle with 5% foreman commission & dividend distributed equally to all enrolled subscribers
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSchemeTypeSelect('DOUBLE_CHIT')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        form.chit_type === 'DOUBLE_CHIT'
                          ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/60 text-purple-900 dark:text-purple-100 shadow-xs ring-2 ring-purple-600/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm sm:text-base flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <span>⚡</span>
                        <span>Double Chit</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Dual winner auctions per cycle with auction discount retained in the scheme pool for accelerated second-tier bidding rounds
                      </div>
                    </button>
                  </div>
                </div>

                {/* Core Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Scheme Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.group_code}
                      onChange={(e) => setForm({ ...form, group_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. DLY-AUC-101"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-semibold text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
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
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Assign Collection Agent
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAgentError('');
                          setShowQuickAgentModal(true);
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Add New Agent</span>
                      </button>
                    </div>
                    <select
                      value={form.assigned_agent_id}
                      onChange={(e) => setForm({ ...form, assigned_agent_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="">-- Assign Later --</option>
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.full_name} ({ag.phone})
                        </option>
                      ))}
                    </select>
                    {agents.length === 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        No agents registered yet. Click "+ Add New Agent" above to create one right now.
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial Configuration with Auto-Calculated Total Pool (No Manual Typing) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
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
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Subscribers Limit (Members) *
                    </label>
                    <input
                      type="number"
                      required
                      value={form.total_members_limit}
                      onChange={(e) => handleFinancialFieldChange('total_members_limit', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Duration ({form.frequency === 'DAILY' ? 'Days' : 'Months'}) *
                    </label>
                    <input
                      type="number"
                      required
                      value={form.duration_periods}
                      onChange={(e) => handleFinancialFieldChange('duration_periods', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* AUTO CALCULATED TOTAL POOL BOX - NO MANUAL TYPING */}
                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                        Total Chit Pool (Auto)
                      </span>
                      <div className="text-lg font-extrabold text-blue-700 dark:text-blue-300 font-mono mt-0.5">
                        ₹{parseFloat(form.total_pool_amount || '0').toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      ₹{form.installment_amount} × {form.total_members_limit} subscribers
                    </span>
                  </div>
                </div>

                {/* Auction / Double Chit Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
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
                      className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Standard statutory commission: 5.0%</p>
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
                      className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Cap on subscriber reverse bidding: 35.0%</p>
                  </div>
                </div>

                {/* Scheme Commencement Date - Unrestricted: Can be past, present, or future */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Scheme Commencement Date *
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Flexible: Any past, current, or future date allowed
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Chits can be backdated for ledger import, initialized today, or scheduled for future launch.
                  </p>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Next: Select Enrolled Members ({selectedMemberIds.length}/{targetMembersCount})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT ENROLLED MEMBERS */}
            {wizardStep === 2 && (
              <div className="space-y-5 animate-fadeIn">
                {/* Capacity Counter & Progress Alert */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  selectedCount === targetMembersCount
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : selectedCount < targetMembersCount
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                      {selectedCount === targetMembersCount ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>Exact Member Capacity Met: {selectedCount} / {targetMembersCount} Enrolled</span>
                        </>
                      ) : selectedCount < targetMembersCount ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>Need {targetMembersCount - selectedCount} More Subscriber(s) to Fill Group ({selectedCount} / {targetMembersCount})</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>{selectedCount - targetMembersCount} Extra Members Selected ({selectedCount} / {targetMembersCount})</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 shadow-2xs">
                      {Math.round((selectedCount / Math.max(1, targetMembersCount)) * 100)}% Filled
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-3">
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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search registered members by name, phone, code..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAutoSelectMembers}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Quickly fill first available members"
                    >
                      ⚡ Auto-Select {targetMembersCount}
                    </button>

                    {selectedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAllMembers}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}

                    {/* Inline Quick Add Member */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickMemberError('');
                        setShowQuickMemberModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Quick Add Member</span>
                    </button>
                  </div>
                </div>

                {/* Members Selection List */}
                <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {allMembers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-sm font-semibold">No registered members found in the system</p>
                      <button
                        type="button"
                        onClick={() => setShowQuickMemberModal(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        + Register First Subscriber Now
                      </button>
                    </div>
                  ) : filteredMembersList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
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
                          className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] rounded-xl ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100/60 animate-selectPop border-l-4 border-blue-600 shadow-xs'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer pointer-events-none"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {m.full_name}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {m.member_code}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>📞 {m.phone}</span>
                                {m.address && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate max-w-[200px]">📍 {m.address}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono shrink-0 shadow-2xs">
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
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setWizardStep(1);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
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
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 space-y-3">
                    <div className="flex items-start gap-3">
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
                                onClick={() => setShowQuickMemberModal(true)}
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
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold block">✓ All Pre-Flight Validations Passed!</span>
                      <span>
                        Exactly {targetMembersCount} subscribers verified and allocated to Tickets #1 through #{targetMembersCount}. Ledger accounts and agent route stops will be initialized automatically upon confirmation.
                      </span>
                    </div>
                  </div>
                )}

                {/* Scheme Blueprint Summary */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60">
                        {form.group_code}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {form.group_name}
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {form.frequency === 'DAILY' ? 'Daily Route' : 'Monthly Cycle'} · {form.chit_type === 'DOUBLE_CHIT' ? 'Double Chit' : 'Auction Chit'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Per Period Installment</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">
                        ₹{parseFloat(form.installment_amount || '0').toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Total Chit Pool</span>
                      <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm font-extrabold">
                        ₹{parseFloat(form.total_pool_amount || '0').toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Subscribers & Tickets</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">
                        {selectedCount} / {targetMembersCount} Members
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Commencement Date</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">
                        {form.start_date}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Foreman Commission</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">
                        {form.foreman_commission_percent}%
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Max Permissible Bid</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">
                        {form.max_bid_percent}%
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Route Location</span>
                      <strong className="text-slate-900 dark:text-white truncate block">
                        {form.location_name}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Assigned Agent</span>
                      <strong className="text-slate-900 dark:text-white truncate block">
                        {agents.find((a) => String(a.id) === String(form.assigned_agent_id))?.full_name || 'Unassigned'}
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

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedMemberIds.map((mId, idx) => {
                      const member = allMembers.find((m) => m.id === mId);
                      return (
                        <div key={mId} className="p-2.5 px-4 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                              Ticket #{idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {member?.full_name || `Member #${mId}`}
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono">
                            {member?.phone || 'No Phone'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setWizardStep(2);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Select Members</span>
                  </button>

                  <button
                    type="button"
                    disabled={isMismatch || submitting}
                    onClick={handleCreateGroup}
                    className={`px-7 py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center gap-2 ${
                      isMismatch || submitting
                        ? 'bg-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer ring-2 ring-emerald-500/30'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Launching Scheme & Generating Stops...</span>
                      </>
                    ) : isMismatch ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Fix Member Mismatch to Launch ({selectedCount}/{targetMembersCount})</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Confirm & Launch Chit Group</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
         INLINE MODAL: QUICK ADD COLLECTION AGENT (Zero Navigation Loss)
         ========================================================================= */}
      {showQuickAgentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-800/80 shadow-2xl p-6 space-y-4 animate-confirmScale">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Quick Add Collection Agent
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAgentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickAgentError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{quickAgentError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddAgent} className="space-y-3">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAgentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAgentSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  {quickAgentSubmitting ? 'Creating...' : 'Create & Select Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         INLINE MODAL: QUICK REGISTER MEMBER / SUBSCRIBER (Zero Navigation Loss)
         ========================================================================= */}
      {showQuickMemberModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-slate-800/80 shadow-2xl p-6 space-y-4 animate-confirmScale">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Quick Register New Subscriber
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickMemberModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickMemberError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{quickMemberError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddMember} className="space-y-3">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickMemberModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickMemberSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  {quickMemberSubmitting ? 'Registering...' : 'Register & Select Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chit Group Complete History & Audit Dossier */}
      <ChitHistoryModal
        groupId={selectedHistoryGroupId}
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedHistoryGroupId(null);
        }}
      />
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [agRes, grRes] = await Promise.all([
        api.get('/admin/agents'),
        api.get('/admin/groups'),
      ]);
      if (agRes.data?.success) setAgents(agRes.data.data || []);
      if (grRes.data?.success) setGroups(grRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/admin/agents', form);
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
      {/* Modal: Create Agent */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
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
        </div>
      )}

      {/* Modal: Assign Agent to Route */}
      {showAssignModal && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
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
                  <p className="text-xs text-slate-500">{selectedAgent.full_name}</p>
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
                      {g.group_name} ({g.group_code}) [{g.frequency}] - {g.location_name || 'All Stops'}
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
        </div>
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
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination for Members Table
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);

  useEffect(() => {
    setMembersPage(1);
  }, [search]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, gRes] = await Promise.all([
        api.get(`/admin/members${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        api.get('/admin/groups'),
      ]);
      if (mRes.data?.success) setMembers(mRes.data.data || []);
      if (gRes.data?.success) setGroups(gRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const openPassbook = async (member) => {
    setSelectedMember(member);
    setLoadingPassbook(true);
    setShowPassbookModal(true);
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
                      <td className="py-3.5 px-4 text-right space-x-2">
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
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
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
        </div>
      )}

      {/* Modal: Enroll in Group */}
      {showEnrollModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
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
                  <p className="text-xs text-slate-500">{selectedMember.full_name} ({selectedMember.phone})</p>
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
                      {g.group_name} ({g.group_code}) [{g.frequency}] — Installment: ₹{parseFloat(g.installment_amount).toLocaleString('en-IN')}/{g.frequency === 'DAILY' ? 'day' : 'month'}
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
        </div>
      )}

      {/* Modal: ChitBase Member Passbook / Statement of Account */}
      {showPassbookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
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
                      <div key={eg.membership_id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{eg.group_name}</div>
                          <div className="text-[11px] text-slate-500">{eg.chit_type?.replace('_', ' ')} · Ticket #{eg.ticket_number}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">₹{Number(eg.installment_amount).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block">{eg.frequency}</span>
                        </div>
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
                              <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">₹{Number(col.amount).toLocaleString('en-IN')}</td>
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
                              <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">₹{Number(div.net_installment_due).toLocaleString('en-IN')}</td>
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
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. COLLECTIONS & RECEIPT MANAGEMENT
   ========================================================================= */
export function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedReceipt, setGeneratedReceipt] = useState(null);

  // Pagination for Collections Table
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionsPageSize, setCollectionsPageSize] = useState(10);

  const [form, setForm] = useState({
    group_id: '',
    member_id: '',
    amount: '',
    payment_method: 'CASH',
    payment_reference: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [colRes, grpRes, memRes] = await Promise.all([
        api.get('/admin/collections'),
        api.get('/admin/groups'),
        api.get('/admin/members'),
      ]);
      if (colRes.data?.success) setCollections(colRes.data.data || []);
      if (grpRes.data?.success) setGroups(grpRes.data.data || []);
      if (memRes.data?.success) setMembers(memRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        setSuccess('Payment collected and recorded in MySQL!');
        setGeneratedReceipt(res.data.receipt);
        setShowModal(false);
        setForm({
          group_id: '',
          member_id: '',
          amount: '',
          payment_method: 'CASH',
          payment_reference: '',
          notes: '',
        });
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Collection recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Collections & Receipt Entry</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record physical cash and digital UPI payments with official receipt generation
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowModal(true);
            setError('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {generatedReceipt && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                Receipt Issued: {generatedReceipt.receiptNumber}
              </p>
              <p className="text-emerald-700 dark:text-emerald-300">
                Amount: ₹{parseFloat(generatedReceipt.amount).toLocaleString('en-IN')} via {generatedReceipt.paymentMethod}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGeneratedReceipt(null)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading collections ledger...</td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
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

      {/* Modal: Record Collection */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
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

            <form onSubmit={handleRecordCollection} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Chit Group Scheme *
                </label>
                <select
                  required
                  value={form.group_id}
                  onChange={(e) => handleGroupSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Choose Chit Scheme Group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} ({g.group_code}) [{g.frequency}] — ₹{parseFloat(g.installment_amount).toLocaleString('en-IN')}/{g.frequency === 'DAILY' ? 'day' : 'month'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Member Participant *
                </label>
                <select
                  required
                  value={form.member_id}
                  onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Choose Enrolled Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.phone}) - Code: {m.member_code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
            Configure business registration details, default chit fund rules, and verify database integrity
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

        {/* Card 3: Database & Security Integrity */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Database & Security Parameters
            </h3>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Database Engine</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">MySQL 9.3</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Database Schema</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">chitfund_db</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Authentication Session</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">HttpOnly Secure JWT</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Password Algorithm</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">Bcrypt (Salt 12)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Receipt & Handover Verification */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Receipt & Numbering Standard
            </h3>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Receipt Numbering Standard</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">REC-YYYYMMDD-XXXX</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Member Identifier Standard</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">MEM-XXXX</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span>Universal Date Format</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">DD/MM/YYYY</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Daily Reconciliation</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Synchronous Active</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
