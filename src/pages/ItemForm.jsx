import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import UnitSelector from '../components/UnitSelector';
import TaxRateSelector from '../components/TaxRateSelector';
import { FaSave, FaArrowLeft } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const ItemForm = ({ isModal, onSuccess }) => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const id = isModal ? null : routeId;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Goods'); // 'Goods' (Product) or 'Service'

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Goods',
    hsnCode: '', // Used for both HSN and SAC
    sku: '',
    unit: 'pcs',
    openingQuantity: 0,
    defaultTaxRate: 0, // Keeping flat tax rate for simplicity in General section
    salesInfo: {
      price: 0,
      currency: 'INR',
      cessPercent: 0,
      cessAmount: 0,
    },
    purchaseInfo: {
      price: 0,
      currency: 'INR',
      cessPercent: 0,
      cessAmount: 0,
    }
  });

  useEffect(() => {
    if (id && !isModal) {
      fetchItem();
    }
  }, [id, isModal]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/items/${id}`);
      const item = response.data;
      
      // Merge with default state to ensure nested objects exist (e.g., older items lacking salesInfo)
      setFormData(prev => ({
        ...prev,
        ...item,
        salesInfo: { ...prev.salesInfo, ...(item.salesInfo || {}) },
        purchaseInfo: { ...prev.purchaseInfo, ...(item.purchaseInfo || {}) }
      }));
      
      setActiveTab(item.type || 'Goods');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching item:', error);
      alert('Failed to fetch item details');
      navigate('/items');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormData(prev => ({ ...prev, type: tab }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (section, e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let response;
      // Map flat tax rate to sales/purchase if needed, or backend handles it.
      // For now sending as is.
      if (id) {
        response = await api.put(`/items/${id}`, formData);
      } else {
        response = await api.post('/items', formData);
      }
      if (isModal && onSuccess) {
        onSuccess(response.data); // Return new item data
      } else {
        navigate('/items');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
      return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4"><Skeleton width="150px" height="32px" /></div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-1 flex gap-1">
                    <Skeleton width="100px" height="36px" />
                    <Skeleton width="100px" height="36px" />
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="col-span-1">
                             <Skeleton width="100px" height="16px" className="mb-1" />
                             <Skeleton width="100%" height="40px" />
                        </div>
                    ))}
                </div>
                <div className="mb-8">
                    <Skeleton width="100px" height="24px" className="mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                        {[...Array(4)].map((_, i) => <div key={i}><Skeleton width="80px" height="16px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>)}
                    </div>
                </div>
                <div className="mb-8">
                    <Skeleton width="120px" height="24px" className="mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                        {[...Array(4)].map((_, i) => <div key={i}><Skeleton width="80px" height="16px" className="mb-1" /><Skeleton width="100%" height="40px" /></div>)}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className={isModal ? "" : "container mx-auto p-6 max-w-5xl text-slate-800 dark:text-slate-100 transition-colors"}>
      {!isModal && (
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/items')}
            className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{id ? 'Edit Inventory' : 'New Inventory'}</h1>
        </div>
        
        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 flex shadow-sm">
          <button
            onClick={() => handleTabChange('Goods')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'Goods' 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            PRODUCT
          </button>
          <button
            onClick={() => handleTabChange('Service')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'Service' 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            SERVICE
          </button>
        </div>
      </div>
      )}

      {isModal && (
        <div className="mb-4 bg-gray-50 dark:bg-slate-800/60 rounded-lg p-1 flex justify-center border border-gray-200 dark:border-slate-700">
          <button type="button" onClick={() => handleTabChange('Goods')}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${activeTab === 'Goods' ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm border border-gray-200 dark:border-slate-700' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
            Product
          </button>
          <button type="button" onClick={() => handleTabChange('Service')}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${activeTab === 'Service' ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm border border-gray-200 dark:border-slate-700' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
            Service
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${isModal ? "" : "bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden p-8 transition-colors"}`}>
        
        {/* General Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              required
              data-testid="item-name"
              className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          
          <div className="col-span-1">
             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
             <textarea
                name="description"
                rows="1"
                className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                value={formData.description}
                onChange={handleChange}
              />
          </div>

          {activeTab === 'Goods' && (
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Opening Quantity</label>
              <input
                type="number"
                name="openingQuantity"
                className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                value={formData.openingQuantity}
                onChange={handleChange}
              />
            </div>
          )}

           <div className="col-span-1">
             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Unit</label>
             <UnitSelector
               value={formData.unit}
               onChange={(val) => setFormData(prev => ({ ...prev, unit: val }))}
             />
          </div>

           <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {activeTab === 'Service' ? 'SAC Code' : 'HSN Code'}
            </label>
            <input
              type="text"
              name="hsnCode"
              className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
              value={formData.hsnCode}
              onChange={handleChange}
            />
          </div>

          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tax Rate (%)</label>
             <TaxRateSelector
                value={formData.defaultTaxRate}
                onChange={(val) => setFormData(prev => ({ ...prev, defaultTaxRate: val }))}
              />
          </div>
          
           <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">SKU</label>
            <input
              type="text"
              name="sku"
              placeholder="Auto-generated if left blank"
              className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
              value={formData.sku}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Sales Info */}
        <div className="mb-8">
           <h3 className="text-md font-semibold text-gray-700 dark:text-slate-200 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">Sales Info</h3>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Unit Price</label>
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  data-testid="item-sales-price"
                  className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                  value={formData.salesInfo.price}
                  onChange={(e) => handleNestedChange('salesInfo', e)}
                />
              </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Currency</label>
                <select
                  name="currency"
                  className="w-full border-gray-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  value={formData.salesInfo.currency}
                  onChange={(e) => handleNestedChange('salesInfo', e)}
                  disabled
                >
                  <option value="INR">INR</option>
                </select>
              </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">CESS %</label>
                <input
                  type="number"
                  name="cessPercent"
                   min="0"
                   step="0.01"
                  className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                  value={formData.salesInfo.cessPercent}
                  onChange={(e) => handleNestedChange('salesInfo', e)}
                />
              </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">+ CESS</label>
                <input
                  type="number"
                  name="cessAmount"
                   min="0"
                   step="0.01"
                  className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                  value={formData.salesInfo.cessAmount}
                  onChange={(e) => handleNestedChange('salesInfo', e)}
                />
              </div>
           </div>
        </div>

        {/* Purchase Info */}
        <div className="mb-8">
           <h3 className="text-md font-semibold text-gray-700 dark:text-slate-200 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">Purchase Info</h3>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Unit Price</label>
                <input
                  type="number"
                  name="price"
                   min="0"
                   step="0.01"
                  className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                  value={formData.purchaseInfo.price}
                   onChange={(e) => handleNestedChange('purchaseInfo', e)}
                />
              </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Currency</label>
                <select
                  name="currency"
                  className="w-full border-gray-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  value={formData.purchaseInfo.currency}
                   onChange={(e) => handleNestedChange('purchaseInfo', e)}
                   disabled
                >
                  <option value="INR">INR</option>
                </select>
              </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">CESS %</label>
                <input
                  type="number"
                  name="cessPercent"
                   min="0"
                   step="0.01"
                  className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                  value={formData.purchaseInfo.cessPercent}
                   onChange={(e) => handleNestedChange('purchaseInfo', e)}
                />
              </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">+ CESS</label>
                <input
                  type="number"
                  name="cessAmount"
                   min="0"
                   step="0.01"
                  className="w-full border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 p-2 border outline-none"
                  value={formData.purchaseInfo.cessAmount}
                   onChange={(e) => handleNestedChange('purchaseInfo', e)}
                />
              </div>
           </div>
        </div>

        <div className="flex justify-start gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading}
            data-testid="save-item"
            className="px-8 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2 shadow-sm font-semibold transition-colors"
          >
            <FaSave size={18} />
            {loading ? 'Saving...' : 'Save'}
          </button>
           {!isModal && (
           <button
            type="button"
            onClick={() => navigate('/items')}
            className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 font-semibold transition-colors"
          >
            Cancel
          </button>
           )}
        </div>

      </form>
    </div>
  );
};

export default ItemForm;
