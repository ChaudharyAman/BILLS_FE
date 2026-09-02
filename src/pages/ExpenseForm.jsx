import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaCalendarAlt, FaCheck, FaTimes, FaPlus } from 'react-icons/fa';
import { buildPdfTransactionPatch } from '../utils/pdfTransactionImport';
import AttachmentUploader from '../components/AttachmentUploader';

const ExpenseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [budgetInfo, setBudgetInfo] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [expenseType, setExpenseType] = useState('Vendor Expense');
  const initialValues = React.useRef(null);

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
    businessUnit: '',
    items: [
      { itemRef: '', name: '', unit: '', qty: 1, rate: 0, taxRate: 0, amount: 0 }
    ],
    attachments: [],
    reverseCharge: false,
    terms: '',
    privateNotes: '',
    tds_applicable: false,
    tds_section: '',
    tds_rate: 0,
    tds_amount: 0,
    tds_nature: 'deductor',
    net_vendor_payment: 0
  });

  const [totals, setTotals] = useState({ subTotal: 0, taxTotal: 0, grandTotal: 0 });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes, iRes, catRes, buRes] = await Promise.all([
        api.get('/vendors?limit=1000'),
        api.get('/clients?limit=1000'),
        api.get('/items?limit=1000'),
        api.get('/categories?type=expense'),
        api.get('/business-units?status=active').catch(() => ({ data: [] })),
      ]);
      const loadedVendors = vRes.data.data || [];
      const loadedClients = cRes.data.data || [];
      const loadedInventory = iRes.data.data || [];
      const loadedCategories = catRes.data || [];
      setVendors(loadedVendors);
      setClients(loadedClients);
      setInventory(loadedInventory);
      setCategories(loadedCategories);
      setBusinessUnits(buRes.data || []);

      if (id) {
        const eRes = await api.get(`/expenses/${id}`);
        const data = eRes.data;
        if (data.vendor?.vendorRef || data.vendor?.name) {
          setExpenseType('Vendor Expense');
        } else {
          setExpenseType('Category Expense');
        }
        
        let prefix = 'EXP-';
        let suffix = data.expenseNumber || '';
        if (data.expenseNumber && data.expenseNumber.includes('-')) {
            const parts = data.expenseNumber.split('-');
            prefix = parts[0] + '-';
            suffix = parts[1];
        }

        const initialData = {
            category: data.category?._id || data.category || '',
            vendorRef: data.vendor?.vendorRef || '',
            tds_applicable: !!data.tds_applicable,
            tds_section: data.tds_section || '',
            tds_rate: data.tds_rate || 0,
            tds_amount: data.tds_amount || 0,
            net_vendor_payment: data.net_vendor_payment || 0,
        };
        initialValues.current = initialData;

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
            category: initialData.category,
            subCategory: data.subCategory?._id || data.subCategory || '',
            businessUnit: data.businessUnit?._id || data.businessUnit || '',
            items: data.items?.length > 0 ? data.items : [{ itemRef: '', name: '', unit: '', qty: 1, rate: 0, taxRate: 0, amount: 0 }],
            attachments: data.attachments || [],
            reverseCharge: !!data.reverseCharge,
            terms: data.terms || '',
            privateNotes: data.privateNotes || '',
            tds_applicable: initialData.tds_applicable,
            tds_section: initialData.tds_section,
            tds_rate: initialData.tds_rate,
            tds_amount: initialData.tds_amount,
            tds_nature: data.tds_nature || 'deductor',
            net_vendor_payment: initialData.net_vendor_payment,
        });
      } else {
        applyPdfImportData(loadedVendors, loadedClients, loadedInventory);
      }
      setIsReady(true);
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
        vendorGST: patch.vendorGST || '',
        vendorAddressObject: patch.vendorAddressObject || null,
        vendorPhone: patch.vendorPhone || '',
        vendorEmail: patch.vendorEmail || '',
        vendorPAN: patch.vendorPAN || '',
        clientRef: patch.clientRef || prev.clientRef,
        clientName: patch.clientName || prev.clientName,
        clientGST: patch.clientGST || '',
        clientAddressObject: patch.clientAddressObject || null,
        clientPhone: patch.clientPhone || '',
        clientEmail: patch.clientEmail || '',
        clientPAN: patch.clientPAN || '',
        placeOfSupply: patch.placeOfSupply || prev.placeOfSupply,
        items: patch.items.length > 0 ? patch.items : prev.items,
        attachments: Array.isArray(patch.attachments) && patch.attachments.length > 0 ? patch.attachments : prev.attachments,
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
    let active = true;
    const fetchBudget = async () => {
      if (!formData.category) {
        setBudgetInfo(null);
        return;
      }
      try {
        const res = await api.get(`/budgets?category=${formData.category}&limit=1`);
        if (active) setBudgetInfo(res.data.data?.[0] || null);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.warn('Failed to load budget for category', error);
        if (active) setBudgetInfo(null);
      }
    };
    fetchBudget();
    return () => {
      active = false;
    };
  }, [formData.category]);

  // Sync Default TDS Rate based on Section, Vendor, & Category
  useEffect(() => {
    if (!isReady) return;

    let hasChanged = true;
    if (id && initialValues.current) {
      hasChanged = 
        formData.tds_applicable !== initialValues.current.tds_applicable ||
        formData.tds_section !== initialValues.current.tds_section ||
        formData.vendorRef !== initialValues.current.vendorRef;
    }

    if (formData.tds_applicable) {
      const section = formData.tds_section || '194C';
      let rate = formData.tds_rate;
      
      // Only recalculate rate to standard defaults if section/vendor/applicability changed
      if (hasChanged) {
        if (section !== 'Manual') {
          if (section === '194C') {
            const vendor = vendors.find(v => v._id === formData.vendorRef);
            rate = vendor?.clientType === 'Individual' ? 1 : 2;
          } else if (['194J', '194I', '194A'].includes(section)) {
            rate = 10;
          } else if (section === '194H') {
            rate = 5;
          }
        }
      }
      
      const sub = totals.subTotal;
      const amount = Math.round((sub * rate / 100) * 100) / 100;
      const payable = totals.grandTotal - (!!formData.reverseCharge ? totals.taxTotal : 0);
      const net = Math.max(0, Math.round((payable - amount) * 100) / 100);
      
      if (formData.tds_rate !== rate || formData.tds_amount !== amount || formData.net_vendor_payment !== net) {
        setFormData(prev => ({
          ...prev,
          tds_rate: rate,
          tds_amount: amount,
          net_vendor_payment: net,
        }));
      }
    } else {
      const payable = totals.grandTotal - (!!formData.reverseCharge ? totals.taxTotal : 0);
      if (formData.tds_amount !== 0 || formData.tds_rate !== 0 || formData.net_vendor_payment !== payable) {
        setFormData(prev => ({
          ...prev,
          tds_rate: 0,
          tds_amount: 0,
          net_vendor_payment: payable,
        }));
      }
    }
  }, [isReady, formData.tds_applicable, formData.tds_section, formData.vendorRef, vendors, totals.subTotal, totals.grandTotal, formData.reverseCharge, totals.taxTotal]);

  // Auto-Suggest TDS based on Category Selection
  useEffect(() => {
    if (!isReady) return;
    if (expenseType !== 'Vendor Expense') return;

    if (id && initialValues.current) {
      if (formData.category === initialValues.current.category) {
        return;
      }
    }

    if (!formData.category) return;
    const cat = categories.find(c => c._id === formData.category);
    if (!cat) return;
    const name = String(cat.name).toLowerCase();
    
    let section = '';
    let rate = 0;
    
    if (name.includes('professional')) {
      section = '194J';
      rate = 10;
    } else if (name.includes('contractor') || name.includes('labour') || name.includes('labor')) {
      section = '194C';
      const vendor = vendors.find(v => v._id === formData.vendorRef);
      rate = vendor?.clientType === 'Individual' ? 1 : 2;
    } else if (name.includes('rent')) {
      section = '194I';
      rate = 10;
    } else if (name.includes('commission')) {
      section = '194H';
      rate = 5;
    } else if (name.includes('interest')) {
      section = '194A';
      rate = 10;
    }
    
    if (section) {
      setFormData(prev => ({
        ...prev,
        tds_applicable: true,
        tds_section: section,
        tds_rate: rate,
      }));
    }
  }, [isReady, formData.category, categories, formData.vendorRef, vendors, expenseType]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'itemRef') {
      const selectedInv = inventory.find(inv => inv._id === value);
      let rate = 0;
      if (selectedInv) {
        if (selectedInv.purchaseInfo && selectedInv.purchaseInfo.price) {
          rate = selectedInv.purchaseInfo.price;
        } else if (selectedInv.purchasePrice) {
          rate = selectedInv.purchasePrice;
        } else if (selectedInv.rate) {
          rate = selectedInv.rate;
        } else if (selectedInv.salesInfo && selectedInv.salesInfo.price) {
          rate = selectedInv.salesInfo.price;
        } else if (selectedInv.sellingPrice) {
          rate = selectedInv.sellingPrice;
        }
      }
      
      let taxRate = 0;
      if (selectedInv) {
        const candidates = [selectedInv.defaultTaxRate, selectedInv.taxRate, selectedInv.purchaseInfo?.taxRate, selectedInv.salesInfo?.taxRate];
        for (const candidate of candidates) {
          if (candidate !== undefined && candidate !== null) {
            const numeric = parseFloat(String(candidate).replace('%', '').trim());
            if (!isNaN(numeric) && (numeric > 0 || String(candidate).trim() === '0')) {
              taxRate = numeric;
              break;
            }
          }
        }
      }
      
      newItems[index] = {
        ...newItems[index],
        itemRef: value,
        name: selectedInv ? selectedInv.name : '',
        rate: rate,
        unit: selectedInv ? selectedInv.unit : '',
        taxRate: taxRate
      };
    } else {
      newItems[index][field] = value;
    }
    
    // Recalculate amount dynamically
    const qty = parseFloat(newItems[index].qty) || 0;
    const rate = parseFloat(newItems[index].rate) || 0;
    newItems[index].amount = qty * rate;
    
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

      if (expenseType === 'Vendor Expense' && !selectedVendor._id && !scannedVendorName) {
        alert('Please select a vendor.');
        setLoading(false);
        return;
      }

      const suffix = formData.expenseNumberSuffix?.trim() || String(Date.now()).slice(-6);
      const payload = {
        expenseNumber: `${formData.expenseNumberPrefix}${suffix}`,
        date: formData.date,
        dueDate: formData.dueDate || null,
        paymentMethod: formData.paymentMethod,
        amountPaid: Number(formData.amountPaid) || 0,
        status: formData.status,
        vendor: selectedVendor._id
          ? {
              vendorRef: selectedVendor._id,
              name: selectedVendor.name,
              gstin: selectedVendor.gstin || formData.vendorGST,
              address: selectedVendor.billingAddress || formData.vendorAddressObject,
              phone: selectedVendor.phone || formData.vendorPhone,
              email: selectedVendor.email || formData.vendorEmail,
              pan: selectedVendor.pan || formData.vendorPAN,
            }
          : {
              name: scannedVendorName,
              vendorGST: formData.vendorGST,
              vendorAddressObject: formData.vendorAddressObject,
              vendorPhone: formData.vendorPhone,
              vendorEmail: formData.vendorEmail,
              vendorPAN: formData.vendorPAN,
            },
        client: selectedClient._id
          ? {
              clientRef: selectedClient._id,
              name: selectedClient.name,
              gstin: selectedClient.gstin || formData.clientGST,
              address: selectedClient.billingAddress || formData.clientAddressObject,
              phone: selectedClient.phone || formData.clientPhone,
              email: selectedClient.email || formData.clientEmail,
              pan: selectedClient.pan || formData.clientPAN,
            }
          : (scannedClientName
              ? {
                  name: scannedClientName,
                  clientGST: formData.clientGST,
                  clientAddressObject: formData.clientAddressObject,
                  clientPhone: formData.clientPhone,
                  clientEmail: formData.clientEmail,
                  clientPAN: formData.clientPAN,
                }
              : null),
        placeOfSupply: formData.placeOfSupply || '',
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        reverseCharge: !!formData.reverseCharge,
        items: formData.items,
        subTotal: totals.subTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        terms: formData.terms,
        privateNotes: formData.privateNotes,
        attachments: formData.attachments || [],
        tds_applicable: formData.tds_applicable,
        tds_section: formData.tds_section,
        tds_rate: formData.tds_rate,
        tds_amount: formData.tds_amount,
        tds_nature: formData.tds_nature,
        net_vendor_payment: formData.net_vendor_payment,
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
  const inputBaseCls = "w-full border border-gray-200 dark:border-slate-700 rounded text-sm px-3 py-2 text-gray-700 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans transition-colors";
  const labelCls = "text-xs font-semibold text-gray-600 dark:text-slate-300 tracking-wide mb-1.5 inline-block";
  const rowBorder = "border-b border-gray-200 dark:border-slate-800";
  const rootCategories = categories.filter(cat => !cat.parent);
  const subCategories = categories.filter(cat => (cat.parent?._id || cat.parent) === formData.category);
  const budgetRemaining = budgetInfo ? Number(budgetInfo.remainingAmount) || 0 : null;
  const payableAmount = totals.grandTotal - (!!formData.reverseCharge ? totals.taxTotal : 0);
  const budgetExceededBy = budgetInfo && payableAmount > budgetRemaining ? payableAmount - budgetRemaining : 0;
  const payableBalance = Math.max(payableAmount - (Number(formData.amountPaid) || 0), 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f3f6f9] dark:bg-[#090d16] py-8 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 rounded font-sans overflow-hidden transition-colors">
          
          {/* Header Title */}
          <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
            <h1 className="text-lg font-bold text-[#2d4b6b] dark:text-blue-400">
              {id ? 'Edit Expense' : 'Add New Expense'}
            </h1>
            {/* Expense Type Tabs */}
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
              {['Vendor Expense', 'Category Expense'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setExpenseType(type);
                    if (type === 'Category Expense') {
                      setFormData(prev => ({
                        ...prev,
                        tds_applicable: false,
                        tds_section: '',
                        tds_rate: 0,
                        tds_amount: 0,
                      }));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    expenseType === type
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-slate-700'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Top Info Section */}
          <div className={`flex flex-col md:flex-row bg-[#fdfdfd] dark:bg-slate-900/60 ${rowBorder}`}>
            {/* Vendor Col */}
            {expenseType === 'Vendor Expense' && (
              <div className="w-full md:w-1/3 p-6 border-r border-gray-200 dark:border-slate-800">
                <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Vendor name</span>
                  <div className="flex-1 min-w-0">
                    <select 
                      data-testid="expense-vendor-select"
                      className={`${inputBaseCls} w-full`}
                      value={formData.vendorRef}
                      onChange={e => {
                        const vendor = vendors.find(v => v._id === e.target.value);
                        const tdsApp = vendor?.tds_applicable || false;
                        setFormData(p => ({
                          ...p,
                          vendorRef: e.target.value,
                          vendorName: vendor?.name || p.vendorName,
                          tds_applicable: tdsApp,
                          tds_section: tdsApp ? (vendor.default_tds_section || '194C') : '',
                          tds_rate: tdsApp ? (vendor.default_tds_rate || 0) : 0,
                        }));
                      }}
                    >
                      <option value="">{formData.vendorName && !formData.vendorRef ? `${formData.vendorName} (will be created on save)` : 'Select Vendor'}</option>
                      {vendors.map(v => (
                        <option key={v._id} value={v._id}>{v.name}</option>
                      ))}
                    </select>
                    {!formData.vendorRef && formData.vendorName && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Scanned: {formData.vendorName}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Config Col (Grid Layout) */}
            <div className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 ${
              expenseType === 'Vendor Expense' ? 'w-full md:w-2/3' : 'w-full'
            }`}>
                
              {/* Number */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Number</span>
                <div className="flex-1 min-w-0 flex gap-2 items-center text-gray-500 dark:text-slate-400 font-bold">
                  <input 
                    type="text" 
                    className="w-24 border border-gray-200 dark:border-slate-700 rounded text-sm px-3 py-2 text-gray-900 dark:text-slate-100 text-center uppercase focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans bg-[#f8f9fa] dark:bg-slate-800 shadow-sm font-normal" 
                    value={formData.expenseNumberPrefix.replace(/-$/, '')} 
                    onChange={e => setFormData(p => ({ ...p, expenseNumberPrefix: e.target.value }))}
                  />
                  -
                  <input 
                    type="text" 
                    data-testid="expense-number-suffix"
                    className="w-full min-w-0 flex-1 border border-gray-200 dark:border-slate-700 rounded text-sm px-3 py-2 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans bg-[#f8f9fa] dark:bg-slate-800 shadow-sm font-normal" 
                    value={formData.expenseNumberSuffix}
                    onChange={e => setFormData(p => ({ ...p, expenseNumberSuffix: e.target.value }))}
                    placeholder="e.g. 4567"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Payment method</span>
                <div className="flex-1 min-w-0">
                  <select 
                  data-testid="expense-payment-method"
                  className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
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
              </div>

              {/* Business Unit */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Business Unit</span>
                <div className="flex-1 min-w-0">
                  <select 
                    className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
                    value={formData.businessUnit || ''}
                    onChange={e => setFormData(p => ({ ...p, businessUnit: e.target.value }))}
                  >
                    <option value="">General / Unassigned</option>
                    {businessUnits.map(bu => (
                      <option key={bu._id} value={bu._id}>{bu.name} ({bu.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expense Date */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Expense Date</span>
                  <div className="relative flex-1 min-w-0">
                    <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 pointer-events-none" />
                    <input 
                      type="date" 
                      className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`} 
                      style={{ WebkitAppearance: 'none' }}
                      value={formData.date}
                      onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                      required
                    />
                  </div>
              </div>

              {/* Due Date */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Due date</span>
                  <div className="relative flex-1 min-w-0">
                    <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
                      value={formData.dueDate}
                      onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                    />
                  </div>
              </div>

              {/* Amount Paid */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Amount paid</span>
                <div className="flex-1 min-w-0">
                  <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
                  value={formData.amountPaid}
                  onChange={e => setFormData(p => ({ ...p, amountPaid: Number(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
                </div>
              </div>

              {/* Payment Status */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Status</span>
                <div className="flex-1 min-w-0">
                  <select
                  className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
                  value={formData.status}
                  onChange={e => {
                    const nextStatus = e.target.value;
                      const payableAmount = totals.grandTotal - (!!formData.reverseCharge ? totals.taxTotal : 0);
                      const payableNet = formData.tds_applicable ? Math.max(0, payableAmount - formData.tds_amount) : payableAmount;
                      setFormData(p => ({
                        ...p,
                        status: nextStatus,
                        amountPaid: nextStatus === 'PAID' ? payableNet : nextStatus === 'UNPAID' ? 0 : p.amountPaid,
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
              </div>

              {/* Ref Vendor */}
              {expenseType === 'Category Expense' && (
                <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Ref Vendor</span>
                  <div className="flex-1 min-w-0">
                    <select 
                      data-testid="expense-ref-vendor-select"
                      className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
                      value={formData.vendorRef}
                      onChange={e => {
                        const vendor = vendors.find(v => v._id === e.target.value);
                        setFormData(p => ({
                          ...p,
                          vendorRef: e.target.value,
                          vendorName: vendor?.name || '',
                        }));
                      }}
                    >
                      <option value="">Select Vendor (Optional)</option>
                      {vendors.map(v => (
                        <option key={v._id} value={v._id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Client Reference */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Client</span>
                <div className="flex-1 min-w-0">
                  <select 
                    data-testid="expense-client-select"
                    className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
                    value={formData.clientRef}
                    onChange={e => {
                      const client = clients.find(c => c._id === e.target.value);
                      setFormData(p => ({ ...p, clientRef: e.target.value, clientName: client?.name || p.clientName }));
                    }}
                  >
                    <option value="">{formData.clientName && !formData.clientRef ? `${formData.clientName} (will be created on save)` : 'Reference client'}</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {!formData.clientRef && formData.clientName && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Scanned: {formData.clientName}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Category</span>
                <div className="flex-1 min-w-0">
                  <select
                  className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
                  value={formData.category}
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value, subCategory: '' }))}
                >
                  <option value="">Select Category</option>
                  {rootCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Sub-category</span>
                <div className="flex-1 min-w-0">
                  <select
                  className={`${inputBaseCls} bg-[#f8f9fa] dark:bg-slate-800 shadow-sm w-full`}
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
              </div>

              {budgetInfo && (
                <div className="md:col-span-2 rounded border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                  Budget remaining: <span className="font-bold">₹{budgetRemaining.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  {budgetExceededBy > 0 && (
                    <div className="mt-1 text-amber-700 dark:text-amber-300 font-semibold">
                      This will exceed your budget by ₹{budgetExceededBy.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Section Sub-header */}
          <div className="bg-white dark:bg-slate-900 px-6 py-3 font-bold text-sm text-[#2d4b6b] dark:text-blue-400 border-b border-gray-200 dark:border-slate-800 pt-6 transition-colors">
            Expense
          </div>

          {/* Table Headers */}
          <div className="bg-[#e9ecef] dark:bg-slate-800/80 flex px-6 py-2.5 text-xs font-bold text-[#495057] dark:text-slate-300 uppercase tracking-wide transition-colors">
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
                    step="0.01"
                  />
                  {/* Inline Tax Select */}
                  <select 
                    className={inputBaseCls}
                    value={item.taxRate}
                    onChange={(e) => handleItemChange(idx, 'taxRate', e.target.value)}
                  >
                    <option value="0">Select GST</option>
                    <option value="5">GST 5%</option>
                    <option value="12">GST 12%</option>
                    <option value="18">GST 18%</option>
                    <option value="28">GST 28%</option>
                  </select>
                </div>

                {/* Total Text */}
                <div className="w-full md:w-32 text-right text-sm font-bold text-gray-700 dark:text-slate-200 mt-2 md:mt-0 px-2 flex items-center justify-end md:justify-between">
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
          <div className="border-t border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row justify-between transition-colors">
            {/* Reverse Charge & TDS Configuration */}
            <div className="p-6 md:w-1/2 space-y-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-green-500 focus:ring-green-500 cursor-pointer dark:bg-slate-800"
                  checked={!!formData.reverseCharge}
                  onChange={(e) => setFormData(p => ({...p, reverseCharge: e.target.checked}))}
                />
                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors">
                  Subject to reverse charge
                </span>
              </label>

              {/* TDS Config Card */}
              <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-gray-200/80 dark:border-slate-700 p-4 space-y-4 max-w-md shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">TDS Applicable</span>
                    <span className="text-[10px] text-slate-400">Deduct tax at source from vendor payment</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tds_applicable: !prev.tds_applicable }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.tds_applicable ? 'bg-[#48c774]' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.tds_applicable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formData.tds_applicable && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-150 dark:border-slate-700 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 dark:text-slate-300 uppercase mb-1">TDS Section *</label>
                      <select
                        className="w-full border border-gray-200 dark:border-slate-700 rounded text-xs px-2.5 py-1.5 outline-none focus:border-green-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        value={formData.tds_section}
                        onChange={(e) => setFormData(prev => ({ ...prev, tds_section: e.target.value }))}
                      >
                        <option value="194C">194C – Contractor (1% / 2%)</option>
                        <option value="194J">194J – Professional/Technical (10%)</option>
                        <option value="194I">194I – Rent (10%)</option>
                        <option value="194H">194H – Commission (5%)</option>
                        <option value="194A">194A – Interest (10%)</option>
                        <option value="Manual">Manual (Custom Rate)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 dark:text-slate-300 uppercase mb-1">TDS Rate %</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className={`w-full border border-gray-200 dark:border-slate-700 rounded text-xs px-2.5 py-1.5 outline-none focus:border-green-500 ${
                          formData.tds_section !== 'Manual' ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                        }`}
                        value={formData.tds_rate}
                        readOnly={formData.tds_section !== 'Manual'}
                        onChange={(e) => {
                          if (formData.tds_section === 'Manual') {
                            setFormData(prev => ({ ...prev, tds_rate: parseFloat(e.target.value) || 0 }));
                          }
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-650 dark:text-slate-300 uppercase mb-1">TDS Amount (₹)</label>
                      <input
                        type="text"
                        className="w-full border border-gray-200 dark:border-slate-700 rounded text-xs px-2.5 py-1.5 outline-none bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-400 font-semibold cursor-not-allowed"
                        value={Number(formData.tds_amount).toFixed(2)}
                        readOnly
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Totals Pane */}
            <div className="p-6 md:w-1/2 xl:w-1/3">
               <div className="space-y-3">
                 {!!formData.reverseCharge && (
                   <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] rounded-lg p-2.5 font-medium flex flex-col gap-0.5 mb-2 mx-4 leading-relaxed animate-fade-in">
                     <span className="font-bold flex items-center gap-1 text-[11px] text-amber-900 dark:text-amber-200">⚠️ Reverse Charge Active</span>
                     <span className="text-gray-600 dark:text-slate-400">GST is calculated but not added to the payable Total. The customer is liable to pay GST directly to the government.</span>
                   </div>
                 )}
                  <div className="flex justify-between items-center px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Expense (Base):</span>
                    <span className="text-slate-700 dark:text-slate-200">₹ {totals.subTotal.toFixed(2)}</span>
                  </div>
                  {totals.taxTotal > 0 && (
                    <div className="flex justify-between items-center px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>GST:</span>
                      <span className="text-slate-700 dark:text-slate-200">₹ {totals.taxTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {formData.tds_applicable && (
                    <div className="flex justify-between items-center px-4 text-xs font-bold text-red-500 dark:text-red-400">
                      <span>TDS @ {formData.tds_rate}% ({formData.tds_section}):</span>
                      <span>-₹ {formData.tds_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="bg-[#f2f9f5] dark:bg-emerald-950/30 flex justify-between items-center px-4 py-3 rounded border border-[#e1eee6] dark:border-emerald-800/40">
                    <span className="text-sm font-bold text-[#28a745] dark:text-emerald-400">
                      {formData.tds_applicable ? "Net Pay Vendor:" : "Total:"}
                    </span>
                    <span className="text-sm font-bold text-[#28a745] dark:text-emerald-400">
                      ₹ {formData.net_vendor_payment.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Amount Paid:</span>
                    <span className="text-slate-700 dark:text-slate-200">₹ {(Number(formData.amountPaid) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 text-sm font-bold text-[#2d4b6b] dark:text-blue-400 border-t border-dashed border-gray-200 dark:border-slate-800 pt-2.5">
                    <span>Balance Due:</span>
                    <span>₹ {Math.max(0, formData.net_vendor_payment - (Number(formData.amountPaid) || 0)).toFixed(2)}</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="p-6 border-t border-gray-200 dark:border-slate-800">
            <AttachmentUploader
              attachments={formData.attachments || []}
              onChange={(atts) => setFormData(prev => ({ ...prev, attachments: atts }))}
              entityId={id}
              entityType="expenses"
            />
          </div>

          {/* Notes Section */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className={`${labelCls} text-gray-500 dark:text-slate-400`}>Terms & Conditions</label>
              <textarea 
                rows="4"
                className={`${inputBaseCls} resize-y text-gray-600 dark:text-slate-300`}
                value={formData.terms}
                onChange={e => setFormData(p => ({...p, terms: e.target.value}))}
              ></textarea>
            </div>
            <div>
              <label className={`${labelCls} text-gray-500 dark:text-slate-400`}>Private notes (not shown to vendor)</label>
              <textarea 
                rows="4"
                className={`${inputBaseCls} resize-y text-gray-600 dark:text-slate-300`}
                value={formData.privateNotes}
                onChange={e => setFormData(p => ({...p, privateNotes: e.target.value}))}
              ></textarea>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-6 bg-[#fdfdfd] dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex gap-3 transition-colors">
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
               className="bg-[#e9ecef] dark:bg-slate-800 hover:bg-[#d6dadd] dark:hover:bg-slate-700 text-[#555] dark:text-slate-300 px-6 py-2.5 rounded font-semibold text-sm transition-colors"
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
