import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

const getDefaultDates = () => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);
  return { startDate, endDate };
};

const getEmptyForm = () => ({
  name: '',
  category: '',
  department: '',
  businessUnit: '',
  period: 'monthly',
  budgetAmount: 0,
  alertThreshold: 80,
  notes: '',
  ...getDefaultDates(),
});

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const BudgetManager = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(getEmptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [budgetRes, categoryRes, departmentRes, buRes] = await Promise.all([
        api.get('/budgets?limit=100'),
        api.get('/categories?type=expense'),
        api.get('/departments'),
        api.get('/business-units?status=active').catch(() => ({ data: [] })),
      ]);
      setBudgets(budgetRes.data.data || []);
      setCategories((categoryRes.data || []).filter(cat => !cat.parent));
      setDepartments(departmentRes.data || []);
      setBusinessUnits(buRes.data || []);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.response?.data?.message || 'Failed to load budget data');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(getEmptyForm());
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (budget) => {
    setEditing(budget);
    const { startDate: defaultStart, endDate: defaultEnd } = getDefaultDates();
    setFormData({
      name: budget.name || '',
      category: budget.category?._id || budget.category || '',
      department: budget.department?._id || budget.department || '',
      businessUnit: budget.businessUnit?._id || budget.businessUnit || '',
      period: budget.period || 'monthly',
      startDate: budget.startDate?.substring(0, 10) || defaultStart,
      endDate: budget.endDate?.substring(0, 10) || defaultEnd,
      budgetAmount: budget.budgetAmount || 0,
      alertThreshold: budget.alertThreshold || 80,
      notes: budget.notes || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const saveBudget = async (event) => {
    event.preventDefault();
    setFormError('');
    if (formData.endDate < formData.startDate) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    const payload = {
      ...formData,
      category: formData.category || null,
      department: formData.department || null,
      businessUnit: formData.businessUnit || null,
      budgetAmount: Number(formData.budgetAmount) || 0,
      alertThreshold: Number(formData.alertThreshold) || 80,
    };

    try {
      if (editing) await api.put(`/budgets/${editing._id}`, payload);
      else await api.post('/budgets', payload);
      setShowForm(false);
      fetchAll();
      setError(null);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || 'Failed to save budget');
    }
  };

  const deleteBudget = async (budget) => {
    if (!window.confirm(`Delete budget ${budget.name}?`)) return;
    try {
      await api.delete(`/budgets/${budget._id}`);
      fetchAll();
      setError(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError.response?.data?.message || 'Failed to delete budget');
    }
  };

  const inputCls = 'w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5 inline-block';

  const getStatusClass = (status) => {
    switch (status) {
      case 'exceeded': return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'warning':
      case 'at_risk':
        return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'active':
      case 'ok':
        return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700';
    }
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Budgets</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Plan category spend and track actuals</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all">
          <FaPlus /> Add Budget
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveBudget} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {formError && (
            <div className="md:col-span-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
              {formError}
            </div>
          )}
          {error && (
            <div className="md:col-span-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className={labelCls} htmlFor="budget-name">Name</label>
            <input id="budget-name" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="budget-category">Category</label>
            <select id="budget-category" required value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputCls}>
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="budget-department">Department</label>
            <select id="budget-department" value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} className={inputCls}>
              <option value="">None</option>
              {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="budget-business-unit">Business Unit</label>
            <select id="budget-business-unit" value={formData.businessUnit} onChange={e => setFormData(p => ({ ...p, businessUnit: e.target.value }))} className={inputCls}>
              <option value="">None (General)</option>
              {businessUnits.map(bu => <option key={bu._id} value={bu._id}>{bu.name} ({bu.code})</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="budget-period">Period</label>
            <select id="budget-period" value={formData.period} onChange={e => setFormData(p => ({ ...p, period: e.target.value }))} className={inputCls}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="startDate">Start Date</label>
            <input id="startDate" type="date" required value={formData.startDate} onChange={e => {
              const nextStart = e.target.value;
              setFormData(p => ({
                ...p,
                startDate: nextStart,
                endDate: p.endDate && p.endDate < nextStart ? nextStart : p.endDate,
              }));
              setFormError('');
            }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="endDate">End Date</label>
            <input id="endDate" type="date" required min={formData.startDate} value={formData.endDate} onChange={e => {
              setFormData(p => ({ ...p, endDate: e.target.value }));
              setFormError('');
            }} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="budget-amount">Budget Amount</label>
            <input id="budget-amount" type="number" min="0" required value={formData.budgetAmount} onChange={e => setFormData(p => ({ ...p, budgetAmount: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="budget-threshold">Alert Threshold %</label>
            <input id="budget-threshold" type="number" min="0" max="100" value={formData.alertThreshold} onChange={e => setFormData(p => ({ ...p, alertThreshold: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Business Unit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Budget</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Spent</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {budgets.length === 0 ? (
              <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">No budgets created yet.</td></tr>
            ) : budgets.map(budget => (
              <tr key={budget._id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-semibold text-gray-900 dark:text-slate-100">{budget.name}</td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300">{budget.category?.name || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{budget.businessUnit?.name ? `${budget.businessUnit.name} (${budget.businessUnit.code})` : '-'}</td>
                <td className="px-6 py-4 text-sm capitalize text-gray-700 dark:text-slate-300">{budget.period}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-slate-100">{fmtMoney(budget.budgetAmount)}</td>
                <td className="px-6 py-4 text-right text-gray-700 dark:text-slate-300">{fmtMoney(budget.spentAmount)}</td>
                <td className="px-6 py-4 text-right text-gray-700 dark:text-slate-300">{fmtMoney(budget.remainingAmount)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusClass(budget.status)}`}>
                    {budget.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => openEdit(budget)} className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><FaEdit /></button>
                    <button onClick={() => deleteBudget(budget)} className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"><FaTrash /></button>
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
