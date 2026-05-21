import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import {
  FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaTags,
  FaUsers, FaBuilding, FaBullhorn, FaBoxOpen, FaCar, FaBriefcase,
  FaLaptopCode, FaShieldAlt, FaFileInvoiceDollar, FaTools, FaEllipsisH,
  FaChartLine, FaHandshake, FaCoins, FaPlusCircle, FaQuestionCircle,
  FaUniversity, FaUserTie, FaHeart, FaTruck, FaFileInvoice,
} from 'react-icons/fa';

const ICONS = {
  FaTags,
  FaUsers,
  FaBuilding,
  FaBullhorn,
  FaBoxOpen,
  FaCar,
  FaBriefcase,
  FaLaptopCode,
  FaShieldAlt,
  FaFileInvoiceDollar,
  FaTools,
  FaEllipsisH,
  FaChartLine,
  FaHandshake,
  FaCoins,
  FaPlusCircle,
  FaQuestionCircle,
  FaUniversity,
  FaUserTie,
  FaHeart,
  FaTruck,
  FaFileInvoice,
};

const emptyForm = {
  name: '',
  type: 'expense',
  parent: '',
  icon: 'FaTags',
  color: '#2563eb',
  budgetLimit: 0,
  description: '',
};

const CategoryManagement = () => {
  const [activeTab, setActiveTab] = useState('expense');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/categories?type=${activeTab}`);
      setCategories(res.data || []);
    } catch (error) {
      console.error(error);
      alert('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const rootCategories = useMemo(
    () => categories.filter(cat => !cat.parent),
    [categories]
  );

  const filteredRoots = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rootCategories;
    return rootCategories.filter(cat => {
      const children = categories.filter(child => child.parent?._id === cat._id);
      return cat.name.toLowerCase().includes(needle) ||
        children.some(child => child.name.toLowerCase().includes(needle));
    });
  }, [categories, rootCategories, search]);

  const openCreate = (parent = '') => {
    setEditingCategory(null);
    setFormData({ ...emptyForm, type: activeTab, parent });
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      type: category.type || activeTab,
      parent: category.parent?._id || '',
      icon: category.icon || 'FaTags',
      color: category.color || '#2563eb',
      budgetLimit: category.budgetLimit || 0,
      description: category.description || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...formData,
        parent: formData.parent || null,
        budgetLimit: Number(formData.budgetLimit) || 0,
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, payload);
      } else {
        await api.post('/categories', payload);
      }

      closeModal();
      fetchCategories();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    if (category?.isSystem) {
      alert('Cannot delete system category');
      return;
    }
    if (!window.confirm(`Delete ${category.name}?`)) return;
    try {
      await api.delete(`/categories/${category._id}`);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const initializeDefaults = async () => {
    if (isInitializing) return;
    try {
      setIsInitializing(true);
      await api.post('/categories/initialize-defaults');
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to initialize defaults');
    } finally {
      setIsInitializing(false);
    }
  };

  const renderIcon = (iconName, color) => {
    const Icon = ICONS[iconName] || FaTags;
    return <Icon style={{ color }} size={18} />;
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-gray-500 mt-1">Organize income and expenses for reporting, payroll, and budgets</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={initializeDefaults}
            disabled={isInitializing}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Initialize Defaults
          </button>
          <button
            type="button"
            onClick={() => openCreate()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm"
          >
            <FaPlus size={14} /> Add Category
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/60 flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="inline-flex bg-white border border-gray-200 rounded-lg p-1 w-fit">
            {['expense', 'income'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTab(type)}
                className={`px-4 py-2 rounded-md text-sm font-semibold capitalize ${activeTab === type ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {type} Categories
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories..."
            className="w-full md:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sub-Categories</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Budget Limit</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-500">Loading categories...</td></tr>
              ) : filteredRoots.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-500">No categories found.</td></tr>
              ) : filteredRoots.map(category => {
                const children = categories.filter(child => child.parent?._id === category._id);
                return (
                  <tr key={category._id} className="hover:bg-blue-50/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                          {renderIcon(category.icon, category.color)}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {category.name}
                            {category.isSystem && <span className="text-[10px] uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">System</span>}
                          </div>
                          {category.description && <div className="text-xs text-gray-500 mt-0.5">{category.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {children.map(child => (
                          <span key={child._id} className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color || category.color }} />
                            {child.name}
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => openCreate(category._id)}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          <FaPlus size={10} /> Sub
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold">
                      {Number(category.budgetLimit) > 0 ? `₹${Number(category.budgetLimit).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-3">
                        <button type="button" onClick={() => openEdit(category)} className="text-gray-400 hover:text-blue-600" title="Edit">
                          <FaEdit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={category.isSystem}
                          className={category.isSystem ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}
                          title={category.isSystem ? 'System categories cannot be deleted' : 'Delete'}
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData(prev => ({ ...prev, name: event.target.value }))}
                  required
                  disabled={Boolean(editingCategory?.isSystem)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Type</label>
                <select
                  value={formData.type}
                  onChange={(event) => setFormData(prev => ({ ...prev, type: event.target.value, parent: '' }))}
                  disabled={Boolean(editingCategory?.isSystem)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Parent</label>
                <select
                  value={formData.parent}
                  onChange={(event) => setFormData(prev => ({ ...prev, parent: event.target.value }))}
                  disabled={Boolean(editingCategory?.isSystem)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">None</option>
                  {categories
                    .filter(cat => cat.type === formData.type && !cat.parent && cat._id !== editingCategory?._id)
                    .map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Icon</label>
                <select
                  value={formData.icon}
                  onChange={(event) => setFormData(prev => ({ ...prev, icon: event.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {Object.keys(ICONS).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(event) => setFormData(prev => ({ ...prev, color: event.target.value }))}
                  className="w-full h-10 border border-gray-300 rounded-lg px-2 py-1"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Budget Limit</label>
                <input
                  type="number"
                  min="0"
                  value={formData.budgetLimit}
                  onChange={(event) => setFormData(prev => ({ ...prev, budgetLimit: event.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(event) => setFormData(prev => ({ ...prev, description: event.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
                <FaSave size={14} /> Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
