import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  FaCreditCard, FaPlus, FaEdit, FaTrash, FaTimes, FaSave,
  FaUniversity, FaCalendarAlt, FaPercent, FaMoneyBillWave,
  FaCheckCircle, FaExclamationTriangle, FaFilter
} from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => {
  if (value === null || value === undefined) return '₹0.00';
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const emptyLiability = {
  name: '',
  type: 'long-term',
  category: 'loan',
  principalAmount: '',
  outstandingAmount: '',
  currentPortionAmount: '',
  interestRate: '',
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  status: 'active',
};

const LiabilityManagement = () => {
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingLiability, setEditingLiability] = useState(null);
  const [formData, setFormData] = useState(emptyLiability);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchLiabilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/liabilities');
      setLiabilities(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to fetch liabilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiabilities();
  }, []);

  const filteredLiabilities = liabilities.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const totalOutstanding = liabilities
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (Number(l.outstandingAmount) || 0), 0);

  const totalLongTerm = liabilities
    .filter(l => l.status === 'active' && l.type === 'long-term')
    .reduce((sum, l) => sum + (Number(l.outstandingAmount) || 0), 0);

  const totalCurrentPortion = liabilities
    .filter(l => l.status === 'active' && l.type === 'long-term')
    .reduce((sum, l) => sum + (Number(l.currentPortionAmount) || 0), 0);

  const openCreate = () => {
    setEditingLiability(null);
    setFormData(emptyLiability);
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingLiability(item);
    setFormData({
      name: item.name || '',
      type: item.type || 'long-term',
      category: item.category || 'loan',
      principalAmount: item.principalAmount ?? '',
      outstandingAmount: item.outstandingAmount ?? '',
      currentPortionAmount: item.currentPortionAmount ?? '',
      interestRate: item.interestRate ?? '',
      startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : '',
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
      status: item.status || 'active',
    });
    setModalError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLiability(null);
    setFormData(emptyLiability);
    setModalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        category: formData.category,
        principalAmount: Number(formData.principalAmount) || 0,
        outstandingAmount: Number(formData.outstandingAmount) || 0,
        currentPortionAmount: formData.type === 'long-term' ? (Number(formData.currentPortionAmount) || 0) : 0,
        interestRate: Number(formData.interestRate) || 0,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        status: formData.status,
      };

      if (editingLiability) {
        await api.put(`/liabilities/${editingLiability._id}`, payload);
      } else {
        await api.post('/liabilities', payload);
      }

      closeModal();
      fetchLiabilities();
    } catch (err) {
      console.error(err);
      setModalError(err?.response?.data?.message || 'Failed to save liability');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/liabilities/${id}`);
      fetchLiabilities();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete liability');
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 dark:text-slate-100 min-h-screen transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <span className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
              <FaCreditCard size={20} />
            </span>
            Liabilities & Debt Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Track business loans, credit facilities, long-term debt, and 12-month current principal portions.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <FaPlus size={12} />
          <span>Add Liability</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Total Outstanding Debt</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{fmtMoney(totalOutstanding)}</div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 block">All active obligations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Long-Term Debt</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{fmtMoney(totalLongTerm)}</div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 block">Maturity &gt; 12 months</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Current Portion of LT Debt</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{fmtMoney(totalCurrentPortion)}</div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 block">Principal due in next 12 months</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FaFilter size={10} /> Filter:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
          >
            <option value="all">All Types</option>
            <option value="current">Current (&le; 1 yr)</option>
            <option value="long-term">Long-Term (&gt; 1 yr)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paid">Paid</option>
            <option value="defaulted">Defaulted</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Showing {filteredLiabilities.length} of {liabilities.length} liabilities
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="60px" className="rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 p-6 rounded-2xl text-center font-bold">
          {error}
        </div>
      ) : filteredLiabilities.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
          No liabilities recorded matching the filters. Click "+ Add Liability" to add one.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                  <th className="py-3 px-5">Name & Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-right">Current Portion</th>
                  <th className="py-3 px-4 text-center">Interest</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredLiabilities.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">{item.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        item.type === 'long-term' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs">{fmtMoney(item.principalAmount)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{fmtMoney(item.outstandingAmount)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-indigo-600 dark:text-indigo-400">
                      {item.type === 'long-term' ? fmtMoney(item.currentPortionAmount) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs">{item.interestRate ? `${item.interestRate}%` : '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' : item.status === 'paid' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          title="Edit"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id, item.name)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 relative transition-colors">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
            >
              <FaTimes size={16} />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
              <FaCreditCard className="text-amber-500" />
              {editingLiability ? 'Edit Liability' : 'Add Liability'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Record business debt, bank loans, and 12-month current principal portions for accurate balance sheet categorization.
            </p>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Liability Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Business Term Loan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
                  >
                    <option value="long-term">Long-Term (&gt; 12 mo)</option>
                    <option value="current">Current (&le; 12 mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
                  >
                    <option value="loan">Loan / Notes Payable</option>
                    <option value="credit-card">Credit Card Facility</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="accounts-payable">Accounts Payable</option>
                    <option value="other">Other Obligation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Principal Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 500000"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Outstanding Balance (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 350000"
                    value={formData.outstandingAmount}
                    onChange={(e) => setFormData({ ...formData, outstandingAmount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              {formData.type === 'long-term' && (
                <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3">
                  <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-300 mb-1">
                    Current Portion of Long-Term Debt (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Principal due within next 12 months"
                    value={formData.currentPortionAmount}
                    onChange={(e) => setFormData({ ...formData, currentPortionAmount: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-indigo-800 dark:text-indigo-400 mt-1">
                    This amount populates "Current portion long-term debt" on your Balance Sheet.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 9.5"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="paid">Paid</option>
                    <option value="defaulted">Defaulted</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Liability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiabilityManagement;
