import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaChevronDown, FaFileAlt, FaArrowRight, FaFilePdf } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import QuotaIndicator from '../components/QuotaIndicator';
import PdfInvoiceImporter from '../components/PdfInvoiceImporter';

const PurchaseOrderList = () => {
  const navigate = useNavigate();
  const STATUS_OPTIONS = ['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'RECEIVED', 'REJECTED', 'BILLED', 'CANCELLED'];
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPurchaseOrders();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, statusFilter, page, rowsPerPage]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/purchase-orders?page=${page}&limit=${rowsPerPage}&search=${encodeURIComponent(searchTerm)}&status=${encodeURIComponent(statusFilter)}`);
      setPurchaseOrders(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchaseOrder?')) return;
    try { await api.delete(`/purchase-orders/${id}`); fetchPurchaseOrders(); }
    catch (e) { alert('Failed to delete'); }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this purchaseOrder to an Invoice?')) return;
    try {
      const res = await api.post(`/purchase-orders/${id}/convert`);
      alert(`Invoice ${res.data.invoice.invoiceNo} created!`);
      navigate(`/invoices/${res.data.invoice._id}/print`);
    } catch (e) { alert(e.response?.data?.message || 'Conversion failed'); }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === purchaseOrders.length ? [] : purchaseOrders.map(q => q._id));

  const handleCsvParsed = async (data) => {
    setIsImporting(true);
    try {
      const grouped = {};
      data.forEach(row => {
        const getVal = (keys) => {
           for (const key of keys) {
             if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
               return row[key];
             }
           }
           return undefined;
        };

        const id = getVal(['PurchaseOrder No', 'Draft No', 'ID', 'Id', 'id', 'PurchaseOrder Number']) || Math.random().toString();
        if (!grouped[id]) {
          grouped[id] = {
            vendorName: getVal(['Vendor Name', 'Vendor', 'Customer Name', 'Customer']),
            vendorEmail: getVal(['Vendor Email', 'Email', 'Customer Email']) || '',
            vendorPhone: getVal(['Vendor Phone', 'Phone', 'Customer Phone', 'Contact']) || '',
            vendorGST: getVal(['Vendor GSTIN', 'Vendor GST', 'GSTIN']) || '',
            vendorState: getVal(['Vendor State', 'State', 'Place of Supply']) || '',
            placeOfSupply: getVal(['Place of Supply', 'Vendor State', 'State']) || '',
            invoiceType: getVal(['Invoice Type', 'Type', 'Document Type']) || 'Tax Invoice',
            refNumber: getVal(['Reference Number', 'Ref Number', 'Reference']) || '',
            date: getVal(['Date', 'PurchaseOrder Date', 'Issue Date']) || undefined,
            validUntil: getVal(['Valid Until', 'Valid']) || undefined,
            paymentMode: getVal(['Payment Mode']) || '',
            paymentTerms: getVal(['Payment Terms']) || '',
            status: getVal(['Status']) || 'DRAFT',
            shippingCharges: Number(getVal(['Shipping Charges', 'Shipping', 'Freight'])) || 0,
            packagingCharges: Number(getVal(['Packaging Charges', 'Packaging'])) || 0,
            customChargeLabel: getVal(['Custom Charge Label']) || 'Custom Amount',
            discountTotal: Number(getVal(['Discount Total', 'Discount'])) || 0,
            notes: getVal(['Notes']) || '',
            privateNotes: getVal(['Private Notes']) || '',
            terms: getVal(['Terms']) || '',
            shippingAddress: {
              line1: getVal(['Shipping Address Line 1', 'Shipping Line 1']) || '',
              line2: getVal(['Shipping Address Line 2', 'Shipping Line 2']) || '',
              city: getVal(['Shipping City']) || '',
              state: getVal(['Shipping State']) || '',
              zip: getVal(['Shipping ZIP', 'Shipping Zip']) || '',
            },
            transport: {
              mode: getVal(['Transport Mode']) || '',
              vehicleNumber: getVal(['Vehicle Number']) || '',
              poNumber: getVal(['Transport PO Number', 'PO Number']) || '',
              poDate: getVal(['Transport PO Date', 'PO Date']) || undefined,
              eWayBillNo: getVal(['E-Way Bill No', 'EWay Bill No', 'E Way Bill No']) || '',
            },
            items: []
          };
        }
        
        const itemName = getVal(['Item Name', 'Item', 'Product Name', 'Product', 'Description']);
        if (itemName) {
           grouped[id].items.push({
             name: itemName,
             description: getVal(['Item Description', 'Desc', 'Details']) || '',
             hsnCode: getVal(['HSN/SAC', 'HSN Code', 'HSN']) || '',
             unit: getVal(['Unit']) || 'pcs',
             qty: Number(getVal(['Qty', 'QTY', 'Quantity', 'Quantity '])) || 1,
             rate: Number(getVal(['Rate', 'Price', 'Unit Price'])) || 0,
             taxRate: Number(getVal(['Tax Rate', 'Tax', 'Tax %', 'GST', 'IGST'])) || 0,
             discount: Number(getVal(['Item Discount', 'Disc'])) || 0 
           });
        }
      });

      const formattedPurchaseOrders = Object.values(grouped).filter(q => q.vendorName);

      if (formattedPurchaseOrders.length === 0) {
        alert('No valid purchaseOrders found. Ensure the "Vendor Name" column exists.');
        setIsImporting(false);
        return;
      }

      await api.post('/purchase-orders/bulk', { purchaseOrders: formattedPurchaseOrders });
      alert(`Successfully imported ${formattedPurchaseOrders.length} purchaseOrders!`);
      setIsCsvModalOpen(false);
      setLoading(true);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Bulk import error:', error);
      alert('Failed to import purchaseOrders: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsImporting(false);
    }
  };

  const displayed = purchaseOrders; // Backend pagination
  const buildPurchaseOrderExportRows = (rows) =>
    (rows || []).flatMap((purchaseOrder) => {
      const items = purchaseOrder.items?.length ? purchaseOrder.items : [{}];
      return items.map((item, index) => ({
        ...purchaseOrder,
        exportItemIndex: index + 1,
        exportItemName: item.name || '',
        exportItemDescription: item.description || '',
        exportItemHsnCode: item.hsnCode || '',
        exportItemUnit: item.unit || '',
        exportItemQty: item.qty || 0,
        exportItemRate: item.rate || 0,
        exportItemDiscount: item.discount || 0,
        exportItemTaxRate: item.taxRate || 0,
        exportItemTaxAmount: item.taxAmount || 0,
        exportItemAmount: item.amount || 0,
      }));
    });
  const exportRows = buildPurchaseOrderExportRows(
    selectedIds.length > 0 ? displayed.filter(q => selectedIds.includes(q._id)) : displayed
  );
  const fetchPurchaseOrdersForExport = async () => {
    const params = new URLSearchParams({
      all: 'true',
      search: searchTerm,
      status: statusFilter,
    });
    const res = await api.get(`/purchase-orders?${params.toString()}`);
    let exportPurchaseOrders = res.data.data || [];

    if (selectedIds.length > 0) {
      exportPurchaseOrders = exportPurchaseOrders.filter((purchaseOrder) => selectedIds.includes(purchaseOrder._id));
    }

    return buildPurchaseOrderExportRows(exportPurchaseOrders);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SENT: 'bg-blue-100 text-blue-700 border-blue-200',
    ACCEPTED: 'bg-green-100 text-green-700 border-green-200',
    RECEIVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    BILLED: 'bg-purple-100 text-purple-700 border-purple-200',
    CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const EXPORT_COLUMNS = [
    { header: 'PurchaseOrder No', key: 'poNumber' },
    { header: 'Reference Number', key: 'refNumber' },
    { header: 'Date', key: 'date' },
    { header: 'Valid Until', key: 'validUntil' },
    { header: 'Status', key: 'status' },
    { header: 'Invoice Type', key: 'invoiceType' },
    { header: 'Payment Mode', key: 'paymentMode' },
    { header: 'Payment Terms', key: 'paymentTerms' },
    { header: 'Place of Supply', key: 'placeOfSupply' },
    { header: 'Reverse Charge', key: 'reverseCharge' },
    { header: 'Vendor Name', key: 'vendor.name' },
    { header: 'Vendor GSTIN', key: 'vendor.gstin' },
    { header: 'Vendor Phone', key: 'vendor.phone' },
    { header: 'Vendor Email', key: 'vendor.email' },
    { header: 'Vendor Address Line 1', key: 'vendor.address.line1' },
    { header: 'Vendor Address Line 2', key: 'vendor.address.line2' },
    { header: 'Vendor City', key: 'vendor.address.city' },
    { header: 'Vendor State', key: 'vendor.address.state' },
    { header: 'Vendor ZIP', key: 'vendor.address.zip' },
    { header: 'Shipping Address Line 1', key: 'shippingAddress.line1' },
    { header: 'Shipping Address Line 2', key: 'shippingAddress.line2' },
    { header: 'Shipping City', key: 'shippingAddress.city' },
    { header: 'Shipping State', key: 'shippingAddress.state' },
    { header: 'Shipping ZIP', key: 'shippingAddress.zip' },
    { header: 'Transport Mode', key: 'transport.mode' },
    { header: 'Vehicle Number', key: 'transport.vehicleNumber' },
    { header: 'Transport PO Number', key: 'transport.poNumber' },
    { header: 'Transport PO Date', key: 'transport.poDate' },
    { header: 'E-Way Bill No', key: 'transport.eWayBillNo' },
    { header: 'Sub Total', key: 'subTotal' },
    { header: 'Tax Total', key: 'taxTotal' },
    { header: 'Total CGST', key: 'totalCGST' },
    { header: 'Total SGST', key: 'totalSGST' },
    { header: 'Total IGST', key: 'totalIGST' },
    { header: 'Shipping Charges', key: 'shippingCharges' },
    { header: 'Packaging Charges', key: 'packagingCharges' },
    { header: 'Custom Charge Label', key: 'customChargeLabel' },
    { header: 'Discount Total', key: 'discountTotal' },
    { header: 'Grand Total', key: 'grandTotal' },
    { header: 'Advance Paid', key: 'advancePaid' },
    { header: 'Balance Due', key: 'balanceDue' },
    { header: 'Notes', key: 'notes' },
    { header: 'Private Notes', key: 'privateNotes' },
    { header: 'Terms', key: 'terms' },
    { header: 'Item Line', key: 'exportItemIndex' },
    { header: 'Item Name', key: 'exportItemName' },
    { header: 'Item Description', key: 'exportItemDescription' },
    { header: 'HSN/SAC', key: 'exportItemHsnCode' },
    { header: 'Unit', key: 'exportItemUnit' },
    { header: 'Qty', key: 'exportItemQty' },
    { header: 'Rate', key: 'exportItemRate' },
    { header: 'Item Discount', key: 'exportItemDiscount' },
    { header: 'Tax Rate', key: 'exportItemTaxRate' },
    { header: 'Tax Amount', key: 'exportItemTaxAmount' },
    { header: 'Item Amount', key: 'exportItemAmount' },
  ];

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
          <p className="text-gray-500 mt-1">Create and manage quotations for your vendors</p>
        </div>
        <div className="flex gap-3">
          <ExportDropdown 
              data={exportRows}
              getExportData={fetchPurchaseOrdersForExport}
              filename="Flance_Purchase_Orders"
              columns={EXPORT_COLUMNS}
          />
          <button
             onClick={() => setIsPdfScannerOpen(true)}
             className="bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
           >
             <FaFilePdf size={16} /> Scan PDF
           </button>
          <button
             onClick={() => setIsCsvModalOpen(true)}
             className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
           >
             <FaFileAlt size={16} /> Bulk Import
           </button>
          <Link to="/purchase-orders/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
            <FaPlus size={16} /> New PurchaseOrder
          </Link>
        </div>
      </div>

      {/* Quota Indicator for Free Tier */}
      <QuotaIndicator type="purchaseOrders" />

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <div className="flex w-full items-center gap-3">
            <input type="text" placeholder="Search purchaseOrders..."
              className="w-full max-w-sm pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500 ml-4">Showing {displayed.length} of {totalRecords}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 font-sans">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 w-10 text-center">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {selectedIds.length === purchaseOrders.length && purchaseOrders.length > 0 ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">PO No.</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">HSN/SAC</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">Vendor</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">Date</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">Valid Until</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">Status</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">Amount</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-gray-100">
                    <td className="px-4 py-2 text-center"><Skeleton width="16px" height="16px" className="mx-auto" /></td>
                    <td className="px-4 py-2"><Skeleton width="80px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-4 py-2">
                      <Skeleton width="100px" height="16px" className="mb-1" />
                      <Skeleton width="60px" height="12px" />
                    </td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="20px" className="rounded-full" /></td>
                    <td className="px-4 py-2 text-right"><Skeleton width="60px" height="16px" className="ml-auto" /></td>
                    <td className="px-4 py-2 text-center"><Skeleton width="80px" height="16px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500 text-xs">No purchase orders found.</td></tr>
              ) : displayed.map(q => (
                <tr key={q._id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => toggleSelect(q._id)} className={selectedIds.includes(q._id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}>
                      {selectedIds.includes(q._id) ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <Link to={`/purchase-orders/${q._id}/print`} className="text-blue-600 text-xs font-semibold hover:text-blue-800 hover:underline">
                      {q.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                    {[...new Set((q.items || []).map(it => it.hsnCode).filter(Boolean))].join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-xs font-semibold text-gray-900">{q.vendor?.name}</div>
                    {q.vendor?.gstin && <div className="text-[10px] text-gray-400 mt-0.5">{q.vendor.gstin}</div>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{fmtDate(q.date)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                    {q.validUntil ? (
                      <span className={new Date(q.validUntil) < new Date() && !['BILLED', 'RECEIVED', 'CANCELLED'].includes(q.status) ? 'text-red-500 font-medium' : ''}>
                        {fmtDate(q.validUntil)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {q.status === 'BILLED' ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[q.status] || STATUS_STYLES.DRAFT}`}>
                        {q.status}
                      </span>
                    ) : (
                      <select
                         value={q.status || 'DRAFT'}
                         onChange={async (e) => {
                             const newStatus = e.target.value;
                             try {
                                 await api.put(`/purchase-orders/${q._id}/status`, { status: newStatus });
                                 fetchPurchaseOrders();
                             } catch (err) {
                                 alert(err.response?.data?.message || 'Failed to update status');
                             }
                         }}
                         className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent transition-colors text-center appearance-none ${
                             q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 border-green-200' :
                             q.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                             q.status === 'SENT' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                             q.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' :
                             q.status === 'CANCELLED' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                             q.status === 'DRAFT' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                             'bg-gray-100 text-gray-700 border-gray-200'
                         }`}
                      >
                          <option value="DRAFT" className="bg-white text-gray-700">DRAFT</option>
                          <option value="SENT" className="bg-white text-gray-700">SENT</option>
                          <option value="ACCEPTED" className="bg-white text-gray-700">ACCEPTED</option>
                          <option value="RECEIVED" className="bg-white text-gray-700">RECEIVED</option>
                          <option value="REJECTED" className="bg-white text-gray-700">REJECTED</option>
                          <option value="CANCELLED" className="bg-white text-gray-700">CANCELLED</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                    ₹{fmt(q.grandTotal)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2 items-center">
                      <Link to={`/purchase-orders/${q._id}/print`} className="text-gray-400 hover:text-blue-600 transition-colors" title="View"><FaEye size={16} /></Link>
                      <Link to={`/purchase-orders/edit/${q._id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><FaEdit size={16} /></Link>
                      {q.status !== 'BILLED' && (
                        <button onClick={() => handleConvert(q._id)} className="text-gray-400 hover:text-purple-600 transition-colors" title="Convert to Invoice">
                          <FaArrowRight size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if (!isPro) return setShowPremiumModal(true);
                          handleDelete(q._id);
                        }} 
                        className={`transition-colors ${isPro ? 'text-gray-400 hover:text-red-600' : 'text-gray-300 hover:text-gray-500'}`} 
                        title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                  Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages || 1}</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* Bulk Upload CSV Modal */}
      <Modal isOpen={isCsvModalOpen} onClose={() => !isImporting && setIsCsvModalOpen(false)} title="Bulk Import Purchase Orders to Database">
        <CsvAndExcelUploader 
          onDataParsed={handleCsvParsed} 
          isLoading={isImporting}
          title="Upload Purchase Orders File"
          subtitle="Group rows by 'PurchaseOrder No'. You can import the full exported Excel/CSV with vendor, totals, transport, notes, and item-level columns."
        />
        <div className="mt-4 flex justify-end">
          <button 
            type="button" 
            onClick={() => setIsCsvModalOpen(false)} 
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Premium Feature Modal */}
      <Modal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} title="Premium Feature">
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upgrade to Pro</h3>
          <p className="text-gray-500 mb-6">
            Deleting purchaseOrders is a premium feature. Upgrade to Pro to unlock unlimited document management, including deleting and an unlimited edit quota.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowPremiumModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Maybe Later
            </button>
            <Link to="/subscription" className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 rounded-xl shadow-lg shadow-yellow-500/30 transition-all flex items-center gap-2">
              Upgrade Now
            </Link>
          </div>
        </div>
      </Modal>

      <PdfInvoiceImporter
        isOpen={isPdfScannerOpen}
        onClose={() => setIsPdfScannerOpen(false)}
        onImportSuccess={() => setIsPdfScannerOpen(false)}
        targetType="purchaseOrder"
      />

    </div>
  );
};

export default PurchaseOrderList;
