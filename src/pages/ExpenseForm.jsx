import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaCalendarAlt, FaCheck, FaTimes, FaPlus } from 'react-icons/fa';
import { buildPdfTransactionPatch } from '../utils/pdfTransactionImport';

const ExpenseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetInfo, setBudgetInfo] = useState(null);

  // Form State matching Sleekbills screenshot
  const [formData, setFormData] = useState({
    expenseNumberPrefix: 'EXP-',
    expenseNumberSuffix: '',
    date: new Date().toISOString().substring(0, 10),
    dueDate: '',
    paymentMethod: '',
    amountPaid: 0,
    status: 'UNPAID',
    vendorRef: '',
    vendorName: '',
    clientRef: '',
    clientName: '',
    category: '',
    subCategory: '',
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
      const [vRes, cRes, iRes, catRes] = await Promise.all([
        api.get('/vendors?limit=1000'),
        api.get('/clients?limit=1000'),
        api.get('/items?limit=1000'),
        api.get('/categories?type=expense')
      ]);
      const loadedVendors = vRes.data.data || [];
      const loadedClients = cRes.data.data || [];
      const loadedInventory = iRes.data.data || [];
      const loadedCategories = catRes.data || [];
      setVendors(loadedVendors);
      setClients(loadedClients);
      setInventory(loadedInventory);
      setCategories(loadedCategories);

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
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString().substring(0, 10) : '',
            paymentMethod: data.paymentMethod || '',
            amountPaid: data.amountPaid || 0,
            status: data.status || 'UNPAID',
            vendorRef: data.vendor?.vendorRef || '',
            vendorName: data.vendor?.name || '',
            clientRef: data.client?.clientRef || '',
            clientName: data.client?.name || '',
            category: data.category?._id || data.category || '',
            subCategory: data.subCategory?._id || data.subCategory || '',
            items: data.items?.length > 0 ? data.items : [{ itemRef: '', name: '', unit: '', qty: 1, rate: 0, taxRate: 0, amount: 0 }],
            reverseCharge: data.reverseCharge || false,
            terms: data.terms || '',
            privateNotes: data.privateNotes || ''
        });
      } else {
        applyPdfImportData(loadedVendors, loadedClients, loadedInventory);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const applyPdfImportData = (loadedVendors, loadedClients, loadedInventory) => {
    const source = new URLSearchParams(location.search).get('source');
    if (source !== 'pdf' || id) return;

    try {
      const raw = sessionStorage.getItem('expensePdfImportData');
      if (!raw) return;

      const pdf = JSON.parse(raw);
      sessionStorage.removeItem('expensePdfImportData');
      if (!pdf._fromPdfImport) return;

      const patch = buildPdfTransactionPatch(pdf, 'expense', {
        vendors: loadedVendors,
        clients: loadedClients,
        inventory: loadedInventory,
      });

      setFormData(prev => ({
        ...prev,
        expenseNumberSuffix: patch.numberSuffix || prev.expenseNumberSuffix,
        date: patch.date || prev.date,
        dueDate: patch.dueDate || prev.dueDate,
        paymentMethod: patch.paymentMethod || prev.paymentMethod,
        vendorRef: patch.vendorRef || prev.vendorRef,
        vendorName: patch.vendorName || prev.vendorName,
        clientRef: patch.clientRef || prev.clientRef,
        clientName: patch.clientName || prev.clientName,
        items: patch.items.length > 0 ? patch.items : prev.items,
        privateNotes: [prev.privateNotes, patch.privateNotes].filter(Boolean).join('\n'),
      }));
    } catch (e) {
      console.warn('Failed to load expense PDF import data:', e);
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

  useEffect(() => {
    const fetchBudget = async () => {
      if (!formData.category) {
        setBudgetInfo(null);
        return;
      }
      try {
        const res = await api.get(`/budgets?category=${formData.category}&limit=1`);
        setBudgetInfo(res.data.data?.[0] || null);
      } catch (error) {
        console.warn('Failed to load budget for category', error);
        setBudgetInfo(null);
      }
    };
    fetchBudget();
  }, [formData.category]);

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
      const scannedVendorName = formData.vendorName?.trim();
      const scannedClientName = formData.clientName?.trim();

      if (!selectedVendor._id && !scannedVendorName) {
        alert('Please select a vendor.');
        setLoading(false);
        return;
      }

      const payload = {
        expenseNumber: `${formData.expenseNumberPrefix}${formData.expenseNumberSuffix}`,
        date: formData.date,
        dueDate: formData.dueDate || null,
        paymentMethod: formData.paymentMethod,
        amountPaid: Number(formData.amountPaid) || 0,
        status: formData.status,
        vendor: selectedVendor._id
          ? { vendorRef: selectedVendor._id, name: selectedVendor.name }
          : { name: scannedVendorName },
        client: selectedClient._id
          ? { clientRef: selectedClient._id, name: selectedClient.name }
          : (scannedClientName ? { name: scannedClientName } : null),
        category: formData.category || null,
        subCategory: formData.subCategory || null,
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
  const rootCategories = categories.filter(cat => !cat.parent);
  const subCategories = categories.filter(cat => (cat.parent?._id || cat.parent) === formData.category);
  const budgetRemaining = budgetInfo ? Number(budgetInfo.remainingAmount) || 0 : null;
  const budgetExceededBy = budgetInfo && totals.grandTotal > budgetRemaining ? totals.grandTotal - budgetRemaining : 0;
  const payableBalance = Math.max(totals.grandTotal - (Number(formData.amountPaid) || 0), 0);

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
                <span className={`${labelCls} !mb-0 min-w-[90px] shrink-0`}>Vendor name</span>
                <div className="flex-1">
                  <select 
                    data-testid="expense-vendor-select"
                    className={`${inputBaseCls} w-full`}
                    value={formData.vendorRef}
                    onChange={e => {
                      const vendor = vendors.find(v => v._id === e.target.value);
                      setFormData(p => ({ ...p, vendorRef: e.target.value, vendorName: vendor?.name || p.vendorName }));
                    }}
                  >
                    <option value="" disabled className="text-gray-400">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v._id} value={v._id}>{v.name}</option>
                    ))}
                  </select>
                  {!formData.vendorRef && formData.vendorName && (
                    <p className="mt-1 text-xs text-amber-600">Scanned: {formData.vendorName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Config Col (Grid Layout) */}
            <div className="w-full md:w-2/3 p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
              {/* Number */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[70px] shrink-0`}>Number</span>
                <div className="flex flex-1 gap-2 items-center text-gray-500 font-bold">
                  <input 
                    type="text" 
                    className="w-24 border border-gray-200 rounded text-sm px-3 py-2 text-gray-900 text-center uppercase focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans bg-[#f8f9fa] shadow-sm font-normal" 
                    value={formData.expenseNumberPrefix.replace(/-$/, '')} 
                    onChange={e => setFormData(p => ({ ...p, expenseNumberPrefix: e.target.value }))}
                  />
                  -
                  <input 
                    type="text" 
                    data-testid="expense-number-suffix"
                    className="flex-1 border border-gray-200 rounded text-sm px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans bg-[#f8f9fa] shadow-sm font-normal" 
                    value={formData.expenseNumberSuffix}
                    onChange={e => setFormData(p => ({ ...p, expenseNumberSuffix: e.target.value }))}
                    placeholder="e.g. 4567"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Payment method</span>
                <select 
                  data-testid="expense-payment-method"
                  className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm flex-1`}
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

              {/* Date */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[70px] shrink-0`}>Date</span>
                  <div className="relative flex-1">
                    <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input 
                      type="date" 
                      className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`} 
                      style={{ WebkitAppearance: 'none' }}
                      value={formData.date}
                      onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                      required
                    />
                    <style jsx>{`
                      input[type="date"]::-webkit-calendar-picker-indicator {
                          opacity: 0;
                          width: 100%;
                          height: 100%;
                          position: absolute;
                          top: 0;
                          left: 0;
                          cursor: pointer;
                      }
                    `}</style>
                  </div>
              </div>

              {/* Due Date */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Due date</span>
                  <div className="relative flex-1">
                    <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
                      value={formData.dueDate}
                      onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                    />
                  </div>
              </div>

              {/* Amount Paid */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Amount paid</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm flex-1`}
                  value={formData.amountPaid}
                  onChange={e => setFormData(p => ({ ...p, amountPaid: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              {/* Payment Status */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Status</span>
                <select
                  className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm flex-1`}
                  value={formData.status}
                  onChange={e => {
                    const nextStatus = e.target.value;
                    setFormData(p => ({
                      ...p,
                      status: nextStatus,
                      amountPaid: nextStatus === 'PAID' ? totals.grandTotal : nextStatus === 'UNPAID' ? 0 : p.amountPaid,
                    }));
                  }}
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Client Reference */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Client</span>
                <div className="flex-1">
                  <select 
                    data-testid="expense-client-select"
                    className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
                    value={formData.clientRef}
                    onChange={e => {
                      const client = clients.find(c => c._id === e.target.value);
                      setFormData(p => ({ ...p, clientRef: e.target.value, clientName: client?.name || p.clientName }));
                    }}
                  >
                    <option value="" className="text-gray-400">Reference client</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {!formData.clientRef && formData.clientName && (
                    <p className="mt-1 text-xs text-amber-600">Scanned: {formData.clientName}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Category</span>
                <select
                  className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm flex-1`}
                  value={formData.category}
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value, subCategory: '' }))}
                >
                  <option value="">Select Category</option>
                  {rootCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Sub-category</span>
                <select
                  className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm flex-1`}
                  value={formData.subCategory}
                  onChange={e => setFormData(p => ({ ...p, subCategory: e.target.value }))}
                  disabled={!formData.category || subCategories.length === 0}
                >
                  <option value="">None</option>
                  {subCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {budgetInfo && (
                <div className="md:col-span-2 rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Budget remaining: <span className="font-bold">₹{budgetRemaining.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  {budgetExceededBy > 0 && (
                    <div className="mt-1 text-amber-700 font-semibold">
                      This will exceed your budget by ₹{budgetExceededBy.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              )}

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
                    data-testid={`expense-item-select-${idx}`}
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
                    data-testid={`expense-item-name-${idx}`}
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
                    data-testid={`expense-item-qty-${idx}`}
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
                    data-testid={`expense-item-rate-${idx}`}
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
                 <div className="flex justify-between items-center px-4">
                   <span className="text-sm text-gray-500">Paid:</span>
                   <span className="text-sm text-gray-800">₹ {(Number(formData.amountPaid) || 0).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center px-4">
                   <span className="text-sm font-bold text-[#2d4b6b]">Payable:</span>
                   <span className="text-sm font-bold text-[#2d4b6b]">₹ {payableBalance.toFixed(2)}</span>
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
               data-testid="save-expense"
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
