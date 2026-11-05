import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  ShieldCheck,
  Coins,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import ModalPortal from '../../components/ModalPortal';
import { formatDate } from '../../utils/dateUtils';

export default function InterestCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Customer Form State
  const initialForm = {
    full_name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    aadhaar_number: '',
    pan_number: '',
    nominee_name: '',
    nominee_phone: '',
    nominee_relation: '',
    guarantor_name: '',
    guarantor_phone: '',
    guarantor_address: '',
    notes: '',
  };
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/interest/customers?search=${encodeURIComponent(search)}`);
      if (res.data?.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openCustomerProfile = async (id) => {
    setSelectedCustomerId(id);
    setCustomerDetail(null);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/interest/customers/${id}`);
      if (res.data?.success) {
        setCustomerDetail(res.data.data);
      }
    } catch (err) {
      // Failed to load
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const res = await api.post('/interest/customers', form);
      if (res.data?.success) {
        setShowAddModal(false);
        setForm(initialForm);
        fetchCustomers();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-fadeIn font-sans pb-10">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-heading">
              Borrower Directory
            </span>
            <span className="text-xs text-slate-400">· {customers.length} Profiles</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-heading mt-1">
            Borrower & Customer KYC Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage borrower KYC documents, nominees, guarantors, active loan liabilities & double-entry ledgers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setFormError('');
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(99,102,241,0.35)] cursor-pointer font-heading"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search borrower name, phone number, customer code, or Aadhaar..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-all"
        />
      </div>

      {/* Customers List / Table */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/60 dark:border-white/5">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading customer profiles...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-heading">No Customers Found</p>
          <p className="text-xs text-slate-500 mt-1">Register a new borrower to start originating loans.</p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-white/[0.02] text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200/60 dark:border-white/5">
                <tr>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Borrower Name</th>
                  <th className="py-3.5 px-4">Phone / Contact</th>
                  <th className="py-3.5 px-4">City / Area</th>
                  <th className="py-3.5 px-4">Active Loans</th>
                  <th className="py-3.5 px-4">Total Outstanding</th>
                  <th className="py-3.5 px-4">KYC</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-indigo-50/30 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {c.customer_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {c.full_name ? c.full_name[0].toUpperCase() : 'B'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white font-heading">{c.full_name}</div>
                          {c.aadhaar_number && (
                            <div className="text-[10px] text-slate-400 font-mono">Aadhaar: {c.aadhaar_number}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {c.phone}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {c.city || c.address || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {c.active_loans_count || 0} Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white">
                      ₹{Number(c.total_principal_outstanding || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {c.kyc_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openCustomerProfile(c.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer font-heading shadow-2xs hover:-translate-y-0.5"
                      >
                        Profile & Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Profile & Unified Ledger Drawer Modal */}
      {selectedCustomerId && (
        <ModalPortal
          id="interest-customer-profile-modal"
          isOpen={Boolean(selectedCustomerId)}
          onClose={() => setSelectedCustomerId(null)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl p-6 space-y-5 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-base font-heading">
                  {customerDetail?.customer?.full_name ? customerDetail.customer.full_name[0] : 'C'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base font-heading">
                    {customerDetail?.customer?.full_name || 'Customer Profile'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {customerDetail?.customer?.customer_code} · {customerDetail?.customer?.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center flex-1">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-1" />
                <p className="text-xs text-slate-500">Loading customer profile and ledger history...</p>
              </div>
            ) : customerDetail ? (
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
                {/* Profile Information Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">KYC & Contact</span>
                    <div>Address: <strong>{customerDetail.customer.address || '—'}</strong></div>
                    <div>Aadhaar: <strong>{customerDetail.customer.aadhaar_number || '—'}</strong></div>
                    <div>PAN: <strong>{customerDetail.customer.pan_number || '—'}</strong></div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Guarantor & Nominee</span>
                    <div>Nominee: <strong>{customerDetail.customer.nominee_name || '—'}</strong> ({customerDetail.customer.nominee_relation || 'Relation'})</div>
                    <div>Guarantor: <strong>{customerDetail.customer.guarantor_name || '—'}</strong> ({customerDetail.customer.guarantor_phone || '—'})</div>
                  </div>
                </div>

                {/* Linked Loan Accounts */}
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white font-heading mb-2">
                    Linked Loan Accounts ({customerDetail.loans?.length || 0})
                  </div>
                  {customerDetail.loans?.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No loan accounts disbursed yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerDetail.loans?.map((l) => (
                        <div
                          key={l.id}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-indigo-600">{l.loan_account_number}</span>
                            <span className="text-slate-400 mx-1.5">·</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{l.scheme_name}</span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Disbursed: ₹{Number(l.principal_amount).toLocaleString('en-IN')} on {formatDate(l.disbursement_date)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              ₹{Number(l.principal_outstanding).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unified Customer Ledger History */}
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white font-heading mb-2">
                    Unified Financial Ledger
                  </div>
                  {customerDetail.ledger?.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No ledger entries recorded yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Debit (+)</th>
                            <th className="py-2.5 px-3">Credit (-)</th>
                            <th className="py-2.5 px-3">Net Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                          {customerDetail.ledger?.map((entry) => (
                            <tr key={entry.id}>
                              <td className="py-2 px-3 font-sans">{formatDate(entry.transaction_date)}</td>
                              <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">
                                {entry.description}
                              </td>
                              <td className="py-2 px-3 text-rose-600">
                                {Number(entry.debit_amount) > 0 ? `₹${Number(entry.debit_amount).toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-emerald-600 font-bold">
                                {Number(entry.credit_amount) > 0 ? `₹${Number(entry.credit_amount).toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                                ₹{Number(entry.net_balance).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </ModalPortal>
      )}

      {/* Register New Customer Modal */}
      {showAddModal && (
        <ModalPortal
          id="interest-add-customer-modal"
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="font-black text-slate-900 dark:text-white text-base font-heading">
                Register New Customer / Borrower
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    value={form.aadhaar_number}
                    onChange={(e) => setForm({ ...form, aadhaar_number: e.target.value })}
                    placeholder="12-digit Aadhaar"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={form.pan_number}
                    onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                    placeholder="PAN number"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, locality, landmarks..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">City / Town</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nominee Name</label>
                  <input
                    type="text"
                    value={form.nominee_name}
                    onChange={(e) => setForm({ ...form, nominee_name: e.target.value })}
                    placeholder="Nominee full name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Guarantor Name</label>
                  <input
                    type="text"
                    value={form.guarantor_name}
                    onChange={(e) => setForm({ ...form, guarantor_name: e.target.value })}
                    placeholder="Guarantor name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Guarantor Phone</label>
                  <input
                    type="tel"
                    value={form.guarantor_phone}
                    onChange={(e) => setForm({ ...form, guarantor_phone: e.target.value })}
                    placeholder="Guarantor mobile"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Register Customer</span>
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

