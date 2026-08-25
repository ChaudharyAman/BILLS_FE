import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
  FaUniversity, FaPlus, FaEdit, FaTrash, FaTimes, FaSave,
  FaCalendarAlt, FaPercent, FaMoneyBillWave, FaFilter, FaCalculator
} from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const fmtMoney = (value) => {
  if (value === null || value === undefined) return '₹0.00';
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const emptyAsset = {
  name: '',
  category: 'fixed',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchaseValue: '',
  salvageValue: '0',
  usefulLife: '5',
  depreciationMethod: 'straight-line',
  depreciationRate: '20',
  status: 'active',
};

const AssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState(emptyAsset);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/assets');
      setAssets(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    return true;
  });

  const totalPurchaseValue = assets
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + (Number(a.purchaseValue) || 0), 0);

  const totalFixedAssets = assets
    .filter(a => a.status === 'active' && a.category === 'fixed')
    .reduce((sum, a) => sum + (Number(a.currentValue || a.purchaseValue) || 0), 0);

  const openCreate = () => {
    setEditingAsset(null);
    setFormData(emptyAsset);
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingAsset(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'fixed',
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().slice(0, 10) : '',
      purchaseValue: item.purchaseValue ?? '',
      salvageValue: item.salvageValue ?? '0',
      usefulLife: item.usefulLife ?? '5',
      depreciationMethod: item.depreciationMethod || 'straight-line',
      depreciationRate: item.depreciationRate ?? '20',
      status: item.status || 'active',
    });
    setModalError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAsset(null);
    setFormData(emptyAsset);
    setModalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : new Date(),
        purchaseValue: Number(formData.purchaseValue) || 0,
        salvageValue: Number(formData.salvageValue) || 0,
        usefulLife: Number(formData.usefulLife) || 0,
        depreciationMethod: formData.depreciationMethod,
        depreciationRate: Number(formData.depreciationRate) || 0,
        status: formData.status,
      };

      if (editingAsset) {
        await api.put(`/assets/${editingAsset._id}`, payload);
      } else {
        await api.post('/assets', payload);
      }

      closeModal();
      fetchAssets();
    } catch (err) {
      console.error(err);
      setModalError(err?.response?.data?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete asset "${name}"?`)) return;
    try {
      await api.delete(`/assets/${id}`);
      fetchAssets();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete asset');
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans text-slate-900 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 flex items-center gap-3">
            <span className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-100">
              <FaUniversity size={20} />
            </span>
            Asset Management & Depreciation
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track fixed assets, equipment, depreciation schedules, and book values for your Balance Sheet.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <FaPlus size={12} />
          <span>Add Asset</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Total Purchase Valuation</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{fmtMoney(totalPurchaseValue)}</div>
          <span className="text-[11px] text-slate-400 mt-2 block">Original historical cost</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Net Fixed Assets (Book Value)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{fmtMoney(totalFixedAssets)}</div>
          <span className="text-[11px] text-slate-400 mt-2 block">Populates Balance Sheet Net Fixed Assets</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <FaFilter size={10} /> Filter Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none"
          >
            <option value="all">All Categories</option>
            <option value="fixed">Fixed Assets</option>
            <option value="current">Current Assets</option>
            <option value="intangible">Intangible Assets</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {filteredAssets.length} of {assets.length} assets
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
        <div className="bg-white border border-rose-200 text-rose-700 p-6 rounded-2xl text-center font-bold">
          {error}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 font-semibold">
          No assets recorded matching the filters. Click "+ Add Asset" to add one.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <th className="py-3 px-5">Asset Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Purchase Cost</th>
                  <th className="py-3 px-4 text-center">Depreciation Method</th>
                  <th className="py-3 px-4 text-center">Useful Life</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredAssets.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Purchased: {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-IN') : '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        item.category === 'fixed' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900">
                      {fmtMoney(item.purchaseValue)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs capitalize">
                      {item.depreciationMethod || 'straight-line'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs">
                      {item.usefulLife ? `${item.usefulLife} yrs` : item.depreciationRate ? `${item.depreciationRate}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 capitalize">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id, item.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <FaTimes size={16} />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
              <FaUniversity className="text-blue-600" />
              {editingAsset ? 'Edit Asset' : 'Add Asset'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Record fixed assets and specify depreciation methods to populate Balance Sheet Net Fixed Assets.
            </p>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell PowerEdge Server"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="fixed">Fixed Asset</option>
                    <option value="current">Current Asset</option>
                    <option value="intangible">Intangible Asset</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 80000"
                    value={formData.purchaseValue}
                    onChange={(e) => setFormData({ ...formData, purchaseValue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salvage Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={formData.salvageValue}
                    onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Depreciation Method</label>
                  <select
                    value={formData.depreciationMethod}
                    onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="straight-line">Straight-Line</option>
                    <option value="declining-balance">Declining-Balance</option>
                    <option value="none">None (No Depreciation)</option>
                  </select>
                </div>

                {formData.depreciationMethod === 'straight-line' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Useful Life (Years)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={formData.usefulLife}
                      onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                ) : formData.depreciationMethod === 'declining-balance' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Annual Rate (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="e.g. 20"
                      value={formData.depreciationRate}
                      onChange={(e) => setFormData({ ...formData, depreciationRate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
