import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaDownload, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaChevronDown, FaFilePdf } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import QuotaIndicator from '../components/QuotaIndicator';
import PdfInvoiceImporter from '../components/PdfInvoiceImporter';
import { FaFileAlt } from 'react-icons/fa';
import { mapInvoiceImportRows } from '../utils/invoiceImport';

const DOC_TYPES = [
  {
    section: 'Invoices',
    items: [
      { label: 'Tax Invoice',     desc: 'GST invoice with CGST/SGST/IGST',  path: '/invoices/new?type=Tax+Invoice' },
      { label: 'Invoice',         desc: 'Simple invoice without GST',         path: '/invoices/new?type=Invoice' },
      { label: 'Retail Invoice',  desc: 'For retail / B2C sales',             path: '/invoices/new?type=Retail+Invoice' },
      { label: 'Excise Invoice',  desc: 'Tax invoice with excise duty',        path: '/invoices/new?type=Excise+Invoice' },
    ],
  },
  {
    section: 'Estimates',
    items: [
      { label: 'Quotation',         desc: 'Send a price quote to your client', path: '/quotes/new' },
      { label: 'Proforma Invoice',  desc: 'Advance invoice before final bill',  path: '/proformas/new' },
    ],
  },
];

const InvoiceList = () => {
  const navigate = useNavigate();
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef(null);

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) setTypeMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);

  // Debounced Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices?page=${page}&limit=${rowsPerPage}&search=${encodeURIComponent(searchTerm)}`);
      setInvoices(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(i => i._id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter(i => i !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  const handleCsvParsed = async (data) => {
    setIsImporting(true);
    try {
      const formattedInvoices = mapInvoiceImportRows(data);

      if (formattedInvoices.length === 0) {
        alert('No valid invoices found. Make sure the file contains invoice rows and not only summary totals.');
        setIsImporting(false);
        return;
      }

      await api.post('/invoices/bulk', { invoices: formattedInvoices });
      alert(`Successfully imported ${formattedInvoices.length} invoices!`);
      setIsCsvModalOpen(false);
      setLoading(true);
      fetchInvoices();
    } catch (error) {
      console.error('Bulk import error:', error);
      alert('Failed to import invoices: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsImporting(false);
    }
  };


  const fetchInvoicesForExport = async () => {
    if (selectedInvoices.length > 0) {
      return displayedInvoices.filter((invoice) => selectedInvoices.includes(invoice._id));
    }

    const res = await api.get(`/invoices?all=true&search=${encodeURIComponent(searchTerm)}`);
    return res.data.data || [];
  };

  
  const displayedInvoices = invoices; // Backend handles slice/filter

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };
  
  const getStatusBadge = (status, balance) => {
      const normalizedBalance = Number(balance) || 0;
      const finalStatus = status || (normalizedBalance === 0 ? 'PAID' : 'SENT');
      
      const styles = {
          'PAID': 'bg-green-100 text-green-700 border-green-200',
          'DRAFT': 'bg-gray-100 text-gray-700 border-gray-200',
          'SENT': 'bg-blue-100 text-blue-700 border-blue-200',
          'OVERDUE': 'bg-red-100 text-red-700 border-red-200',
          'PARTIAL': 'bg-yellow-100 text-yellow-700 border-yellow-200',
          'UNPAID': 'bg-orange-100 text-orange-700 border-orange-200',
          'CANCELLED': 'bg-red-100 text-red-700 border-red-200',
      };
      
      return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[finalStatus] || styles['SENT']}`}>
              {finalStatus}
          </span>
      );
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Invoices</h1>
            <p className="text-gray-500 mt-1">Manage and track your invoice history</p>
        </div>
        <div className="flex gap-3">
           <div onClick={() => !isPro && setShowPremiumModal(true)} className={!isPro ? 'cursor-pointer' : ''}>
             <ExportDropdown 
                disabled={!isPro}
                data={displayedInvoices}
                getExportData={fetchInvoicesForExport}
                filename="Flance_Invoices"
                columns={[
                   { header: 'Client Name', key: 'client.name' },
                   { header: 'Client GSTIN', key: 'client.gstin' },
                   { header: 'Invoice Number', key: 'invoiceNo' },
                   { header: 'Creator Name', key: 'user.username' },
                   { header: 'Client Phone Number', key: 'client.phone' },
                   { header: 'Client Email', key: 'client.email' },
                   { header: 'Client City', key: 'client.address.city' },
                   { header: 'Client State', key: 'client.address.state' },
                   { header: 'P.O. Number', key: 'transport.poNumber' },
                   { header: 'P.O. Date', key: 'transport.poDate' },
                   { header: 'Issue Date', key: 'date' },
                   { header: 'Due Date', key: 'dueDate' },
                   { header: 'Payment Mode', key: 'paymentMode' },
                   { header: 'Financial Year', key: 'fy' },
                   { header: 'Currency', key: 'currency' },
                   { header: 'Amount', key: 'subTotal' },
                   { header: 'Tax', key: 'taxTotal' },
                   { header: 'Total', key: 'grandTotal' },
                   { header: 'Status', key: 'status' },
                   { header: 'Amount Paid', key: 'advancePaid' },
                   { header: 'Balance', key: 'balanceDue' },
                   { header: 'Dr. / Cr.', key: 'drCr' },
                   { header: 'Date Of Payment', key: 'paymentDate' },
                   { header: 'Type', key: 'invoiceType' },
                   { header: 'Private notes', key: 'notes' },
                   { header: 'Payments', key: 'paymentMode' },
                   { header: 'Discount', key: 'discountTotal' },
                   { header: 'TDS', key: 'tds' },
                   { header: 'TCS', key: 'tcs' },
                ]}
             />
           </div>
           
           <button
              onClick={() => setIsPdfScannerOpen(true)}
              className="bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <FaFilePdf size={16} /> Scan PDF
            </button>

           <button
              onClick={() => isPro ? setIsCsvModalOpen(true) : setShowPremiumModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm ${
                isPro 
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200' 
                  : 'bg-gray-50 text-gray-400 border border-gray-200 opacity-70 cursor-not-allowed'
              }`}
            >
              <FaFileAlt size={16} /> Bulk Import
            </button>

          {/* Unified New Document button */}
          <div className="relative" ref={typeMenuRef}>
            <div className="flex">
              <button
                onClick={() => navigate('/invoices/new?type=Tax+Invoice')}
                className="bg-blue-600 hover:bg-blue-700 text-white pl-4 pr-3 py-2 rounded-l-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm border-r border-blue-500"
              >
                <FaPlus size={16} /> New Document
              </button>
              <button
                onClick={() => setTypeMenuOpen(o => !o)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 rounded-r-lg shadow-sm transition-all"
                title="Choose document type"
              >
                <FaChevronDown size={16} />
              </button>
            </div>

            {typeMenuOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {DOC_TYPES.map(({ section, items }) => (
                  <div key={section}>
                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                      {section}
                    </div>
                    {items.map(({ label, desc, path }) => (
                      <button
                        key={label}
                        onClick={() => { navigate(path); setTypeMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group border-b border-gray-50 last:border-0"
                      >
                        <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quota Indicator for Free Tier */}
      <QuotaIndicator type="invoices" />

      {/* Modern Table Section */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
             <div className="relative max-w-sm w-full">
                 {/* Search placeholder could go here */}
                 <input 
                    type="text" 
                    placeholder="Search invoices..." 
                    className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                 />
             </div>
             <div className="text-sm text-gray-500">
                 Showing {displayedInvoices.length} of {totalRecords} results
             </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {selectedInvoices.length === invoices.length && invoices.length > 0 ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-gray-100">
                     <td className="px-6 py-4 text-center"><Skeleton width="20px" height="20px" className="mx-auto" /></td>
                     <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                     <td className="px-6 py-4"><Skeleton width="80px" height="20px" /></td>
                     <td className="px-6 py-4">
                        <Skeleton width="120px" height="20px" className="mb-1" />
                        <Skeleton width="80px" height="15px" />
                     </td>
                     <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                     <td className="px-6 py-4"><Skeleton width="60px" height="24px" className="rounded-full" /></td>
                     <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                     <td className="px-6 py-4"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                     <td className="px-6 py-4 text-center"><Skeleton width="80px" height="20px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayedInvoices.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm">No invoices found.</td></tr>
              ) : (
                displayedInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleSelect(inv._id)} className={`${selectedInvoices.includes(inv._id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}>
                         {selectedInvoices.includes(inv._id) ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                      </button>
                    </td>
                    
                    {/* Invoice No */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/invoices/${inv._id}/print`} className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                            {inv.invoiceNo}
                        </Link>
                    </td>
                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {inv.invoiceType || 'Tax Invoice'}
                        </span>
                    </td>
                    
                    {/* Client */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{inv.client?.name}</div>
                        {inv.client?.gstin && <div className="text-xs text-gray-400 mt-0.5">{inv.client.gstin}</div>}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(inv.date)}
                        <div className="text-xs text-gray-400 mt-0.5">Due: {formatDate(inv.dueDate)}</div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(inv.status, inv.balanceDue)}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <span className={inv.balanceDue > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            ₹{inv.balanceDue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center gap-3">
                            <Link to={`/invoices/${inv._id}/print`} className="text-gray-400 hover:text-blue-600 transition-colors" title="View">
                                <FaEye size={18} />
                            </Link>
                            <Link to={`/invoices/edit/${inv._id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                                <FaEdit size={18} />
                            </Link>
                            <button 
                                onClick={async () => {
                                    if (!isPro) {
                                      setShowPremiumModal(true);
                                      return;
                                    }
                                    if(window.confirm('Are you sure you want to delete this invoice?')) {
                                        try {
                                            await api.delete(`/invoices/${inv._id}`);
                                            fetchInvoices();
                                        } catch(err) {
                                            alert('Failed to delete');
                                        }
                                    }
                                }} 
                                className={`transition-colors ${isPro ? 'text-gray-400 hover:text-red-600' : 'text-gray-300 hover:text-gray-500'}`}
                                title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                            >
                                <FaTrash size={18} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer / Pagination */}
         <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
           
           <div className="flex items-center gap-2">
               <span className="text-sm text-gray-500">Rows per page:</span>
               <select 
                 value={rowsPerPage}
                 onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                 className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
               >
                 <option value={10}>10</option>
                 <option value={20}>20</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
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
      <Modal isOpen={isCsvModalOpen} onClose={() => !isImporting && setIsCsvModalOpen(false)} title="Bulk Import Invoices to Database">
        <CsvAndExcelUploader 
          onDataParsed={handleCsvParsed} 
          isLoading={isImporting}
          title="Upload Invoices File"
          subtitle="Supports invoice exports with summary totals or itemized rows. Summary rows like 'Total invoices' are ignored automatically."
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
            Deleting invoices is a premium feature. Upgrade to Pro to unlock unlimited document management, including deleting and an unlimited edit quota.
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

      {/* PDF Invoice Scanner Modal */}
      <PdfInvoiceImporter
        isOpen={isPdfScannerOpen}
        onClose={() => setIsPdfScannerOpen(false)}
        onImportSuccess={() => { setIsPdfScannerOpen(false); fetchInvoices(); }}
      />

    </div>
  );
};

export default InvoiceList;
