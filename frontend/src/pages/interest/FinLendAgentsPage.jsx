import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserCheck,
  Plus,
  RefreshCw,
  Phone,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit3,
  X,
  AlertCircle,
  Shield,
} from 'lucide-react';
import api from '../../api/client';
import { formatDate } from '../../utils/interestUtils';

export default function FinLendAgentsPage() {
  const navigate = useNavigate();

  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    password: '',
    role: 'COLLECTION_AGENT',
    assigned_business: 'INTEREST',
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    password: '',
    is_active: 1,
    assigned_business: 'INTEREST',
  });

  const loadAgents = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.get('/admin/agents');
      if (res.data?.success) {
        const all = res.data.data || [];
        const interestStaff = all.filter(
          (u) =>
            u.assigned_business === 'INTEREST' ||
            u.assigned_business === 'ALL' ||
            u.role === 'SUPER_ADMIN' ||
            u.role === 'ADMIN'
        );
        setAgents(interestStaff);
      }
    } catch (err) {
      setError('Failed to load agents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase().trim();
    return agents.filter(
      (a) =>
        a.full_name?.toLowerCase().includes(q) ||
        a.username?.toLowerCase().includes(q) ||
        a.phone?.includes(q)
    );
  }, [agents, searchQuery]);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/admin/agents', {
        full_name: createForm.full_name.trim(),
        username: createForm.username.trim().toLowerCase(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role,
        assigned_business: 'INTEREST',
      });

      if (res.data?.success) {
        setSuccess(`Agent account '${createForm.username}' created successfully.`);
        setShowCreateModal(false);
        setCreateForm({
          full_name: '',
          username: '',
          phone: '',
          password: '',
          role: 'COLLECTION_AGENT',
          assigned_business: 'INTEREST',
        });
        loadAgents(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create agent.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (agent) => {
    setSelectedAgent(agent);
    setEditForm({
      full_name: agent.full_name || '',
      username: agent.username || '',
      phone: agent.phone || '',
      password: '',
      is_active: agent.is_active ? 1 : 0,
      assigned_business: agent.assigned_business || 'INTEREST',
    });
    setShowEditModal(true);
    setError('');
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        username: editForm.username.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        is_active: editForm.is_active,
        assigned_business: selectedAgent.role === 'ADMIN' ? 'ALL' : editForm.assigned_business,
      };
      if (editForm.password && editForm.password.trim().length >= 4) {
        payload.password = editForm.password.trim();
      }

      const res = await api.put(`/admin/agents/${selectedAgent.id}`, payload);
      if (res.data?.success) {
        setSuccess(`Agent '${selectedAgent.username}' updated.`);
        setShowEditModal(false);
        loadAgents(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update agent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn font-sans pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/interest/more')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>More</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadAgents(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-xs transition-colors font-heading"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Agent</span>
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
          Agents & Staff
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage field collection staff, credentials and assigned business
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agent by name, username or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Agents List */}
      <div className="space-y-3">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm shrink-0 border border-purple-200/60 dark:border-purple-800/40 font-heading">
                {(agent.full_name || 'A').charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white font-heading">
                    {agent.full_name}
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    @{agent.username}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      agent.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                    }`}
                  >
                    {agent.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>📱 {agent.phone || 'No phone'}</span>
                  <span>•</span>
                  <span>Role: <strong>{agent.role}</strong></span>
                  <span>•</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    Scope: {agent.assigned_business || 'INTEREST'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => openEditModal(agent)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit / Password</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Add FinLend Field Agent
                </h3>
                <p className="text-xs text-slate-500">Create agent login credentials</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Username (Login ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. suresh_finlend"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit number"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Password or PIN *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 4 digits"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
                >
                  {submitting ? 'Creating...' : 'Create Agent Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Edit Agent: @{selectedAgent.username}
                </h3>
                <p className="text-xs text-slate-500">Update agent profile or reset password</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAgent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Reset Password (leave empty to keep current)</label>
                <input
                  type="password"
                  placeholder="New password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Status</label>
                <select
                  value={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Disabled</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

