import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaTrash, FaPlus, FaUpload } from 'react-icons/fa';
import Modal from '../components/Modal';
import ClientForm from './ClientForm';
import ItemForm from './ItemForm';
import Skeleton from '../components/Skeleton';
import CsvUploader from '../components/CsvUploader';

// docType: 'quote' | 'proforma'
const QuoteForm = ({ docType = 'quote' }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isProforma = docType === 'proforma';

  const apiBase = isProforma ? '/proformas' : '/quotes';
  const listPath = isProforma ? '/proformas' : '/quotes';
  const docLabel = isProforma ? 'Proforma Invoice' : 'Quotation';
  const docNoLabel = isProforma ? 'Proforma no' : 'Quotation no';

  const STATUSES = isProforma
    ? ['DRAFT', 'SENT', 'CONFIRMED']
    : ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

  const [clients, setClients] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [pendingItemIndex, setPendingItemIndex] = useState(null);
  const [clientPending, setClientPending] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState('');

  // Optional add-ons
  const [showShipping, setShowShipping] = useState(false);
  const [showDiscountTotal, setShowDiscountTotal] = useState(false);
  const [showDiscountToAll, setShowDiscountToAll] = useState(false);
  const [discountToAll, setDiscountToAll] = useState('');
  const [showCustomAmount, setShowCustomAmount] = useState(false);

  const emptyItem = () => ({
    name: '', description: '', hsnCode: '', unit: 'pcs',
    qty: 1, rate: 0, discount: 0, taxRate: 0, taxSelect: '0', customTaxRate: '', amount: 0,
  });

  const [formData, setFormData] = useState({
    invoiceType: 'Tax Invoice',
    clientRef: '',
    docNo: '',
    docNoSuffix: '',
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: '',
    status: 'DRAFT',
    placeOfSupply: '',
    items: [emptyItem()],
    shippingCharges: 0,
    packagingCharges: 0,
    customChargeLabel: 'Custom Amount',
    customChargeAmount: 0,
    discountTotal: 0,
    notes: '',
    terms: '',
  });

  const hasTax = ['Tax Invoice', 'Excise Invoice'].includes(formData.invoiceType);

  useEffect(() => {
    fetchDependencies();
    if (id) fetchDoc(id);
  }, [id]);

  const fetchDependencies = async () => {
    try {
      const [cr, ir] = await Promise.all([api.get('/clients'), api.get('/items')]);
      setClients(cr.data);
      setItemsList(ir.data);
    } catch (e) { console.error(e); }
  };

  const fetchDoc = async (docId) => {
    try {
      const res = await api.get(`${apiBase}/${docId}`);
      const d = res.data;
      setFormData({
        invoiceType: d.invoiceType || 'Tax Invoice',
        clientRef: d.client?.clientRef || '',
        docNo: '', docNoSuffix: '',
        poNumber: d.transport?.poNumber || '',
        date: d.date ? d.date.split('T')[0] : '',
        validUntil: d.validUntil ? d.validUntil.split('T')[0] : '',
        status: d.status || 'DRAFT',
        placeOfSupply: d.placeOfSupply || '',
        items: d.items?.length ? d.items.map(it => ({
          name: it.name, description: it.description || '',
          hsnCode: it.hsnCode || '', unit: it.unit || 'pcs',
          qty: it.qty, rate: it.rate, discount: it.discount || 0,
          taxRate: it.taxRate || 0,
          taxSelect: [0,5,12,18,28].includes(it.taxRate) ? String(it.taxRate) : (it.taxRate > 0 ? 'custom' : '0'),
          customTaxRate: [0,5,12,18,28].includes(it.taxRate) ? '' : String(it.taxRate || ''),
          amount: it.amount,
        })) : [emptyItem()],
        shippingCharges: d.shippingCharges || 0,
        packagingCharges: d.packagingCharges || 0,
        customChargeLabel: d.customChargeLabel || 'Custom Amount',
        customChargeAmount: 0,
        discountTotal: d.discountTotal || 0,
        notes: d.notes || '',
        terms: d.terms || '',
      });
      if (d.shippingCharges > 0) setShowShipping(true);
      if (d.discountTotal > 0) setShowDiscountTotal(true);
    } catch (e) { console.error(e); }
  };

  // ── Row calc ─────────────────────────────────────────────────────────────────
  const calcRow = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const taxable = qty * rate * (1 - disc / 100);
    const tax = hasTax ? taxable * (taxRate / 100) : 0;
    return parseFloat((taxable + tax).toFixed(2));
  };

  const updateItem = (idx, field, value) => {
    const items = [...formData.items];
    items[idx] = { ...items[idx], [field]: value };
    items[idx].amount = calcRow(items[idx]);
    setFormData(f => ({ ...f, items }));
  };

  const addItem = () => setFormData(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const selectItem = (idx, itemId) => {
    const found = itemsList.find(i => i._id === itemId);
    if (!found) return;
    const items = [...formData.items];
    items[idx] = {
      ...items[idx], name: found.name, description: found.description || '',
      hsnCode: found.hsnCode || '', unit: found.unit || 'pcs',
      rate: found.price || 0, taxRate: found.taxRate || 0,
    };
    items[idx].amount = calcRow(items[idx]);
    setFormData(f => ({ ...f, items }));
  };

  // CSV Bulk Upload handler
  const handleCsvParsed = (data) => {
    let currentItems = [...formData.items];
    if (currentItems.length === 1 && !currentItems[0].name) {
      currentItems = []; // Clear the empty default row if it's unused
    }
    
    const parsedItems = data.map(row => {
      const it = emptyItem();
      it.name = row.Name || row.name || row.Item || row.item || 'Unnamed Item';
      it.description = row.Description || row.description || row.Desc || row.desc || '';
      it.hsnCode = row.HSNCode || row.hsnCode || row.HSN || row.hsn || '';
      it.unit = row.Unit || row.unit || 'pcs';
      it.qty = Number(row.QTY || row.Qty || row.qty || row.Quantity || row.quantity) || 1;
      it.rate = Number(row.Price || row.price || row.Rate || row.rate) || 0;
      it.discount = Number(row.Discount || row.discount || row.Disc || row.disc) || 0;
      
      const taxParam = Number(row.TaxRate || row.taxRate || row.Tax || row.tax) || 0;
      it.taxRate = taxParam;
      it.taxSelect = [0,5,12,18,28].includes(taxParam) ? String(taxParam) : (taxParam > 0 ? 'custom' : '0');
      it.customTaxRate = [0,5,12,18,28].includes(taxParam) ? '' : String(taxParam || '');
      
      it.amount = calcRow(it);
      return it;
    });

    setFormData(f => ({ ...f, items: [...currentItems, ...parsedItems] }));
    setIsCsvModalOpen(false);
  };

  // Apply discount to all items
  const applyDiscountToAll = () => {
    const pct = Number(discountToAll) || 0;
    const items = formData.items.map(it => {
      const updated = { ...it, discount: pct };
      updated.amount = calcRow(updated);
      return updated;
    });
    setFormData(f => ({ ...f, items }));
  };

  // ── Totals ───────────────────────────────────────────────────────────────────
  const subTotal = formData.items.reduce((s, it) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const disc = Number(it.discount) || 0;
    return s + qty * rate * (1 - disc / 100);
  }, 0);

  const taxTotal = hasTax ? formData.items.reduce((s, it) => {
    const qty = Number(it.qty) || 0;
    const rate = Number(it.rate) || 0;
    const disc = Number(it.discount) || 0;
    const taxable = qty * rate * (1 - disc / 100);
    return s + taxable * ((Number(it.taxRate) || 0) / 100);
  }, 0) : 0;

  const grandTotal = subTotal + taxTotal
    + (showShipping ? Number(formData.shippingCharges) || 0 : 0)
    + (showCustomAmount ? Number(formData.customChargeAmount) || 0 : 0)
    - (showDiscountTotal ? Number(formData.discountTotal) || 0 : 0);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    if (!formData.clientRef) return alert('Please select a client');
    if (!formData.items.length || !formData.items[0].name) return alert('Add at least one item');

    setLoading(true);
    try {
      const payload = {
        ...formData,
        status: saveAsDraft ? 'DRAFT' : formData.status,
        items: formData.items.map(it => ({ ...it, amount: calcRow(it) })),
        shippingCharges: showShipping ? Number(formData.shippingCharges) : 0,
        discountTotal: showDiscountTotal ? Number(formData.discountTotal) : 0,
        customChargeAmount: showCustomAmount ? Number(formData.customChargeAmount) : 0,
      };
      let savedId = id;
      if (id) {
        await api.put(`${apiBase}/${id}`, payload);
      } else {
        const res = await api.post(apiBase, payload);
        savedId = res.data._id;
      }
      if (!saveAsDraft) {
        navigate(`${listPath}/${savedId}/print`);
      } else {
        navigate(listPath);
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Save failed';
      if (e.response?.status === 403) {
        setPremiumMessage(msg);
        setShowPremiumModal(true);
      } else {
        alert(msg);
      }
    } finally { setLoading(false); }
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const inp = 'border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white w-full';
  const th = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 bg-gray-100 border-b border-gray-200 whitespace-nowrap';
  
  if (loading && id) {
      return (
        <div className="min-h-screen bg-white font-sans text-gray-800">
            <div className="px-6 pt-5 pb-3 border-b border-gray-200"><Skeleton width="200px" height="28px" /></div>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <div className="flex items-center gap-2">
                          <Skeleton width="100px" height="20px" />
                          <Skeleton width="220px" height="36px" className="flex-1" />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <div className="flex items-center gap-3">
                          <Skeleton width="100px" height="20px" />
                          <Skeleton width="80px" height="36px" />
                          <Skeleton width="60px" height="36px" />
                          <Skeleton width="100px" height="20px" />
                          <Skeleton width="120px" height="36px" className="flex-1" />
                      </div>
                      <div className="flex items-center gap-3">
                           <Skeleton width="140px" height="36px" />
                           <Skeleton width="120px" height="36px" />
                           <Skeleton width="100px" height="20px" />
                           <Skeleton width="120px" height="36px" className="flex-1" />
                      </div>
                  </div>
               </div>
            </div>
            <div className="px-6 py-4">
                <Skeleton width="150px" height="24px" className="mb-3" />
                <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="bg-gray-100 p-3 flex gap-2">
                        {[...Array(9)].map((_,i) => <Skeleton key={i} width="80px" height="20px" />)}
                    </div>
                    <div className="p-3 space-y-3">
                        {[...Array(3)].map((_,i) => (
                             <div key={i} className="flex gap-2">
                                {[...Array(9)].map((_,j) => <Skeleton key={j} width="80px" height="36px" />)}
                             </div>
                        ))}
                    </div>
                </div>
            </div>
             <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 pt-2">
                    <Skeleton width="200px" height="24px" />
                    <Skeleton width="200px" height="24px" />
                    <Skeleton width="200px" height="24px" />
                </div>
                 <div className="flex flex-col items-end justify-start pt-2 space-y-2">
                      <Skeleton width="250px" height="24px" />
                      <Skeleton width="250px" height="24px" />
                      <Skeleton width="250px" height="32px" className="mt-2" />
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <form onSubmit={handleSubmit}>

        {/* ── Page Title ── */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">
            {id ? `Edit ${docLabel}` : `Add New ${docLabel}`}
          </h1>
        </div>

        {/* ── Top Section: Client + Doc Info ── */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left: Client */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-28 flex-shrink-0">Client name</label>
                <div className="flex gap-2 flex-1">
                  <select value={formData.clientRef}
                    onChange={e => {
                      setFormData(f => ({ ...f, clientRef: e.target.value }));
                      // Show pending if client has outstanding
                      const c = clients.find(c => c._id === e.target.value);
                      setClientPending(c?.pendingAmount || null);
                    }}
                    className={inp} required>
                    <option value="">— Select —</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsClientModalOpen(true)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 whitespace-nowrap">
                    + New
                  </button>
                </div>
              </div>
              {clientPending > 0 && (
                <div className="ml-28 text-sm font-semibold text-red-600">
                  Pending Amount Due: ₹ {Number(clientPending).toFixed(2)}
                </div>
              )}
            </div>

            {/* Right: Doc No + Date + PO + Valid Until */}
            <div className="space-y-2">
              {/* Row 1: Doc No + Date */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-28 flex-shrink-0">{docNoLabel}</label>
                <input type="text" placeholder="123" value={formData.docNo}
                  onChange={e => setFormData(f => ({ ...f, docNo: e.target.value }))}
                  className={`${inp} w-20`} />
                <input type="text" placeholder="2" value={formData.docNoSuffix}
                  onChange={e => setFormData(f => ({ ...f, docNoSuffix: e.target.value }))}
                  className={`${inp} w-16`} />
                <label className="text-sm text-gray-600 w-28 flex-shrink-0 text-right">{docLabel} date</label>
                <input type="date" value={formData.date}
                  onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                  className={`${inp} flex-1`} required />
              </div>
              {/* Row 2: PO Number + Valid Until */}
              <div className="flex items-center gap-3">
                <select className={`${inp} w-36`} defaultValue="PO Number">
                  <option>PO Number</option>
                  <option>Reference No</option>
                </select>
                <input type="text" value={formData.poNumber}
                  onChange={e => setFormData(f => ({ ...f, poNumber: e.target.value }))}
                  className={`${inp} w-32`} placeholder="" />
                <label className="text-sm text-gray-600 w-24 flex-shrink-0 text-right">Valid until</label>
                <input type="date" value={formData.validUntil}
                  onChange={e => setFormData(f => ({ ...f, validUntil: e.target.value }))}
                  className={`${inp} flex-1`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Items Section ── */}
        <div className="px-6 py-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{docLabel}</h2>

          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={`${th} w-8`}>No</th>
                  <th className={`${th} w-40`}>Inventory Name</th>
                  <th className={th}>Description</th>
                  <th className={`${th} w-20`}>Unit</th>
                  <th className={`${th} w-16`}>QTY</th>
                  <th className={`${th} w-24`}>Price</th>
                  <th className={`${th} w-24`}>Discount (%)</th>
                  {hasTax && <th className={`${th} w-28`}>Tax</th>}
                  <th className={`${th} w-24 text-right`}>Total</th>
                  <th className={`${th} w-10`}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {formData.items.map((item, idx) => (
                  <tr key={idx} className="bg-white hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-sm text-gray-400 align-top pt-3">{idx + 1}</td>
                    <td className="px-2 py-2 align-top">
                      <select className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full mb-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        onChange={e => {
                            if (e.target.value === '_CREATE_NEW_') {
                                setPendingItemIndex(idx);
                                setIsItemModalOpen(true);
                            } else {
                                selectItem(idx, e.target.value);
                            }
                        }} 
                        value={item._id || ""}>
                        <option value="">Select Inventory</option>
                        {itemsList.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                        <option value="_CREATE_NEW_" className="font-bold text-blue-600">+ Create New Item</option>
                      </select>
                      <input placeholder="Inventory name" value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" required />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <textarea rows={2} placeholder="Description" value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <div className="text-xs text-gray-400 mt-0.5">
                        {1000 - (item.description?.length || 0)} characters left
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input type="number" min="0" value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input type="number" min="0" placeholder="Price" value={item.rate || ''}
                        onChange={e => updateItem(idx, 'rate', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input type="number" min="0" max="100" placeholder="Disc. %" value={item.discount || ''}
                        onChange={e => updateItem(idx, 'discount', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    {hasTax && (
                      <td className="px-2 py-2 align-top">
                        <select
                          value={item.taxSelect ?? String(item.taxRate)}
                          onChange={e => {
                            const val = e.target.value;
                            const items = [...formData.items];
                            items[idx] = {
                              ...items[idx],
                              taxSelect: val,
                              taxRate: val === 'custom' ? (Number(items[idx].customTaxRate) || 0) : Number(val),
                            };
                            items[idx].amount = calcRow(items[idx]);
                            setFormData(f => ({ ...f, items }));
                          }}
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="">Select Tax</option>
                          {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>GST {r}%</option>)}
                          <option value="custom">Custom %</option>
                        </select>
                        {item.taxSelect === 'custom' && (
                          <input
                            type="number" min="0" max="100" placeholder="Rate %"
                            value={item.customTaxRate ?? ''}
                            onChange={e => {
                              const items = [...formData.items];
                              items[idx] = {
                                ...items[idx],
                                customTaxRate: e.target.value,
                                taxRate: Number(e.target.value) || 0,
                              };
                              items[idx].amount = calcRow(items[idx]);
                              setFormData(f => ({ ...f, items }));
                            }}
                            className="mt-1 border border-blue-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800 align-top pt-3">
                      ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 align-top pt-3">
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <FaTrash size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add line / Bulk Add buttons */}
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={() => setIsCsvModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors">
              <FaUpload size={14} /> Bulk Add CSV
            </button>
            <button type="button" onClick={addItem}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors">
              <FaPlus size={14} /> Add line
            </button>
          </div>
        </div>

        {/* ── Add-ons + Totals ── */}
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: Checkboxes */}
          <div className="space-y-3 pt-2">
            {/* Shipping */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-800">
              <input type="checkbox" checked={showShipping} onChange={e => setShowShipping(e.target.checked)}
                className="rounded border-gray-300 text-blue-600" />
              Add shipping charges
            </label>
            {showShipping && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-sm text-gray-600">₹</span>
                <input type="number" min="0" value={formData.shippingCharges}
                  onChange={e => setFormData(f => ({ ...f, shippingCharges: e.target.value }))}
                  className="border border-gray-300 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            )}

            {/* Discount on Total */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-800">
              <input type="checkbox" checked={showDiscountTotal} onChange={e => setShowDiscountTotal(e.target.checked)}
                className="rounded border-gray-300 text-blue-600" />
              Add Discount On Total
            </label>
            {showDiscountTotal && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-sm text-gray-600">₹</span>
                <input type="number" min="0" value={formData.discountTotal}
                  onChange={e => setFormData(f => ({ ...f, discountTotal: e.target.value }))}
                  className="border border-gray-300 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            )}

            {/* Discount to all */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-800">
              <input type="checkbox" checked={showDiscountToAll} onChange={e => setShowDiscountToAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600" />
              Add discount to all
            </label>
            {showDiscountToAll && (
              <div className="ml-6 flex items-center gap-2">
                <input type="number" min="0" max="100" placeholder="%" value={discountToAll}
                  onChange={e => setDiscountToAll(e.target.value)}
                  className="border border-gray-300 rounded px-2.5 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button type="button" onClick={applyDiscountToAll}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm rounded border border-gray-300 transition-colors">
                  Apply
                </button>
              </div>
            )}

            {/* Custom Amount */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-800">
              <input type="checkbox" checked={showCustomAmount} onChange={e => setShowCustomAmount(e.target.checked)}
                className="rounded border-gray-300 text-blue-600" />
              Add Custom Amount
            </label>
            {showCustomAmount && (
              <div className="ml-6 flex items-center gap-2">
                <input type="text" placeholder="Label" value={formData.customChargeLabel}
                  onChange={e => setFormData(f => ({ ...f, customChargeLabel: e.target.value }))}
                  className="border border-gray-300 rounded px-2.5 py-1.5 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <span className="text-sm text-gray-600">₹</span>
                <input type="number" min="0" value={formData.customChargeAmount}
                  onChange={e => setFormData(f => ({ ...f, customChargeAmount: e.target.value }))}
                  className="border border-gray-300 rounded px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            )}
          </div>

          {/* Right: Totals */}
          <div className="flex flex-col items-end justify-start pt-2 space-y-1">
            <div className="w-full max-w-xs">
              <div className="flex justify-between py-2 border-b border-gray-200 text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>₹ {subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {hasTax && taxTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm text-gray-600">
                  <span>Tax:</span>
                  <span>₹ {taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {showShipping && Number(formData.shippingCharges) > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm text-gray-600">
                  <span>Shipping:</span>
                  <span>₹ {Number(formData.shippingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {showDiscountTotal && Number(formData.discountTotal) > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm text-red-600">
                  <span>Discount:</span>
                  <span>- ₹ {Number(formData.discountTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between py-2.5 text-sm font-bold text-green-700 bg-green-50 px-2 rounded mt-1">
                <span>Total:</span>
                <span>₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Terms & Notes ── */}
        <div className="px-6 py-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Terms &amp; Conditions</label>
            <textarea rows={4} value={formData.terms}
              onChange={e => setFormData(f => ({ ...f, terms: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Private notes <span className="text-gray-400 font-normal">(not shown to client)</span>
            </label>
            <textarea rows={4} value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
        </div>

        {/* ── Footer Buttons ── */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-60">
            ✓ Preview &amp; save
          </button>
          <button type="button" disabled={loading}
            onClick={e => handleSubmit(e, true)}
            className="px-5 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60">
            Save as draft
          </button>
          <button type="button" onClick={() => navigate(listPath)}
            className="px-5 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
        </div>

      </form>

      {/* New Client Modal */}
      <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Add New Client">
        <ClientForm isModal onSuccess={(newClient) => {
          setClients(prev => [...prev, newClient]);
          setFormData(f => ({ ...f, clientRef: newClient._id }));
          setIsClientModalOpen(false);
        }} />
      </Modal>
      {/* New Item Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Add New Item">
        <ItemForm isModal onSuccess={(newItem) => {
            setItemsList(prev => [...prev, newItem]);
             if (pendingItemIndex !== null) {
                selectItem(pendingItemIndex, newItem._id);
            }
            setIsItemModalOpen(false);
            setPendingItemIndex(null);
        }} />
      </Modal>

      {/* Bulk Upload CSV Modal */}
      <Modal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} title="Bulk Import Items from CSV">
        <CsvUploader 
          onDataParsed={handleCsvParsed} 
          title="Upload Line Items"
          subtitle="Ensure columns like Name, Qty, Rate, Tax are present."
        />
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={() => setIsCsvModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg">Cancel</button>
        </div>
      </Modal>

      {/* Premium Feature Modal */}
      <Modal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} title="Premium Feature limit reached">
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upgrade to Pro</h3>
          <p className="text-gray-500 mb-6">
            {premiumMessage || "You've reached a limit on the free plan. Upgrade to Pro to unlock unlimited documents and edits."}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowPremiumModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Maybe Later
            </button>
            <button onClick={() => navigate('/subscription')} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 rounded-xl shadow-lg shadow-yellow-500/30 transition-all flex items-center gap-2">
              Upgrade Now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuoteForm;
