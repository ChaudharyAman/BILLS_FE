import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaChevronDown, FaFileAlt, FaArrowRight } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import QuotaIndicator from '../components/QuotaIndicator';

const QuoteList = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedImportQuotes, setParsedImportQuotes] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Sorting & Filtering State
  const [statusFilter, setStatusFilter] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateTypeFilter, setDateTypeFilter] = useState('date'); // 'date' or 'validUntil'
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  useEffect(() => {
    api.get('/business-units?status=active')
      .then(res => setBusinessUnits(res.data || []))
      .catch(err => console.error('Failed to load business units:', err));
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchQuotes();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage, statusFilter, businessUnitFilter, startDate, endDate, dateTypeFilter, sortBy, sortOrder]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
        businessUnit: businessUnitFilter,
        startDate,
        endDate,
        dateType: dateTypeFilter,
        sortBy,
        sortOrder,
      }).toString();

      const res = await api.get(`/quotes?${queryParams}`);
      setQuotes(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quote?')) return;
    try { await api.delete(`/quotes/${id}`); fetchQuotes(); }
    catch (e) { alert('Failed to delete'); }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this quote to an Invoice?')) return;
    try {
      const res = await api.post(`/quotes/${id}/convert`);
      alert(`Invoice ${res.data.invoice.invoiceNo} created!`);
      navigate(`/invoices/${res.data.invoice._id}/print`);
    } catch (e) { alert(e.response?.data?.message || 'Conversion failed'); }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelectedIds(selectedIds.length === quotes.length ? [] : quotes.map(q => q._id));

  const handleBulkDelete = async () => {
    if (!isPro) {
      setShowPremiumModal(true);
      return;
    }
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete the ${selectedIds.length} selected quotes?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedIds.map(id => api.delete(`/quotes/${id}`)));
        setSelectedIds([]);
        fetchQuotes();
      } catch (error) {
        console.error('Error deleting quotes:', error);
        alert(error.response?.data?.message || 'Failed to delete some quotes');
      } finally {
        setLoading(false);
      }
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
      ? <span className="text-blue-600 ml-1.5 text-xs font-bold font-sans">↑</span> 
      : <span className="text-blue-600 ml-1.5 text-xs font-bold font-sans">↓</span>;
  };

  const resetImportModal = () => {
    if (isImporting) return;
    setIsCsvModalOpen(false);
    setParsedImportQuotes([]);
    setImportResult(null);
  };

  const parseQuoteRows = (data) => {
      const grouped = {};
      data.forEach((row, index) => {
        const getVal = (keys) => {
           for (const key of keys) {
             if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
               return row[key];
             }
           }
           return undefined;
        };

        const id = getVal(['Quote No', 'Draft No', 'ID', 'Id', 'id', 'Quote Number']) || Math.random().toString();
        if (!grouped[id]) {
          grouped[id] = {
            _importRowId: `quote-import-${Date.now()}-${index}`,
            quoteNo: String(id || '').trim(),
            clientName: getVal(['Client Name', 'Client', 'Customer Name', 'Customer']),
            clientEmail: getVal(['Client Email', 'Email', 'Customer Email']) || '',
            clientPhone: getVal(['Client Phone', 'Phone', 'Customer Phone', 'Contact']) || '',
            clientState: getVal(['Client State', 'State', 'Place of Supply']) || '',
            placeOfSupply: getVal(['Place of Supply', 'Client State', 'State']) || '',
            invoiceType: getVal(['Invoice Type', 'Type', 'Document Type']) || 'Tax Invoice',
            date: getVal(['Date', 'Quote Date', 'Issue Date']) || undefined,
            validUntil: getVal(['Valid Until', 'Valid']) || undefined,
            shippingCharges: Number(getVal(['Shipping Charges', 'Shipping', 'Freight'])) || 0,
            packagingCharges: Number(getVal(['Packaging Charges', 'Packaging'])) || 0,
            discountTotal: Number(getVal(['Discount Total', 'Discount'])) || 0,
            importedGrandTotal: Number(getVal(['Total', 'Grand Total', 'Grand Tot', 'Grand Total ', 'GrandTot'])) || 0,
            importedSubTotal: Number(getVal(['Sub Total', 'Subtotal', 'Taxable Value', 'SubTotal', 'Subtot', 'Sub Tot'])) || 0,
            items: []
          };
        }
        
        const itemName = getVal(['Item Name', 'Item', 'Product Name', 'Product', 'Description']);
        if (itemName) {
           grouped[id].items.push({
             name: itemName,
             description: getVal(['Item Description', 'Desc', 'Details']) || '',
             qty: Number(getVal(['Qty', 'QTY', 'Quantity', 'Quantity '])) || 1,
             rate: Number(getVal(['Rate', 'Price', 'Unit Price'])) || 0,
             taxRate: Number(getVal(['Tax Rate', 'Tax', 'Tax %', 'GST', 'IGST'])) || 0,
             discount: Number(getVal(['Item Discount', 'Disc'])) || 0 
           });
        }
      });

      return Object.values(grouped).filter(q => q.clientName);
  };

  const handleCsvParsed = (data) => {
      const formattedQuotes = parseQuoteRows(data);

      if (formattedQuotes.length === 0) {
        alert('No valid quotes found. Ensure the "Client Name" column exists.');
        return;
      }

      setParsedImportQuotes(formattedQuotes);
      setImportResult(null);
  };

  const handleImportParsedQuotes = async () => {
    if (parsedImportQuotes.length === 0) return;

    setIsImporting(true);
    try {
      const res = await api.post('/quotes/bulk', { quotes: parsedImportQuotes });
      setImportResult(res.data);
      setLoading(true);
      fetchQuotes();
    } catch (error) {
      console.error('Bulk import error:', error);
      setImportResult({
        message: 'Failed to import quotes.',
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: parsedImportQuotes.length,
        failedQuotes: parsedImportQuotes.map((quote, index) => ({
          importRowId: quote._importRowId,
          row: index + 1,
          quoteNo: quote.quoteNo,
          clientName: quote.clientName,
          reason: error.response?.data?.message || error.message,
        })),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const buildImportOutcomeRows = () => {
    const importedByRow = new Map((importResult?.importedQuotes || []).map((item) => [item.importRowId, item]));
    const skippedByRow = new Map((importResult?.skippedQuotes || []).map((item) => [item.importRowId, item]));
    const failedByRow = new Map((importResult?.failedQuotes || []).map((item) => [item.importRowId, item]));
    const renumberedByRow = new Map((importResult?.renumberedQuotes || []).map((item) => [item.importRowId, item]));

    return parsedImportQuotes.map((quote, index) => {
      const imported = importedByRow.get(quote._importRowId);
      const skipped = skippedByRow.get(quote._importRowId);
      const failed = failedByRow.get(quote._importRowId);
      const renumbered = renumberedByRow.get(quote._importRowId);

      if (failed) return { ...quote, row: index + 1, outcome: 'Failed', finalNo: quote.quoteNo || 'Auto', reason: failed.reason };
      if (skipped) return { ...quote, row: index + 1, outcome: 'Skipped', finalNo: skipped.quoteNo || quote.quoteNo, reason: skipped.reason };
      if (imported) return { ...quote, row: index + 1, outcome: renumbered || imported.renumbered ? 'Imported with new number' : 'Imported', finalNo: imported.quoteNo, reason: renumbered?.reason || 'Imported successfully' };
      return { ...quote, row: index + 1, outcome: importResult ? 'Not processed' : 'Ready', finalNo: quote.quoteNo || 'Auto', reason: '' };
    });
  };

  const importOutcomeClass = (outcome) => {
    if (outcome === 'Imported' || outcome === 'Imported with new number') return 'bg-green-50 text-green-700 border-green-200';
    if (outcome === 'Skipped') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (outcome === 'Failed') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const displayed = quotes; // Handled by backend

  const getFinancialYear = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed: 0 is Jan, 3 is Apr
    if (month >= 3) {
      return `${year}-${String(year + 1).slice(-2)}`;
    } else {
      return `${year - 1}-${String(year).slice(-2)}`;
    }
  };

  const mapQuoteForExport = (q) => ({
    ...q,
    creatorName: q.user?.username || userObj?.username || '',
    financialYear: getFinancialYear(q.date),
    type: 'Quotation',
    converted: (q.convertedToInvoice || q.status === 'CONVERTED') ? 'Y' : 'N',
    discount: q.discountTotal || 0,
    tds: q.tds || 0,
    tcs: q.tcs || 0,
  });

  const buildQuoteExportRows = (rows) =>
    (rows || []).map((quote) => {
      const mapped = mapQuoteForExport(quote);
      
      const itemsSummary = (quote.items || [])
        .map(item => {
          const qtyStr = `Qty: ${item.qty || 0}`;
          const unitStr = item.unit ? ` ${item.unit}` : '';
          return `${item.name || ''} (${qtyStr}${unitStr})`;
        })
        .filter(Boolean)
        .join(', ');

      return {
        ...mapped,
        exportItemsSummary: itemsSummary
      };
    });

  const exportRows = buildQuoteExportRows(
    selectedIds.length > 0 ? displayed.filter(q => selectedIds.includes(q._id)) : displayed
  );

  const fetchQuotesForExport = async () => {
    const queryParams = new URLSearchParams({
      all: 'true',
      search: searchTerm,
      status: statusFilter,
      businessUnit: businessUnitFilter,
      startDate,
      endDate,
      dateType: dateTypeFilter,
      sortBy,
      sortOrder,
    }).toString();

    const res = await api.get(`/quotes?${queryParams}`);
    let rawData = res.data.data || [];

    if (selectedIds.length > 0) {
      rawData = rawData.filter((quote) => selectedIds.includes(quote._id));
    }

    return buildQuoteExportRows(rawData);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SENT: 'bg-blue-100 text-blue-700 border-blue-200',
    ACCEPTED: 'bg-green-100 text-green-700 border-green-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    CONVERTED: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Quotes</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Create and manage quotations for your clients</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <FaTrash size={14} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <div onClick={() => !isPro && setShowPremiumModal(true)} className={!isPro ? 'cursor-pointer' : ''}>
            <ExportDropdown 
                disabled={!isPro}
                data={exportRows}
                getExportData={fetchQuotesForExport}
                filename="Flance_Quotes"
                columns={[
                   { header: 'Quote Number', key: 'quoteNo' },
                   { header: 'Date', key: 'date' },
                   { header: 'Valid Until', key: 'validUntil' },
                   { header: 'Status', key: 'status' },
                   { header: 'Invoice Type', key: 'invoiceType' },
                   { header: 'Payment Mode', key: 'paymentMode' },
                   { header: 'Payment Terms', key: 'paymentTerms' },
                   { header: 'Place of Supply', key: 'placeOfSupply' },
                   { header: 'Reverse Charge', key: 'reverseCharge' },
                   { header: 'Client Name', key: 'client.name' },
                   { header: 'Client GSTIN', key: 'client.gstin' },
                   { header: 'Client Phone Number', key: 'client.phone' },
                   { header: 'Client Email', key: 'client.email' },
                   { header: 'Client Address Line 1', key: 'client.address.line1' },
                   { header: 'Client Address Line 2', key: 'client.address.line2' },
                   { header: 'Client City', key: 'client.address.city' },
                   { header: 'Client State', key: 'client.address.state' },
                   { header: 'Client ZIP', key: 'client.address.zip' },
                   { header: 'Client Country', key: 'client.address.country' },
                   { header: 'Shipping Address Line 1', key: 'shippingAddress.line1' },
                   { header: 'Shipping Address Line 2', key: 'shippingAddress.line2' },
                   { header: 'Shipping City', key: 'shippingAddress.city' },
                   { header: 'Shipping State', key: 'shippingAddress.state' },
                   { header: 'Shipping ZIP', key: 'shippingAddress.zip' },
                   { header: 'Shipping Country', key: 'shippingAddress.country' },
                   { header: 'Transport Mode', key: 'transport.mode' },
                   { header: 'Vehicle Number', key: 'transport.vehicleNumber' },
                   { header: 'P.O. Number', key: 'transport.poNumber' },
                   { header: 'P.O. Date', key: 'transport.poDate' },
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
                   { header: 'Creator Name', key: 'creatorName' },
                   { header: 'Financial Year', key: 'financialYear' },
                   { header: 'Type', key: 'type' },
                   { header: 'Converted', key: 'converted' },
                   { header: 'Private notes', key: 'notes' },
                   { header: 'Terms', key: 'terms' },
                   { header: 'Bank Account Name', key: 'bankDetails.accountName' },
                   { header: 'Bank Name', key: 'bankDetails.bankName' },
                   { header: 'Bank Account Number', key: 'bankDetails.accountNumber' },
                   { header: 'Bank Branch', key: 'bankDetails.branch' },
                   { header: 'Bank IFSC Code', key: 'bankDetails.ifscCode' },
                   { header: 'Items', key: 'exportItemsSummary' }
                ]}
            />
          </div>
          <button
              onClick={() => isPro ? setIsCsvModalOpen(true) : setShowPremiumModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm ${
                isPro 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 opacity-70 cursor-not-allowed'
              }`}
            >
              <FaFileAlt size={16} /> Bulk Import
            </button>
          <Link to="/quotes/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
            <FaPlus size={16} /> New Quote
          </Link>
        </div>
      </div>

      {/* Quota Indicator for Free Tier */}
      <QuotaIndicator type="quotes" />

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        
        {/* Table Toolbar & Filters */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col gap-4">
             <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="relative max-w-xs w-full">
                     <input 
                        type="text" 
                        placeholder="Search quotes..." 
                        className="w-full pl-3 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm font-sans"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                     />
                 </div>
                 <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                     Showing {displayed.length} of {totalRecords} results
                 </div>
             </div>

             {/* Filters Bar */}
             <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-sm">
                 <div className="flex flex-col min-w-[140px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Status</span>
                     <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 dark:text-slate-200 transition-all cursor-pointer font-sans"
                     >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="SENT">SENT</option>
                        <option value="ACCEPTED">ACCEPTED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="CONVERTED">CONVERTED</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[160px]">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Business Unit</span>
                      <select
                         value={businessUnitFilter}
                         onChange={(e) => { setBusinessUnitFilter(e.target.value); setPage(1); }}
                         className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 dark:text-slate-200 transition-all cursor-pointer font-sans"
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
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 dark:text-slate-200 transition-all cursor-pointer font-sans"
                     >
                        <option value="date">Issue Date</option>
                        <option value="validUntil">Valid Until</option>
                     </select>
                 </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">From Date</span>
                     <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 dark:text-slate-200 transition-all cursor-pointer font-sans"
                     />
                 </div>

                 <div className="flex flex-col min-w-[130px]">
                     <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">To Date</span>
                     <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 dark:text-slate-200 transition-all cursor-pointer font-sans"
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
                         className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 dark:text-slate-200 transition-all cursor-pointer font-sans"
                      >
                         <option value="createdAt-desc">Created (Latest first)</option>
                         <option value="createdAt-asc">Created (Oldest first)</option>
                         <option value="date-desc">Issue Date (Latest first)</option>
                         <option value="date-asc">Issue Date (Oldest first)</option>
                         <option value="validUntil-desc">Valid Until (Latest first)</option>
                         <option value="validUntil-asc">Valid Until (Oldest first)</option>
                         <option value="grandTotal-desc">Amount (Highest first)</option>
                         <option value="grandTotal-asc">Amount (Lowest first)</option>
                      </select>
                  </div>

                 {(statusFilter || startDate || endDate || searchTerm || dateTypeFilter !== 'date' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                     <button
                        onClick={() => {
                            setStatusFilter('');
                            setStartDate('');
                            setEndDate('');
                            setDateTypeFilter('date');
                            setSearchTerm('');
                            setSortBy('createdAt');
                            setSortOrder('desc');
                            setPage(1);
                        }}
                        className="self-end px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                     >
                        Clear Filters
                     </button>
                 )}
             </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 font-sans">
            <thead className="bg-gray-50 dark:bg-slate-800/75">
              <tr>
                <th className="px-4 py-2 w-10 text-center">
                  <button onClick={toggleAll} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                    {selectedIds.length === quotes.length && quotes.length > 0 ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('quoteNo')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Quote No. {renderSortIcon('quoteNo')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('clientName')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Client {renderSortIcon('clientName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('validUntil')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Valid Until {renderSortIcon('validUntil')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Status {renderSortIcon('status')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('grandTotal')}
                  className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Amount {renderSortIcon('grandTotal')}
                  </div>
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                    <td className="px-4 py-2 text-center"><Skeleton width="16px" height="16px" className="mx-auto" /></td>
                    <td className="px-4 py-2"><Skeleton width="80px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="120px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="20px" className="rounded-full" /></td>
                    <td className="px-4 py-2 text-right"><Skeleton width="60px" height="16px" className="ml-auto" /></td>
                    <td className="px-4 py-2 text-center"><Skeleton width="80px" height="16px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 text-xs">No quotes found.</td></tr>
              ) : (
                displayed.map(q => (
                  <tr key={q._id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => toggleSelect(q._id)} className={selectedIds.includes(q._id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400 dark:hover:text-slate-400'}>
                        {selectedIds.includes(q._id) ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link to={`/quotes/${q._id}/print`} className="text-blue-600 dark:text-blue-400 text-xs font-semibold hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                        {q.quoteNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-xs font-semibold text-gray-900 dark:text-slate-100">{q.client?.name}</div>
                      {q.client?.gstin && <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{q.client.gstin}</div>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">{fmtDate(q.date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                      {q.validUntil ? (
                        <span className={new Date(q.validUntil) < new Date() && q.status !== 'CONVERTED' ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                          {fmtDate(q.validUntil)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {q.status === 'CONVERTED' ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[q.status] || STATUS_STYLES.DRAFT}`}>
                          {q.status}
                        </span>
                      ) : (
                        <select
                           value={q.status || 'DRAFT'}
                           onChange={async (e) => {
                               const newStatus = e.target.value;
                               try {
                                   await api.put(`/quotes/${q._id}/status`, { status: newStatus });
                                   fetchQuotes();
                               } catch (err) {
                                   alert(err.response?.data?.message || 'Failed to update status');
                               }
                           }}
                           className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent transition-colors text-center appearance-none ${
                               q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800' :
                               q.status === 'SENT' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                               q.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                               q.status === 'DRAFT' ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' :
                               'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                           }`}
                        >
                            <option value="DRAFT" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">DRAFT</option>
                            <option value="SENT" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">SENT</option>
                            <option value="ACCEPTED" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">ACCEPTED</option>
                            <option value="REJECTED" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">REJECTED</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900 dark:text-slate-100">
                      ₹{fmt(q.grandTotal)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2 items-center">
                        <Link to={`/quotes/${q._id}/print`} className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="View"><FaEye size={16} /></Link>
                        {q.status !== 'CONVERTED' ? (
                          <Link to={`/quotes/edit/${q._id}`} className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit"><FaEdit size={16} /></Link>
                        ) : (
                          <span className="text-gray-200 dark:text-slate-700 cursor-not-allowed" title="Converted quotations cannot be edited"><FaEdit size={16} /></span>
                        )}
                        {q.status !== 'CONVERTED' && (
                          <button onClick={() => handleConvert(q._id)} className="text-gray-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors" title="Convert to Invoice">
                            <FaArrowRight size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (!isPro) return setShowPremiumModal(true);
                            handleDelete(q._id);
                          }} 
                          className={`transition-colors ${isPro ? 'text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-500'}`} 
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

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-sans transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">Rows per page:</span>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 dark:border-slate-700 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 dark:text-slate-400">
                  Page <span className="font-medium text-gray-900 dark:text-slate-100">{page}</span> of <span className="font-medium text-gray-900 dark:text-slate-100">{totalPages || 1}</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        title={importResult ? 'Quote Import Result' : parsedImportQuotes.length ? 'Parsed Quotes Ready to Import' : 'Bulk Import Quotes to Database'}
      >
        {parsedImportQuotes.length === 0 ? (
          <>
            <CsvAndExcelUploader
              onDataParsed={handleCsvParsed}
              isLoading={isImporting}
              title="Upload Quotes File"
              subtitle="Group rows by 'Quote No'. Columns must include 'Client Name', 'Item Name', 'Qty', 'Rate'."
            />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={resetImportModal} disabled={isImporting} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Parsed', parsedImportQuotes.length, 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800'],
                ['Imported', importResult?.imported ?? 0, 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40'],
                ['Updated', importResult?.updated ?? 0, 'border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40'],
                ['Skipped', importResult?.skipped ?? 0, 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'],
                ['Failed', importResult?.failed ?? 0, 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40'],
              ].map(([label, value, cls]) => (
                <div key={label} className={`border rounded-lg p-3 ${cls}`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</div>
                  <div className="text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>
            {importResult?.message && <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">{importResult.message}</div>}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[48vh]">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      {['Row', 'Quote', 'Final No', 'Client', 'Date', 'Amount', 'Result', 'Reason'].map((header) => (
                        <th key={header} className={`px-4 py-3 text-${header === 'Amount' ? 'right' : 'left'} text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400`}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                    {buildImportOutcomeRows().map((row) => (
                      <tr key={row._importRowId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.row}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.quoteNo || 'Auto'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.finalNo}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.clientName}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.date ? fmtDate(row.date) : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">₹{fmt(row.importedGrandTotal || row.grandTotal)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${importOutcomeClass(row.outcome)}`}>{row.outcome}</span></td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 min-w-[220px]">{row.reason || 'Ready to import'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setParsedImportQuotes([]); setImportResult(null); }} disabled={isImporting} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50">Upload Another File</button>
              <button type="button" onClick={resetImportModal} disabled={isImporting} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50">Close</button>
              {!importResult && <button type="button" onClick={handleImportParsedQuotes} disabled={isImporting} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"> {isImporting ? 'Importing...' : `Import ${parsedImportQuotes.length} Quotes`}</button>}
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
            Deleting quotes is a premium feature. Upgrade to Pro to unlock unlimited document management, including deleting and an unlimited edit quota.
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

    </div>
  );
};

export default QuoteList;
