import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { Plus, Trash2, Save, Calendar, Truck } from 'lucide-react';
import Modal from '../components/Modal';
import ClientForm from './ClientForm';

const InvoiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from URL
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Toggle States for Extras
  const [showShipping, setShowShipping] = useState(false);
  const [showDiscountTotal, setShowDiscountTotal] = useState(false);
  const [showDiscountToAll, setShowDiscountToAll] = useState(false);
  const [discountToAll, setDiscountToAll] = useState('');
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showTransport, setShowTransport] = useState(false);
  
  // Transport Dropdown State
  const [showTransportDropdown, setTransportDropdown] = useState(false);
  const [transportSearch, setTransportSearch] = useState('');

  const toggleTransportDropdown = () => {
    setTransportDropdown(!showTransportDropdown);
    if (!showTransportDropdown) {
        setTransportSearch('');
    }
  };

  const [formData, setFormData] = useState({
    clientRef: '',
    invoiceNo: 'Auto-generated', 
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    poDate: '',
    dueDate: '',
    paymentMode: '',
    paymentTerms: 'On Receipt',
    status: 'DRAFT',
    
    // Arrays / Objects
    items: [
      {
        name: '',
        description: '',
        unit: 'pcs',
        qty: 1,
        rate: 0,
        discount: 0, 
        taxRate: 0,
        amount: 0
      },
    ],
    
    shippingCharges: 0,
    packagingCharges: 0, 
    customChargeLabel: 'Custom Amount',
    discountTotal: 0,
    advancePaid: 0,
    
    notes: '',
    terms: '',
    
    // Hidden / Background fields (still needed for backend)
    transport: {
        mode: 'Road', // Default
        vehicleNumber: '',
        eWayBillNo: '',
        // poNumber mapped to top level
    },
     shippingAddress: {
      line1: '',
      city: '',
      state: '',
      zip: '',
    },
  });
  
  useEffect(() => {
    fetchDependencies();
    if (id) {
        fetchInvoice(id);
    }
  }, [id]);

  const fetchDependencies = async () => {
    try {
      const [clientsRes, itemsRes] = await Promise.all([
        api.get('/clients'),
        api.get('/items'),
      ]);
      setClients(clientsRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  const fetchInvoice = async (invoiceId) => {
      try {
          setLoading(true);
          const response = await api.get(`/invoices/${invoiceId}`);
          const invoice = response.data;
          
          // Format Dates for Input
          const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

          setFormData({
              ...invoice,
              clientRef: invoice.client?.clientRef || invoice.clientRef, // Handle snapshot structure or direct ref
              date: formatDate(invoice.date),
              dueDate: formatDate(invoice.dueDate),
              poDate: formatDate(invoice.poDate || invoice.transport?.poDate),
              poNumber: invoice.poNumber || invoice.transport?.poNumber || '',
              status: invoice.status || 'DRAFT',
              // Ensure objects exist
              transport: invoice.transport || { mode: 'Road' },
              shippingAddress: invoice.shippingAddress || {},
              items: invoice.items || [],
          });

          // Set Toggle States based on values
          if (invoice.shippingCharges > 0) setShowShipping(true);
          if (invoice.packagingCharges > 0) setShowCustomAmount(true);
          if (invoice.discountTotal > 0) setShowDiscountTotal(true);
          if (invoice.advancePaid > 0) setShowAdvance(true);

      } catch (error) {
          console.error('Error fetching invoice:', error);
          alert('Failed to load invoice details');
          navigate('/invoices');
      } finally {
          setLoading(false);
      }
  };

  // Calculations
  const calculateRowTotal = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const descPercent = Number(item.discount) || 0;
    
    const baseVal = qty * rate;
    const discVal = baseVal * (descPercent / 100);
    const taxable = baseVal - discVal;
    
    const taxVal = taxable * (Number(item.taxRate) / 100);
    
    return taxable + taxVal;
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'name') {
         const selectedItem = items.find(i => i.name === value);
         if (selectedItem) {
             newItems[index].description = selectedItem.description || '';
             newItems[index].rate = selectedItem.rate || 0;
             newItems[index].unit = selectedItem.unit || 'pcs';
             newItems[index].taxRate = selectedItem.defaultTaxRate || 0;
             newItems[index].itemRef = selectedItem._id;
         }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { name: '', description: '', unit: 'pcs', qty: 1, rate: 0, discount: 0, taxRate: 0, amount: 0 },
      ],
    });
  };
  
  const removeItemRow = (index) => {
      if (formData.items.length > 1) {
          const newItems = formData.items.filter((_, i) => i !== index);
          setFormData({ ...formData, items: newItems });
      }
  };

  const getSubTotal = () => {
    return formData.items.reduce((acc, item) => acc + calculateRowTotal(item), 0);
  };

  const getGrandTotal = () => {
    const sub = getSubTotal();
    const ship = Number(formData.shippingCharges) || 0;
    const custom = Number(formData.packagingCharges) || 0; // "Custom Amount"
    const disc = Number(formData.discountTotal) || 0;
    
    return sub + ship + custom - disc;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Map Top-level PO to transport object for backend compatibility
    const submissionData = {
        ...formData,
        transport: {
            ...formData.transport,
            poNumber: formData.poNumber,
            poDate: formData.poDate
        }
    };

    try {
      if (id) {
          await api.put(`/invoices/${id}`, submissionData);
          alert('Invoice updated successfully');
      } else {
          await api.post('/invoices', submissionData);
          alert('Invoice created successfully');
      }
      navigate('/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error.response?.data?.message || error.message);
      alert('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Top Header */}
      <div className="border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 bg-white z-10">
        <h1 className="text-xl font-bold text-blue-900">{id ? 'Edit Invoice' : 'Add New Invoice'}</h1>
        <div className="space-x-4">
             <button
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Save Invoice'}
            </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1600px] mx-auto">
        
        {/* Main Grid: Client & Details */}
        <div className="grid grid-cols-12 gap-8 mb-8">
            
            {/* Left: Client Selection */}
            <div className="col-span-4 space-y-4">
                <div className="flex bg-gray-50 p-1 rounded-md items-center">
                    <label className="w-24 text-sm font-medium text-gray-700 pl-3">Client name</label>
                    <div className="flex-1 relative">
                        <select 
                            className="w-full bg-white border border-gray-200 rounded py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
                            value={formData.clientRef}
                            onChange={(e) => setFormData({...formData, clientRef: e.target.value})}
                        >
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                         <button
                            type="button"
                            onClick={() => setIsClientModalOpen(true)}
                            className="absolute right-8 top-2 text-blue-600 hover:text-blue-800"
                            title="Add Client"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Invoice Meta Data */}
            <div className="col-span-8 grid grid-cols-3 gap-x-4 gap-y-4">
                
                {/* Row 1 */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Invoice no</label>
                    <div className="flex gap-1">
                         <input 
                            type="text" 
                            disabled 
                            value="INV" 
                            className="w-12 bg-gray-100 border border-gray-200 rounded px-2 py-1.5 text-xs text-center" 
                         />
                         <input 
                            type="text" 
                            value={formData.invoiceNo.replace('INV-', '')} 
                            disabled 
                            className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm font-medium" 
                         />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Invoice date</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            className="w-full border border-gray-200 rounded pl-8 pr-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                         <Calendar className="absolute left-2 top-2 text-gray-400" size={14} />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Due date</label>
                     <div className="relative">
                        <input 
                            type="date" 
                            className="w-full border border-gray-200 rounded pl-8 pr-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        />
                        <Calendar className="absolute left-2 top-2 text-gray-400" size={14} />
                    </div>
                </div>

                {/* Row 2 */}
                <div className="flex flex-col gap-1">
                     <label className="text-xs font-medium text-gray-500">PO no</label>
                     <input 
                        type="text" 
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                        value={formData.poNumber}
                        onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                     />
                </div>

                 <div className="flex flex-col gap-1">
                     <label className="text-xs font-medium text-gray-500">Status</label>
                     <select 
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none bg-white font-medium"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                     >
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="PAID">Paid</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="UNPAID">Unpaid</option>
                     </select>
                </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">PO date</label>
                    <div className="relative">
                        <input 
                            type="date" 
                            className="w-full border border-gray-200 rounded pl-8 pr-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                            value={formData.poDate}
                            onChange={(e) => setFormData({...formData, poDate: e.target.value})}
                        />
                         <Calendar className="absolute left-2 top-2 text-gray-400" size={14} />
                    </div>
                </div>

                 <div className="flex flex-col gap-1">
                     <label className="text-xs font-medium text-gray-500">Payment Mode</label>
                     <select 
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none bg-white"
                        value={formData.paymentMode}
                        onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                     >
                        <option value="">Select</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                     </select>
                </div>
                
                 {/* Row 3 */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Payment terms</label>
                    <select 
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:border-blue-500 outline-none bg-white"
                        value={formData.paymentTerms}
                        onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                    >
                        <option value="On Receipt">On Receipt</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 45">Net 45</option>
                        <option value="Net 60">Net 60</option>
                    </select>
                 </div>
            </div>
        </div>

        <div className="my-6">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Invoice</h3>
            
            {/* Items Table Header */}
            <div className="bg-[#E8EFF5] border border-gray-200 border-b-0 rounded-t-md grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-600">
                <div className="col-span-1">No</div>
                <div className="col-span-3">Item Name</div>
                <div className="col-span-2">Description</div>
                <div className="col-span-1">Unit</div>
                <div className="col-span-1">QTY</div>
                <div className="col-span-1">Price</div>
                <div className="col-span-2">Discount (%)</div>
                <div className="col-span-1 text-right">Total</div>
            </div>

            {/* Items Rows */}
            <div className="border border-gray-200 rounded-b-md bg-white">
                {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 items-start hover:bg-gray-50">
                        <div className="col-span-1 pt-2 text-gray-500 text-sm">{index + 1}</div>
                        
                        <div className="col-span-3">
                            <input 
                                list={`item-options-${index}`}
                                placeholder="Select Item"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                value={item.name}
                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                            />
                            <datalist id={`item-options-${index}`}>
                                {items.map(i => <option key={i._id} value={i.name} />)}
                            </datalist>
                        </div>

                        <div className="col-span-2">
                             <input 
                                placeholder="Description"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-gray-500"
                                value={item.description}
                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                            />
                        </div>

                        <div className="col-span-1">
                              <select 
                                className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:border-blue-500 outline-none bg-white"
                                value={item.unit}
                                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              >
                                  <option value="pcs">pcs</option>
                                  <option value="box">box</option>
                                  <option value="kg">kg</option>
                                  <option value="ft">ft</option>
                              </select>
                        </div>

                        <div className="col-span-1">
                             <input 
                                type="number"
                                min="1"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-right"
                                value={item.qty}
                                onChange={(e) => updateItem(index, 'qty', e.target.value)}
                            />
                        </div>

                         <div className="col-span-1">
                             <input 
                                type="number"
                                min="0"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-right"
                                value={item.rate}
                                onChange={(e) => updateItem(index, 'rate', e.target.value)}
                            />
                        </div>

                        <div className="col-span-2 flex gap-2">
                             <input 
                                type="number"
                                placeholder="%"
                                min="0"
                                className="w-20 border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-right"
                                value={item.discount}
                                onChange={(e) => updateItem(index, 'discount', e.target.value)}
                            />
                             <select 
                                className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm focus:border-blue-500 outline-none text-gray-500"
                                value={item.taxRate}
                                onChange={(e) => updateItem(index, 'taxRate', e.target.value)}
                             >
                                 <option value="0">0% Tax</option>
                                 <option value="5">5% GST</option>
                                 <option value="12">12% GST</option>
                                 <option value="18">18% GST</option>
                                 <option value="28">28% GST</option>
                             </select>
                        </div>

                        <div className="col-span-1 text-right pt-2 font-medium text-gray-800">
                             {calculateRowTotal(item).toFixed(2)}
                             <button onClick={() => removeItemRow(index)} className="ml-2 text-red-400 hover:text-red-600 float-right mt-1">
                                 <Trash2 size={14} />
                             </button>
                        </div>
                    </div>
                ))}

                <div className="p-4 bg-white rounded-b-md">
                     <button
                        type="button"
                        onClick={addItemRow}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-1 transition-colors"
                    >
                        <Plus size={16} /> Add line
                    </button>
                </div>
            </div>
            <div className="text-right text-xs text-gray-400 mt-1">1000 characters left</div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-12 gap-8">
            
            {/* Left Options - Specific Grid Layout from Screenshot */}
            <div className="col-span-7 space-y-6">
                 
                 {/* Shipping */}
                 <div className="grid grid-cols-12 gap-4 items-center">
                     <div className="col-span-12 flex items-center mb-1">
                        <input 
                            type="checkbox" 
                            id="check-shipping" 
                            checked={showShipping}
                            onChange={(e) => setShowShipping(e.target.checked)}
                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-gray-300 cursor-pointer accent-emerald-500" 
                        />
                        <label htmlFor="check-shipping" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Add shipping charges</label>
                     </div>
                     {showShipping && (
                        <div className="col-span-12 flex items-center gap-4 pl-8">
                             {/* Custom Searchable Dropdown for Transport Mode */}
                             <div className="relative w-48">
                                <div 
                                    className="px-3 py-2 border border-blue-300 rounded text-sm bg-white cursor-pointer flex justify-between items-center text-gray-700 font-medium"
                                    onClick={() => toggleTransportDropdown()}
                                >
                                    {formData.transport.mode || 'Road'}
                                    <span className="text-xs text-blue-400">▲</span>
                                </div>
                                
                                {showTransportDropdown && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-blue-300 rounded shadow-lg p-2">
                                        <input 
                                            type="text" 
                                            placeholder="Type to search" 
                                            className="w-full border border-blue-200 rounded px-2 py-1 text-xs mb-2 focus:outline-none focus:border-blue-400"
                                            autoFocus
                                            value={transportSearch}
                                            onChange={(e) => setTransportSearch(e.target.value)}
                                        />
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {['Road', 'Rail', 'Air', 'Ship/Road cum Ship']
                                                .filter(opt => opt.toLowerCase().includes(transportSearch.toLowerCase()))
                                                .map(opt => (
                                                    <div 
                                                        key={opt}
                                                        className={`px-2 py-1 text-sm rounded cursor-pointer ${formData.transport.mode === opt ? 'bg-gray-500 text-white' : 'hover:bg-blue-50 text-gray-700'}`}
                                                        onClick={() => {
                                                            setFormData({...formData, transport: {...formData.transport, mode: opt}});
                                                            setTransportDropdown(false);
                                                            setTransportSearch('');
                                                        }}
                                                    >
                                                        {opt}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                             </div>

                             <input 
                                type="number" 
                                className="px-3 py-2 border border-gray-300 rounded w-48 text-sm focus:outline-none focus:border-emerald-500"
                                placeholder="Shipping Amount"
                                value={formData.shippingCharges}
                                onChange={(e) => setFormData({...formData, shippingCharges: e.target.value})}
                             />
                        </div>
                     )}
                 </div>

                 {/* Discount On Total */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                     <div className="col-span-12 flex items-center mb-1">
                        <input 
                            type="checkbox" 
                            id="check-discount"
                            checked={showDiscountTotal}
                            onChange={(e) => setShowDiscountTotal(e.target.checked)}
                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-gray-300 cursor-pointer accent-emerald-500" 
                        />
                        <label htmlFor="check-discount" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Add Discount On Total</label>
                     </div>
                     {showDiscountTotal && (
                        <div className="col-span-12 pl-8">
                            <input 
                                type="number" 
                                className="px-3 py-2 border border-blue-300 rounded w-48 text-sm focus:outline-none focus:border-emerald-500"
                                placeholder="0"
                                value={formData.discountTotal}
                                onChange={(e) => setFormData({...formData, discountTotal: e.target.value})}
                             />
                             <p className="text-[10px] text-gray-400 mt-1">By enabling this feature gstr1 report does not match with invoices report</p>
                        </div>
                     )}
                 </div>

                 {/* Discount to All */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                     <div className="col-span-12 flex items-center mb-1">
                        <input 
                            type="checkbox" 
                            id="check-disc-all"
                            checked={showDiscountToAll}
                            onChange={(e) => setShowDiscountToAll(e.target.checked)}
                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-gray-300 cursor-pointer accent-emerald-500" 
                        />
                        <label htmlFor="check-disc-all" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Add discount to all</label>
                     </div>
                     {showDiscountToAll && (
                         <div className="col-span-12 pl-8 flex items-center gap-2">
                             <input 
                                type="number" 
                                className="px-3 py-2 border border-gray-300 rounded w-32 text-sm focus:outline-none focus:border-emerald-500"
                                placeholder=""
                                value={discountToAll}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setDiscountToAll(val);
                                    // Apply to all items
                                    const newItems = formData.items.map(item => ({...item, discount: val}));
                                    setFormData({...formData, items: newItems});
                                }}
                             />
                             <div className="relative">
                                  <select className="px-3 py-2 border border-gray-300 rounded w-20 text-sm focus:outline-none focus:border-emerald-500 text-gray-600 bg-white appearance-none">
                                     <option>%</option>
                                 </select>
                                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                  </div>
                             </div>
                         </div>
                     )}
                 </div>

                   {/* Custom Amount */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                     <div className="col-span-12 flex items-center mb-1">
                        <input 
                            type="checkbox" 
                            id="check-custom"
                            checked={showCustomAmount}
                            onChange={(e) => setShowCustomAmount(e.target.checked)}
                            className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-gray-300 cursor-pointer accent-emerald-500" 
                        />
                        <label htmlFor="check-custom" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Add Custom Amount</label>
                     </div>
                      {showCustomAmount && (
                         <div className="col-span-12 pl-8 flex items-center gap-4">
                             <input 
                                type="text"
                                className="px-3 py-2 border border-gray-300 rounded w-48 text-sm focus:outline-none focus:border-emerald-500 text-gray-500 placeholder-gray-400"
                                placeholder="Custom Amount Label"
                                value={formData.customChargeLabel}
                                onChange={(e) => setFormData({...formData, customChargeLabel: e.target.value})}
                             />
                             <input 
                                type="number" 
                                className="px-3 py-2 border border-gray-300 rounded w-48 text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-400"
                                placeholder="Custom Amount"
                                value={formData.packagingCharges}
                                onChange={(e) => setFormData({...formData, packagingCharges: e.target.value})}
                             />
                         </div>
                     )}
                 </div>

                 {/* Advance and Transport removed for now to match screenshot focus, or kept separate? 
                     Screenshot finishes at Custom Amount. I will keep Advance/Transport but maybe below or minimize them if user didn't ask to remove. 
                     The user said "make it like this", implying the "Extra Charges" area. I'll keep others but styled consistently if needed.
                 */}
                  <div className="pt-4 border-t border-gray-100">
                     <button 
                        type="button" 
                        onClick={() => setShowAdvance(!showAdvance)}
                        className="text-blue-500 text-sm font-medium flex items-center gap-1 hover:text-blue-700"
                     >
                         <Plus size={14} /> Add advance payment
                     </button>
                      {showAdvance && (
                         <div className="mt-2 flex items-center gap-2 pl-6">
                              <label className="text-xs text-gray-500">Amount Paid:</label>
                              <input 
                                type="number" 
                                className="w-32 border border-blue-200 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none bg-blue-50"
                                value={formData.advancePaid}
                                onChange={(e) => setFormData({...formData, advancePaid: e.target.value})}
                             />
                         </div>
                     )}
                  </div>
            </div>

            {/* Right Totals - Matched to Screenshot */}
            <div className="col-span-5 relative">
                 <div className="bg-white p-4 space-y-2">
                     <div className="flex justify-between text-sm font-bold text-gray-800">
                         <span>Subtotal:</span>
                         <span>₹ {getSubTotal().toFixed(2)}</span>
                     </div>
                     
                     <div className="flex justify-between text-sm font-bold text-gray-800">
                         <span>Shipping & Packaging charges:</span>
                         <span>₹ {(Number(formData.shippingCharges) + Number(formData.packagingCharges)).toFixed(2)}</span>
                     </div>
                     
                     <div className="flex justify-between text-sm font-bold text-gray-800">
                         <span>Discount On Total</span>
                         <div className="text-right">
                             <span className="text-gray-500 mr-1">(-)</span>
                             <span>₹ {Number(formData.discountTotal).toFixed(2)}</span>
                         </div>
                     </div>
                     
                     {/* Placeholder for Round off if needed, screenshot shows 0.00 above total */}
                      <div className="flex justify-between text-sm font-bold text-gray-800">
                         <span></span>
                         <span>₹ 0.00</span>
                     </div>

                     <div className="border border-green-100 bg-green-50 rounded px-4 py-2 mt-4 flex justify-between items-center">
                         <span className="text-green-600 font-bold text-lg">Total:</span>
                         <span className="text-green-600 font-bold text-lg">₹ {getGrandTotal().toFixed(2)}</span>
                     </div>
                 </div>
            </div>
        </div>
        
        {/* Footer Text Areas */}
        <div className="grid grid-cols-2 gap-8 mt-8 border-t border-gray-100 pt-6">
            <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Terms & Conditions</label>
                <textarea 
                    className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none h-24 resize-none"
                    placeholder="Enter terms and conditions..."
                    value={formData.terms}
                    onChange={(e) => setFormData({...formData, terms: e.target.value})}
                ></textarea>
            </div>
            <div>
                 <label className="block text-xs font-bold text-gray-600 mb-2">Private notes (not shown to client)</label>
                <textarea 
                    className="w-full border border-gray-200 rounded p-2 text-sm focus:border-blue-500 outline-none h-24 resize-none"
                    placeholder="Enter private notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
            </div>
        </div>
        
      </div>
      
       <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Create New Client"
      >
        <ClientForm 
          onSuccess={(newClient) => {
            setClients([newClient, ...clients]);
            setFormData({ ...formData, clientRef: newClient._id });
            setIsClientModalOpen(false);
          }}
          onCancel={() => setIsClientModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default InvoiceForm;
