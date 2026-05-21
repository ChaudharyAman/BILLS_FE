import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { FaPause, FaPlay, FaPlus, FaTrash } from 'react-icons/fa';

const emptyForm = {
  type: 'expense',
  category: '',
  subCategory: '',
  name: '',
  amount: 0,
  description: '',
  paymentMethod: '',
  frequency: 'monthly',
  startDate: new Date().toISOString().substring(0, 10),
  endDate: '',
  dayOfMonth: new Date().getDate(),
  dayOfWeek: new Date().getDay(),
  autoCreate: true,
};

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

const RecurringTransactions = () => {
  const [activeTab, setActiveTab] = useState('expense');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [activeTab]);

  const fetchTransactions = async () => {
    const res = await api.get(`/recurring?type=${activeTab}&limit=100`);
    setTransactions(res.data.data || []);
  };

  const fetchCategories = async () => {
    const res = await api.get(`/categories?type=${activeTab}`);
    setCategories(res.data || []);
  };

  const rootCategories = useMemo(() => {
    return categories.filter(cat => !cat.parent);
  }, [categories]);

  const subCategories = useMemo(() => {
    if (!formData.category) return [];
    return categories.filter(cat => cat.parent === formData.category || cat.parent?._id === formData.category);
  }, [categories, formData.category]);

  const previewDates = useMemo(() => {
    const dates = [];
    const start = new Date(formData.startDate || new Date());
    let next = new Date(start);
    for (let i = 0; i < 6; i += 1) {
      dates.push(new Date(next));
      if (formData.frequency === 'daily') next.setDate(next.getDate() + 1);
      if (formData.frequency === 'weekly') next.setDate(next.getDate() + 7);
      if (formData.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      if (formData.frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
      if (formData.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
    }
    return dates;
  }, [formData.startDate, formData.frequency]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...emptyForm, type: activeTab });
    setShowForm(true);
  };

  const openEdit = (rt) => {
    setEditing(rt);
    setFormData({
      type: rt.type,
      category: rt.category?._id || rt.category || '',
      subCategory: rt.subCategory?._id || rt.subCategory || '',
      name: rt.name || '',
      amount: rt.amount || 0,
      description: rt.description || '',
      paymentMethod: rt.paymentMethod || '',
      frequency: rt.frequency || 'monthly',
      startDate: rt.startDate?.substring(0, 10) || emptyForm.startDate,
      endDate: rt.endDate?.substring(0, 10) || '',
      dayOfMonth: rt.dayOfMonth || new Date().getDate(),
      dayOfWeek: rt.dayOfWeek ?? new Date().getDay(),
      autoCreate: rt.autoCreate !== false,
    });
    setShowForm(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      category: formData.category,
      subCategory: formData.subCategory || null,
      amount: Number(formData.amount) || 0,
      dayOfMonth: Number(formData.dayOfMonth) || undefined,
      dayOfWeek: Number(formData.dayOfWeek),
      endDate: formData.endDate || null,
    };
    if (editing) await api.put(`/recurring/${editing._id}`, payload);
    else await api.post('/recurring', payload);
    setShowForm(false);
    fetchTransactions();
  };

  const toggleActive = async (rt) => {
    await api.post(`/recurring/${rt._id}/${rt.isActive ? 'pause' : 'resume'}`);
    fetchTransactions();
  };

  const remove = async (rt) => {
    if (!window.confirm(`Delete ${rt.name}?`)) return;
    await api.delete(`/recurring/${rt._id}`);
    fetchTransactions();
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm';
  const labelCls = 'text-xs font-semibold text-gray-600 mb-1.5 inline-block';

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Recurring Transactions</h1>
          <p className="text-gray-500 mt-1">Schedule repeated income and expense entries</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <FaPlus /> Add Recurring
        </button>
      </div>

      <div className="inline-flex bg-white border border-gray-200 rounded-lg p-1 mb-6">
        {['expense', 'income'].map(type => (
          <button key={type} onClick={() => setActiveTab(type)} className={`px-4 py-2 rounded-md text-sm font-semibold capitalize ${activeTab === type ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {type}s
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select required value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value, subCategory: '' }))} className={inputCls}>
              <option value="">Select Category</option>
              {rootCategories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
          {subCategories.length > 0 && (
            <div>
              <label className={labelCls}>Subcategory</label>
              <select value={formData.subCategory} onChange={e => setFormData(p => ({ ...p, subCategory: e.target.value }))} className={inputCls}>
                <option value="">Select Subcategory</option>
                {subCategories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Amount</label>
            <input type="number" min="0" required value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Frequency</label>
            <select value={formData.frequency} onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))} className={inputCls}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Payment Method</label>
            <input value={formData.paymentMethod} onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Description</label>
            <input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className={inputCls} />
          </div>
          <div className="md:col-span-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
            <span className="font-semibold text-gray-700">Next dates: </span>
            {previewDates.map(date => fmtDate(date)).join(' · ')}
          </div>
          <div className="md:col-span-3 flex gap-3">
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
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Frequency</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Next Due</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500">No recurring transactions found.</td></tr>
            ) : transactions.map(rt => (
              <tr key={rt._id} className="hover:bg-blue-50/40">
                <td className="px-6 py-4 font-semibold">{rt.name}</td>
                 <td className="px-6 py-4 text-sm">
                  <div className="font-semibold text-slate-800">{rt.category?.name || '-'}</div>
                  {rt.subCategory && (
                    <div className="text-xs text-slate-400 font-semibold mt-0.5 capitalize">
                      › {rt.subCategory.name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-semibold">{fmtMoney(rt.amount)}</td>
                <td className="px-6 py-4 text-sm capitalize">{rt.frequency}</td>
                <td className="px-6 py-4 text-sm">{fmtDate(rt.nextProcessDate)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rt.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {rt.isActive ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => openEdit(rt)} className="text-blue-600 text-sm font-semibold">Edit</button>
                    <button onClick={() => toggleActive(rt)} className="text-gray-500 hover:text-blue-600">{rt.isActive ? <FaPause /> : <FaPlay />}</button>
                    <button onClick={() => remove(rt)} className="text-gray-500 hover:text-red-600"><FaTrash /></button>
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

export default RecurringTransactions;
