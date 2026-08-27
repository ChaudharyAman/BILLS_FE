import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaCalendarAlt, FaCheck, FaTimes, FaPlus } from 'react-icons/fa';
import { buildPdfTransactionPatch } from '../utils/pdfTransactionImport';
import AttachmentUploader from '../components/AttachmentUploader';

const gstStateMap = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', 
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh', '97': 'Other Territory', '99': 'Centre Jurisdiction'
};

const extractStateCode = (value = '') => {
  const text = String(value || '').trim();
  if (!text) return '';
  const prefixMatch = text.match(/^(\d{2})\s*[-(]/);
  if (prefixMatch) return prefixMatch[1];
  const parenMatch = text.match(/\((\d{2})\)/);
  if (parenMatch) return parenMatch[1];
  return '';
};

const normalizeStateName = (value = '') => String(value || '')
  .replace(/^\d{2}\s*[-)]?\s*/, '')
  .split('(')[0]
  .trim()
  .toLowerCase();

const isInterStateSupply = (placeOfSupply, companyState, companyGstin) => {
  const supply = String(placeOfSupply || '').trim();
  if (!supply) return false;
  const supplyStateCode = extractStateCode(supply);
  const companyStateCode = String(companyGstin || '').trim().slice(0, 2);
  if (supplyStateCode && /^\d{2}$/.test(companyStateCode)) {
    return supplyStateCode !== companyStateCode;
  }
  const normalizedSupply = normalizeStateName(supply);
  const normalizedCompanyState = normalizeStateName(companyState);
  if (normalizedSupply && normalizedCompanyState) {
    return normalizedSupply !== normalizedCompanyState;
  }
  return false;
};

const roundTwo = (value) => Math.round((Number(value) || 0) * 100) / 100;

const IncomeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);

  // Form State matching Sleekbills screenshot
  const [formData, setFormData] = useState({
    incomeNumberPrefix: 'INC-',
    incomeNumberSuffix: '',
    date: new Date().toISOString().substring(0, 10),
    paymentDate: '',
    paymentMethod: '',
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
    reverseCharge: false,
    terms: '',
    privateNotes: '',
    placeOfSupply: '',
    tds_applicable: false,
    tds_section: '',
    tds_rate: 0,
    tds_amount: 0,
    amountPaid: 0,
    attachments: [],
  });

  const [companyTaxProfile, setCompanyTaxProfile] = useState({ state: '', gstin: '' });
  const [totals, setTotals] = useState({
    subTotal: 0,
    taxTotal: 0,
    totalCGST: 0,
    totalSGST: 0,
    totalIGST: 0,
    grandTotal: 0,
    tds_amount: 0,
    netReceived: 0,
    balanceDue: 0,
    isInterState: false
  });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes, iRes, catRes, settingsRes, buRes] = await Promise.all([
        api.get('/vendors?limit=1000'),
        api.get('/clients?limit=1000'),
        api.get('/items?limit=1000'),
        api.get('/categories?type=income'),
        api.get('/settings'),
        api.get('/business-units?status=active')
      ]);
      const loadedVendors = vRes.data.data || [];
      const loadedClients = cRes.data.data || [];
      const loadedInventory = iRes.data.data || [];
      const loadedCategories = catRes.data || [];
      const settings = settingsRes.data || {};
      const loadedBUs = buRes.data.data || [];

      setVendors(loadedVendors);
      setClients(loadedClients);
      setInventory(loadedInventory);
      setCategories(loadedCategories);
      setBusinessUnits(loadedBUs);
      setCompanyTaxProfile({
        state: settings.address?.state || '',
        gstin: settings.gstin || '',
      });

      if (id) {
        const eRes = await api.get(`/incomes/${id}`);
        const data = eRes.data;

        if (data.sourceType === 'invoice' && data.sourceInvoice) {
          alert('This income is synced from an invoice. Opening the original invoice instead.');
          navigate(`/invoices/edit/${data.sourceInvoice}`, { replace: true });
          return;
        }
        
        let prefix = 'INC-';
        let suffix = data.incomeNumber || '';
        if (data.incomeNumber && data.incomeNumber.includes('-')) {
            const parts = data.incomeNumber.split('-');
            prefix = parts[0] + '-';
            suffix = parts[1];
        }

        setFormData({
            incomeNumberPrefix: prefix,
            incomeNumberSuffix: suffix,
            date: data.date ? new Date(data.date).toISOString().substring(0, 10) : '',
            paymentDate: data.paymentDate ? new Date(data.paymentDate).toISOString().substring(0, 10) : '',
            paymentMethod: data.paymentMethod || '',
            vendorRef: data.vendor?.vendorRef || '',
            vendorName: data.vendor?.name || '',
            clientRef: data.client?.clientRef || '',
            clientName: data.client?.name || '',
            category: data.category?._id || data.category || '',
            subCategory: data.subCategory?._id || data.subCategory || '',
            businessUnit: data.businessUnit?._id || data.businessUnit || '',
            items: data.items?.length > 0 ? data.items : [{ itemRef: '', name: '', unit: '', qty: 1, rate: 0, taxRate: 0, amount: 0 }],
            attachments: data.attachments || [],
            reverseCharge: !!data.reverseCharge,
            terms: data.terms || '',
            privateNotes: data.privateNotes || '',
            placeOfSupply: data.placeOfSupply || '',
            tds_applicable: !!data.tds_applicable,
            tds_section: data.tds_section || '',
            tds_rate: data.tds_rate || 0,
            tds_amount: data.tds_amount || 0,
            amountPaid: data.amountPaid || 0,
        });
      } else {
        setFormData(p => ({
          ...p,
          placeOfSupply: settings.address?.state || ''
        }));
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
      const raw = sessionStorage.getItem('incomePdfImportData');
      if (!raw) return;

      const pdf = JSON.parse(raw);
      sessionStorage.removeItem('incomePdfImportData');
      if (!pdf._fromPdfImport) return;

      const patch = buildPdfTransactionPatch(pdf, 'income', {
        vendors: loadedVendors,
        clients: loadedClients,
        inventory: loadedInventory,
      });

      setFormData(prev => ({
        ...prev,
        incomeNumberSuffix: patch.numberSuffix || prev.incomeNumberSuffix,
        date: patch.date || prev.date,
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
      console.warn('Failed to load income PDF import data:', e);
    }
  };

  const getTaxBreakdown = useCallback(() => {
    let cgst = 0, sgst = 0, igst = 0;
    const isInterState = isInterStateSupply(
      formData.placeOfSupply,
      companyTaxProfile.state,
      companyTaxProfile.gstin
    );

    formData.items.forEach(item => {
      const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
      const taxRate = parseFloat(item.taxRate) || 0;
      const tax = amount * (taxRate / 100);
      if (isInterState) {
        igst = roundTwo(igst + tax);
      } else {
        cgst = roundTwo(cgst + roundTwo(tax / 2));
        sgst = roundTwo(sgst + roundTwo(tax / 2));
      }
    });

    return { cgst, sgst, igst, isInterState };
  }, [formData.items, formData.placeOfSupply, companyTaxProfile]);

  const calculateTotals = useCallback(() => {
    let sub = 0;
    let tax = 0;
    
    formData.items.forEach(item => {
      const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
      const itemTax = amount * ((parseFloat(item.taxRate) || 0) / 100);
      sub += amount;
      tax += itemTax;
    });

    const subTotal = roundTwo(sub);
    const taxTotal = roundTwo(tax);
    
    // Split tax
    const { cgst, sgst, igst, isInterState } = getTaxBreakdown();

    const grandTotalBeforeTds = subTotal + (formData.reverseCharge ? 0 : taxTotal);
    
    // TDS calculations
    let tdsAmt = 0;
    if (formData.tds_applicable) {
      tdsAmt = roundTwo(subTotal * ((parseFloat(formData.tds_rate) || 0) / 100));
    }

    const netReceived = roundTwo(Math.max(grandTotalBeforeTds - tdsAmt, 0));
    const balanceDue = roundTwo(Math.max(netReceived - (parseFloat(formData.amountPaid) || 0), 0));

    setTotals({
      subTotal,
      taxTotal,
      totalCGST: cgst,
      totalSGST: sgst,
      totalIGST: igst,
      grandTotal: grandTotalBeforeTds,
      tds_amount: tdsAmt,
      netReceived,
      balanceDue,
      isInterState
    });
  }, [formData.items, formData.reverseCharge, formData.tds_applicable, formData.tds_rate, formData.amountPaid, getTaxBreakdown]);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.reverseCharge, formData.tds_applicable, formData.tds_rate, formData.amountPaid, calculateTotals]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'itemRef') {
      const selectedInv = inventory.find(inv => inv._id === value);
      let rate = 0;
      if (selectedInv) {
        if (selectedInv.salesInfo && selectedInv.salesInfo.price) {
          rate = selectedInv.salesInfo.price;
        } else if (selectedInv.sellingPrice) {
          rate = selectedInv.sellingPrice;
        } else if (selectedInv.rate) {
          rate = selectedInv.rate;
        } else if (selectedInv.purchaseInfo && selectedInv.purchaseInfo.price) {
          rate = selectedInv.purchaseInfo.price;
        } else if (selectedInv.purchasePrice) {
          rate = selectedInv.purchasePrice;
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

      if (!selectedVendor._id && !scannedVendorName) {
        alert('Please select a vendor.');
        setLoading(false);
        return;
      }

      const payload = {
        incomeNumber: `${formData.incomeNumberPrefix}${formData.incomeNumberSuffix}`,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
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
        businessUnit: formData.businessUnit || null,
        reverseCharge: !!formData.reverseCharge,
        items: formData.items,
        subTotal: totals.subTotal,
        taxTotal: totals.taxTotal,
        totalCGST: totals.totalCGST,
        totalSGST: totals.totalSGST,
        totalIGST: totals.totalIGST,
        grandTotal: totals.grandTotal,
        terms: formData.terms,
        privateNotes: formData.privateNotes,
        attachments: formData.attachments || [],
        tds_applicable: !!formData.tds_applicable,
        tds_section: formData.tds_section || '',
        tds_rate: Number(formData.tds_rate) || 0,
        tds_amount: totals.tds_amount || 0,
        amountPaid: Number(formData.amountPaid) || 0,
        paymentDate: formData.paymentDate || null
      };

      if (id) {
        await api.put(`/incomes/${id}`, payload);
      } else {
        await api.post('/incomes', payload);
      }
      
      navigate('/incomes');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to save income');
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f3f6f9] py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        <form onSubmit={handleSave} className="bg-white shadow-sm border border-gray-200 rounded font-sans overflow-hidden">
          
          {/* Header Title */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-[#2d4b6b]">
              {id ? 'Edit Income' : 'Add New Income'}
            </h1>
          </div>

          {/* Top Info Section */}
          <div className={`flex flex-col md:flex-row bg-[#fdfdfd] ${rowBorder}`}>
            {/* Vendor Col */}
            <div className="w-full md:w-1/3 p-6 border-r border-gray-200">
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Vendor name</span>
                <div className="flex-1 min-w-0">
                  <select 
                    data-testid="income-vendor-select"
                    className={`${inputBaseCls} w-full`}
                    value={formData.vendorRef}
                    onChange={e => {
                      const vendor = vendors.find(v => v._id === e.target.value);
                      const billingState = vendor?.billingAddress?.state || vendor?.placeOfSupply || companyTaxProfile.state || '';
                      setFormData(p => ({
                        ...p,
                        vendorRef: e.target.value,
                        vendorName: vendor?.name || p.vendorName,
                        placeOfSupply: billingState
                      }));
                    }}
                  >
                    <option value="">{formData.vendorName && !formData.vendorRef ? `${formData.vendorName} (will be created on save)` : 'Select Vendor'}</option>
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
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Number</span>
                <div className="flex-1 min-w-0 flex gap-2 items-center text-gray-500 font-bold">
                  <input 
                    type="text" 
                    className="w-24 border border-gray-200 rounded text-sm px-3 py-2 text-gray-900 text-center uppercase focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans bg-[#f8f9fa] shadow-sm font-normal" 
                    value={formData.incomeNumberPrefix.replace(/-$/, '')} 
                    onChange={e => setFormData(p => ({ ...p, incomeNumberPrefix: e.target.value }))}
                  />
                  -
                  <input 
                    type="text" 
                    data-testid="income-number-suffix"
                    className="w-full min-w-0 flex-1 border border-gray-200 rounded text-sm px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans bg-[#f8f9fa] shadow-sm font-normal" 
                    value={formData.incomeNumberSuffix}
                    onChange={e => setFormData(p => ({ ...p, incomeNumberSuffix: e.target.value }))}
                    placeholder="e.g. 4567"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Payment method</span>
                <div className="flex-1 min-w-0">
                  <select 
                  data-testid="income-payment-method"
                    className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
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

              {/* Date */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Date</span>
                  <div className="relative flex-1 min-w-0">
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

              {/* Payment Date */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                  <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Payment date</span>
                  <div className="relative flex-1 min-w-0">
                    <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input 
                      type="date" 
                      className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`} 
                      style={{ WebkitAppearance: 'none' }}
                      value={formData.paymentDate || ''}
                      onChange={e => setFormData(p => ({ ...p, paymentDate: e.target.value }))}
                    />
                  </div>
              </div>

              {/* Client Reference */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Client</span>
                <div className="flex-1 min-w-0">
                  <select 
                    data-testid="income-client-select"
                    className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
                    value={formData.clientRef}
                    onChange={e => {
                      const client = clients.find(c => c._id === e.target.value);
                      const billingState = client?.billingAddress?.state || client?.placeOfSupply || companyTaxProfile.state || '';
                      setFormData(p => ({
                        ...p,
                        clientRef: e.target.value,
                        clientName: client?.name || p.clientName,
                        placeOfSupply: billingState
                      }));
                    }}
                  >
                    <option value="">{formData.clientName && !formData.clientRef ? `${formData.clientName} (will be created on save)` : 'Reference client'}</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {!formData.clientRef && formData.clientName && (
                    <p className="mt-1 text-xs text-amber-600">Scanned: {formData.clientName}</p>
                  )}
                </div>
              </div>

              {/* Place of Supply */}
              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Place of Supply</span>
                <div className="flex-1 min-w-0">
                  <select 
                    data-testid="income-place-of-supply"
                    className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
                    value={formData.placeOfSupply}
                    onChange={e => setFormData(p => ({ ...p, placeOfSupply: e.target.value }))}
                  >
                    <option value="">Select State</option>
                    {Object.values(gstStateMap).map(stateName => (
                      <option key={stateName} value={stateName}>{stateName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Category</span>
                <div className="flex-1 min-w-0">
                  <select
                  className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
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
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Business Unit</span>
                <div className="flex-1 min-w-0">
                  <select
                    className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
                    value={formData.businessUnit}
                    onChange={e => setFormData(p => ({ ...p, businessUnit: e.target.value }))}
                  >
                    <option value="">Select Business Unit</option>
                    {businessUnits.map(bu => (
                      <option key={bu._id} value={bu._id}>{bu.name} ({bu.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
                <span className={`${labelCls} !mb-0 w-[110px] shrink-0`}>Sub-category</span>
                <div className="flex-1 min-w-0">
                  <select
                  className={`${inputBaseCls} bg-[#f8f9fa] shadow-sm w-full`}
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

            </div>
          </div>

          {/* Section Sub-header */}
          <div className="bg-white px-6 py-3 font-bold text-sm text-[#2d4b6b] border-b border-gray-200 pt-6">
            Income
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
                    data-testid={`income-item-select-${idx}`}
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
                    data-testid={`income-item-name-${idx}`}
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
                    data-testid={`income-item-qty-${idx}`}
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
                    data-testid={`income-item-rate-${idx}`}
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
                    <option value="0">Select GST</option>
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
            {/* Left Side: Reverse Charge & TDS */}
            <div className="p-6 md:w-1/2 flex flex-col gap-6 border-r border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-500 cursor-pointer"
                  checked={!!formData.reverseCharge}
                  onChange={(e) => setFormData(p => ({...p, reverseCharge: e.target.checked}))}
                />
                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                  Subject to reverse charge
                </span>
              </label>

              {/* TDS Checklist UI */}
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group mb-4">
                  <input 
                    type="checkbox" 
                    data-testid="apply-tds"
                    className="w-5 h-5 rounded border-gray-300 text-[#5c8bc1] focus:ring-[#5c8bc1] cursor-pointer"
                    checked={!!formData.tds_applicable}
                    onChange={(e) => {
                      const active = e.target.checked;
                      setFormData(p => ({
                        ...p,
                        tds_applicable: active,
                        tds_section: active ? '194J' : '',
                        tds_rate: active ? 10 : 0
                      }));
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-800 transition-colors">
                    Apply TDS Receivable
                  </span>
                </label>

                {formData.tds_applicable && (
                  <div className="grid grid-cols-2 gap-4 bg-[#f8f9fa] p-4 rounded border border-gray-200 animate-fade-in">
                    <div>
                      <span className={labelCls}>TDS Section</span>
                      <select
                        className={inputBaseCls}
                        value={formData.tds_section}
                        onChange={(e) => {
                          const sec = e.target.value;
                          let rate = 10;
                          if (sec === '194C') {
                            rate = 2; // Default to 2% for contractor (company/firm)
                          } else if (sec === 'Manual') {
                            rate = 0;
                          }
                          setFormData(p => ({ ...p, tds_section: sec, tds_rate: rate }));
                        }}
                      >
                        <option value="194J">194J - Professional/Technical (10%)</option>
                        <option value="194C">194C - Contractor (2%)</option>
                        <option value="194I">194I - Rent (10%)</option>
                        <option value="194A">194A - Interest (10%)</option>
                        <option value="Manual">Manual (Custom Rate)</option>
                      </select>
                    </div>
                    <div>
                      <span className={labelCls}>TDS Rate (%)</span>
                      <input
                        type="number"
                        className={inputBaseCls}
                        value={formData.tds_rate}
                        readOnly={formData.tds_section !== 'Manual'}
                        onChange={(e) => {
                          if (formData.tds_section === 'Manual') {
                            setFormData(p => ({ ...p, tds_rate: parseFloat(e.target.value) || 0 }));
                          }
                        }}
                        step="0.01"
                        min="0"
                        max="100"
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
                   <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded-lg p-2.5 font-medium flex flex-col gap-0.5 mb-2 leading-relaxed animate-fade-in">
                     <span className="font-bold flex items-center gap-1 text-[11px] text-amber-900">⚠️ Reverse Charge Active</span>
                     <span className="text-gray-600">GST is calculated but not added to the payable Total. The customer is liable to pay GST directly to the government.</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center px-4">
                   <span className="text-sm font-semibold text-gray-500">Subtotal:</span>
                   <span className="text-sm font-semibold text-gray-800">₹ {totals.subTotal.toFixed(2)}</span>
                 </div>
                 {totals.taxTotal > 0 && (
                   <>
                     {totals.isInterState ? (
                       <div className="flex justify-between items-center px-4">
                         <span className="text-sm text-gray-500">IGST:</span>
                         <span className="text-sm text-gray-800">₹ {totals.totalIGST.toFixed(2)}</span>
                       </div>
                     ) : (
                       <>
                         <div className="flex justify-between items-center px-4">
                           <span className="text-sm text-gray-500">CGST:</span>
                           <span className="text-sm text-gray-800">₹ {totals.totalCGST.toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between items-center px-4">
                           <span className="text-sm text-gray-500">SGST:</span>
                           <span className="text-sm text-gray-800">₹ {totals.totalSGST.toFixed(2)}</span>
                         </div>
                       </>
                     )}
                   </>
                 )}
                 <div className="flex justify-between items-center px-4 pt-2 border-t border-gray-100">
                   <span className="text-sm font-bold text-[#2d4b6b]">Income Total:</span>
                   <span className="text-sm font-bold text-[#2d4b6b]">₹ {totals.grandTotal.toFixed(2)}</span>
                 </div>
                 {formData.tds_applicable && (
                   <div className="flex justify-between items-center px-4 text-red-600">
                     <span className="text-sm font-semibold">TDS Receivable ({formData.tds_section}):</span>
                     <span className="text-sm font-semibold">- ₹ {totals.tds_amount.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="bg-[#f2f9f5] flex justify-between items-center px-4 py-3 rounded border border-[#e1eee6]">
                   <span className="text-sm font-bold text-[#28a745]">You will receive:</span>
                   <span className="text-sm font-bold text-[#28a745]">₹ {totals.netReceived.toFixed(2)}</span>
                 </div>
                 
                 {/* Amount Paid input */}
                 <div className="flex justify-between items-center px-4 pt-2">
                   <span className="text-sm font-semibold text-gray-500">Amount Paid:</span>
                   <div className="relative w-36">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                     <input 
                       type="number"
                       data-testid="amount-paid"
                       className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                       value={formData.amountPaid}
                       onChange={e => setFormData(p => ({ ...p, amountPaid: parseFloat(e.target.value) || 0 }))}
                       min="0"
                       step="0.01"
                     />
                   </div>
                 </div>

                 <div className="flex justify-between items-center px-4 pt-2 border-t border-gray-200">
                   <span className="text-sm font-bold text-[#2d4b6b]">Balance Due:</span>
                   <span className="text-sm font-bold text-[#2d4b6b]">₹ {totals.balanceDue.toFixed(2)}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="p-6 border-t border-gray-200">
            <AttachmentUploader
              attachments={formData.attachments || []}
              onChange={(atts) => setFormData(p => ({ ...p, attachments: atts }))}
              entityId={id}
              entityType="incomes"
            />
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
               data-testid="save-income"
               className="bg-[#48c774] hover:bg-[#3db263] text-white px-6 py-2.5 rounded font-bold text-sm tracking-wide shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
             >
               <FaCheck size={14} /> Save
             </button>
             <button 
               type="button" 
               onClick={() => navigate('/incomes')}
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

export default IncomeForm;
