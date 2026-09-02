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
  const [businessUnitFilter, setBusinessUnitFilter] = useState('');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateTypeFilter, setDateTypeFilter] = useState('date'); // 'date' or 'dueDate'
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    api.get('/business-units?status=active')
      .then((res) => setBusinessUnits(res.data || []))
      .catch((err) => console.error('Failed to load business units:', err));
  }, []);

  // Debounced Search and Direct Filter Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage, statusFilter, typeFilter, businessUnitFilter, startDate, endDate, dateTypeFilter, sortBy, sortOrder]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
        invoiceType: typeFilter,
        businessUnit: businessUnitFilter,
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
      businessUnit: businessUnitFilter,
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
    <div className="container mx-auto p-6 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Invoices</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Manage and track your invoice history</p>
        </div>
        <div className="flex gap-3 flex-wrap">
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
              className="bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <FaFilePdf size={16} /> Scan PDF
            </button>

           <button
              onClick={() => isPro ? setIsCsvModalOpen(true) : setShowPremiumModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm ${
                isPro 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60' 
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 opacity-70 cursor-not-allowed'
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
              <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                {DOC_TYPES.map(({ section, items }) => (
                  <div key={section}>
                    <div className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-900/80 border-b border-gray-100 dark:border-slate-700">
                      {section}
                    </div>
                    {items.map(({ label, desc, path }) => (
                      <button
                        key={label}
                        onClick={() => { navigate(path); setTypeMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-colors group border-b border-gray-50 dark:border-slate-700/40 last:border-0"
                      >
                        <div className="text-sm font-semibold text-gray-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">{label}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{desc}</div>
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
      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        
        {/* Table Toolbar & Filters */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex flex-col gap-4">
             <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="relative max-w-xs w-full">
                     <input 
                        type="text" 
                        placeholder="Search invoices..." 
                        className="w-full pl-3 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm font-sans"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                     />
                 </div>
                 <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                     Showing {displayedInvoices.length} of {totalRecords} results
                 </div>
             </div>

             {/* Filters Bar */}
             <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm text-sm">
                 <div className="flex flex-col min-w-[140px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Status</span>
                     <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
                     >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="SENT">SENT</option>
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="CANCELLED">CANCELLED</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[150px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Type</span>
                     <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
                     >
                        <option value="">All Types</option>
                        <option value="Tax Invoice">Tax Invoice</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Retail Invoice">Retail Invoice</option>
                        <option value="Excise Invoice">Excise Invoice</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[160px]">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Business Unit</span>
                      <select
                         value={businessUnitFilter}
                         onChange={(e) => { setBusinessUnitFilter(e.target.value); setPage(1); }}
                         className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
                      >
                         <option value="">All Business Units</option>
                         {businessUnits.map((bu) => (
                           <option key={bu._id} value={bu._id}>
                             {bu.name} ({bu.code})
                           </option>
                         ))}
                      </select>
                  </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Date Type</span>
                     <select
                        value={dateTypeFilter}
                        onChange={(e) => { setDateTypeFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
                     >
                        <option value="date">Issue Date</option>
                        <option value="dueDate">Due Date</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">From Date</span>
                     <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
                     />
                 </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">To Date</span>
                     <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
                     />
                 </div>

                 <div className="flex flex-col min-w-[160px]">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Sort By</span>
                      <select
                         value={`${sortBy}-${sortOrder}`}
                         onChange={(e) => {
                             const [field, order] = e.target.value.split('-');
                             setSortBy(field);
                             setSortOrder(order);
                             setPage(1);
                         }}
                         className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
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
                        className="self-end px-4 py-2 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                     >
                        Clear Filters
                     </button>
                 )}
             </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 font-sans">
            <thead className="bg-gray-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-4 py-2 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                    {selectedInvoices.length === invoices.length && invoices.length > 0 ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('invoiceNo')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Invoice {renderSortIcon('invoiceNo')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('invoiceType')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Type {renderSortIcon('invoiceType')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('clientName')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Client {renderSortIcon('clientName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('dueDate')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Due Date {renderSortIcon('dueDate')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Status {renderSortIcon('status')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('grandTotal')}
                  className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Amount {renderSortIcon('grandTotal')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('balanceDue')}
                  className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Balance {renderSortIcon('balanceDue')}
                  </div>
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800/60">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
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
                <tr><td colSpan="10" className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 text-xs">No invoices found.</td></tr>
              ) : (
                displayedInvoices.map((inv) => {
                  const displayBalance = (inv.grandTotal || 0) - (inv.advancePaid || 0);
                  return (
                    <tr key={inv._id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => toggleSelect(inv._id)} className={`${selectedInvoices.includes(inv._id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400 dark:hover:text-slate-500'}`}>
                           {selectedInvoices.includes(inv._id) ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                       </button>
                      </td>
                      
                      {/* Invoice No */}
                      <td className="px-4 py-2 whitespace-nowrap">
                          <Link to={`/invoices/${inv._id}/print`} className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                              {inv.invoiceNo}
                          </Link>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                              {inv.invoiceType || 'Tax Invoice'}
                          </span>
                      </td>
                      
                      {/* Client */}
                      <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900 dark:text-slate-100">{inv.client?.name}</div>
                          {inv.client?.gstin && <div className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5">{inv.client.gstin}</div>}
                      </td>
   
                      {/* Date */}
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                          {formatDate(inv.date)}
                      </td>
   
                      {/* Due Date */}
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                          {inv.dueDate ? (
                            <span className={new Date(inv.dueDate) < new Date() && displayBalance > 0 ? 'text-red-500 font-medium font-sans' : ''}>
                              {formatDate(inv.dueDate)}
                            </span>
                          ) : '—'}
                      </td>
   
                      {/* Status */}
                      <td className="px-4 py-2 whitespace-nowrap">
                          <select
                             value={inv.status === 'PAID' ? 'RECEIVED' : (inv.status || (Number(displayBalance) === 0 ? 'RECEIVED' : 'SENT'))}
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
                                 (inv.status === 'RECEIVED' || inv.status === 'PAID' || (!inv.status && Number(displayBalance) === 0)) ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/60' :
                                 inv.status === 'DRAFT' ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700' :
                                 (inv.status === 'SENT' || (!inv.status && Number(displayBalance) > 0)) ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60' :
                                 inv.status === 'OVERDUE' ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60' :
                                 inv.status === 'PARTIAL' ? 'bg-yellow-100 dark:bg-amber-950/50 text-yellow-700 dark:text-amber-300 border-yellow-200 dark:border-amber-800/60' :
                                 inv.status === 'UNPAID' ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60' :
                                 inv.status === 'CANCELLED' ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60' :
                                 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                             }`}
                          >
                              <option value="DRAFT" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">DRAFT</option>
                              <option value="SENT" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">SENT</option>
                              <option value="UNPAID" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">UNPAID</option>
                              <option value="PARTIAL" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">PARTIAL</option>
                              <option value="RECEIVED" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">RECEIVED</option>
                              <option value="CANCELLED" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">CANCELLED</option>
                          </select>
                      </td>
   
                      {/* Amount */}
                      <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900 dark:text-slate-100">
                          ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
   
                      {/* Balance */}
                      <td className="px-4 py-2 whitespace-nowrap text-right text-xs">
                          <span className={displayBalance > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400 font-bold'}>
                              ₹{displayBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                      </td>
   
                      {/* Actions */}
                      <td className="px-4 py-2 whitespace-nowrap text-center text-xs font-medium">
                          <div className="flex justify-center gap-3">
                              <Link to={`/invoices/${inv._id}/print`} className="text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="View">
                                  <FaEye size={16} />
                              </Link>
                              <Link to={`/invoices/edit/${inv._id}`} className="text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit">
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
                                  className={`transition-colors ${isPro ? 'text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-500'}`}
                                  title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                              >
                                  <FaTrash size={16} />
                              </button>
                          </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer / Pagination */}
         <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
           
           <div className="flex items-center gap-2">
               <span className="text-sm text-gray-500 dark:text-slate-400">Rows per page:</span>
               <select 
                 value={rowsPerPage}
                 onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                 className="border border-gray-300 dark:border-slate-700 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
               >
                 <option value={10}>10</option>
                 <option value={20}>20</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
               </select>
           </div>
           
           <div className="flex items-center gap-4">
               <div className="text-sm text-gray-500 dark:text-slate-400">
                   Page <span className="font-semibold text-gray-900 dark:text-slate-200">{page}</span> of <span className="font-semibold text-gray-900 dark:text-slate-200">{totalPages || 1}</span>
               </div>
               <div className="flex gap-2">
                 <button
                   disabled={page <= 1}
                   onClick={() => setPage(p => p - 1)}
                   className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   Previous
                 </button>
                 <button
                   disabled={page >= totalPages}
                   onClick={() => setPage(p => p + 1)}
                   className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parsed</div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{parsedImportInvoices.length}</div>
              </div>
              <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 rounded-lg p-3">
                <div className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Imported</div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">{importResult?.imported ?? 0}</div>
              </div>
              <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 rounded-lg p-3">
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Updated</div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{importResult?.updated ?? 0}</div>
              </div>
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-3">
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Skipped</div>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{importResult?.skipped ?? 0}</div>
              </div>
              <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 rounded-lg p-3">
                <div className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Failed</div>
                <div className="text-xl font-bold text-red-700 dark:text-red-300">{importResult?.failed ?? 0}</div>
              </div>
            </div>

            {importResult?.message && (
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
                {importResult.message}
              </div>
            )}

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[48vh]">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Row</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invoice</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Final No</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Client</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Result</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                    {buildImportOutcomeRows().map((row) => (
                      <tr key={row._importRowId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.row}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{row.invoiceNo || 'Auto'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{row.finalInvoiceNo}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.clientName}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.date ? formatDate(row.date) : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">
                          ₹{Number(row.importedGrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${importOutcomeClass(row.outcome)}`}>
                            {row.outcome}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 min-w-[220px]">{row.reason || 'Ready to import'}</td>
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
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50"
              >
                Upload Another File
              </button>
              <button
                type="button"
                onClick={resetImportModal}
                disabled={isImporting}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50"
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
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Upgrade to Pro</h3>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            Deleting invoices is a premium feature. Upgrade to Pro to unlock unlimited document management, including deleting and an unlimited edit quota.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowPremiumModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
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
