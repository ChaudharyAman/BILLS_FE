import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaTrash, FaChevronDown, FaUpload } from 'react-icons/fa';
import Modal from '../components/Modal';
import ClientForm from './ClientForm';
import ItemForm from './ItemForm';
import Skeleton from '../components/Skeleton';
import CsvUploader from '../components/CsvUploader';
import ItemSelect from '../components/ItemSelect';

const INVOICE_TYPES = ['Invoice', 'Retail Invoice', 'Tax Invoice', 'Excise Invoice'];
const STANDARD_TAX_RATES = [0, 5, 12, 18, 28];
const MAX_GST_RATE = 28;

const TAX_TYPES = {
  'Invoice': false,
  'Retail Invoice': false,
  'Tax Invoice': true,
  'Excise Invoice': true,
};

const SHOW_HSN = {
  'Invoice': false,
  'Retail Invoice': false,
  'Tax Invoice': true,
  'Excise Invoice': true,
};

const SHOW_EXCISE = {
  'Invoice': false,
  'Retail Invoice': false,
  'Tax Invoice': false,
  'Excise Invoice': true,
};

const emptyItem = () => ({
  name: '', description: '', hsnCode: '', unit: 'pcs',
  qty: 1, rate: 0, discount: 0, taxRate: 0,
  bedPercent: 0, sedPercent: 0, cessPercent: 0,
  amount: 0, isCustom: false,
});

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

const normalizeCatalogName = (value = '') => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase();

const normalizeTaxRate = (value = '') => {
  const numeric = Number.parseFloat(String(value ?? '').replace('%', '').trim());
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
};

const clampPercent = (value = '') => {
  const numeric = normalizeTaxRate(value);
  return Math.min(100, Math.max(0, numeric));
};

const clampPercentInput = (value = '') => {
  if (value === '') return '';
  return String(clampPercent(value));
};

const sanitizeGstRate = (value = '') => {
  const numeric = normalizeTaxRate(value);
  return numeric > MAX_GST_RATE ? 0 : numeric;
};

const isCustomTaxRate = (value = '') => !STANDARD_TAX_RATES.includes(sanitizeGstRate(value));

const roundTwo = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getCatalogItemTaxRate = (item = {}) => {
  const candidates = [item.defaultTaxRate, item.taxRate, item.salesInfo?.taxRate];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      const numeric = parseFloat(String(candidate).replace('%', '').trim());
      if (!isNaN(numeric) && (numeric > 0 || String(candidate).trim() === '0')) {
        return sanitizeGstRate(numeric);
      }
    }
  }

  return 0;
};

const InvoiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const queryType = new URLSearchParams(location.search).get('type') || 'Tax Invoice';
  const [clients, setClients] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [pendingItemIndex, setPendingItemIndex] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState('');

  const [showShipping, setShowShipping] = useState(false);
  const [showDiscountTotal, setShowDiscountTotal] = useState(false);
  const [showDiscountToAll, setShowDiscountToAll] = useState(false);
  const [discountToAll, setDiscountToAll] = useState('');

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showTransportDropdown, setTransportDropdown] = useState(false);
  const [transportSearch, setTransportSearch] = useState('');
  const [companyTaxProfile, setCompanyTaxProfile] = useState({ state: '', gstin: '' });
  const [catalogReady, setCatalogReady] = useState(false);
  const [isSyncingPdfItems, setIsSyncingPdfItems] = useState(false);

  const [formData, setFormData] = useState({
    invoiceType: queryType,
    clientRef: '',
    clientName: '',
    clientGST: '',
    importSource: '',
    invoiceNo: 'Auto-generated',
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    poDate: '',
    dueDate: '',
    paymentMode: '',
    paymentTerms: 'On Receipt',
    status: 'DRAFT',
    placeOfSupply: '',
    reverseCharge: false,
    items: [emptyItem()],
    shippingCharges: 0,
    packagingCharges: 0,
    customChargeLabel: 'Custom Amount',
    discountTotal: 0,
    advancePaid: 0,
    notes: '',
    terms: '',
    transport: { mode: 'Road', vehicleNumber: '', eWayBillNo: '' },
    shippingAddress: { line1: '', line2: '', city: '', state: '', zip: '', country: 'India' },
    bankDetails: {
      accountName: '',
      bankName: '',
      accountNumber: '',
      branch: '',
      ifscCode: '',
    },
    exciseDuty: {
      bedPercent: 0, sedPercent: 0, cessPercent: 0,
      manufacturerName: '', manufacturerAddress: '', rangeCode: '',
    },
    fy: '',
    currency: 'INR',
    tds: 0,
    tcs: 0,
    drCr: 'Dr.',
    purchaseOrderRef: '',
  });

  const invoiceType = formData.invoiceType;
  const hasTax = TAX_TYPES[invoiceType];
  const hasHSN = SHOW_HSN[invoiceType];
  const hasExcise = SHOW_EXCISE[invoiceType];

  useEffect(() => {
    fetchDependencies();
    if (id) fetchInvoice(id);
  }, [id]);

  // ── PDF Import: Read extracted data from sessionStorage ────────
  useEffect(() => {
    const source = new URLSearchParams(location.search).get('source');
    if (source !== 'pdf' || id) return;

    try {
      const raw = sessionStorage.getItem('pdfImportData');
      if (!raw) return;

      const pdf = JSON.parse(raw);
      // sessionStorage.removeItem('pdfImportData'); // Clean up - deferred to successful submit to avoid React double-mount race condition

      if (!pdf._fromPdfImport) return;

      setFormData(prev => ({
        ...prev,
        clientName: pdf.clientName || prev.clientName,
        clientGST: pdf.clientGST || prev.clientGST,
        importSource: pdf._fromPdfImport ? 'pdf' : prev.importSource,
        invoiceNo: pdf.invoiceNo || prev.invoiceNo,
        date: pdf.invoiceDate || prev.date,
        dueDate: pdf.dueDate || prev.dueDate,
        placeOfSupply: pdf.placeOfSupply || prev.placeOfSupply,
        paymentMode: pdf.paymentMode || prev.paymentMode,
        poNumber: pdf.poNumber || prev.poNumber,
        poDate: pdf.poDate || prev.poDate,
        customChargeLabel: pdf.customChargeLabel || prev.customChargeLabel,
        packagingCharges: pdf.packagingCharges ?? prev.packagingCharges,
        discountTotal: pdf.discountTotal || 0,
        items: pdf.items?.length > 0
          ? pdf.items.map(item => ({
              ...emptyItem(),
              name: item.name || '',
              description: item.description || '',
              unit: item.unit || 'pcs',
              qty: item.qty || item.quantity || 1,
              rate: item.rate || item.price || 0,
              taxRate: sanitizeGstRate(item.taxRate !== undefined ? item.taxRate : item.gst),
              discount: item.discount || 0,
              isCustom: isCustomTaxRate(item.taxRate !== undefined ? item.taxRate : item.gst),
            }))
          : prev.items,
      }));

      if (Number(pdf.packagingCharges) !== 0) {
        setShowCustomAmount(true);
      }

      // Auto-match client by name (deferred until clients are loaded)
      if (pdf.clientName) {
        const matchInterval = setInterval(() => {
          setClients(currentClients => {
            if (currentClients.length === 0) return currentClients;
            clearInterval(matchInterval);

            const match = currentClients.find(c =>
              c.name?.toLowerCase().trim() === pdf.clientName.toLowerCase().trim()
            );
            if (match) {
              setFormData(prev => ({
                ...prev,
                clientRef: match._id,
                placeOfSupply: prev.placeOfSupply || match.billingAddress?.state || '',
              }));
            }
            return currentClients;
          });
        }, 300);

        // Safety: clear interval after 5s
        setTimeout(() => clearInterval(matchInterval), 5000);
      }
    } catch (e) {
      console.warn('Failed to load PDF import data:', e);
    }
  }, [location.search, id]);

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
            taxRate: Number(item.taxRate) || 0,
            defaultTaxRate: Number(item.taxRate) || 0,
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
          console.error('Failed to sync PDF items to catalog:', e);
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
  }, [id, formData.importSource, formData.items, itemsList, catalogReady, isSyncingPdfItems]);

  const fetchDependencies = async () => {
    try {
      const [cr, ir, sr, por] = await Promise.all([
        api.get('/clients?limit=1000'),
        api.get('/items?limit=1000'),
        api.get('/settings'),
        api.get('/purchase-orders?limit=1000')
      ]);
      setClients(cr.data.data || []);
      setItemsList(ir.data.data || []);
      setPurchaseOrders(por.data.data || []);
      setCompanyTaxProfile({
        state: sr.data?.address?.state || '',
        gstin: sr.data?.gstin || '',
      });
      
      // If creating a NEW invoice, pre-fill bank details from settings
      if (!id && sr.data?.bankDetails) {
        setFormData(prev => ({
          ...prev,
          bankDetails: {
            accountName: sr.data.bankDetails.accountName || '',
            bankName: sr.data.bankDetails.bankName || '',
            accountNumber: sr.data.bankDetails.accountNumber || '',
            branch: sr.data.bankDetails.branch || '',
            ifscCode: sr.data.bankDetails.ifscCode || '',
          }
        }));
      }
    } catch (e) { console.error(e); }
    finally { setCatalogReady(true); }
  };

  const fetchInvoice = async (invoiceId) => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices/${invoiceId}`);
      const inv = res.data;
      const fmt = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
      
        setFormData({
        ...inv,
        invoiceType: inv.invoiceType || 'Tax Invoice',
        clientRef: inv.client?.clientRef || inv.clientRef || '',
        clientName: inv.client?.name || '',
        clientGST: inv.client?.gstin || '',
        importSource: '',
        invoiceNo: inv.invoiceNo || 'Auto-generated',
        poNumber: inv.transport?.poNumber || inv.poNumber || '',
        date: fmt(inv.date),
        poDate: fmt(inv.transport?.poDate || inv.poDate),
        dueDate: fmt(inv.dueDate),
        paymentMode: inv.paymentMode || '',
        paymentTerms: inv.paymentTerms || 'On Receipt',
        status: inv.status || 'DRAFT',
        placeOfSupply: inv.placeOfSupply || '',
        reverseCharge: !!inv.reverseCharge,
        shippingCharges: inv.shippingCharges || 0,
        packagingCharges: inv.packagingCharges || 0,
        customChargeLabel: inv.customChargeLabel || 'Custom Amount',
        discountTotal: inv.discountTotal || 0,
        advancePaid: inv.advancePaid || 0,
        notes: inv.notes || '',
        terms: inv.terms || '',
        transport: {
          mode: inv.transport?.mode || 'Road',
          vehicleNumber: inv.transport?.vehicleNumber || '',
          eWayBillNo: inv.transport?.eWayBillNo || '',
        },
        shippingAddress: {
          line1: inv.shippingAddress?.line1 || '',
          line2: inv.shippingAddress?.line2 || '',
          city: inv.shippingAddress?.city || '',
          state: inv.shippingAddress?.state || '',
          zip: inv.shippingAddress?.zip || '',
          country: inv.shippingAddress?.country || 'India',
        },
        bankDetails: {
          accountName: inv.bankDetails?.accountName || '',
          bankName: inv.bankDetails?.bankName || '',
          accountNumber: inv.bankDetails?.accountNumber || '',
          branch: inv.bankDetails?.branch || '',
          ifscCode: inv.bankDetails?.ifscCode || '',
        },
        exciseDuty: {
          bedPercent: inv.exciseDuty?.bedPercent || 0,
          sedPercent: inv.exciseDuty?.sedPercent || 0,
          cessPercent: inv.exciseDuty?.cessPercent || 0,
          manufacturerName: inv.exciseDuty?.manufacturerName || '',
          manufacturerAddress: inv.exciseDuty?.manufacturerAddress || '',
          rangeCode: inv.exciseDuty?.rangeCode || '',
        },
        fy: inv.fy || '',
        currency: inv.currency || 'INR',
        tds: inv.tds || 0,
        tcs: inv.tcs || 0,
        drCr: inv.drCr || 'Dr.',
        purchaseOrderRef: inv.purchaseOrderRef || '',
        items: (inv.items || []).map(i => ({ 
          ...emptyItem(), 
          ...i,
          name: i.name || '',
          description: i.description || '',
          hsnCode: i.hsnCode || '',
          unit: i.unit || 'pcs',
          qty: i.qty || 0,
          rate: i.rate || 0,
          discount: i.discount || 0,
          taxRate: sanitizeGstRate(i.taxRate),
          bedPercent: i.bedPercent || 0,
          sedPercent: i.sedPercent || 0,
          cessPercent: i.cessPercent || 0,
          isCustom: isCustomTaxRate(i.taxRate),
        })),
      });

      if (inv.shippingCharges > 0) setShowShipping(true);
      if (Number(inv.packagingCharges) !== 0) setShowCustomAmount(true);
      if (inv.discountTotal > 0) setShowDiscountTotal(true);
      if (inv.advancePaid > 0) setShowAdvance(true);
    } catch (e) {
      console.error(e);
      alert('Failed to load invoice');
      navigate('/invoices');
    } finally { setLoading(false); }
  };

  // ── Calculations ──────────────────────────────────────────────
  // Returns taxable value for a row (before tax)
  const calcTaxableRow = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Math.min(100, Math.max(0, Number(item.discount) || 0));
    return roundTwo(qty * rate * (1 - disc / 100));
  };

  // Returns full row amount including tax/excise (for display in the items table)
  const calcRow = (item) => {
    const taxable = calcTaxableRow(item);
    const gstRate = sanitizeGstRate(item.taxRate);
    const gst = hasTax ? roundTwo(taxable * (gstRate / 100)) : 0;
    let excise = 0;
    if (hasExcise) {
      const bed = roundTwo(taxable * (Number(item.bedPercent) / 100 || 0));
      const sed = roundTwo(taxable * (Number(item.sedPercent) / 100 || 0));
      const cess = roundTwo((bed + sed) * (Number(item.cessPercent) / 100 || 0));
      excise = roundTwo(bed + sed + cess);
    }
    return roundTwo(taxable + gst + excise);
  };

  // Subtotal = sum of taxable values only (pre-tax)
  const getSubTotal = () => roundTwo(formData.items.reduce((a, i) => a + calcTaxableRow(i), 0));

  const getExciseTotal = () => {
    if (!hasExcise) return 0;
    return roundTwo(formData.items.reduce((total, item) => {
      const taxable = calcTaxableRow(item);
      const bed = roundTwo(taxable * (Number(item.bedPercent) / 100 || 0));
      const sed = roundTwo(taxable * (Number(item.sedPercent) / 100 || 0));
      const cess = roundTwo((bed + sed) * (Number(item.cessPercent) / 100 || 0));
      return total + bed + sed + cess;
    }, 0));
  };

  const getTaxBreakdown = () => {
    let cgst = 0, sgst = 0, igst = 0;
    let isInterState = false;
    if (!hasTax) return { cgst, sgst, igst, isInterState };
    isInterState = isInterStateSupply(
      formData.placeOfSupply,
      companyTaxProfile.state,
      companyTaxProfile.gstin
    );
    formData.items.forEach(item => {
      const taxable = calcTaxableRow(item);
      const tax = roundTwo(taxable * (sanitizeGstRate(item.taxRate) / 100));
      if (isInterState) {
        igst = roundTwo(igst + tax);
      } else {
        cgst = roundTwo(cgst + roundTwo(tax / 2));
        sgst = roundTwo(sgst + roundTwo(tax / 2));
      }
    });
    return { cgst, sgst, igst, isInterState };
  };

  const getGrandTotal = () => {
    const sub = getSubTotal();
    const { cgst, sgst, igst } = getTaxBreakdown();
    const totalTax = cgst + sgst + igst;
    const taxToAdd = formData.reverseCharge ? 0 : totalTax;
    const totalExcise = getExciseTotal();
    const ship = Number(formData.shippingCharges) || 0;
    const custom = Number(formData.packagingCharges) || 0;
    const disc = Number(formData.discountTotal) || 0;
    const tcs = Number(formData.tcs) || 0;
    // Grand Total typically = Subtotal + Tax + Shipping + Custom - Discount
    // TDS/TCS are usually handled as adjustments to the final amount or separate markers.
    // For this app, we'll keep Grand Total as the payable amount before TDS deduction (commonly).
    // But we'll add TCS to Grand Total if present.
    return roundTwo(sub + taxToAdd + totalExcise + ship + custom - disc + tcs);
  };

  // ── Item helpers ──────────────────────────────────────────────
  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'name') {
      const found = itemsList.find(i => i.name === value);
      if (found) {
        const taxRate = getCatalogItemTaxRate(found);
        newItems[index].description = found.description || found.salesInfo?.description || '';
        newItems[index].rate = found.salesInfo?.price || found.rate || 0;
        newItems[index].unit = found.unit || 'pcs';
        newItems[index].taxRate = taxRate;
        newItems[index].hsnCode = found.hsnCode || '';
        newItems[index].itemRef = found._id;
        newItems[index].isCustom = isCustomTaxRate(taxRate);
      }
    }
    setFormData({ ...formData, items: newItems });
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
      
      const taxParam = sanitizeGstRate(row.TaxRate || row.taxRate || row.Tax || row.tax);
      it.taxRate = taxParam;
      it.isCustom = isCustomTaxRate(taxParam);
      
      if (hasExcise) {
        it.bedPercent = Number(row.BED || row.bed || row.bedPercent) || 0;
        it.sedPercent = Number(row.SED || row.sed || row.sedPercent) || 0;
        it.cessPercent = Number(row.Cess || row.cess || row.cessPercent) || 0;
      }
      
      it.amount = calcRow(it);
      return it;
    });

    setFormData(f => ({ ...f, items: [...currentItems, ...parsedItems] }));
    setIsCsvModalOpen(false);
  };

  const addItemRow = () => setFormData({ ...formData, items: [...formData.items, emptyItem()] });
  const removeItemRow = (i) => {
    if (formData.items.length > 1)
      setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i) });
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const canAutoCreatePdfClient = formData.importSource === 'pdf' && formData.clientName?.trim();
    if ((!formData.clientRef || formData.clientRef === '_CREATE_NEW_') && !canAutoCreatePdfClient) {
      alert('Please select a valid client.');
      return;
    }
    setLoading(true);
    const payload = {
      ...formData,
      transport: { ...formData.transport, poNumber: formData.poNumber, poDate: formData.poDate },
    };
    try {
      if (id) {
        await api.put(`/invoices/${id}`, payload);
        alert('Invoice updated successfully');
      } else {
        await api.post('/invoices', payload);
        alert('Invoice created successfully');
      }
      sessionStorage.removeItem('pdfImportData');
      navigate('/invoices');
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
      const msg = err.response?.data?.message || 'Failed to save invoice';
      if (err.response?.status === 403) {
        setPremiumMessage(msg);
        setShowPremiumModal(true);
      } else {
        alert(msg);
      }
    } finally { setLoading(false); }
  };

  // ── Shared input style ────────────────────────────────────────
  const inp = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none bg-white';
  const lbl = 'block text-xs font-medium text-gray-500 mb-1';

  const { cgst, sgst, igst, isInterState } = getTaxBreakdown();
  const pendingPdfClientName = formData.importSource === 'pdf' && !formData.clientRef
    ? formData.clientName?.trim()
    : '';

  useEffect(() => {
    if (!id || itemsList.length === 0) return;

    let hasChanges = false;
    const normalizedItems = formData.items.map(item => {
      const currentRate = normalizeTaxRate(item.taxRate);
      if (currentRate <= MAX_GST_RATE) {
        const sanitizedRate = sanitizeGstRate(item.taxRate);
        const nextIsCustom = isCustomTaxRate(sanitizedRate);
        if (sanitizedRate === item.taxRate && nextIsCustom === !!item.isCustom) {
          return item;
        }
        hasChanges = true;
        return { ...item, taxRate: sanitizedRate, isCustom: nextIsCustom };
      }

      const catalogItem = itemsList.find(entry => entry._id === item.itemRef);
      const fallbackRate = catalogItem ? getCatalogItemTaxRate(catalogItem) : 0;
      hasChanges = true;
      return {
        ...item,
        taxRate: fallbackRate,
        isCustom: isCustomTaxRate(fallbackRate),
      };
    });

    if (hasChanges) {
      setFormData(prev => ({ ...prev, items: normalizedItems }));
    }
  }, [id, itemsList, formData.items]);
  
  if (loading && id) {
      return (
        <div className="bg-white min-h-screen pb-20">
            <div className="border-b border-gray-200 px-8 py-3 flex justify-between items-center sticky top-0 bg-white z-20 shadow-sm">
                <div className="flex items-center gap-4"><Skeleton width="150px" height="28px" /></div>
                <div className="flex gap-3">
                    <Skeleton width="80px" height="36px" className="rounded-lg" />
                    <Skeleton width="120px" height="36px" className="rounded-lg" />
                </div>
            </div>
            <div className="px-8 py-6 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-12 gap-6 mb-6">
                    <div className="col-span-4 space-y-3">
                        <div><Skeleton width="100px" height="16px" className="mb-2" /><Skeleton width="100%" height="40px" /></div>
                        <div><Skeleton width="100px" height="16px" className="mb-2" /><Skeleton width="100%" height="40px" /></div>
                    </div>
                    <div className="col-span-8 grid grid-cols-3 gap-x-4 gap-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i}><Skeleton width="80px" height="16px" className="mb-2" /><Skeleton width="100%" height="40px" /></div>
                        ))}
                    </div>
                </div>
                <div className="mb-6"><Skeleton width="100%" height="200px" className="rounded-lg" /></div>
                <div className="grid grid-cols-12 gap-8">
                     <div className="col-span-7 space-y-4">
                        <Skeleton width="60%" height="40px" />
                        <Skeleton width="60%" height="40px" />
                     </div>
                     <div className="col-span-5"><Skeleton width="100%" height="150px" className="rounded-xl" /></div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="bg-white min-h-screen pb-20">

      {/* ── Sticky Header ── */}
      <div className="border-b border-gray-200 px-8 py-3 flex justify-between items-center sticky top-0 bg-white z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-blue-900">{id ? 'Edit Invoice' : 'New Invoice'}</h1>
          {/* Invoice Type Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {INVOICE_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, invoiceType: type })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  invoiceType === type
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/invoices')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} data-testid="save-invoice" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1600px] mx-auto">

        {/* ── Section 1: Client + Invoice Meta ── */}
        <div className="grid grid-cols-12 gap-6 mb-6">

          {/* Client */}
          <div className="col-span-4 space-y-3">
            <div>
              <label className={lbl}>Client Name *</label>
              <div className="relative">
                <select
                  data-testid="invoice-client-select"
                  className={inp}
                  value={formData.clientRef}
                  onChange={(e) => {
                    if (e.target.value === '_CREATE_NEW_') setIsClientModalOpen(true);
                    else setFormData({ ...formData, clientRef: e.target.value });
                  }}
                >
                  <option value="">{pendingPdfClientName ? `${pendingPdfClientName} (will be created on save)` : 'Select Client'}</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  <option value="_CREATE_NEW_" className="font-bold text-blue-600">+ Create New Client</option>
                </select>
              </div>
            </div>

            {/* Place of Supply — only for Tax/Excise */}
            {(invoiceType === 'Tax Invoice' || invoiceType === 'Excise Invoice') && (
              <div>
                <label className={lbl}>Place of Supply</label>
                <input className={inp} placeholder="e.g. HR (26)" value={formData.placeOfSupply}
                  data-testid="invoice-place-of-supply"
                  onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })} />
              </div>
            )}

            {/* Reverse Charge — only for Tax/Excise */}
            {(invoiceType === 'Tax Invoice' || invoiceType === 'Excise Invoice') && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="rc" checked={formData.reverseCharge}
                  onChange={(e) => setFormData({ ...formData, reverseCharge: e.target.checked })}
                  className="w-4 h-4 accent-blue-600" />
                <label htmlFor="rc" className="text-sm text-gray-600 cursor-pointer">Reverse Charge Applicable</label>
              </div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="col-span-8 grid grid-cols-3 gap-x-4 gap-y-3">
            <div>
              <label className={lbl}>Invoice No.</label>
              <input 
                data-testid="invoice-number"
                className={inp} 
                value={formData.invoiceNo} 
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                onFocus={(e) => {
                  if (e.target.value === 'Auto-generated') {
                    setFormData({ ...formData, invoiceNo: '' });
                  }
                }}
                placeholder="Auto-generated"
              />
            </div>
            <div>
              <label className={lbl}>Invoice Date</label>
              <div className="relative">
                <input type="date" className={inp} value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={lbl}>Due Date</label>
              <div className="relative">
                <input type="date" className={inp} value={formData.dueDate}
                  data-testid="invoice-due-date"
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={lbl}>Link Purchase Order (PO)</label>
              <select
                className={inp}
                value={formData.purchaseOrderRef}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setFormData({
                      ...formData,
                      purchaseOrderRef: '',
                      poNumber: '',
                      poDate: '',
                    });
                  } else {
                    const selectedPo = purchaseOrders.find(po => po._id === val);
                    if (selectedPo) {
                      const matchedClient = clients.find(c => c.name?.toLowerCase().trim() === selectedPo.vendor?.name?.toLowerCase().trim() || c._id === selectedPo.vendor?.vendorRef);
                      
                      const updatedItems = selectedPo.items && selectedPo.items.length > 0 ? selectedPo.items.map(item => ({
                        ...emptyItem(),
                        name: item.name || '',
                        description: item.description || '',
                        hsnCode: item.hsnCode || '',
                        unit: item.unit || 'pcs',
                        qty: item.qty || 1,
                        rate: item.rate || 0,
                        taxRate: sanitizeGstRate(item.taxRate),
                        discount: item.discount || 0,
                        amount: calcRow({
                          ...emptyItem(),
                          qty: item.qty || 1,
                          rate: item.rate || 0,
                          taxRate: sanitizeGstRate(item.taxRate),
                          discount: item.discount || 0,
                        }),
                      })) : formData.items;

                      setFormData({
                        ...formData,
                        purchaseOrderRef: val,
                        poNumber: selectedPo.poNumber || '',
                        poDate: selectedPo.date ? new Date(selectedPo.date).toISOString().split('T')[0] : '',
                        clientRef: matchedClient ? matchedClient._id : formData.clientRef,
                        items: updatedItems,
                        shippingCharges: selectedPo.shippingCharges || 0,
                        packagingCharges: selectedPo.packagingCharges || 0,
                        discountTotal: selectedPo.discountTotal || 0,
                        notes: selectedPo.notes || '',
                        terms: selectedPo.terms || '',
                      });
                      if (selectedPo.shippingCharges > 0) setShowShipping(true);
                      if (selectedPo.packagingCharges > 0) setShowCustomAmount(true);
                      if (selectedPo.discountTotal > 0) setShowDiscountTotal(true);
                    }
                  }
                }}
              >
                <option value="">None (Enter Manually)</option>
                {purchaseOrders.filter(po => po.status !== 'BILLED' || po._id === formData.purchaseOrderRef).map(po => (
                  <option key={po._id} value={po._id}>
                    {po.poNumber} - {po.vendor?.name} (₹{po.grandTotal})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>PO No.</label>
              <input className={inp} value={formData.poNumber}
                disabled={!!formData.purchaseOrderRef}
                placeholder={formData.purchaseOrderRef ? 'Linked to PO' : 'Enter PO No.'}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>PO Date</label>
              <div className="relative">
                <input type="date" className={inp} value={formData.poDate}
                  disabled={!!formData.purchaseOrderRef}
                  onChange={(e) => setFormData({ ...formData, poDate: e.target.value })} />
              </div>
            </div>
            {formData.purchaseOrderRef && (
              <div className="col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-3 my-1 flex flex-col justify-between shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-blue-900 mb-1.5 flex justify-between">
                    <span>Linked Purchase Order Summary</span>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      {purchaseOrders.find(po => po._id === formData.purchaseOrderRef)?.status || 'ACTIVE'}
                    </span>
                  </h4>
                  {(() => {
                    const currentPo = purchaseOrders.find(po => po._id === formData.purchaseOrderRef);
                    if (!currentPo) return null;
                    const billed = currentPo.billedAmount || 0;
                    const total = currentPo.grandTotal || 0;
                    const remaining = Math.max(0, total - billed);
                    return (
                      <div className="grid grid-cols-3 gap-4 text-xs text-blue-800">
                        <div>
                          <span className="block text-[10px] text-blue-600 font-semibold uppercase">PO Total</span>
                          <span className="text-sm font-bold text-blue-950">₹{total.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-blue-600 font-semibold uppercase">Already Invoiced</span>
                          <span className="text-sm font-bold text-blue-950 text-amber-700">₹{billed.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-blue-600 font-semibold uppercase">Unbilled Balance</span>
                          <span className="text-sm font-bold text-emerald-700">₹{remaining.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            <div>
              <label className={lbl}>Status</label>
              <select className={inp} value={formData.status}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'PAID') {
                    const total = getGrandTotal();
                    setFormData({ ...formData, status: val, advancePaid: total });
                    setShowAdvance(true);
                  } else {
                    setFormData({ ...formData, status: val });
                  }
                }}>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Payment Mode</label>
              <select className={inp} value={formData.paymentMode}
                data-testid="invoice-payment-mode"
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}>
                <option value="">Select</option>
                <option>Cash</option>
                <option>Cheque</option>
                <option>Bank Transfer</option>
                <option>UPI</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Payment Terms</label>
              <select className={inp} value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}>
                <option>On Receipt</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Excise Invoice: Manufacturer Details ── */}
        {hasExcise && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-sm font-bold text-amber-800 mb-3">Manufacturer / Excise Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Manufacturer Name</label>
                <input className={inp} value={formData.exciseDuty.manufacturerName}
                  onChange={(e) => setFormData({ ...formData, exciseDuty: { ...formData.exciseDuty, manufacturerName: e.target.value } })} />
              </div>
              <div>
                <label className={lbl}>Manufacturer Address</label>
                <input className={inp} value={formData.exciseDuty.manufacturerAddress}
                  onChange={(e) => setFormData({ ...formData, exciseDuty: { ...formData.exciseDuty, manufacturerAddress: e.target.value } })} />
              </div>
              <div>
                <label className={lbl}>Range Code</label>
                <input className={inp} value={formData.exciseDuty.rangeCode}
                  onChange={(e) => setFormData({ ...formData, exciseDuty: { ...formData.exciseDuty, rangeCode: e.target.value } })} />
              </div>
            </div>
          </div>
        )}

        {/* ── Items Table ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-700">{invoiceType}</h3>
          </div>

          {/* Table Header */}
          <div className={`bg-[#E8EFF5] border border-gray-200 border-b-0 rounded-t-lg px-3 py-2 text-xs font-bold text-gray-600 grid gap-2 items-center`}
            style={{ gridTemplateColumns: buildGridCols(hasHSN, hasTax, hasExcise) }}>
            <div>#</div>
            <div>Inventory Name</div>
            <div>Description</div>
            {hasHSN && <div>HSN/SAC</div>}
            <div>Unit</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Price</div>
            <div className="text-right">Disc%</div>
            {hasTax && <div className="text-right">Tax%</div>}
            {hasExcise && <><div className="text-right">BED%</div><div className="text-right">SED%</div><div className="text-right">Cess%</div></>}
            <div className="text-right">Total</div>
            <div></div>
          </div>

          {/* Table Body */}
          <div className="border border-gray-200 rounded-b-lg bg-white divide-y divide-gray-100">
            {formData.items.map((item, index) => (
              <div key={index} className="px-3 py-2.5 grid gap-2 items-start hover:bg-gray-50"
                style={{ gridTemplateColumns: buildGridCols(hasHSN, hasTax, hasExcise) }}>

                <div className="text-gray-400 text-sm pt-2">{index + 1}</div>

                {/* Item Name */}
                <div>
                  <ItemSelect
                    items={itemsList}
                    value={item.itemRef || ''}
                    displayValue={item.name || ''}
                    testId={`invoice-item-select-${index}`}
                    onChange={(found) => {
                      const taxRate = getCatalogItemTaxRate(found);
                      const newItems = [...formData.items];
                      newItems[index] = {
                        ...newItems[index],
                        itemRef: found._id,
                        name: found.name,
                        description: found.description || found.salesInfo?.description || '',
                        rate: found.salesInfo?.price || found.rate || 0,
                        unit: found.unit || 'pcs',
                        taxRate,
                        hsnCode: found.hsnCode || '',
                        isCustom: isCustomTaxRate(taxRate),
                      };
                      setFormData({ ...formData, items: newItems });
                    }}
                    onAddNew={() => { setPendingItemIndex(index); setIsItemModalOpen(true); }}
                    onEdit={(it) => navigate(`/items/edit/${it._id}`)}
                  />
                </div>


                {/* Description */}
                <div>
                  <input placeholder="Description"
                    data-testid={`invoice-item-description-${index}`}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none text-gray-500"
                    value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                </div>

                {/* HSN */}
                {hasHSN && (
                  <div>
                    <input placeholder="HSN"
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                      value={item.hsnCode} onChange={(e) => updateItem(index, 'hsnCode', e.target.value)} />
                  </div>
                )}

                {/* Unit */}
                <div>
                  <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none bg-white"
                    value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)}>
                    {['pcs','box','kg','g','lt','ml','ft','m','sqft','sqm','nos','set','pair','dz','bag','roll','sheet','unit'].map(u =>
                      <option key={u}>{u}</option>)}
                  </select>
                </div>

                {/* Qty */}
                <div>
                  <input type="number" min="0" step="0.01" className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                    data-testid={`invoice-item-qty-${index}`}
                    value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} />
                </div>

                {/* Price */}
                <div>
                  <input type="number" min="0" step="0.01" className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                    data-testid={`invoice-item-rate-${index}`}
                    value={item.rate} onChange={(e) => updateItem(index, 'rate', e.target.value)} />
                </div>

                {/* Discount */}
                <div>
                  <input type="number" min="0" max="100" placeholder="0"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                    value={item.discount} onChange={(e) => updateItem(index, 'discount', e.target.value)} />
                </div>

                {/* Tax % — Tax Invoice / Excise Invoice */}
                {hasTax && (
                  <div>
                    {!item.isCustom ? (
                      <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none bg-white"
                        value={String(sanitizeGstRate(item.taxRate))}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            const ni = [...formData.items];
                            ni[index] = { ...ni[index], isCustom: true, taxRate: '' };
                            setFormData({ ...formData, items: ni });
                          } else updateItem(index, 'taxRate', e.target.value);
                        }}>
                        <option value="0">0%</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                        <option value="custom">Custom</option>
                      </select>
                    ) : (
                      <div className="relative">
                        <input type="text" inputMode="decimal" autoFocus placeholder="Tax %"
                          className="w-full border border-blue-400 rounded px-2 py-1.5 text-sm bg-blue-50 outline-none pr-6"
                          value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', clampPercentInput(e.target.value))} />
                        <button onClick={() => { const ni = [...formData.items]; ni[index] = { ...ni[index], isCustom: false, taxRate: 0 }; setFormData({ ...formData, items: ni }); }}
                          className="absolute right-1 top-2 text-gray-400 hover:text-red-500">
                          <FaTrash size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Excise columns */}
                {hasExcise && (
                  <>
                    <div>
                      <input type="number" min="0" max="100" placeholder="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                        value={item.bedPercent} onChange={(e) => updateItem(index, 'bedPercent', clampPercent(e.target.value))} />
                    </div>
                    <div>
                      <input type="number" min="0" max="100" placeholder="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                        value={item.sedPercent} onChange={(e) => updateItem(index, 'sedPercent', clampPercent(e.target.value))} />
                    </div>
                    <div>
                      <input type="number" min="0" max="100" placeholder="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                        value={item.cessPercent} onChange={(e) => updateItem(index, 'cessPercent', clampPercent(e.target.value))} />
                    </div>
                  </>
                )}

                {/* Row Total */}
                <div className="text-right pt-2 font-semibold text-gray-800 text-sm">
                  {calcRow(item).toFixed(2)}
                </div>

                {/* Delete */}
                <div className="pt-2 text-center">
                  <button onClick={() => removeItemRow(index)} className="text-red-300 hover:text-red-600 transition-colors">
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Line / Bulk Add buttons */}
            <div className="px-3 py-3 flex justify-end gap-3">
              <button type="button" onClick={() => setIsCsvModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1 transition-colors">
                <FaUpload size={14} /> Bulk Add CSV
              </button>
              <button type="button" onClick={addItemRow}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1 transition-colors">
                <FaPlus size={14} /> Add Line
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom: Extras + Totals ── */}
        <div className="grid grid-cols-12 gap-8">

          {/* Left: Extra Charges */}
          <div className="col-span-7 space-y-4">

            {/* Shipping */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showShipping} onChange={(e) => {
                  const checked = e.target.checked;
                  setShowShipping(checked);
                  if (!checked) setFormData({ ...formData, shippingCharges: 0 });
                }}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm font-medium text-gray-700">Add Shipping Charges</span>
              </label>
              {showShipping && (
                <div className="mt-2 pl-6 flex gap-3">
                  <div className="relative w-44">
                    <div className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white cursor-pointer flex justify-between items-center"
                      onClick={() => setTransportDropdown(!showTransportDropdown)}>
                      {formData.transport.mode || 'Road'}
                      <FaChevronDown size={14} className="text-gray-400" />
                    </div>
                    {showTransportDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg p-2">
                        <input type="text" placeholder="Search..." autoFocus
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs mb-2 outline-none"
                          value={transportSearch} onChange={(e) => setTransportSearch(e.target.value)} />
                        {['Road','Rail','Air','Ship'].filter(o => o.toLowerCase().includes(transportSearch.toLowerCase())).map(o => (
                          <div key={o} className={`px-2 py-1 text-sm rounded cursor-pointer ${formData.transport.mode === o ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                            onClick={() => { setFormData({ ...formData, transport: { ...formData.transport, mode: o } }); setTransportDropdown(false); }}>
                            {o}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" min="0" step="0.01" placeholder="Amount" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-40 outline-none focus:border-blue-500"
                    value={formData.shippingCharges} onChange={(e) => setFormData({ ...formData, shippingCharges: e.target.value })} />
                </div>
              )}
            </div>

            {/* Discount on Total */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showDiscountTotal} onChange={(e) => {
                  const checked = e.target.checked;
                  setShowDiscountTotal(checked);
                  if (!checked) setFormData({ ...formData, discountTotal: 0 });
                }}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm font-medium text-gray-700">Add Discount on Total</span>
              </label>
              {showDiscountTotal && (
                <div className="mt-2 pl-6">
                  <input type="number" min="0" step="0.01" placeholder="0" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-40 outline-none focus:border-blue-500"
                    value={formData.discountTotal} onChange={(e) => setFormData({ ...formData, discountTotal: e.target.value })} />
                  <p className="text-[10px] text-gray-400 mt-1">Note: Enabling this may affect GSTR-1 report accuracy.</p>
                </div>
              )}
            </div>

            {/* Discount to All */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showDiscountToAll} onChange={(e) => {
                  const checked = e.target.checked;
                  setShowDiscountToAll(checked);
                  if (!checked) {
                    setDiscountToAll('');
                    setFormData(f => ({
                      ...f,
                      items: f.items.map(i => ({ ...i, discount: 0 }))
                    }));
                  }
                }}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm font-medium text-gray-700">Apply Discount to All Items</span>
              </label>
              {showDiscountToAll && (
                <div className="mt-2 pl-6 flex items-center gap-2">
                  <input type="number" placeholder="%" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-28 outline-none focus:border-blue-500"
                    value={discountToAll}
                    onChange={(e) => {
                      setDiscountToAll(e.target.value);
                      setFormData({ ...formData, items: formData.items.map(i => ({ ...i, discount: e.target.value })) });
                    }} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              )}
            </div>

            {/* Custom Amount */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showCustomAmount} onChange={(e) => {
                  const checked = e.target.checked;
                  setShowCustomAmount(checked);
                  if (!checked) setFormData({ ...formData, packagingCharges: 0 });
                }}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm font-medium text-gray-700">Add Custom Amount</span>
              </label>
              {showCustomAmount && (
                <div className="mt-2 pl-6 flex gap-3">
                  <input type="text" placeholder="Label" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-44 outline-none focus:border-blue-500"
                    value={formData.customChargeLabel} onChange={(e) => setFormData({ ...formData, customChargeLabel: e.target.value })} />
                  <input type="number" step="0.01" placeholder="Amount" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-40 outline-none focus:border-blue-500"
                    value={formData.packagingCharges} onChange={(e) => setFormData({ ...formData, packagingCharges: e.target.value })} />
                </div>
              )}
            </div>

            {/* Advance */}
            <div>
              <button type="button" onClick={() => setShowAdvance(!showAdvance)}
                className="text-blue-500 text-sm font-medium flex items-center gap-1 hover:text-blue-700">
                <FaPlus size={14} /> Add Advance Payment
              </button>
              {showAdvance && (
                <div className="mt-2 pl-6 flex items-center gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase block">Amount Paid:</label>
                    <input type="number" min="0" step="0.01" className="border border-blue-200 rounded px-2 py-1.5 text-sm w-36 outline-none bg-blue-50 focus:border-blue-500"
                      value={formData.advancePaid} onChange={(e) => setFormData({ ...formData, advancePaid: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            {/* TDS & TCS */}
            <div className="pt-2 grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>TDS Deduction {!isPro && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1 rounded ml-1 border border-amber-200 uppercase tracking-tighter">Pro</span>}</label>
                <input type="number" placeholder="Amount"
                  value={formData.tds} onChange={(e) => setFormData({ ...formData, tds: e.target.value })} disabled={!isPro} onClick={() => !isPro && setShowPremiumModal(true)} className={`${inp} ${!isPro ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`} />
              </div>
              <div>
                <label className={lbl}>TCS Collection {!isPro && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1 rounded ml-1 border border-amber-200 uppercase tracking-tighter">Pro</span>}</label>
                <input type="number" placeholder="Amount"
                  value={formData.tcs} onChange={(e) => setFormData({ ...formData, tcs: e.target.value })} disabled={!isPro} onClick={() => !isPro && setShowPremiumModal(true)} className={`${inp} ${!isPro ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}`} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className={lbl}>Currency</label>
                  <input type="text" className={inp} placeholder="INR"
                    value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} />
               </div>
               <div>
                  <label className={lbl}>Financial Year</label>
                  <input type="text" className={inp} placeholder="e.g. 2023-24"
                    value={formData.fy} onChange={(e) => setFormData({ ...formData, fy: e.target.value })} />
               </div>
            </div>
          </div>

          {/* Right: Totals */}
          <div className="col-span-5">
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2">
              {formData.reverseCharge && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg p-2.5 font-medium flex flex-col gap-0.5 mb-2 leading-relaxed">
                  <span className="font-bold flex items-center gap-1 text-[12px] text-amber-900">⚠️ Reverse Charge Mechanism (RCM)</span>
                  <span>GST is calculated but not added to the payable Grand Total. The customer is liable to pay GST directly to the government.</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">₹ {getSubTotal().toFixed(2)}</span>
              </div>

              {hasTax && isInterState && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IGST</span>
                  <span>₹ {igst.toFixed(2)}</span>
                </div>
              )}
              {hasTax && !isInterState && (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>CGST</span>
                    <span>₹ {cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>SGST</span>
                    <span>₹ {sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              {hasExcise && getExciseTotal() > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Excise Duty</span>
                  <span>₹ {getExciseTotal().toFixed(2)}</span>
                </div>
              )}

              {showShipping && Number(formData.shippingCharges) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>₹ {Number(formData.shippingCharges).toFixed(2)}</span>
                </div>
              )}
              {showCustomAmount && Number(formData.packagingCharges) !== 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formData.customChargeLabel}</span>
                  <span>₹ {Number(formData.packagingCharges).toFixed(2)}</span>
                </div>
              )}
              {showDiscountTotal && Number(formData.discountTotal) > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Discount on Total</span>
                  <span>- ₹ {Number(formData.discountTotal).toFixed(2)}</span>
                </div>
              )}
              {Number(formData.tcs) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TCS Collected</span>
                  <span>+ ₹ {Number(formData.tcs).toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-gray-800">Grand Total</span>
                <span className="text-lg font-bold text-blue-700">₹ {getGrandTotal().toFixed(2)}</span>
              </div>

              {(Number(formData.advancePaid) > 0 || Number(formData.tds) > 0) && (
                <>
                  {Number(formData.advancePaid) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Advance Paid</span>
                      <span>- ₹ {Number(formData.advancePaid).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(formData.tds) > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>TDS Deducted</span>
                      <span>- ₹ {Number(formData.tds).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-2">
                    <span>Balance Due</span>
                    <span>₹ {Math.max(0, getGrandTotal() - Number(formData.advancePaid) - Number(formData.tds)).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Bank Details ── */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          <label className="block text-xs font-bold text-gray-600 mb-4 uppercase tracking-wider">Bank Details</label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Account Holder Name</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Account Holder Name"
                value={formData.bankDetails?.accountName} 
                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountName: e.target.value } })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Bank Name</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Bank Name"
                value={formData.bankDetails?.bankName} 
                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Account Number</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Account Number"
                value={formData.bankDetails?.accountNumber} 
                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: e.target.value } })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Branch Name</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="Branch Name"
                value={formData.bankDetails?.branch} 
                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, branch: e.target.value } })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">IFSC Code</label>
              <input type="text" className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                placeholder="IFSC Code"
                value={formData.bankDetails?.ifscCode} 
                onChange={(e) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, ifscCode: e.target.value } })} />
            </div>
          </div>
        </div>

        {/* ── Notes & Terms ── */}
        <div className="grid grid-cols-2 gap-6 mt-8 border-t border-gray-100 pt-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Terms &amp; Conditions</label>
            <textarea className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none h-24 resize-none"
              placeholder="Enter terms and conditions..."
              value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Private Notes (not shown to client)</label>
            <textarea className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none h-24 resize-none"
              placeholder="Enter private notes..."
              value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Client Modal */}
      <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Create New Client">
        <ClientForm
          onSuccess={(newClient) => {
            setClients([newClient, ...clients]);
            setFormData({ ...formData, clientRef: newClient._id });
            setIsClientModalOpen(false);
          }}
          onCancel={() => setIsClientModalOpen(false)}
        />
      </Modal>
      {/* New Item Modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title="Add New Item">
        <ItemForm isModal onSuccess={(newItem) => {
            setItemsList(prev => [...prev, newItem]);
            if (pendingItemIndex !== null) {
                updateItem(pendingItemIndex, 'name', newItem.name);
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

// Helper: build CSS grid-template-columns string based on active columns
function buildGridCols(hasHSN, hasTax, hasExcise) {
  // #, Name, Desc, [HSN], Unit, Qty, Price, Disc, [Tax], [BED, SED, Cess], Total, Del
  const cols = [
    '28px',       // #
    '1.5fr',      // Name
    '1fr',        // Description
    hasHSN ? '70px' : null,  // HSN
    '70px',       // Unit
    '60px',       // Qty
    '80px',       // Price
    '60px',       // Disc%
    hasTax ? '90px' : null,  // Tax%
    hasExcise ? '60px' : null, // BED%
    hasExcise ? '60px' : null, // SED%
    hasExcise ? '60px' : null, // Cess%
    '80px',       // Total
    '28px',       // Delete
  ].filter(Boolean).join(' ');
  return cols;
}

export default InvoiceForm;
