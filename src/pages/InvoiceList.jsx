import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaDownload, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaChevronDown, FaFilePdf, FaFileInvoiceDollar, FaCheckCircle, FaClock, FaExclamationCircle, FaPaperPlane, FaEllipsisV, FaSlidersH, FaUndo } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import QuotaIndicator from '../components/QuotaIndicator';
import PdfInvoiceImporter from '../components/PdfInvoiceImporter';
import SendInvoiceModal from '../components/SendInvoiceModal';
import { FaFileAlt } from 'react-icons/fa';
import { mapInvoiceImportRows } from '../utils/invoiceImport';
import usePermissions from '../hooks/usePermissions';

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

const FILTER_STORAGE_KEY = 'flance_invoices_filters_pref';
const COLUMN_STORAGE_KEY = 'flance_invoices_columns_pref';

const ALL_INVOICE_COLUMNS = [
  // Primary Info
  { id: 'invoiceNo', label: 'Invoice #', group: 'Primary', required: true, desc: 'Invoice number link' },
  { id: 'invoiceType', label: 'Invoice Type', group: 'Primary', desc: 'Tax Invoice, Retail, etc.' },
  { id: 'clientName', label: 'Client Name', group: 'Primary', desc: 'Client name and GSTIN' },
  { id: 'placeOfSupply', label: 'Place of Supply', group: 'Primary', desc: 'State of supply' },
  { id: 'reverseCharge', label: 'Reverse Charge', group: 'Primary', desc: 'Reverse charge applicable (RCM)' },
  { id: 'businessUnit', label: 'Business Unit', group: 'Primary', desc: 'Assigned business unit' },

  // Dates
  { id: 'date', label: 'Invoice Date', group: 'Dates', desc: 'Date of issue' },
  { id: 'dueDate', label: 'Due Date', group: 'Dates', desc: 'Payment due date' },
  { id: 'paymentDate', label: 'Payment Date', group: 'Dates', desc: 'Date of payment' },
  { id: 'poDate', label: 'PO Date', group: 'Dates', desc: 'Purchase order date' },

  // Order & Payment Details
  { id: 'poNumber', label: 'PO Number', group: 'Order & Payment', desc: 'Linked purchase order' },
  { id: 'paymentMode', label: 'Payment Mode', group: 'Order & Payment', desc: 'Bank, Cash, UPI, Cheque, etc.' },
  { id: 'paymentTerms', label: 'Payment Terms', group: 'Order & Payment', desc: 'On Receipt, Net 30, etc.' },
  { id: 'status', label: 'Status', group: 'Order & Payment', desc: 'DRAFT, SENT, RECEIVED, etc.' },

  // Financials & GST
  { id: 'subTotal', label: 'Taxable Subtotal', group: 'Financials', desc: 'Subtotal before tax' },
  { id: 'taxTotal', label: 'Total GST', group: 'Financials', desc: 'Total GST (IGST/CGST/SGST)' },
  { id: 'totalCGST', label: 'CGST', group: 'Financials', desc: 'Central GST' },
  { id: 'totalSGST', label: 'SGST', group: 'Financials', desc: 'State GST' },
  { id: 'totalIGST', label: 'IGST', group: 'Financials', desc: 'Integrated GST' },
  { id: 'grandTotal', label: 'Total Amount', group: 'Financials', desc: 'Gross invoice total' },

  // TDS & Receivables
  { id: 'tds', label: 'TDS Amount', group: 'TDS & Receivables', desc: 'Tax deducted at source' },
  { id: 'tdsSection', label: 'TDS Section', group: 'TDS & Receivables', desc: 'TDS section (e.g. 194C, 194J)' },
  { id: 'tdsRate', label: 'TDS Rate %', group: 'TDS & Receivables', desc: 'TDS percentage rate' },
  { id: 'advancePaid', label: 'Advance / Paid', group: 'TDS & Receivables', desc: 'Amount received' },
  { id: 'balanceDue', label: 'Receivable (Due)', group: 'TDS & Receivables', desc: 'Net balance due' },
];

const DEFAULT_VISIBLE_COLUMNS = {
  invoiceNo: true,
  invoiceType: true,
  clientName: true,
  placeOfSupply: false,
  reverseCharge: false,
  businessUnit: false,
  date: true,
  dueDate: true,
  paymentDate: false,
  poDate: false,
  poNumber: false,
  paymentMode: false,
  paymentTerms: false,
  status: true,
  subTotal: false,
  taxTotal: true,
  totalCGST: false,
  totalSGST: false,
  totalIGST: false,
  grandTotal: true,
  tds: true,
  tdsSection: false,
  tdsRate: false,
  advancePaid: false,
  balanceDue: true,
};

const getStoredVisibleColumns = () => {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_VISIBLE_COLUMNS,
          ...parsed,
          invoiceNo: true, // Always keep invoice number visible
        };
      }
    }
  } catch (e) {}
  return DEFAULT_VISIBLE_COLUMNS;
};

const getStoredFilter = (key, fallback) => {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[key] !== undefined) return parsed[key];
    }
  } catch (e) {}
  return fallback;
};

const InvoiceList = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isSharedSession = sessionStorage.getItem('isSharedSession') === 'true' || sessionStorage.getItem('isSharedViewOnly') === 'true';
  const isPro = isSharedSession || (userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active') || userObj?.role === 'superadmin';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) setTypeMenuOpen(false);
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setActionMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(() => getStoredFilter('rowsPerPage', 50));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState(() => getStoredFilter('searchTerm', ''));
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedImportInvoices, setParsedImportInvoices] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);

  // Column Visibility State (persisted in localStorage)
  const [visibleColumns, setVisibleColumns] = useState(getStoredVisibleColumns);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  const toggleColumn = (colId) => {
    if (colId === 'invoiceNo') return;
    setVisibleColumns((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
    } catch (e) {}
  };

  const selectAllColumns = () => {
    const all = {};
    ALL_INVOICE_COLUMNS.forEach((c) => { all[c.id] = true; });
    setVisibleColumns(all);
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
  };

  const isCustomColumns = ALL_INVOICE_COLUMNS.some(
    (col) => Boolean(visibleColumns[col.id]) !== Boolean(DEFAULT_VISIBLE_COLUMNS[col.id])
  );

  // Sorting & Filtering State (persisted in localStorage)
  const [statusFilter, setStatusFilter] = useState(() => getStoredFilter('statusFilter', ''));
  const [typeFilter, setTypeFilter] = useState(() => getStoredFilter('typeFilter', ''));
  const [businessUnitFilter, setBusinessUnitFilter] = useState(() => getStoredFilter('businessUnitFilter', ''));
  const [businessUnits, setBusinessUnits] = useState([]);
  const [startDate, setStartDate] = useState(() => getStoredFilter('startDate', ''));
  const [endDate, setEndDate] = useState(() => getStoredFilter('endDate', ''));
  const [dateTypeFilter, setDateTypeFilter] = useState(() => getStoredFilter('dateTypeFilter', 'date'));
  const [sortBy, setSortBy] = useState(() => getStoredFilter('sortBy', 'createdAt'));
  const [sortOrder, setSortOrder] = useState(() => getStoredFilter('sortOrder', 'desc'));

  const [settings, setSettings] = useState(null);
  const [emailModalInvoice, setEmailModalInvoice] = useState(null);

  useEffect(() => {
    api.get('/business-units?status=active')
      .then((res) => setBusinessUnits(res.data || []))
      .catch((err) => console.error('Failed to load business units:', err));
    api.get('/settings')
      .then((res) => setSettings(res.data))
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  // Sync filters and sorting preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
        rowsPerPage,
        searchTerm,
        statusFilter,
        typeFilter,
        businessUnitFilter,
        startDate,
        endDate,
        dateTypeFilter,
        sortBy,
        sortOrder,
      }));
    } catch (e) {}
  }, [rowsPerPage, searchTerm, statusFilter, typeFilter, businessUnitFilter, startDate, endDate, dateTypeFilter, sortBy, sortOrder]);

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
      setSummary(res.data.summary || null);
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
        await api.post('/invoices/bulk-delete', { ids: selectedInvoices });
        setSelectedInvoices([]);
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoices:', error);
        alert(error.response?.data?.message || 'Failed to delete selected invoices');
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
    <div className="w-full px-4 py-4 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Invoices</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Manage and track your invoice history</p>
        </div>
        <div className="flex gap-3 flex-wrap">
           {can('invoices', 'export') && (
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
           )}
           
           {can('invoices', 'delete') && selectedInvoices.length > 0 && (
             <button
               onClick={handleBulkDelete}
               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
             >
               <FaTrash size={14} /> Delete Selected ({selectedInvoices.length})
             </button>
           )}
           
           {can('invoices', 'create') && (
             <button
                onClick={() => setIsPdfScannerOpen(true)}
                className="bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <FaFilePdf size={16} /> Scan PDF
              </button>
           )}

           {can('invoices', 'create') && (
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
           )}

          {/* Unified New Document button */}
          {can('invoices', 'create') && (
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
          )}
        </div>
      </div>
      
      {/* Quota Indicator for Free Tier */}
      <QuotaIndicator type="invoices" />

      {/* Dynamic Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Total Invoiced</span>
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FaFileInvoiceDollar size={14} />
              </span>
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-gray-900 dark:text-slate-100">
              ₹{(summary.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
              {totalRecords} total {totalRecords === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Total Received</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <FaCheckCircle size={14} />
              </span>
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₹{(summary.totalReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
              Realized collections
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Pending Receivable</span>
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <FaClock size={14} />
              </span>
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
              ₹{(summary.totalPending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
              Awaiting settlement
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Overdue</span>
              <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                <FaExclamationCircle size={14} />
              </span>
            </div>
            <div className="mt-2 text-lg font-bold font-mono text-red-600 dark:text-red-400">
              ₹{(summary.overdueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
              <span>{summary.overdueCount || 0} overdue</span>
              {summary.overdueCount > 0 && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modern Table Section */}
      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        
        {/* Table Toolbar & Filters */}
        <div className="p-2 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex flex-col gap-2">
             <div className="flex flex-wrap items-center justify-between gap-2.5">
                 <div className="relative max-w-xs w-full">
                     <input 
                        type="text" 
                        placeholder="Search invoices..." 
                        className="w-full pl-2.5 pr-2.5 py-1 border border-gray-300 dark:border-slate-700 rounded-lg text-[11px] h-7 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-xs font-sans"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                     />
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                         Showing {displayedInvoices.length} of {totalRecords} results
                     </div>
                     <button
                        type="button"
                        onClick={() => setIsColumnModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-[11px] font-semibold transition-all shadow-2xs cursor-pointer h-7"
                        title="Customize visible columns"
                     >
                        <FaSlidersH size={11} className="text-gray-500 dark:text-slate-400" />
                        <span>Columns</span>
                     </button>
                 </div>
             </div>

             {/* Filters Bar */}
             <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-gray-100 dark:border-slate-800 shadow-xs text-xs">
                 <div className="flex flex-col min-w-[90px] max-w-[105px]">
                     <span className="text-[8.5px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Status</span>
                     <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] h-6.5 cursor-pointer font-sans"
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

                 <div className="flex flex-col min-w-[90px] max-w-[105px]">
                     <span className="text-[8.5px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Type</span>
                     <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] h-6.5 cursor-pointer font-sans"
                     >
                        <option value="">All Types</option>
                        <option value="Tax Invoice">Tax Invoice</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Retail Invoice">Retail Invoice</option>
                        <option value="Excise Invoice">Excise Invoice</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[105px] max-w-[125px]">
                      <span className="text-[8.5px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Business Unit</span>
                      <select
                         value={businessUnitFilter}
                         onChange={(e) => { setBusinessUnitFilter(e.target.value); setPage(1); }}
                         className="border border-gray-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] h-6.5 cursor-pointer font-sans"
                      >
                         <option value="">All Business Units</option>
                         {businessUnits.map((bu) => (
                           <option key={bu._id} value={bu._id}>
                             {bu.name} ({bu.code})
                           </option>
                         ))}
                      </select>
                  </div>

                 <div className="flex flex-col min-w-[80px] max-w-[95px]">
                     <span className="text-[8.5px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Date Type</span>
                     <select
                        value={dateTypeFilter}
                        onChange={(e) => { setDateTypeFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] h-6.5 cursor-pointer font-sans"
                     >
                        <option value="date">Issue Date</option>
                        <option value="dueDate">Due Date</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[95px] max-w-[110px]">
                     <span className="text-[8.5px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">From Date</span>
                     <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] h-6.5 cursor-pointer font-sans"
                     />
                 </div>

                 <div className="flex flex-col min-w-[95px] max-w-[110px]">
                     <span className="text-[8.5px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">To Date</span>
                     <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] h-6.5 cursor-pointer font-sans"
                     />
                 </div>

                 <div className="flex flex-col min-w-[105px] max-w-[125px]">
                      <span className="text-[8.5px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Sort By</span>
                      <select
                         value={`${sortBy}-${sortOrder}`}
                         onChange={(e) => {
                             const [field, order] = e.target.value.split('-');
                             setSortBy(field);
                             setSortOrder(order);
                             setPage(1);
                         }}
                         className="border border-gray-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] h-6.5 cursor-pointer font-sans"
                      >
                         <option value="createdAt-desc">Created (Latest)</option>
                         <option value="createdAt-asc">Created (Oldest)</option>
                         <option value="date-desc">Issue Date (Latest)</option>
                         <option value="date-asc">Issue Date (Oldest)</option>
                         <option value="dueDate-desc">Due Date (Latest)</option>
                         <option value="dueDate-asc">Due Date (Oldest)</option>
                         <option value="grandTotal-desc">Amount (Highest)</option>
                         <option value="grandTotal-asc">Amount (Lowest)</option>
                         <option value="taxTotal-desc">GST (Highest)</option>
                         <option value="tds-desc">TDS (Highest)</option>
                         <option value="balanceDue-desc">Receivable (Highest)</option>
                      </select>
                 </div>

                 {(statusFilter || typeFilter || businessUnitFilter || startDate || endDate || searchTerm || dateTypeFilter !== 'date' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                     <button
                        onClick={() => {
                            setStatusFilter('');
                            setTypeFilter('');
                            setBusinessUnitFilter('');
                            setStartDate('');
                            setEndDate('');
                            setDateTypeFilter('date');
                            setSearchTerm('');
                            setSortBy('createdAt');
                            setSortOrder('desc');
                            setPage(1);
                            try {
                              localStorage.removeItem(FILTER_STORAGE_KEY);
                            } catch (e) {}
                        }}
                        className="self-end px-2.5 py-0.5 h-6.5 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                     >
                        Clear Filters
                     </button>
                 )}
             </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 font-sans text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/60">
              <tr>
                {can('invoices', 'delete') && (
                  <th className="px-1.5 py-1.5 w-7 text-center">
                    <button onClick={toggleSelectAll} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                      {selectedInvoices.length === invoices.length && invoices.length > 0 ? <FaCheckSquare size={13} /> : <FaRegSquare size={13} />}
                    </button>
                  </th>
                )}
                {visibleColumns.invoiceNo !== false && (
                  <th 
                    onClick={() => handleSort('invoiceNo')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Invoice {renderSortIcon('invoiceNo')}
                    </div>
                  </th>
                )}
                {visibleColumns.invoiceType && (
                  <th 
                    onClick={() => handleSort('invoiceType')}
                    className="px-1 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Type {renderSortIcon('invoiceType')}
                    </div>
                  </th>
                )}
                {visibleColumns.clientName && (
                  <th 
                    onClick={() => handleSort('clientName')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Client {renderSortIcon('clientName')}
                    </div>
                  </th>
                )}
                {visibleColumns.placeOfSupply && (
                  <th 
                    onClick={() => handleSort('placeOfSupply')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Place of Supply {renderSortIcon('placeOfSupply')}
                    </div>
                  </th>
                )}
                {visibleColumns.reverseCharge && (
                  <th 
                    onClick={() => handleSort('reverseCharge')}
                    className="px-1 py-1.5 text-center text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-center">
                      RCM {renderSortIcon('reverseCharge')}
                    </div>
                  </th>
                )}
                {visibleColumns.businessUnit && (
                  <th 
                    onClick={() => handleSort('businessUnit')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Business Unit {renderSortIcon('businessUnit')}
                    </div>
                  </th>
                )}
                {visibleColumns.date && (
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Date {renderSortIcon('date')}
                    </div>
                  </th>
                )}
                {visibleColumns.dueDate && (
                  <th 
                    onClick={() => handleSort('dueDate')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Due Date {renderSortIcon('dueDate')}
                    </div>
                  </th>
                )}
                {visibleColumns.paymentDate && (
                  <th 
                    onClick={() => handleSort('paymentDate')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Payment Date {renderSortIcon('paymentDate')}
                    </div>
                  </th>
                )}
                {visibleColumns.poDate && (
                  <th 
                    onClick={() => handleSort('poDate')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      PO Date {renderSortIcon('poDate')}
                    </div>
                  </th>
                )}
                {visibleColumns.poNumber && (
                  <th 
                    onClick={() => handleSort('poNumber')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      PO # {renderSortIcon('poNumber')}
                    </div>
                  </th>
                )}
                {visibleColumns.paymentMode && (
                  <th 
                    onClick={() => handleSort('paymentMode')}
                    className="px-1 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Mode {renderSortIcon('paymentMode')}
                    </div>
                  </th>
                )}
                {visibleColumns.paymentTerms && (
                  <th 
                    onClick={() => handleSort('paymentTerms')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Terms {renderSortIcon('paymentTerms')}
                    </div>
                  </th>
                )}
                {visibleColumns.status && (
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-1 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Status {renderSortIcon('status')}
                    </div>
                  </th>
                )}
                {visibleColumns.subTotal && (
                  <th 
                    onClick={() => handleSort('subTotal')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Taxable {renderSortIcon('subTotal')}
                    </div>
                  </th>
                )}
                {visibleColumns.taxTotal && (
                  <th 
                    onClick={() => handleSort('taxTotal')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Total GST {renderSortIcon('taxTotal')}
                    </div>
                  </th>
                )}
                {visibleColumns.totalCGST && (
                  <th 
                    onClick={() => handleSort('totalCGST')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      CGST {renderSortIcon('totalCGST')}
                    </div>
                  </th>
                )}
                {visibleColumns.totalSGST && (
                  <th 
                    onClick={() => handleSort('totalSGST')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      SGST {renderSortIcon('totalSGST')}
                    </div>
                  </th>
                )}
                {visibleColumns.totalIGST && (
                  <th 
                    onClick={() => handleSort('totalIGST')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      IGST {renderSortIcon('totalIGST')}
                    </div>
                  </th>
                )}
                {visibleColumns.grandTotal && (
                  <th 
                    onClick={() => handleSort('grandTotal')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Amount {renderSortIcon('grandTotal')}
                    </div>
                  </th>
                )}
                {visibleColumns.tds && (
                  <th 
                    onClick={() => handleSort('tds')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      TDS {renderSortIcon('tds')}
                    </div>
                  </th>
                )}
                {visibleColumns.tdsSection && (
                  <th 
                    onClick={() => handleSort('tdsSection')}
                    className="px-1.5 py-1.5 text-left text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      TDS Sec {renderSortIcon('tdsSection')}
                    </div>
                  </th>
                )}
                {visibleColumns.tdsRate && (
                  <th 
                    onClick={() => handleSort('tdsRate')}
                    className="px-1 py-1.5 text-center text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-center">
                      TDS % {renderSortIcon('tdsRate')}
                    </div>
                  </th>
                )}
                {visibleColumns.advancePaid && (
                  <th 
                    onClick={() => handleSort('advancePaid')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Received {renderSortIcon('advancePaid')}
                    </div>
                  </th>
                )}
                {visibleColumns.balanceDue && (
                  <th 
                    onClick={() => handleSort('balanceDue')}
                    className="px-1.5 py-1.5 text-right text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Receivable {renderSortIcon('balanceDue')}
                    </div>
                  </th>
                )}
                <th className="px-1 py-1.5 text-center text-[9.5px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none w-10">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800/60">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                     {can('invoices', 'delete') && <td className="px-1.5 py-1 text-center"><Skeleton width="13px" height="13px" className="mx-auto" /></td>}
                     {visibleColumns.invoiceNo !== false && <td className="px-1.5 py-1"><Skeleton width="65px" height="13px" /></td>}
                     {visibleColumns.invoiceType && <td className="px-1 py-1"><Skeleton width="45px" height="13px" /></td>}
                     {visibleColumns.clientName && (
                        <td className="px-1.5 py-1">
                          <Skeleton width="85px" height="13px" className="mb-0.5" />
                          <Skeleton width="45px" height="9px" />
                        </td>
                     )}
                     {visibleColumns.placeOfSupply && <td className="px-1.5 py-1"><Skeleton width="55px" height="13px" /></td>}
                     {visibleColumns.reverseCharge && <td className="px-1 py-1 text-center"><Skeleton width="30px" height="13px" className="mx-auto" /></td>}
                     {visibleColumns.businessUnit && <td className="px-1.5 py-1"><Skeleton width="55px" height="13px" /></td>}
                     {visibleColumns.date && <td className="px-1.5 py-1"><Skeleton width="48px" height="13px" /></td>}
                     {visibleColumns.dueDate && <td className="px-1.5 py-1"><Skeleton width="48px" height="13px" /></td>}
                     {visibleColumns.paymentDate && <td className="px-1.5 py-1"><Skeleton width="48px" height="13px" /></td>}
                     {visibleColumns.poDate && <td className="px-1.5 py-1"><Skeleton width="48px" height="13px" /></td>}
                     {visibleColumns.poNumber && <td className="px-1.5 py-1"><Skeleton width="45px" height="13px" /></td>}
                     {visibleColumns.paymentMode && <td className="px-1 py-1"><Skeleton width="40px" height="13px" /></td>}
                     {visibleColumns.paymentTerms && <td className="px-1.5 py-1"><Skeleton width="45px" height="13px" /></td>}
                     {visibleColumns.status && <td className="px-1 py-1"><Skeleton width="40px" height="14px" className="rounded-full" /></td>}
                     {visibleColumns.subTotal && <td className="px-1.5 py-1"><Skeleton width="48px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.taxTotal && <td className="px-1.5 py-1"><Skeleton width="42px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.totalCGST && <td className="px-1.5 py-1"><Skeleton width="38px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.totalSGST && <td className="px-1.5 py-1"><Skeleton width="38px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.totalIGST && <td className="px-1.5 py-1"><Skeleton width="38px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.grandTotal && <td className="px-1.5 py-1"><Skeleton width="48px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.tds && <td className="px-1.5 py-1"><Skeleton width="42px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.tdsSection && <td className="px-1.5 py-1"><Skeleton width="40px" height="13px" /></td>}
                     {visibleColumns.tdsRate && <td className="px-1 py-1 text-center"><Skeleton width="28px" height="13px" className="mx-auto" /></td>}
                     {visibleColumns.advancePaid && <td className="px-1.5 py-1"><Skeleton width="45px" height="13px" className="ml-auto" /></td>}
                     {visibleColumns.balanceDue && <td className="px-1.5 py-1"><Skeleton width="48px" height="13px" className="ml-auto" /></td>}
                     <td className="px-1 py-1 text-center"><Skeleton width="20px" height="13px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayedInvoices.length === 0 ? (
                <tr>
                  <td 
                    colSpan={ALL_INVOICE_COLUMNS.filter(c => visibleColumns[c.id]).length + 1 + (can('invoices', 'delete') ? 1 : 0)} 
                    className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 text-xs"
                  >
                    No invoices found.
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((inv, index) => {
                  const grandTotal = Number(inv.grandTotal || 0);
                  const totalGst = Number(inv.taxTotal || (inv.totalCGST || 0) + (inv.totalSGST || 0) + (inv.totalIGST || 0) || 0);
                  const tdsVal = Number(inv.tds || inv.tdsAmount || inv.tdsReceivable || 0);
                  const advancePaid = Number(inv.advancePaid || 0);
                  const netReceivable = Math.max(0, grandTotal - tdsVal);
                  const pendingReceivable = typeof inv.balanceDue === 'number' && inv.balanceDue !== null 
                    ? inv.balanceDue 
                    : Math.max(0, netReceivable - advancePaid);
                  const isSettled = inv.status === 'RECEIVED' || inv.status === 'PAID' || pendingReceivable <= 0;

                  return (
                    <tr key={inv._id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      {can('invoices', 'delete') && (
                        <td className="px-1.5 py-1 text-center">
                          <button onClick={() => toggleSelect(inv._id)} className={`${selectedInvoices.includes(inv._id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400 dark:hover:text-slate-500'}`}>
                             {selectedInvoices.includes(inv._id) ? <FaCheckSquare size={13} /> : <FaRegSquare size={13} />}
                         </button>
                        </td>
                      )}
                      
                      {/* Invoice No */}
                      {visibleColumns.invoiceNo !== false && (
                        <td className="px-1.5 py-1 whitespace-nowrap">
                            <Link to={`/invoices/${inv._id}/print`} className="text-blue-600 dark:text-blue-400 text-[11px] font-semibold hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                                {inv.invoiceNo}
                            </Link>
                        </td>
                      )}

                      {/* Type */}
                      {visibleColumns.invoiceType && (
                        <td className="px-1 py-1 whitespace-nowrap">
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                                {inv.invoiceType || 'Tax Invoice'}
                            </span>
                        </td>
                      )}
                      
                      {/* Client */}
                      {visibleColumns.clientName && (
                        <td className="px-1.5 py-1 whitespace-nowrap max-w-[130px]">
                            <div className="text-[11px] font-semibold text-gray-900 dark:text-slate-100 truncate max-w-[130px]" title={inv.client?.name}>
                              {inv.client?.name}
                            </div>
                            {inv.client?.gstin && <div className="text-[8.5px] text-gray-400 dark:text-slate-400 font-mono truncate">{inv.client.gstin}</div>}
                        </td>
                      )}

                      {/* Place of Supply */}
                      {visibleColumns.placeOfSupply && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10.5px] text-gray-600 dark:text-slate-300">
                          {inv.placeOfSupply || '—'}
                        </td>
                      )}

                      {/* Reverse Charge */}
                      {visibleColumns.reverseCharge && (
                        <td className="px-1 py-1 whitespace-nowrap text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-semibold border ${
                            inv.reverseCharge 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                              : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                          }`}>
                            {inv.reverseCharge ? 'Yes' : 'No'}
                          </span>
                        </td>
                      )}

                      {/* Business Unit */}
                      {visibleColumns.businessUnit && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10px] text-gray-600 dark:text-slate-300">
                          {typeof inv.businessUnit === 'object' && inv.businessUnit ? (inv.businessUnit.name || inv.businessUnit.code || '—') : (inv.businessUnit || '—')}
                        </td>
                      )}
   
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10.5px] text-gray-500 dark:text-slate-400">
                            {formatDate(inv.date)}
                        </td>
                      )}
   
                      {/* Due Date */}
                      {visibleColumns.dueDate && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10.5px] text-gray-500 dark:text-slate-400">
                            {inv.dueDate ? (
                              <span className={new Date(inv.dueDate) < new Date() && !isSettled ? 'text-red-500 font-medium font-sans' : ''}>
                                {formatDate(inv.dueDate)}
                              </span>
                            ) : '—'}
                        </td>
                      )}

                      {/* Payment Date */}
                      {visibleColumns.paymentDate && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10.5px] text-gray-500 dark:text-slate-400">
                          {inv.paymentDate ? formatDate(inv.paymentDate) : '—'}
                        </td>
                      )}

                      {/* PO Date */}
                      {visibleColumns.poDate && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10.5px] text-gray-500 dark:text-slate-400">
                          {(inv.poDate || inv.transport?.poDate) ? formatDate(inv.poDate || inv.transport?.poDate) : '—'}
                        </td>
                      )}

                      {/* PO Number */}
                      {visibleColumns.poNumber && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10.5px] font-mono text-gray-600 dark:text-slate-300">
                          {inv.poNumber || inv.transport?.poNumber || inv.purchaseOrderNumber || '—'}
                        </td>
                      )}

                      {/* Payment Mode */}
                      {visibleColumns.paymentMode && (
                        <td className="px-1 py-1 whitespace-nowrap text-[10px] text-gray-600 dark:text-slate-300">
                          <span className="capitalize">{inv.paymentMode || inv.paymentMethod || '—'}</span>
                        </td>
                      )}

                      {/* Payment Terms */}
                      {visibleColumns.paymentTerms && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10px] text-gray-600 dark:text-slate-300">
                          {inv.paymentTerms || '—'}
                        </td>
                      )}
   
                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="px-1 py-1 whitespace-nowrap">
                            <select
                               value={inv.status === 'PAID' ? 'RECEIVED' : (inv.status || (isSettled ? 'RECEIVED' : 'SENT'))}
                               onChange={async (e) => {
                                   const newStatus = e.target.value;
                                   try {
                                       await api.put(`/invoices/${inv._id}/status`, { status: newStatus });
                                       fetchInvoices();
                                   } catch (err) {
                                       alert(err.response?.data?.message || 'Failed to update status');
                                   }
                               }}
                               className={`px-1 py-0.5 rounded text-[8.5px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent transition-colors text-center appearance-none ${
                                   (inv.status === 'RECEIVED' || inv.status === 'PAID' || (!inv.status && isSettled)) ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/60' :
                                   inv.status === 'DRAFT' ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700' :
                                   (inv.status === 'SENT' || (!inv.status && !isSettled)) ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60' :
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
                      )}

                      {/* Subtotal / Taxable */}
                      {visibleColumns.subTotal && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[10.5px] font-semibold text-gray-800 dark:text-slate-200 font-mono">
                          ₹{Number(inv.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* Total GST */}
                      {visibleColumns.taxTotal && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[10.5px]">
                            {totalGst > 0 ? (
                              <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono text-[10.5px]">
                                  ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                {inv.totalIGST > 0 ? (
                                  <span className="text-[8px] text-gray-400 dark:text-slate-500 block leading-tight">IGST</span>
                                ) : (inv.totalCGST > 0 || inv.totalSGST > 0) ? (
                                  <span className="text-[8px] text-gray-400 dark:text-slate-500 block leading-tight">CGST+SGST</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-slate-500 font-mono text-[10.5px]">—</span>
                            )}
                        </td>
                      )}

                      {/* CGST */}
                      {visibleColumns.totalCGST && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[10.5px] font-mono text-slate-700 dark:text-slate-300">
                          {Number(inv.totalCGST || 0) > 0 ? `₹${Number(inv.totalCGST).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      )}

                      {/* SGST */}
                      {visibleColumns.totalSGST && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[10.5px] font-mono text-slate-700 dark:text-slate-300">
                          {Number(inv.totalSGST || 0) > 0 ? `₹${Number(inv.totalSGST).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      )}

                      {/* IGST */}
                      {visibleColumns.totalIGST && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[10.5px] font-mono text-slate-700 dark:text-slate-300">
                          {Number(inv.totalIGST || 0) > 0 ? `₹${Number(inv.totalIGST).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      )}
   
                      {/* Amount */}
                      {visibleColumns.grandTotal && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[11px] font-bold text-gray-900 dark:text-slate-100 font-mono">
                            ₹{grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}

                      {/* TDS */}
                      {visibleColumns.tds && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[10.5px]">
                            {tdsVal > 0 ? (
                              <div>
                                <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono text-[10.5px]">
                                  ₹{tdsVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                {inv.tdsSection && (
                                  <span className="text-[7.5px] text-gray-400 dark:text-slate-500 block leading-tight">
                                    Sec {inv.tdsSection}{inv.tdsRate ? ` (${inv.tdsRate}%)` : ''}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-slate-500 font-mono text-[10.5px]">—</span>
                            )}
                        </td>
                      )}

                      {/* TDS Section */}
                      {visibleColumns.tdsSection && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-[10.5px] font-semibold text-amber-700 dark:text-amber-400">
                          {inv.tds_section || inv.tdsSection ? `Sec ${inv.tds_section || inv.tdsSection}` : '—'}
                        </td>
                      )}

                      {/* TDS Rate */}
                      {visibleColumns.tdsRate && (
                        <td className="px-1 py-1 whitespace-nowrap text-center text-[10.5px] font-mono text-gray-600 dark:text-slate-300">
                          {(inv.tds_rate || inv.tdsRate) ? `${inv.tds_rate || inv.tdsRate}%` : '—'}
                        </td>
                      )}

                      {/* Advance / Paid */}
                      {visibleColumns.advancePaid && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {advancePaid > 0 ? `₹${advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      )}
   
                      {/* Receivable */}
                      {visibleColumns.balanceDue && (
                        <td className="px-1.5 py-1 whitespace-nowrap text-right text-[11px]">
                            <div className="flex flex-col items-end">
                              <span className={`font-bold font-mono text-[11px] ${
                                isSettled 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : (inv.dueDate && new Date(inv.dueDate) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')
                              }`}>
                                ₹{pendingReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              {advancePaid > 0 && (
                                <span className="text-[8px] text-gray-400 dark:text-slate-500 leading-tight">
                                  Rec&apos;d: ₹{advancePaid.toLocaleString('en-IN')}
                                </span>
                              )}
                              {advancePaid === 0 && tdsVal > 0 && (
                                <span className="text-[8px] text-gray-400 dark:text-slate-500 leading-tight">
                                  Net: ₹{netReceivable.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                        </td>
                      )}
   
                      {/* Actions 3-Dot Menu */}
                      <td className="px-1 py-1 whitespace-nowrap text-center text-xs font-medium relative">
                        <div className="relative inline-block text-left" ref={actionMenuId === inv._id ? actionMenuRef : null}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(prev => prev === inv._id ? null : inv._id);
                            }}
                            className={`p-1 rounded-md text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none ${actionMenuId === inv._id ? 'bg-gray-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs' : ''}`}
                            title="Actions"
                          >
                            <FaEllipsisV size={12} />
                          </button>

                          {actionMenuId === inv._id && (
                            <div 
                              className={`absolute right-0 ${
                                index >= Math.max(1, displayedInvoices.length - 2) ? 'bottom-full mb-1' : 'top-full mt-1'
                              } w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 border border-gray-200 dark:border-slate-700 py-1.5 z-50 text-left text-xs font-medium text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link 
                                to={`/invoices/${inv._id}/print`} 
                                onClick={() => setActionMenuId(null)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-slate-700/80 text-gray-700 dark:text-slate-200 transition-colors"
                              >
                                <FaEye size={13} className="text-gray-400 dark:text-slate-400" />
                                <span>{can('invoices', 'pdf') ? 'View / Print' : 'View'}</span>
                              </Link>

                              {can('invoices', 'email') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    setEmailModalInvoice(inv);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 transition-colors"
                                >
                                  <FaPaperPlane size={12} className="text-teal-600 dark:text-teal-400" />
                                  <span>Send Email</span>
                                </button>
                              )}

                              {can('invoices', 'edit') && (
                                <Link 
                                  to={`/invoices/edit/${inv._id}`} 
                                  onClick={() => setActionMenuId(null)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-slate-700/80 text-gray-700 dark:text-slate-200 transition-colors"
                                >
                                  <FaEdit size={13} className="text-gray-400 dark:text-slate-400" />
                                  <span>Edit</span>
                                </Link>
                              )}

                              {can('invoices', 'delete') && (
                                <>
                                  <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                                  <button 
                                    type="button"
                                    onClick={async () => {
                                      setActionMenuId(null);
                                      if (!isPro) {
                                        setShowPremiumModal(true);
                                        return;
                                      }
                                      if (window.confirm('Are you sure you want to delete this invoice?')) {
                                        try {
                                          await api.delete(`/invoices/${inv._id}`);
                                          fetchInvoices();
                                        } catch(err) {
                                          alert('Failed to delete');
                                        }
                                      }
                                    }} 
                                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${
                                      isPro 
                                        ? 'hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400' 
                                        : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                    }`}
                                    title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                                  >
                                    <FaTrash size={12} className={isPro ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-slate-600'} />
                                    <span>{isPro ? 'Delete' : 'Delete (Pro)'}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {displayedInvoices.length > 0 && (
              <tfoot className="bg-gray-50/90 dark:bg-slate-800/80 border-t-2 border-gray-200 dark:border-slate-700 font-semibold text-xs text-gray-900 dark:text-slate-100">
                <tr>
                  <td 
                    colSpan={
                      (can('invoices', 'delete') ? 1 : 0) +
                      ['invoiceNo', 'invoiceType', 'clientName', 'placeOfSupply', 'reverseCharge', 'businessUnit', 'date', 'dueDate', 'paymentDate', 'poDate', 'poNumber', 'paymentMode', 'paymentTerms', 'status']
                        .reduce((acc, colId) => acc + (visibleColumns[colId] ? 1 : 0), 0)
                    } 
                    className="px-2 py-2 text-right text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold"
                  >
                    Page Total ({displayedInvoices.length}):
                  </td>
                  {visibleColumns.subTotal && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-xs text-gray-800 dark:text-slate-200">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.subTotal) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.taxTotal && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.taxTotal || (i.totalCGST || 0) + (i.totalSGST || 0) + (i.totalIGST || 0)) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.totalCGST && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.totalCGST) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.totalSGST && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.totalSGST) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.totalIGST && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.totalIGST) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.grandTotal && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.tds && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.tds || i.tdsAmount || i.tdsReceivable) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.tdsSection && <td className="px-1.5 py-2"></td>}
                  {visibleColumns.tdsRate && <td className="px-1 py-2"></td>}
                  {visibleColumns.advancePaid && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => sum + (Number(i.advancePaid) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {visibleColumns.balanceDue && (
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                      ₹{displayedInvoices.reduce((sum, i) => {
                        const grand = Number(i.grandTotal) || 0;
                        const tds = Number(i.tds || i.tdsAmount || i.tdsReceivable) || 0;
                        const adv = Number(i.advancePaid) || 0;
                        const bal = typeof i.balanceDue === 'number' && i.balanceDue !== null ? i.balanceDue : Math.max(0, grand - tds - adv);
                        return sum + (i.status === 'RECEIVED' || i.status === 'PAID' ? 0 : bal);
                      }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            )}
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

      {/* Send Invoice via SMTP Modal */}
      <SendInvoiceModal
        isOpen={Boolean(emailModalInvoice)}
        onClose={() => setEmailModalInvoice(null)}
        invoice={emailModalInvoice}
        settings={settings}
        onEmailSent={() => {
          fetchInvoices();
        }}
      />

      {/* Column Customizer Modal */}
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title="Customize Table Columns"
      >
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Choose which columns to show or hide in the invoices table. Your preference is saved automatically.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllColumns}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-gray-300 dark:text-slate-600">•</span>
              <button
                type="button"
                onClick={resetColumns}
                className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:underline cursor-pointer"
              >
                Reset Default
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {Array.from(new Set(ALL_INVOICE_COLUMNS.map((c) => c.group))).map((groupName) => {
              const cols = ALL_INVOICE_COLUMNS.filter((c) => c.group === groupName);
              return (
                <div key={groupName} className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    {groupName}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cols.map((col) => {
                      const isChecked = Boolean(visibleColumns[col.id]);
                      const isLocked = Boolean(col.required);
                      return (
                        <label
                          key={col.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all select-none ${
                            isChecked
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                              : 'bg-white dark:bg-slate-800/60 border-gray-200 dark:border-slate-700/80 hover:bg-gray-50 dark:hover:bg-slate-800'
                          } ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isLocked}
                            onChange={() => toggleColumn(col.id)}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900 border-gray-300 dark:border-slate-600 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                                {col.label}
                              </span>
                              {isLocked && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 font-medium">
                                  Required
                                </span>
                              )}
                            </div>
                            {col.desc && (
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                                {col.desc}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={resetColumns}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FaUndo size={11} className="text-gray-400 dark:text-slate-500" />
              <span>Reset to Default</span>
            </button>
            <button
              type="button"
              onClick={() => setIsColumnModalOpen(false)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default InvoiceList;
