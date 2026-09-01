import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaFileAlt, FaFilePdf } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import PdfInvoiceImporter from '../components/PdfInvoiceImporter';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  PAID: 'bg-green-100 text-green-700 border-green-200',
  RECEIVED: 'bg-green-100 text-green-700 border-green-200',
  PARTIAL: 'bg-amber-100 text-amber-700 border-amber-200',
  UNPAID: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-200 text-gray-500 border-gray-300',
};

const IncomeList = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
      fetchIncomes();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage, statusFilter, typeFilter, businessUnitFilter, startDate, endDate, sortBy, sortOrder]);

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter,
        sourceType: typeFilter,
        businessUnit: businessUnitFilter,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      }).toString();
      const res = await api.get(`/incomes?${queryParams}`);
      setIncomes(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this income?')) return;
    try {
      await api.delete(`/incomes/${id}`);
      fetchIncomes();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === incomes.length ? [] : incomes.map(e => e._id));

  const handleBulkDelete = async () => {
    if (!isPro) {
      setShowPremiumModal(true);
      return;
    }
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete the ${selectedIds.length} selected incomes?`)) {
      try {
        setLoading(true);
        // Deleting incomes - handle invoice-linked incomes correctly
        await Promise.all(selectedIds.map(async (id) => {
          const income = incomes.find(inc => inc._id === id);
          if (income && income.sourceType === 'invoice' && income.sourceInvoice) {
            await api.delete(`/invoices/${income.sourceInvoice}`);
          } else {
            await api.delete(`/incomes/${id}`);
          }
        }));
        setSelectedIds([]);
        fetchIncomes();
      } catch (error) {
        console.error('Error deleting incomes:', error);
        alert(error.response?.data?.message || 'Failed to delete some incomes');
      } finally {
        setLoading(false);
      }
    }
  };

  const displayed = incomes; // Backend pagination
  const fetchIncomesForExport = async () => {
    const params = new URLSearchParams({
      all: 'true',
      search: searchTerm,
      status: statusFilter,
      sourceType: typeFilter,
      businessUnit: businessUnitFilter,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });
    const res = await api.get(`/incomes?${params.toString()}`);
    const exportIncomes = res.data.data || [];

    if (selectedIds.length > 0) {
      return exportIncomes.filter((income) => selectedIds.includes(income._id));
    }

    return exportIncomes;
  };
  const isInvoiceSynced = (income) => income?.sourceType === 'invoice' && income?.sourceInvoice;
  const getEditPath = (income) => (
    isInvoiceSynced(income) ? `/invoices/edit/${income.sourceInvoice}` : `/incomes/edit/${income._id}`
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
    PAID: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/60',
    PARTIAL: 'bg-yellow-100 dark:bg-amber-950/50 text-yellow-700 dark:text-amber-300 border-yellow-200 dark:border-amber-800/60',
    UNPAID: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60',
    CANCELLED: 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-300 dark:border-slate-700',
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Incomes</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Track manual income records and invoice-linked income in one place</p>
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
          <ExportDropdown 
              data={displayed}
              getExportData={fetchIncomesForExport}
              filename="Flance_Incomes"
              columns={[
                 { header: 'Income No', key: 'incomeNumber' },
                 { header: 'Party Name', key: 'vendor.name' },
                 { header: 'Date', key: 'date' },
                 { header: 'Status', key: 'status' },
                 { header: 'Amount', key: 'grandTotal' },
                 { header: 'Source', key: 'sourceType' }
              ]}
          />
          <button
            type="button"
            onClick={() => setIsPdfScannerOpen(true)}
            className="bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FaFilePdf size={16} /> Scan PDF
          </button>
          <Link to="/incomes/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
            <FaPlus size={16} /> New Income
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-xs w-full">
              <input 
                type="text" 
                placeholder="Search incomes..." 
                className="w-full pl-3 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm font-sans"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">
              Showing {displayed.length} of {totalRecords} results
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm text-sm">
            <div className="flex flex-col min-w-[140px]">
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
              >
                <option value="">All Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="UNPAID">UNPAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="flex flex-col min-w-[150px]">
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-1 tracking-wider">Source Type</span>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all cursor-pointer font-sans"
              >
                <option value="">All Sources</option>
                <option value="manual">Manual Entry</option>
                <option value="invoice">Invoice Linked</option>
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
                <option value="createdAt-desc">Created Date (Latest first)</option>
                <option value="createdAt-asc">Created Date (Oldest first)</option>
                <option value="date-desc">Income Date (Latest first)</option>
                <option value="date-asc">Income Date (Oldest first)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setBusinessUnitFilter('');
                setStartDate('');
                setEndDate('');
                setSortBy('createdAt');
                setSortOrder('desc');
                setPage(1);
              }}
              className="mt-5 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg px-4 py-1.5 transition-colors font-medium self-end font-sans"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-3.5 py-2.5 w-10 text-center">
                  <button onClick={toggleAll} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                    {selectedIds.length === incomes.length && incomes.length > 0 ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-3.5 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('incomeNumber')}
                  className="px-3.5 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Number {renderSortIcon('incomeNumber')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('vendor.name')}
                  className="px-3.5 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Party {renderSortIcon('vendor.name')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('client.name')}
                  className="px-3.5 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Reference Client {renderSortIcon('client.name')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('sourceType')}
                  className="px-3.5 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Source {renderSortIcon('sourceType')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-3.5 py-2.5 text-left text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Status {renderSortIcon('status')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('grandTotal')}
                  className="px-3.5 py-2.5 text-right text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Amount {renderSortIcon('grandTotal')}
                  </div>
                </th>
                <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                    <td className="px-3.5 py-2.5 text-center"><Skeleton width="16px" height="16px" className="mx-auto" /></td>
                    <td className="px-3.5 py-2.5"><Skeleton width="70px" height="18px" /></td>
                    <td className="px-3.5 py-2.5"><Skeleton width="90px" height="18px" /></td>
                    <td className="px-3.5 py-2.5"><Skeleton width="130px" height="18px" /></td>
                    <td className="px-3.5 py-2.5"><Skeleton width="90px" height="18px" /></td>
                    <td className="px-3.5 py-2.5"><Skeleton width="60px" height="20px" className="rounded-full" /></td>
                    <td className="px-3.5 py-2.5"><Skeleton width="70px" height="20px" className="rounded-full" /></td>
                    <td className="px-3.5 py-2.5 text-right"><Skeleton width="70px" height="18px" className="ml-auto" /></td>
                    <td className="px-3.5 py-2.5 text-center"><Skeleton width="80px" height="18px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan="9" className="px-3.5 py-12 text-center text-gray-500 dark:text-slate-400 text-sm">No incomes found.</td></tr>
              ) : displayed.map(exp => (
                <tr key={exp._id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-3.5 py-2.5 text-center">
                    <button onClick={() => toggleSelect(exp._id)} className={selectedIds.includes(exp._id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400'}>
                      {selectedIds.includes(exp._id) ? <FaCheckSquare size={16} /> : <FaRegSquare size={16} />}
                    </button>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">{fmtDate(exp.date)}</td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-xs">
                    <Link to={getEditPath(exp)} className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      {exp.incomeNumber}
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap max-w-[200px] truncate" title={exp.vendor?.name || exp.client?.name || ''}>
                    <div className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate">{exp.vendor?.name || exp.client?.name || '—'}</div>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400 max-w-[180px] truncate" title={exp.client?.name || ''}>
                    {exp.client?.name || '—'}
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      exp.sourceType === 'invoice'
                        ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                    }`}>
                      {exp.sourceType === 'invoice' ? 'Invoice' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_STYLES[exp.status] || STATUS_STYLES.DRAFT}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-right text-xs font-semibold text-gray-900 dark:text-slate-100">
                    ₹{fmt(exp.grandTotal)}
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2.5 items-center">
                      <Link
                        to={getEditPath(exp)}
                        className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title={isInvoiceSynced(exp) ? 'Open invoice' : 'Edit'}
                      >
                        <FaEdit size={16} />
                      </Link>
                      <button 
                        onClick={() => {
                          if (!isPro) return setShowPremiumModal(true);
                          if (isInvoiceSynced(exp)) {
                            if (!window.confirm('Delete the original invoice? This will remove it from the income tab too.')) return;
                            api.delete(`/invoices/${exp.sourceInvoice}`).then(fetchIncomes).catch(() => alert('Failed to delete'));
                            return;
                          }
                          handleDelete(exp._id);
                        }} 
                        className={`transition-colors ${isPro ? 'text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400' : 'text-gray-300 dark:text-slate-700 hover:text-gray-500'}`} 
                        title={isPro ? (isInvoiceSynced(exp) ? "Delete invoice" : "Delete") : "Pro Feature - Upgrade to Delete"}
                      >
                        <FaTrash size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">Rows per page:</span>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 dark:border-slate-700 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
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

      {/* Premium Feature Modal */}
      <Modal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} title="Premium Feature">
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Upgrade to Pro</h3>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            Deleting incomes is a premium feature. Upgrade to Pro to unlock unlimited document management.
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

      <PdfInvoiceImporter
        isOpen={isPdfScannerOpen}
        onClose={() => setIsPdfScannerOpen(false)}
        targetType="income"
      />

    </div>
  );
};

export default IncomeList;
