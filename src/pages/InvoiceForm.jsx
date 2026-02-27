import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaTrash, FaChevronDown, FaUpload } from 'react-icons/fa';
import Modal from '../components/Modal';
import ClientForm from './ClientForm';
import ItemForm from './ItemForm';
import Skeleton from '../components/Skeleton';
import CsvUploader from '../components/CsvUploader';

const INVOICE_TYPES = ['Invoice', 'Retail Invoice', 'Tax Invoice', 'Excise Invoice'];

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

const InvoiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const queryType = new URLSearchParams(location.search).get('type') || 'Tax Invoice';
  const [clients, setClients] = useState([]);
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
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showTransportDropdown, setTransportDropdown] = useState(false);
  const [transportSearch, setTransportSearch] = useState('');

  const [formData, setFormData] = useState({
    invoiceType: queryType,
    clientRef: '',
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
    shippingAddress: { line1: '', city: '', state: '', zip: '' },
    exciseDuty: {
      bedPercent: 0, sedPercent: 0, cessPercent: 0,
      manufacturerName: '', manufacturerAddress: '', rangeCode: '',
    },
  });

  const invoiceType = formData.invoiceType;
  const hasTax = TAX_TYPES[invoiceType];
  const hasHSN = SHOW_HSN[invoiceType];
  const hasExcise = SHOW_EXCISE[invoiceType];

  useEffect(() => {
    fetchDependencies();
    if (id) fetchInvoice(id);
  }, [id]);

  const fetchDependencies = async () => {
    try {
      const [cr, ir] = await Promise.all([api.get('/clients?limit=1000'), api.get('/items?limit=1000')]);
      setClients(cr.data.data || []);
      setItemsList(ir.data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchInvoice = async (invoiceId) => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices/${invoiceId}`);
      const inv = res.data;
      const fmt = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
      setFormData({
        ...inv,
        clientRef: inv.client?.clientRef || inv.clientRef,
        date: fmt(inv.date),
        dueDate: fmt(inv.dueDate),
        poDate: fmt(inv.poDate || inv.transport?.poDate),
        poNumber: inv.poNumber || inv.transport?.poNumber || '',
        status: inv.status || 'DRAFT',
        transport: inv.transport || { mode: 'Road' },
        shippingAddress: inv.shippingAddress || {},
        exciseDuty: inv.exciseDuty || { bedPercent: 0, sedPercent: 0, cessPercent: 0 },
        items: (inv.items || []).map(i => ({ ...emptyItem(), ...i })),
      });
      if (inv.shippingCharges > 0) setShowShipping(true);
      if (inv.packagingCharges > 0) setShowCustomAmount(true);
      if (inv.discountTotal > 0) setShowDiscountTotal(true);
      if (inv.advancePaid > 0) setShowAdvance(true);
    } catch (e) {
      console.error(e);
      alert('Failed to load invoice');
      navigate('/invoices');
    } finally { setLoading(false); }
  };

  // ── Calculations ──────────────────────────────────────────────
  const calcRow = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;
    const taxable = qty * rate * (1 - disc / 100);
    const gst = hasTax ? taxable * (Number(item.taxRate) / 100) : 0;
    let excise = 0;
    if (hasExcise) {
      const bed = taxable * (Number(item.bedPercent) / 100);
      const sed = taxable * (Number(item.sedPercent) / 100);
      const cess = (bed + sed) * (Number(item.cessPercent) / 100);
      excise = bed + sed + cess;
    }
    return taxable + gst + excise;
  };

  const getSubTotal = () => formData.items.reduce((a, i) => a + calcRow(i), 0);

  const getGrandTotal = () => {
    const sub = getSubTotal();
    const ship = Number(formData.shippingCharges) || 0;
    const custom = Number(formData.packagingCharges) || 0;
    const disc = Number(formData.discountTotal) || 0;
    return sub + ship + custom - disc;
  };

  const getTaxBreakdown = () => {
    let cgst = 0, sgst = 0, igst = 0;
    if (!hasTax) return { cgst, sgst, igst };
    formData.items.forEach(item => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const disc = Number(item.discount) || 0;
      const taxable = qty * rate * (1 - disc / 100);
      const tax = taxable * (Number(item.taxRate) / 100);
      // Assume IGST if place of supply differs — simplified: always CGST+SGST for now
      cgst += tax / 2;
      sgst += tax / 2;
    });
    return { cgst, sgst, igst };
  };

  // ── Item helpers ──────────────────────────────────────────────
  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'name') {
      const found = itemsList.find(i => i.name === value);
      if (found) {
        newItems[index].description = found.description || '';
        newItems[index].rate = found.salesInfo?.price || found.rate || 0;
        newItems[index].unit = found.unit || 'pcs';
        newItems[index].taxRate = found.defaultTaxRate || 0;
        newItems[index].hsnCode = found.hsnCode || '';
        newItems[index].itemRef = found._id;
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
      
      const taxParam = Number(row.TaxRate || row.taxRate || row.Tax || row.tax) || 0;
      it.taxRate = taxParam;
      
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
    if (!formData.clientRef || formData.clientRef === '_CREATE_NEW_') {
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

  const { cgst, sgst } = getTaxBreakdown();
  
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
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-60">
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
                  className={inp}
                  value={formData.clientRef}
                  onChange={(e) => {
                    if (e.target.value === '_CREATE_NEW_') setIsClientModalOpen(true);
                    else setFormData({ ...formData, clientRef: e.target.value });
                  }}
                >
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  <option value="_CREATE_NEW_" className="font-bold text-blue-600">+ Create New Client</option>
                </select>
              </div>
            </div>

            {/* Place of Supply — only for Tax/Excise */}
            {(invoiceType === 'Tax Invoice' || invoiceType === 'Excise Invoice') && (
              <div>
                <label className={lbl}>Place of Supply</label>
                <input className={inp} placeholder="e.g. Delhi" value={formData.placeOfSupply}
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
              <input className={`${inp} bg-gray-50 text-gray-400`} value={formData.invoiceNo} disabled />
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
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={lbl}>PO No.</label>
              <input className={inp} value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>PO Date</label>
              <div className="relative">
                <input type="date" className={inp} value={formData.poDate}
                  onChange={(e) => setFormData({ ...formData, poDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={inp} value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
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
                  <div className="flex gap-1">
                     <input list={`items-${index}`} placeholder="Select item"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                        value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} />
                     <button type="button" onClick={() => { setPendingItemIndex(index); setIsItemModalOpen(true); }}
                        className="px-2 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 transition-colors" title="Add New Item">
                        <FaPlus size={10} />
                     </button>
                  </div>
                  <datalist id={`items-${index}`}>
                    {itemsList.map(i => <option key={i._id} value={i.name} />)}
                  </datalist>
                </div>

                {/* Description */}
                <div>
                  <input placeholder="Description"
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
                  <input type="number" min="0" className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                    value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} />
                </div>

                {/* Price */}
                <div>
                  <input type="number" min="0" className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
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
                        value={item.taxRate}
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
                        <input type="number" min="0" autoFocus placeholder="Tax %"
                          className="w-full border border-blue-400 rounded px-2 py-1.5 text-sm bg-blue-50 outline-none pr-6"
                          value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', e.target.value)} />
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
                      <input type="number" min="0" placeholder="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                        value={item.bedPercent} onChange={(e) => updateItem(index, 'bedPercent', e.target.value)} />
                    </div>
                    <div>
                      <input type="number" min="0" placeholder="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                        value={item.sedPercent} onChange={(e) => updateItem(index, 'sedPercent', e.target.value)} />
                    </div>
                    <div>
                      <input type="number" min="0" placeholder="0"
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 outline-none"
                        value={item.cessPercent} onChange={(e) => updateItem(index, 'cessPercent', e.target.value)} />
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
                <input type="checkbox" checked={showShipping} onChange={(e) => setShowShipping(e.target.checked)}
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
                  <input type="number" placeholder="Amount" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-40 outline-none focus:border-blue-500"
                    value={formData.shippingCharges} onChange={(e) => setFormData({ ...formData, shippingCharges: e.target.value })} />
                </div>
              )}
            </div>

            {/* Discount on Total */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showDiscountTotal} onChange={(e) => setShowDiscountTotal(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm font-medium text-gray-700">Add Discount on Total</span>
              </label>
              {showDiscountTotal && (
                <div className="mt-2 pl-6">
                  <input type="number" placeholder="0" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-40 outline-none focus:border-blue-500"
                    value={formData.discountTotal} onChange={(e) => setFormData({ ...formData, discountTotal: e.target.value })} />
                  <p className="text-[10px] text-gray-400 mt-1">Note: Enabling this may affect GSTR-1 report accuracy.</p>
                </div>
              )}
            </div>

            {/* Discount to All */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showDiscountToAll} onChange={(e) => setShowDiscountToAll(e.target.checked)}
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
                <input type="checkbox" checked={showCustomAmount} onChange={(e) => setShowCustomAmount(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm font-medium text-gray-700">Add Custom Amount</span>
              </label>
              {showCustomAmount && (
                <div className="mt-2 pl-6 flex gap-3">
                  <input type="text" placeholder="Label" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-44 outline-none focus:border-blue-500"
                    value={formData.customChargeLabel} onChange={(e) => setFormData({ ...formData, customChargeLabel: e.target.value })} />
                  <input type="number" placeholder="Amount" className="border border-gray-200 rounded px-3 py-1.5 text-sm w-40 outline-none focus:border-blue-500"
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
                <div className="mt-2 pl-6 flex items-center gap-2">
                  <label className="text-xs text-gray-500">Amount Paid:</label>
                  <input type="number" className="border border-blue-200 rounded px-2 py-1.5 text-sm w-36 outline-none bg-blue-50 focus:border-blue-500"
                    value={formData.advancePaid} onChange={(e) => setFormData({ ...formData, advancePaid: e.target.value })} />
                </div>
              )}
            </div>
          </div>

          {/* Right: Totals */}
          <div className="col-span-5">
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold">₹ {getSubTotal().toFixed(2)}</span>
              </div>

              {hasTax && (
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

              {showShipping && Number(formData.shippingCharges) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>₹ {Number(formData.shippingCharges).toFixed(2)}</span>
                </div>
              )}
              {showCustomAmount && Number(formData.packagingCharges) > 0 && (
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

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-base font-bold text-gray-800">Grand Total</span>
                <span className="text-lg font-bold text-blue-700">₹ {getGrandTotal().toFixed(2)}</span>
              </div>

              {showAdvance && Number(formData.advancePaid) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Advance Paid</span>
                    <span>- ₹ {Number(formData.advancePaid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 pt-2">
                    <span>Balance Due</span>
                    <span>₹ {Math.max(0, getGrandTotal() - Number(formData.advancePaid)).toFixed(2)}</span>
                  </div>
                </>
              )}
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
