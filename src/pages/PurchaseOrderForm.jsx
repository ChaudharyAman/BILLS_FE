import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { FaTrash, FaPlus, FaUpload, FaBoxOpen } from 'react-icons/fa';
import Modal from '../components/Modal';
import VendorForm from './VendorForm';
import ItemForm from './ItemForm';
import Skeleton from '../components/Skeleton';
import CsvUploader from '../components/CsvUploader';
import ItemSelect from '../components/ItemSelect';

const parseDocumentNumberParts = (value, prefix) => {
  const raw = String(value || '').trim();
  if (!raw) return { docNo: '', docNoSuffix: '' };

  const normalizedPrefix = String(prefix || '').trim().replace(/[-/\s]+$/g, '');
  const withoutPrefix = normalizedPrefix && raw.startsWith(`${normalizedPrefix}-`)
    ? raw.slice(normalizedPrefix.length + 1)
    : raw;

  const parts = withoutPrefix.split('-');
  if (parts.length === 1) {
    return { docNo: parts[0], docNoSuffix: '' };
  }

  return {
    docNo: parts[0],
    docNoSuffix: parts.slice(1).join('-'),
  };
};

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const clampPercentInput = (value) => {
  if (value === '') return '';
  return String(clampPercent(value));
};

const normalizeCatalogName = (value = '') => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase();

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const apiBase = '/purchase-orders';
  const listPath = '/purchase-orders';
  const docLabel = 'Purchase Order';
  const docNoLabel = 'Purchase Order no';

  const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'RECEIVED', 'REJECTED', 'BILLED', 'CANCELLED'];

  const [vendors, setVendors] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [pendingItemIndex, setPendingItemIndex] = useState(null);
  const [vendorPending, setVendorPending] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState('');
  const [currentStatus, setCurrentStatus] = useState('DRAFT');
  const [receivingOrder, setReceivingOrder] = useState(false);
  const [pendingPdfVendorName, setPendingPdfVendorName] = useState('');

  // Optional add-ons
  const [showShipping, setShowShipping] = useState(false);
  const [showDiscountTotal, setShowDiscountTotal] = useState(false);
  const [showDiscountToAll, setShowDiscountToAll] = useState(false);
  const [discountToAll, setDiscountToAll] = useState('');
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [prefixes, setPrefixes] = useState({ purchaseOrder: 'PO' });
  const [catalogReady, setCatalogReady] = useState(false);
  const [isSyncingPdfItems, setIsSyncingPdfItems] = useState(false);

  const emptyItem = () => ({
    name: '', description: '', hsnCode: '', unit: 'pcs',
    qty: 1, rate: 0, discount: 0, taxRate: 0, taxSelect: '0', customTaxRate: '', amount: 0,
  });

  const [formData, setFormData] = useState({
    invoiceType: 'Tax Invoice',
    vendorRef: '',
    vendorName: '',
    vendorGST: '',
    vendorAddressObject: null,
    vendorPhone: '',
    vendorEmail: '',
    vendorPAN: '',
    importSource: '',
    docNo: '',
    docNoSuffix: '',
    poNumber: '',
    refNumber: '',
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
    privateNotes: '',
    terms: '',
  });

  const hasTax = ['Tax Invoice', 'Excise Invoice'].includes(formData.invoiceType);

  useEffect(() => {
    const load = async () => {
      const loadedPrefixes = await fetchDependencies();
      if (id) await fetchDoc(id, loadedPrefixes);
    };
    load();
  }, [id]);

  useEffect(() => {
    const source = new URLSearchParams(location.search).get('source');
    if (source !== 'pdf' || id) return;

    try {
      const raw = sessionStorage.getItem('purchaseOrderPdfImportData');
      if (!raw) return;

      const pdf = JSON.parse(raw);
      sessionStorage.removeItem('purchaseOrderPdfImportData');

      if (!pdf._fromPdfImport) return;

      setFormData(prev => ({
        ...prev,
        importSource: 'pdf',
        vendorName: pdf.vendorName || prev.vendorName,
        vendorGST: pdf.vendorGST || prev.vendorGST,
        vendorAddressObject: pdf.vendorAddressObject || prev.vendorAddressObject,
        vendorPhone: pdf.vendorPhone || prev.vendorPhone,
        vendorEmail: pdf.vendorEmail || prev.vendorEmail,
        vendorPAN: pdf.vendorPAN || prev.vendorPAN,
        refNumber: pdf.refNumber || pdf.documentNumber || prev.refNumber,
        date: pdf.date || pdf.documentDate || prev.date,
        validUntil: pdf.validUntil || pdf.dueDate || prev.validUntil,
        placeOfSupply: pdf.placeOfSupply || prev.placeOfSupply,
        paymentMode: pdf.paymentMode || prev.paymentMode,
        customChargeLabel: pdf.customChargeLabel || prev.customChargeLabel,
        customChargeAmount: pdf.packagingCharges ?? prev.customChargeAmount,
        items: pdf.items?.length > 0
          ? pdf.items.map(item => ({
              ...emptyItem(),
              name: item.name || '',
              description: item.description || '',
              unit: item.unit || 'pcs',
              qty: item.qty || item.quantity || 1,
              rate: item.rate || item.price || 0,
              taxRate: clampPercent(item.taxRate !== undefined ? item.taxRate : item.gst),
              taxSelect: [0, 5, 12, 18, 28].includes(Number(item.taxRate !== undefined ? item.taxRate : item.gst)) ? String(Number(item.taxRate !== undefined ? item.taxRate : item.gst)) : ((Number(item.taxRate !== undefined ? item.taxRate : item.gst) || 0) > 0 ? 'custom' : '0'),
              customTaxRate: [0, 5, 12, 18, 28].includes(Number(item.taxRate !== undefined ? item.taxRate : item.gst)) ? '' : String(item.taxRate !== undefined ? item.taxRate : item.gst || ''),
            }))
          : prev.items,
      }));

      if (Number(pdf.packagingCharges) !== 0) {
        setShowCustomAmount(true);
      }

      if (pdf.vendorName) {
        setPendingPdfVendorName(pdf.vendorName);
        const match = vendors.find(v => v.name?.toLowerCase().trim() === pdf.vendorName.toLowerCase().trim());
        if (match) {
          setFormData(prev => ({
            ...prev,
            vendorRef: match._id,
            vendorName: match.name,
            vendorGST: match.gstin || '',
            placeOfSupply: prev.placeOfSupply || match.billingAddress?.state || '',
          }));
          setPendingPdfVendorName('');
        }
      }
    } catch (e) {
      console.warn('Failed to load purchase order PDF import data:', e);
    }
  }, [location.search, id, vendors]);

  useEffect(() => {
    if (!pendingPdfVendorName || vendors.length === 0) return;

    const match = vendors.find(v => v.name?.toLowerCase().trim() === pendingPdfVendorName.toLowerCase().trim());
    if (!match) return;

    setFormData(prev => ({
      ...prev,
      vendorRef: prev.vendorRef || match._id,
      vendorName: match.name,
      vendorGST: match.gstin || '',
      placeOfSupply: prev.placeOfSupply || match.billingAddress?.state || '',
    }));
    setPendingPdfVendorName('');
  }, [vendors, pendingPdfVendorName]);

  useEffect(() => {
    if (id || formData.importSource !== 'pdf' || !catalogReady || isSyncingPdfItems) return;

    const missingItems = formData.items.filter(item => !item.itemRef && normalizeCatalogName(item.name));
    if (missingItems.length === 0) return;

    let isCancelled = false;

    const syncPdfItemsToCatalog = async () => {
      setIsSyncingPdfItems(true);

      try {
        const knownItems = new Map(
          itemsList
            .filter(item => normalizeCatalogName(item.name))
            .map(item => [normalizeCatalogName(item.name), item])
        );

        const createdItems = [];

        for (const item of missingItems) {
          const itemKey = normalizeCatalogName(item.name);
          if (!itemKey || knownItems.has(itemKey)) continue;

          const response = await api.post('/items', {
            name: item.name,
            description: item.description || '',
            hsnCode: item.hsnCode || '',
            unit: item.unit || 'pcs',
            rate: Number(item.rate) || 0,
            sellingPrice: Number(item.rate) || 0,
            purchasePrice: Number(item.rate) || 0,
            taxRate: clampPercent(item.taxRate),
            defaultTaxRate: clampPercent(item.taxRate),
          });

          const createdItem = response.data;
          knownItems.set(itemKey, createdItem);
          createdItems.push(createdItem);
        }

        if (isCancelled) return;

        if (createdItems.length > 0) {
          setItemsList(prev => [...createdItems, ...prev]);
        }

        setFormData(prev => ({
          ...prev,
          items: prev.items.map(item => {
            if (item.itemRef) return item;

            const matchedItem = knownItems.get(normalizeCatalogName(item.name));
            if (!matchedItem) return item;

            return {
              ...item,
              itemRef: matchedItem._id,
            };
          }),
        }));
      } catch (e) {
        if (!isCancelled) {
          console.error('Failed to sync PDF purchase order items to catalog:', e);
        }
      } finally {
        if (!isCancelled) {
          setIsSyncingPdfItems(false);
        }
      }
    };

    syncPdfItemsToCatalog();

    return () => {
      isCancelled = true;
    };
  }, [id, formData.items, itemsList, catalogReady, isSyncingPdfItems]);

  const fetchDependencies = async () => {
    try {
      const [vr, ir, sr] = await Promise.all([
        api.get('/vendors?limit=1000'),
        api.get('/items?limit=1000'),
        api.get('/settings'),
      ]);
      setVendors(vr.data.data || []);
      setItemsList(ir.data.data || []);
      const loadedPrefixes = {
        purchaseOrder: sr.data?.purchaseOrderPrefix || 'PO',
      };
      setPrefixes(loadedPrefixes);
      return loadedPrefixes;
    } catch (e) { console.error(e); }
    finally { setCatalogReady(true); }
    return prefixes;
  };

  const fetchDoc = async (docId, prefixMap = prefixes) => {
    try {
      const res = await api.get(`${apiBase}/${docId}`);
      const d = res.data;
      const parsedDocNumber = parseDocumentNumberParts(d.poNumber, prefixMap.purchaseOrder);
      setCurrentStatus(d.status || 'DRAFT');
      setFormData({
        invoiceType: d.invoiceType || 'Tax Invoice',
        vendorRef: d.vendor?.vendorRef || '',
        importSource: '',
        docNo: parsedDocNumber.docNo,
        docNoSuffix: parsedDocNumber.docNoSuffix,
        poNumber: d.transport?.poNumber || '',
        refNumber: d.refNumber || '',
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
        customChargeAmount: d.packagingCharges || 0,
        discountTotal: d.discountTotal || 0,
        notes: d.notes || '',
        privateNotes: d.privateNotes || '',
        terms: d.terms || '',
      });
      if (d.shippingCharges > 0) setShowShipping(true);
      if (d.discountTotal > 0) setShowDiscountTotal(true);
      if (Number(d.packagingCharges) !== 0) setShowCustomAmount(true);
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
    const taxRate = found.salesInfo?.taxRate || found.defaultTaxRate || 0;
    items[idx] = {
      ...items[idx],
      itemRef: found._id,
      name: found.name,
      description: found.description || found.salesInfo?.description || '',
      hsnCode: found.hsnCode || '',
      unit: found.unit || 'pcs',
      rate: found.salesInfo?.price || found.rate || 0,
      taxRate,
      taxSelect: [0,5,12,18,28].includes(taxRate) ? String(taxRate) : (taxRate > 0 ? 'custom' : '0'),
      customTaxRate: [0,5,12,18,28].includes(taxRate) ? '' : String(taxRate || ''),
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
      
      const taxParam = clampPercent(row.TaxRate || row.taxRate || row.Tax || row.tax);
      it.taxRate = taxParam;
      it.taxSelect = [0,5,12,18,28].includes(taxParam) ? String(taxParam) : (taxParam > 0 ? 'custom' : '0');
      it.customTaxRate = [0,5,12,18,28].includes(taxParam) ? '' : String(taxParam || '');
      
      it.amount = calcRow(it);
      return it;
    });

    setFormData(f => ({ ...f, items: [...currentItems, ...parsedItems] }));
    setIsCsvModalOpen(false);
  };

  // Apply discount to all items automatically via onChange now

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
    const canAutoCreatePdfVendor = formData.importSource === 'pdf' && pendingPdfVendorName?.trim();
    if (!formData.vendorRef && !canAutoCreatePdfVendor) return alert('Please select a vendor');
    if (!formData.items.length || !formData.items[0].name) return alert('Add at least one item');

    setLoading(true);
    try {
      const payload = {
        ...formData,
        status: saveAsDraft ? 'DRAFT' : formData.status,
        items: formData.items.map(it => ({ ...it, amount: calcRow(it) })),
        shippingCharges: showShipping ? Number(formData.shippingCharges) : 0,
        discountTotal: showDiscountTotal ? Number(formData.discountTotal) : 0,
        packagingCharges: showCustomAmount ? Number(formData.customChargeAmount) : 0,
        customChargeLabel: showCustomAmount ? formData.customChargeLabel : 'Custom Amount',
        refNumber: formData.refNumber || '',
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

  const handleReceive = async () => {
    if (!window.confirm('Mark this Purchase Order as received?')) return;
    setReceivingOrder(true);
    try {
      await api.post(`${apiBase}/${id}/receive`);
      navigate(`${listPath}/${id}/print`);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to mark as received');
    } finally { setReceivingOrder(false); }
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

            {/* Left: Vendor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-28 flex-shrink-0">Vendor name</label>
                <div className="flex gap-2 flex-1">
                  <select value={formData.vendorRef}
                    data-testid="purchase-order-vendor-select"
                    onChange={e => {
                      const vId = e.target.value;
                      const matchedVendor = vendors.find(v => v._id === vId);
                      setFormData(f => ({ ...f, vendorRef: vId, vendorName: matchedVendor ? matchedVendor.name : '', vendorGST: matchedVendor ? matchedVendor.gstin : '' }));
                      // Show pending if vendor has outstanding
                      const v = vendors.find(v => v._id === e.target.value);
                      setVendorPending(v?.pendingAmount || null);
                    }}
                    className={inp} required={!(formData.importSource === 'pdf' && pendingPdfVendorName)}>
                    <option value="">
                      {pendingPdfVendorName ? `${pendingPdfVendorName} (will be created on save)` : '— Select Vendor —'}
                    </option>
                    {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsVendorModalOpen(true)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 whitespace-nowrap">
                    + New
                  </button>
                </div>
              </div>
              {vendorPending > 0 && (
                <div className="ml-28 text-sm font-semibold text-red-600">
                  Pending Amount Due: ₹ {Number(vendorPending).toFixed(2)}
                </div>
              )}
            </div>

            {/* Right: Doc No + Date + PO + Valid Until */}
            <div className="space-y-2">
              {/* Row 1: Doc No + Date */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-28 flex-shrink-0">{docNoLabel}</label>
                <input type="text" placeholder="123" value={formData.docNo}
                  data-testid="purchase-order-doc-number"
                  onChange={e => setFormData(f => ({ ...f, docNo: e.target.value }))}
                  className={`${inp} w-20`} />
                <input type="text" placeholder="2" value={formData.docNoSuffix}
                  onChange={e => setFormData(f => ({ ...f, docNoSuffix: e.target.value }))}
                  className={`${inp} w-16`} />
                <label className="text-sm text-gray-600 w-28 flex-shrink-0 text-right">PO date</label>
                <input type="date" value={formData.date}
                  onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                  className={`${inp} flex-1`} required />
              </div>
              {/* Row 2: PO Number + Valid Until */}
              <div className="flex items-center gap-3">
                <select className={`${inp} w-36`} defaultValue="Ref Number">
                  <option>Ref Number</option>
                  <option>PO Number</option>
                </select>
                <input type="text" value={formData.refNumber}
                  onChange={e => setFormData(f => ({ ...f, refNumber: e.target.value }))}
                  className={`${inp} w-32`} placeholder="" />
                <label className="text-sm text-gray-600 w-24 flex-shrink-0 text-right">Valid until</label>
                <input type="date" value={formData.validUntil}
                  data-testid="purchase-order-valid-until"
                  onChange={e => setFormData(f => ({ ...f, validUntil: e.target.value }))}
                  className={`${inp} flex-1`} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-28 flex-shrink-0">Status</label>
                <select
                  value={formData.status}
                  onChange={e => {
                    const nextStatus = e.target.value;
                    setFormData(f => ({ ...f, status: nextStatus }));
                    setCurrentStatus(nextStatus);
                  }}
                  className={`${inp} w-[calc(50%-0.375rem)]`}
                >
                  {STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Items Section ── */}
        <div className="px-6 py-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{docLabel}</h2>

          <div className="border border-gray-200 rounded">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={`${th} w-8`}>No</th>
                  <th className={`${th} w-40`}>Inventory Name</th>
                  <th className={th}>Description</th>
                  <th className={`${th} w-24`}>HSN/SAC</th>
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
                      <ItemSelect
                        items={itemsList}
                        value={item.itemRef || ''}
                        testId={`purchase-order-item-select-${idx}`}
                        onChange={(found) => selectItem(idx, found._id)}
                        onAddNew={() => { setPendingItemIndex(idx); setIsItemModalOpen(true); }}
                        onEdit={(it) => navigate(`/items/edit/${it._id}`)}
                      />
                      <input placeholder="Inventory name" value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" required />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <textarea rows={2} placeholder="Description" value={item.description}
                        data-testid={`purchase-order-item-description-${idx}`}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <div className="text-xs text-gray-400 mt-0.5">
                        {1000 - (item.description?.length || 0)} characters left
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input placeholder="HSN" value={item.hsnCode || ''} onChange={e => updateItem(idx, 'hsnCode', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input type="number" min="0" step="0.01" value={item.qty}
                        data-testid={`purchase-order-item-qty-${idx}`}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input type="number" min="0" step="0.01" placeholder="Price" value={item.rate || ''}
                        data-testid={`purchase-order-item-rate-${idx}`}
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
                              taxRate: val === 'custom' ? clampPercent(items[idx].customTaxRate) : Number(val),
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
                            type="text" inputMode="decimal" placeholder="Rate %"
                            value={item.customTaxRate ?? ''}
                            onChange={e => {
                              const items = [...formData.items];
                              items[idx] = {
                                ...items[idx],
                                customTaxRate: clampPercentInput(e.target.value),
                                taxRate: clampPercent(e.target.value),
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
                <input type="number" min="0" step="0.01" value={formData.shippingCharges}
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
                <input type="number" min="0" step="0.01" value={formData.discountTotal}
                  onChange={e => setFormData(f => ({ ...f, discountTotal: e.target.value }))}
                  className="border border-gray-300 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            )}

            {/* Discount to all */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 hover:text-blue-800">
              <input type="checkbox" checked={showDiscountToAll} onChange={e => {
                const checked = e.target.checked;
                setShowDiscountToAll(checked);
                if (!checked) {
                  setDiscountToAll('');
                  setFormData(f => ({
                    ...f,
                    items: f.items.map(it => {
                      const updated = { ...it, discount: 0 };
                      updated.amount = calcRow(updated);
                      return updated;
                    })
                  }));
                }
              }}
                className="rounded border-gray-300 text-blue-600" />
              Add discount to all
            </label>
            {showDiscountToAll && (
              <div className="ml-6 flex items-center gap-2">
                <input type="number" min="0" max="100" placeholder="%" value={discountToAll}
                  onChange={e => {
                    const pct = e.target.value;
                    setDiscountToAll(pct);
                    setFormData(f => ({
                      ...f,
                      items: f.items.map(it => {
                        const updated = { ...it, discount: pct };
                        updated.amount = calcRow(updated);
                        return updated;
                      })
                    }));
                  }}
                  className="border border-gray-300 rounded px-2.5 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-400" />
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
                <input type="number" min="0" step="0.01" value={formData.customChargeAmount}
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
              {showCustomAmount && Number(formData.customChargeAmount) !== 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm text-gray-600">
                  <span>{formData.customChargeLabel}:</span>
                  <span>₹ {Number(formData.customChargeAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
              Private notes <span className="text-gray-400 font-normal">(not shown to vendor)</span>
            </label>
            <textarea rows={4} value={formData.privateNotes}
              onChange={e => setFormData(f => ({ ...f, privateNotes: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
        </div>

        {/* ── Footer Buttons ── */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
          <button type="submit" disabled={loading}
            data-testid="purchase-order-save"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-60">
            ✓ Preview &amp; save
          </button>
          <button type="button" disabled={loading}
            data-testid="purchase-order-save-draft"
            onClick={e => handleSubmit(e, true)}
            className="px-5 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-60">
            Save as draft
          </button>
          {id && !['RECEIVED', 'BILLED', 'CANCELLED'].includes(currentStatus) && (
            <button type="button" onClick={handleReceive} disabled={receivingOrder}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-60">
              <FaBoxOpen size={14} /> Mark as Received
            </button>
          )}
          <button type="button" onClick={() => navigate(listPath)}
            className="px-5 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
        </div>

      </form>

      {/* New Vendor Modal */}
      <Modal isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} title="Add New Vendor">
        <VendorForm isModal onSuccess={(newVendor) => {
          setVendors(prev => [...prev, newVendor]);
          setFormData(f => ({ ...f, vendorRef: newVendor._id }));
          setIsVendorModalOpen(false);
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

export default PurchaseOrderForm;
