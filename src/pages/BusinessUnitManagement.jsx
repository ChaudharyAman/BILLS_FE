import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { FaBuilding, FaPlus, FaEdit, FaTrash, FaUser, FaChartPie, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';

const PRESET_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const BusinessUnitManagement = () => {
  const [units, setUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head: '',
    status: 'active',
    color: '#2563eb',
    isDefault: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rollupRes, empRes] = await Promise.all([
        api.get('/business-units/rollup'),
        api.get('/employees?limit=1000').catch(() => ({ data: { data: [] } })),
      ]);
      setUnits(rollupRes.data || []);
      setEmployees(empRes.data.data || empRes.data || []);
    } catch (err) {
      console.error('Failed to load business units:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (unit = null) => {
    setErrorMsg('');
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name || '',
        code: unit.code || '',
        description: unit.description || '',
        head: unit.head?._id || unit.head || '',
        status: unit.status || 'active',
        color: unit.color || '#2563eb',
        isDefault: !!unit.isDefault,
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        head: '',
        status: 'active',
        color: PRESET_COLORS[units.length % PRESET_COLORS.length],
        isDefault: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMsg('Name and Short Code are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        head: formData.head || null,
      };

      if (editingUnit) {
        await api.put(`/business-units/${editingUnit._id}`, payload);
      } else {
        await api.post('/business-units', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save business unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Business Unit?')) return;
    try {
      await api.delete(`/business-units/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete business unit');
    }
  };

  const totalRevenueSum = units.reduce((acc, u) => acc + (u.totalRevenue || 0), 0);
  const totalExpenseSum = units.reduce((acc, u) => acc + (u.totalExpense || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FaBuilding className="text-blue-600" /> Business Units
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage operational business units and view consolidated revenue, expenses, and net profit per unit.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <FaPlus size={14} /> Add Business Unit
          </button>
        </div>

        {/* Summary Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
              {units.length}
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Units</span>
              <p className="text-lg font-bold text-slate-800">{units.length} Units</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
              <FaCheckCircle />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Units</span>
              <p className="text-lg font-bold text-slate-800">
                {units.filter(u => u.status === 'active').length} Active
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold text-xl">
              <FaChartPie />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
              <p className="text-lg font-bold text-green-700">₹{totalRevenueSum.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
              ₹
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses</span>
              <p className="text-lg font-bold text-slate-800">₹{totalExpenseSum.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Business Units Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
                <Skeleton width="60%" height="20px" />
                <Skeleton width="40%" height="14px" />
                <Skeleton width="100%" height="60px" />
              </div>
            ))
          ) : units.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200">
              <FaBuilding size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Business Units Created</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Set up business units to slice income, expenses, and invoices by business division.</p>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                Create First Business Unit
              </button>
            </div>
          ) : (
            units.map((unit) => {
              const headName = unit.head ? `${unit.head.firstName || ''} ${unit.head.lastName || ''}`.trim() : null;
              return (
                <div
                  key={unit._id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: unit.color || '#2563eb' }}
                        />
                        <h3 className="font-bold text-slate-900 text-base">{unit.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {unit.code}
                      </span>
                    </div>

                    {unit.description && (
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{unit.description}</p>
                    )}

                    {/* Unit Head */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <FaUser className="text-slate-400" />
                      <span className="font-medium">{headName ? `Head: ${headName}` : 'Unassigned Head'}</span>
                    </div>

                    {/* Financial Rollup */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Revenue</span>
                        <p className="font-bold text-green-600">₹{(unit.totalRevenue || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Expenses</span>
                        <p className="font-bold text-slate-700">₹{(unit.totalExpense || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      unit.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {unit.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(unit)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit Business Unit"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(unit._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Business Unit"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Form */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUnit ? 'Edit Business Unit' : 'Create Business Unit'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600 flex items-center gap-2">
                <FaExclamationCircle /> {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Retail Division"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Short Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. RETAIL"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Head (Optional)</label>
              <select
                value={formData.head}
                onChange={e => setFormData({ ...formData, head: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              >
                <option value="">Select Employee Manager</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId || 'Emp'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of operations handled by this business unit..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">UI Color Badge</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    className="w-9 h-9 p-0.5 border border-slate-300 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 font-mono">{formData.color}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                {submitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Create Unit'}
              </button>
            </div>
          </form>
        </Modal>

      </div>
    </div>
  );
};

export default BusinessUnitManagement;
