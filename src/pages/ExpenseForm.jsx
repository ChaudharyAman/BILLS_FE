import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaCalendarAlt, FaCheck, FaTimes, FaPlus } from 'react-icons/fa';

const ExpenseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Form State matching Sleekbills screenshot
  const [formData, setFormData] = useState({
    expenseNumberPrefix: 'EXP-',
    expenseNumberSuffix: '',
    date: new Date().toISOString().substring(0, 10),
    paymentMethod: '',
    vendorRef: '',
    clientRef: '',
    items: [
      { itemRef: '', name: '', unit: '', qty: 1, rate: 0, taxRate: 0, amount: 0 }
    ],
    reverseCharge: false,
    terms: '',
    privateNotes: ''
  });

  const [totals, setTotals] = useState({ subTotal: 0, taxTotal: 0, grandTotal: 0 });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes, iRes] = await Promise.all([
        api.get('/vendors?limit=1000'),
        api.get('/clients?limit=1000'),
        api.get('/items?limit=1000')
      ]);
      setVendors(vRes.data.data || []);
      setClients(cRes.data.data || []);
      setInventory(iRes.data.data || []);

      if (id) {
        const eRes = await api.get(`/expenses/${id}`);
        const data = eRes.data;
        
        let prefix = 'EXP-';
        let suffix = data.expenseNumber || '';
        if (data.expenseNumber && data.expenseNumber.includes('-')) {
            const parts = data.expenseNumber.split('-');
            prefix = parts[0] + '-';
            suffix = parts[1];
        }

        setFormData({
            expenseNumberPrefix: prefix,
            expenseNumberSuffix: suffix,
            date: data.date ? new Date(data.date).toISOString().substring(0, 10) : '',
            paymentMethod: data.paymentMethod || '',
            vendorRef: data.vendor?.vendorRef || '',
            clientRef: data.client?.clientRef || '',
            items: data.items?.length > 0 ? data.items : [{ itemRef: '', name: '', unit: '', qty: 1, rate: 0, taxRate: 0, amount: 0 }],
            reverseCharge: data.reverseCharge || false,
            terms: data.terms || '',
            privateNotes: data.privateNotes || ''
        });
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = useCallback(() => {
    let sub = 0;
    let tax = 0;
    
    const updatedItems = formData.items.map(item => {
      const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
      const itemTax = amount * ((parseFloat(item.taxRate) || 0) / 100);
      sub += amount;
      tax += itemTax;
      return { ...item, amount, taxAmount: itemTax };
    });

    setTotals({
      subTotal: sub,
      taxTotal: tax,
      grandTotal: sub + tax
    });
  }, [formData.items]);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, calculateTotals]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'itemRef') {
      const selectedInv = inventory.find(inv => inv._id === value);
      newItems[index] = {
        ...newItems[index],
        itemRef: value,
        name: selectedInv ? selectedInv.name : '',
        rate: selectedInv ? selectedInv.rate : 0,
        unit: selectedInv ? selectedInv.unit : '',
        taxRate: selectedInv ? selectedInv.taxPreference === 'Taxable' ? 18 : 0 : 0 // Default logic
      };
    } else {
      newItems[index][field] = value;
    }
    
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { itemRef: '', name: '', unit: '', qty: 1, rate: 0, taxRate: 0, amount: 0 }]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedVendor = vendors.find(v => v._id === formData.vendorRef) || {};
      const selectedClient = clients.find(c => c._id === formData.clientRef) || {};

      const payload = {
        expenseNumber: `${formData.expenseNumberPrefix}${formData.expenseNumberSuffix}`,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        vendor: { vendorRef: selectedVendor._id, name: selectedVendor.name },
        client: formData.clientRef ? { clientRef: selectedClient._id, name: selectedClient.name } : null,
        reverseCharge: formData.reverseCharge,
        items: formData.items,
        subTotal: totals.subTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        terms: formData.terms,
        privateNotes: formData.privateNotes
      };

      if (id) {
        await api.put(`/expenses/${id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      
      navigate('/expenses');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  // --- Sleekbills UI Theme Classes ---
  // Using pure white backgrounds, subtle gray borders, left-aligned bold labels, green submit buttons
  const inputBaseCls = "w-full border border-gray-200 rounded text-sm px-3 py-2 text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans";
  const labelCls = "text-xs font-semibold text-gray-600 tracking-wide mb-1.5 inline-block";
  const rowBorder = "border-b border-gray-200";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f3f6f9] py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        <form onSubmit={handleSave} className="bg-white shadow-sm border border-gray-200 rounded font-sans overflow-hidden">
          
          {/* Header Title */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-[#2d4b6b]">
              {id ? 'Edit Expense' : 'Add New Expense'}
            </h1>
          </div>

          {/* Top Info Section */}
          <div className={`flex flex-col md:flex-row bg-[#fdfdfd] ${rowBorder}`}>
            {/* Vendor Col */}
            <div className="w-full md:w-1/3 p-6 border-r border-gray-200">
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 min-w-[90px]`}>Vendor name</span>
                <select 
                  className={inputBaseCls}
                  value={formData.vendorRef}
                  onChange={e => setFormData(p => ({ ...p, vendorRef: e.target.value }))}
                  required
                >
                  <option value="" disabled className="text-gray-400">Select Vendor</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Config Col */}
            <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              
              {/* Number and Date */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className={`${labelCls} !mb-0 min-w-[60px]`}>Number</span>
                  <div className="flex w-full gap-2">
                    <input 
                      type="text" 
                      className={`${inputBaseCls} w-20 text-center uppercase`} 
                      value={formData.expenseNumberPrefix} 
                      onChange={e => setFormData(p => ({ ...p, expenseNumberPrefix: e.target.value }))}
                    />
                    <input 
                      type="text" 
                      className={`${inputBaseCls} flex-1 text-gray-700`} 
                      value={formData.expenseNumberSuffix}
                      onChange={e => setFormData(p => ({ ...p, expenseNumberSuffix: e.target.value }))}
                      placeholder="e.g. 001"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <span className={`${labelCls} !mb-0 min-w-[60px] text-right xl:text-left`}>Date</span>
                   <div className="relative w-full">
                     <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input 
                       type="date" 
                       className={`${inputBaseCls} pl-9`} 
                       value={formData.date}
                       onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                       required
                     />
                   </div>
                </div>
              </div>

              {/* Payment Method and Client Reference */}
              <div className="space-y-4">
                 <div className="flex items-center gap-4">
                  <span className={`${labelCls} !mb-0 min-w-[100px] text-right xl:text-left`}>Payment method</span>
                  <select 
                    className={inputBaseCls}
                    value={formData.paymentMethod}
                    onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))}
                  >
                    <option value=""></option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`${labelCls} !mb-0 min-w-[100px] text-right xl:text-left`}>Client</span>
                  <select 
                    className={inputBaseCls}
                    value={formData.clientRef}
                    onChange={e => setFormData(p => ({ ...p, clientRef: e.target.value }))}
                  >
                    <option value="" className="text-gray-400">Reference client</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Section Sub-header */}
          <div className="bg-white px-6 py-3 font-bold text-sm text-[#2d4b6b] border-b border-gray-200 pt-6">
            Expense
          </div>

          {/* Table Headers */}
          <div className="bg-[#e9ecef] flex px-6 py-2.5 text-xs font-bold text-[#495057] uppercase tracking-wide">
            <div className="flex-1 min-w-[300px]">Item Name</div>
            <div className="w-24 px-2">Unit</div>
            <div className="w-24 px-2">QTY</div>
            <div className="w-40 px-2">Price</div>
            <div className="w-32 px-2 text-right">Total</div>
          </div>

          {/* Table Body (Items) */}
          <div className="p-6 space-y-4">
            {formData.items.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-center gap-4">
                
                {/* Item Select & Text grouped */}
                <div className="flex-1 flex flex-col md:flex-row gap-2 w-full md:w-auto min-w-[300px]">
                  <select 
                    className={`${inputBaseCls} md:w-1/2`}
                    value={item.itemRef}
                    onChange={(e) => handleItemChange(idx, 'itemRef', e.target.value)}
                  >
                    <option value="" disabled className="text-gray-400">Select Item</option>
                    {inventory.map(inv => (
                      <option key={inv._id} value={inv._id}>{inv.name}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Custom Item Description"
                    className={`${inputBaseCls} md:w-1/2`} 
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    required
                  />
                </div>

                {/* Unit */}
                <div className="w-full md:w-24">
                  <input 
                    type="text" 
                    placeholder="Unit"
                    className={inputBaseCls} 
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                  />
                </div>
                
                {/* QTY */}
                <div className="w-full md:w-24">
                  <input 
                    type="number" 
                    placeholder="1"
                    className={inputBaseCls} 
                    value={item.qty}
                    onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                    min="1"
                  />
                </div>

                {/* Price */}
                <div className="w-full md:w-40 flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Price"
                    className={inputBaseCls} 
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  {/* Inline Tax Select */}
                  <select 
                    className={inputBaseCls}
                    value={item.taxRate}
                    onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                  >
                    <option value="0">Select Tax</option>
                    <option value="5">GST 5%</option>
                    <option value="12">GST 12%</option>
                    <option value="18">GST 18%</option>
                    <option value="28">GST 28%</option>
                  </select>
                </div>

                {/* Total Text */}
                <div className="w-full md:w-32 text-right text-sm font-semibold text-gray-700 mt-2 md:mt-0 px-2 flex items-center justify-end md:justify-between">
                  <span>₹{item.amount.toFixed(2)}</span>
                  {idx === formData.items.length - 1 && (
                    <button 
                      type="button" 
                      onClick={addItemRow}
                      className="ml-4 bg-[#5c8bc1] hover:bg-[#4a729e] text-white text-xs font-semibold py-1.5 px-3 rounded flex items-center justify-center gap-1 transition-colors"
                    >
                        <FaPlus size={10} /> Add line
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Middle Band: Reverse Charge and Subtotals */}
          <div className="border-t border-b border-gray-200 flex flex-col md:flex-row justify-between">
            {/* Reverse Charge Toggle */}
            <div className="p-6 md:w-1/2 flex items-start pt-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-500 cursor-pointer"
                  checked={formData.reverseCharge}
                  onChange={(e) => setFormData(p => ({...p, reverseCharge: e.target.checked}))}
                />
                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                  Subject to reverse charge
                </span>
              </label>
            </div>

            {/* Totals Pane */}
            <div className="p-6 md:w-1/2 xl:w-1/3">
               <div className="space-y-3">
                 <div className="flex justify-between items-center px-4">
                   <span className="text-sm font-bold text-[#2d4b6b]">Subtotal:</span>
                   <span className="text-sm font-bold text-gray-800">₹ {totals.subTotal.toFixed(2)}</span>
                 </div>
                 {totals.taxTotal > 0 && (
                   <div className="flex justify-between items-center px-4">
                     <span className="text-sm text-gray-500">Tax Total:</span>
                     <span className="text-sm text-gray-800">₹ {totals.taxTotal.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="bg-[#f2f9f5] flex justify-between items-center px-4 py-3 rounded border border-[#e1eee6]">
                   <span className="text-sm font-bold text-[#28a745]">Total:</span>
                   <span className="text-sm font-bold text-[#28a745]">₹ {totals.grandTotal.toFixed(2)}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className={`${labelCls} text-gray-500`}>Terms & Conditions</label>
              <textarea 
                rows="4"
                className={`${inputBaseCls} resize-y text-gray-600`}
                value={formData.terms}
                onChange={e => setFormData(p => ({...p, terms: e.target.value}))}
              ></textarea>
            </div>
            <div>
              <label className={`${labelCls} text-gray-500`}>Private notes (not shown to vendor)</label>
              <textarea 
                rows="4"
                className={`${inputBaseCls} resize-y text-gray-600`}
                value={formData.privateNotes}
                onChange={e => setFormData(p => ({...p, privateNotes: e.target.value}))}
              ></textarea>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-6 bg-[#fdfdfd] border-t border-gray-200 flex gap-3">
             <button 
               type="submit" 
               disabled={loading}
               className="bg-[#48c774] hover:bg-[#3db263] text-white px-6 py-2.5 rounded font-bold text-sm tracking-wide shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
             >
               <FaCheck size={14} /> Save
             </button>
             <button 
               type="button" 
               onClick={() => navigate('/expenses')}
               className="bg-[#e9ecef] hover:bg-[#d6dadd] text-[#555] px-6 py-2.5 rounded font-semibold text-sm transition-colors"
             >
               Cancel
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
