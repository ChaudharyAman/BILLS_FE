import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);

const emptyForm = {
  name: '',
  category: '',
  department: '',
  period: 'monthly',
  startDate: firstDay,
  endDate: lastDay,
  budgetAmount: 0,
  alertThreshold: 80,
  notes: '',
};

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const BudgetManager = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [budgetRes, categoryRes, departmentRes] = await Promise.all([
      api.get('/budgets?limit=100'),
      api.get('/categories?type=expense'),
      api.get('/departments'),
    ]);
    setBudgets(budgetRes.data.data || []);
    setCategories((categoryRes.data || []).filter(cat => !cat.parent));
    setDepartments(departmentRes.data || []);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (budget) => {
    setEditing(budget);
    setFormData({
      name: budget.name || '',
      category: budget.category?._id || budget.category || '',
      department: budget.department?._id || budget.department || '',
      period: budget.period || 'monthly',
      startDate: budget.startDate?.substring(0, 10) || firstDay,
      endDate: budget.endDate?.substring(0, 10) || lastDay,
      budgetAmount: budget.budgetAmount || 0,
      alertThreshold: budget.alertThreshold || 80,
      notes: budget.notes || '',
    });
    setShowForm(true);
  };

  const saveBudget = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      category: formData.category || null,
      department: formData.department || null,
      budgetAmount: Number(formData.budgetAmount) || 0,
      alertThreshold: Number(formData.alertThreshold) || 80,
    };
    if (editing) await api.put(`/budgets/${editing._id}`, payload);
    else await api.post('/budgets', payload);
    setShowForm(false);
    fetchAll();
  };

  const deleteBudget = async (budget) => {
    if (!window.confirm(`Delete budget ${budget.name}?`)) return;
    await api.delete(`/budgets/${budget._id}`);
    fetchAll();
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';
  const labelCls = 'text-xs font-semibold text-gray-600 mb-1.5 inline-block';

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-gray-500 mt-1">Plan category spend and track actuals</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <FaPlus /> Add Budget
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveBudget} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select required value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputCls}>
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Department</label>
            <select value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} className={inputCls}>
              <option value="">None</option>
              {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Period</label>
            <select value={formData.period} onChange={e => setFormData(p => ({ ...p, period: e.target.value }))} className={inputCls}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" required value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input type="date" required value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Budget Amount</label>
            <input type="number" min="0" required value={formData.budgetAmount} onChange={e => setFormData(p => ({ ...p, budgetAmount: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Alert Threshold %</label>
            <input type="number" min="0" max="100" value={formData.alertThreshold} onChange={e => setFormData(p => ({ ...p, alertThreshold: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Budget</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Spent</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {budgets.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-500">No budgets created yet.</td></tr>
            ) : budgets.map(budget => (
              <tr key={budget._id} className="hover:bg-blue-50/40">
                <td className="px-6 py-4 font-semibold">{budget.name}</td>
                <td className="px-6 py-4 text-sm">{budget.category?.name || '-'}</td>
                <td className="px-6 py-4 text-sm capitalize">{budget.period}</td>
                <td className="px-6 py-4 text-right font-semibold">{fmtMoney(budget.budgetAmount)}</td>
                <td className="px-6 py-4 text-right">{fmtMoney(budget.spentAmount)}</td>
                <td className="px-6 py-4 text-right">{fmtMoney(budget.remainingAmount)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${budget.status === 'exceeded' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {budget.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => openEdit(budget)} className="text-gray-400 hover:text-blue-600"><FaEdit /></button>
                    <button onClick={() => deleteBudget(budget)} className="text-gray-400 hover:text-red-600"><FaTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetManager;
