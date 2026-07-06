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
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedImportInvoices, setParsedImportInvoices] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);

  // Sorting & Filtering State
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateTypeFilter, setDateTypeFilter] = useState('date'); // 'date' or 'dueDate'
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Debounced Search and Direct Filter Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage, statusFilter, typeFilter, startDate, endDate, dateTypeFilter, sortBy, sortOrder]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
        invoiceType: typeFilter,
        startDate,
        endDate,
        dateType: dateTypeFilter,
        sortBy,
        sortOrder,
      }).toString();

      const res = await api.get(`/invoices?${queryParams}`);
      setInvoices(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending when switching fields
    }
    setPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) {
      return <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 text-xs">↕</span>;
    }
    return sortOrder === 'asc' 
      ? <span className="text-blue-600 ml-1.5 text-xs font-bold">↑</span> 
      : <span className="text-blue-600 ml-1.5 text-xs font-bold">↓</span>;
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

  const handleBulkDelete = async () => {
    if (!isPro) {
      setShowPremiumModal(true);
      return;
    }
    if (selectedInvoices.length === 0) return;
    if (window.confirm(`Are you sure you want to delete the ${selectedInvoices.length} selected invoices?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedInvoices.map(id => api.delete(`/invoices/${id}`)));
        setSelectedInvoices([]);
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoices:', error);
        alert(error.response?.data?.message || 'Failed to delete some invoices');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetImportModal = () => {
    if (isImporting) return;
    setIsCsvModalOpen(false);
    setParsedImportInvoices([]);
    setImportResult(null);
  };

  const handleCsvParsed = (data) => {
    const formattedInvoices = mapInvoiceImportRows(data).map((invoice, index) => ({
      ...invoice,
      _importRowId: `invoice-import-${Date.now()}-${index}`,
    }));

    if (formattedInvoices.length === 0) {
      alert('No valid invoices found. Make sure the file contains invoice rows and not only summary totals.');
      return;
    }

    setParsedImportInvoices(formattedInvoices);
    setImportResult(null);
  };

  const handleImportParsedInvoices = async () => {
    if (parsedImportInvoices.length === 0) return;

    setIsImporting(true);
    try {
      const res = await api.post('/invoices/bulk', { invoices: parsedImportInvoices });
      setImportResult(res.data);
      setLoading(true);
      fetchInvoices();
    } catch (error) {
      console.error('Bulk import error:', error);
      setImportResult({
        message: 'Failed to import invoices.',
        imported: 0,
        updated: 0,
        skipped: 0,
        renumbered: 0,
        failed: parsedImportInvoices.length,
        failedInvoices: parsedImportInvoices.map((invoice, index) => ({
          importRowId: invoice._importRowId,
          row: index + 1,
          invoiceNo: invoice.invoiceNo,
          clientName: invoice.clientName,
          reason: error.response?.data?.message || error.message,
        })),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const buildImportOutcomeRows = () => {
    const importedByRow = new Map((importResult?.importedInvoices || []).map((item) => [item.importRowId, item]));
    const skippedByRow = new Map((importResult?.skippedInvoices || []).map((item) => [item.importRowId, item]));
    const failedByRow = new Map((importResult?.failedInvoices || []).map((item) => [item.importRowId, item]));
    const renumberedByRow = new Map((importResult?.renumberedInvoices || []).map((item) => [item.importRowId, item]));

    return parsedImportInvoices.map((invoice, index) => {
      const importRowId = invoice._importRowId;
      const imported = importedByRow.get(importRowId);
      const skipped = skippedByRow.get(importRowId);
      const failed = failedByRow.get(importRowId);
      const renumbered = renumberedByRow.get(importRowId);

      if (failed) {
        return { ...invoice, row: index + 1, outcome: 'Failed', finalInvoiceNo: invoice.invoiceNo || 'Auto', reason: failed.reason };
      }
      if (skipped) {
        return { ...invoice, row: index + 1, outcome: 'Skipped', finalInvoiceNo: skipped.invoiceNo || invoice.invoiceNo, reason: skipped.reason };
      }
      if (imported) {
        return {
          ...invoice,
          row: index + 1,
          outcome: renumbered || imported.renumbered ? 'Imported with new number' : 'Imported',
          finalInvoiceNo: imported.invoiceNo,
          reason: renumbered?.reason || 'Imported successfully',
        };
      }

      return { ...invoice, row: index + 1, outcome: importResult ? 'Not processed' : 'Ready', finalInvoiceNo: invoice.invoiceNo || 'Auto', reason: '' };
    });
  };

  const importOutcomeClass = (outcome) => {
    if (outcome === 'Imported' || outcome === 'Imported with new number') return 'bg-green-50 text-green-700 border-green-200';
    if (outcome === 'Skipped') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (outcome === 'Failed') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const fetchInvoicesForExport = async () => {
    if (selectedInvoices.length > 0) {
      return displayedInvoices.filter((invoice) => selectedInvoices.includes(invoice._id));
    }

    const queryParams = new URLSearchParams({
      all: 'true',
      search: searchTerm,
      status: statusFilter,
      invoiceType: typeFilter,
      startDate,
      endDate,
      dateType: dateTypeFilter,
      sortBy,
      sortOrder,
    }).toString();

    const res = await api.get(`/invoices?${queryParams}`);
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
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[finalStatus] || styles['SENT']}`}>
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
           
           {selectedInvoices.length > 0 && (
             <button
               onClick={handleBulkDelete}
               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
             >
               <FaTrash size={14} /> Delete Selected ({selectedInvoices.length})
             </button>
           )}
           
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
        
        {/* Table Toolbar & Filters */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-4">
             <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="relative max-w-xs w-full">
                     <input 
                        type="text" 
                        placeholder="Search invoices..." 
                        className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm font-sans"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                     />
                 </div>
                 <div className="text-sm text-gray-500 font-medium">
                     Showing {displayedInvoices.length} of {totalRecords} results
                 </div>
             </div>

             {/* Filters Bar */}
             <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-sm">
                 <div className="flex flex-col min-w-[140px]">
                     <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Status</span>
                     <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 transition-all cursor-pointer font-sans"
                     >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="SENT">SENT</option>
                        <option value="PAID">PAID</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="CANCELLED">CANCELLED</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[150px]">
                     <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Type</span>
                     <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 transition-all cursor-pointer font-sans"
                     >
                        <option value="">All Types</option>
                        <option value="Tax Invoice">Tax Invoice</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Retail Invoice">Retail Invoice</option>
                        <option value="Excise Invoice">Excise Invoice</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Date Type</span>
                     <select
                        value={dateTypeFilter}
                        onChange={(e) => { setDateTypeFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 transition-all cursor-pointer font-sans"
                     >
                        <option value="date">Issue Date</option>
                        <option value="dueDate">Due Date</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">From Date</span>
                     <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 transition-all cursor-pointer font-sans"
                     />
                 </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">To Date</span>
                     <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 transition-all cursor-pointer font-sans"
                     />
                 </div>

                 <div className="flex flex-col min-w-[160px]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Sort By</span>
                      <select
                         value={`${sortBy}-${sortOrder}`}
                         onChange={(e) => {
                             const [field, order] = e.target.value.split('-');
                             setSortBy(field);
                             setSortOrder(order);
                             setPage(1);
                         }}
                         className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 transition-all cursor-pointer font-sans"
                      >
                         <option value="createdAt-desc">Created (Latest first)</option>
                         <option value="createdAt-asc">Created (Oldest first)</option>
                         <option value="date-desc">Issue Date (Latest first)</option>
                         <option value="date-asc">Issue Date (Oldest first)</option>
                         <option value="dueDate-desc">Due Date (Latest first)</option>
                         <option value="dueDate-asc">Due Date (Oldest first)</option>
                         <option value="grandTotal-desc">Amount (Highest first)</option>
                         <option value="grandTotal-asc">Amount (Lowest first)</option>
                      </select>
                 </div>

                 {(statusFilter || typeFilter || startDate || endDate || searchTerm || dateTypeFilter !== 'date' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                     <button
                        onClick={() => {
                            setStatusFilter('');
                            setTypeFilter('');
                            setStartDate('');
                            setEndDate('');
                            setDateTypeFilter('date');
                            setSearchTerm('');
                            setSortBy('createdAt');
                            setSortOrder('desc');
                            setPage(1);
                        }}
                        className="self-end px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                     >
                        Clear Filters
                     </button>
                 )}
             </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 font-sans">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {selectedInvoices.length === invoices.length && invoices.length > 0 ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('invoiceNo')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Invoice {renderSortIcon('invoiceNo')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('invoiceType')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Type {renderSortIcon('invoiceType')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('clientName')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Client {renderSortIcon('clientName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('dueDate')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Due Date {renderSortIcon('dueDate')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Status {renderSortIcon('status')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('grandTotal')}
                  className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Amount {renderSortIcon('grandTotal')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('balanceDue')}
                  className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Balance {renderSortIcon('balanceDue')}
                  </div>
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">
                  Actions
                </th>
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
                     <td className="px-4 py-2"><Skeleton width="50px" height="20px" className="rounded-full" /></td>
                     <td className="px-4 py-2"><Skeleton width="60px" height="16px" className="ml-auto" /></td>
                     <td className="px-4 py-2"><Skeleton width="60px" height="16px" className="ml-auto" /></td>
                     <td className="px-4 py-2 text-center"><Skeleton width="60px" height="16px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayedInvoices.length === 0 ? (
                <tr><td colSpan="10" className="px-4 py-8 text-center text-gray-500 text-xs">No invoices found.</td></tr>
              ) : (
                displayedInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => toggleSelect(inv._id)} className={`${selectedInvoices.includes(inv._id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}>
                         {selectedInvoices.includes(inv._id) ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                      </button>
                    </td>
                    
                    {/* Invoice No */}
                    <td className="px-4 py-2 whitespace-nowrap">
                        <Link to={`/invoices/${inv._id}/print`} className="text-blue-600 text-xs font-semibold hover:text-blue-800 hover:underline">
                            {inv.invoiceNo}
                        </Link>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-2 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {inv.invoiceType || 'Tax Invoice'}
                        </span>
                    </td>
                    
                    {/* Client */}
                    <td className="px-4 py-2 whitespace-nowrap">
                        <div className="text-xs font-semibold text-gray-900">{inv.client?.name}</div>
                        {inv.client?.gstin && <div className="text-[10px] text-gray-400 mt-0.5">{inv.client.gstin}</div>}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(inv.date)}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {inv.dueDate ? (
                          <span className={new Date(inv.dueDate) < new Date() && inv.balanceDue > 0 ? 'text-red-500 font-medium font-sans' : ''}>
                            {formatDate(inv.dueDate)}
                          </span>
                        ) : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2 whitespace-nowrap">
                        <select
                           value={inv.status || (Number(inv.balanceDue) === 0 ? 'PAID' : 'SENT')}
                           onChange={async (e) => {
                               const newStatus = e.target.value;
                               try {
                                   await api.put(`/invoices/${inv._id}/status`, { status: newStatus });
                                   fetchInvoices();
                               } catch (err) {
                                   alert(err.response?.data?.message || 'Failed to update status');
                               }
                           }}
                           className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent transition-colors text-center appearance-none ${
                               (inv.status === 'PAID' || (!inv.status && Number(inv.balanceDue) === 0)) ? 'bg-green-100 text-green-700 border-green-200' :
                               inv.status === 'DRAFT' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                               (inv.status === 'SENT' || (!inv.status && Number(inv.balanceDue) > 0)) ? 'bg-blue-100 text-blue-700 border-blue-200' :
                               inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700 border-red-200' :
                               inv.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                               inv.status === 'UNPAID' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                               inv.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border-red-200' :
                               'bg-blue-100 text-blue-700 border-blue-200'
                           }`}
                        >
                            <option value="DRAFT" className="bg-white text-gray-700">DRAFT</option>
                            <option value="SENT" className="bg-white text-gray-700">SENT</option>
                            <option value="UNPAID" className="bg-white text-gray-700">UNPAID</option>
                            <option value="PARTIAL" className="bg-white text-gray-700">PARTIAL</option>
                            <option value="PAID" className="bg-white text-gray-700">PAID</option>
                            <option value="CANCELLED" className="bg-white text-gray-700">CANCELLED</option>
                        </select>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                        ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-2 whitespace-nowrap text-right text-xs">
                        <span className={inv.balanceDue > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                            ₹{inv.balanceDue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2 whitespace-nowrap text-center text-xs font-medium">
                        <div className="flex justify-center gap-3">
                            <Link to={`/invoices/${inv._id}/print`} className="text-gray-400 hover:text-blue-600 transition-colors" title="View">
                                <FaEye size={16} />
                            </Link>
                            <Link to={`/invoices/edit/${inv._id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                                <FaEdit size={16} />
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
                                <FaTrash size={16} />
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
      <Modal
        isOpen={isCsvModalOpen}
        onClose={resetImportModal}
        title={importResult ? 'Invoice Import Result' : parsedImportInvoices.length ? 'Parsed Invoices Ready to Import' : 'Bulk Import Invoices to Database'}
      >
        {parsedImportInvoices.length === 0 ? (
          <>
            <CsvAndExcelUploader
              onDataParsed={handleCsvParsed}
              isLoading={isImporting}
              title="Upload Invoices File"
              subtitle="Supports invoice exports with summary totals or itemized rows. Summary rows like 'Total invoices' are ignored automatically."
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={resetImportModal}
                disabled={isImporting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parsed</div>
                <div className="text-xl font-bold text-slate-900">{parsedImportInvoices.length}</div>
              </div>
              <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Imported</div>
                <div className="text-xl font-bold text-green-700">{importResult?.imported ?? 0}</div>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Updated</div>
                <div className="text-xl font-bold text-blue-700">{importResult?.updated ?? 0}</div>
              </div>
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Skipped</div>
                <div className="text-xl font-bold text-amber-700">{importResult?.skipped ?? 0}</div>
              </div>
              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Failed</div>
                <div className="text-xl font-bold text-red-700">{importResult?.failed ?? 0}</div>
              </div>
            </div>

            {importResult?.message && (
              <div className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                {importResult.message}
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[48vh]">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Row</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Final No</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Client</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Result</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {buildImportOutcomeRows().map((row) => (
                      <tr key={row._importRowId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{row.row}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.invoiceNo || 'Auto'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.finalInvoiceNo}</td>
                        <td className="px-4 py-3 text-slate-700">{row.clientName}</td>
                        <td className="px-4 py-3 text-slate-600">{row.date ? formatDate(row.date) : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          ₹{Number(row.importedGrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${importOutcomeClass(row.outcome)}`}>
                            {row.outcome}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 min-w-[220px]">{row.reason || 'Ready to import'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => { setParsedImportInvoices([]); setImportResult(null); }}
                disabled={isImporting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Upload Another File
              </button>
              <button
                type="button"
                onClick={resetImportModal}
                disabled={isImporting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Close
              </button>
              {!importResult && (
                <button
                  type="button"
                  onClick={handleImportParsedInvoices}
                  disabled={isImporting}
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : `Import ${parsedImportInvoices.length} Invoices`}
                </button>
              )}
            </div>
          </div>
        )}
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
