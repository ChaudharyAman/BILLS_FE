import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaFilePdf } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import PdfInvoiceImporter from '../components/PdfInvoiceImporter';

const ExpenseList = () => {
  const navigate = useNavigate();
  const initialCategory = new URLSearchParams(window.location.search).get('category') || '';
  const [filterType, setFilterType] = useState('all');
  
  const [combinedItems, setCombinedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter] = useState(initialCategory);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Filters & Sorting State
  const [statusFilter, setStatusFilter] = useState('');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  useEffect(() => {
    api.get('/business-units?status=active').then(res => setBusinessUnits(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, businessUnitFilter]);

  useEffect(() => {
    setPage(1);
  }, [filterType, rowsPerPage, businessUnitFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const expenseParams = new URLSearchParams({ limit: 1000, search: searchTerm });
      if (categoryFilter) expenseParams.set('category', categoryFilter);
      if (businessUnitFilter) expenseParams.set('businessUnit', businessUnitFilter);
      expenseParams.set('excludeCategoryName', 'Payroll');

      const payrollParams = new URLSearchParams({ limit: 1000, search: searchTerm });

      const [expRes, payRes] = await Promise.all([
        api.get(`/expenses?${expenseParams.toString()}`),
        api.get(`/payroll?${payrollParams.toString()}`)
      ]);

      const loadedExpenses = expRes.data.data || [];
      const loadedPayrolls = payRes.data.data || [];

      const formattedExpenses = loadedExpenses.map(exp => {
        const isCategory = !exp.vendor?.vendorRef && !exp.vendor?.name;
        const gross = Number(exp.grandTotal || 0);
        const tax = Number(exp.taxTotal || (exp.items?.reduce((s, i) => s + (Number(i.taxAmount) || 0), 0)) || 0);
        const tds = Number(exp.tds_amount || exp.tdsAmount || 0);
        const tdsSec = exp.tds_section || exp.tdsSection || '';
        const paid = Number(exp.amountPaid || 0);
        const net = Math.max(0, gross - tds);
        const bal = typeof exp.balanceDue === 'number' && exp.balanceDue !== null ? exp.balanceDue : Math.max(0, net - paid);

        return {
          id: exp._id,
          type: isCategory ? 'category' : 'vendor',
          date: exp.date,
          number: exp.expenseNumber,
          partyName: exp.vendor?.name || '—',
          clientOrMethod: exp.client?.name || exp.paymentMethod || '—',
          status: exp.status,
          amount: gross,
          taxTotal: tax,
          tds: tds,
          tdsSection: tdsSec,
          amountPaid: paid,
          balanceDue: bal,
          rawItem: exp
        };
      });

      const formattedPayrolls = loadedPayrolls.map(pr => {
        const empName = `${pr.employee?.firstName || pr.employeeSnapshot?.firstName || ''} ${pr.employee?.lastName || pr.employeeSnapshot?.lastName || ''}`.trim() || 'Unknown Employee';
        const dateObj = pr.createdAt || new Date(pr.year, pr.month - 1, 1).toISOString();
        const netSalary = Number(pr.netSalary || 0);
        const totalGross = Number(pr.earnings?.totalEarnings || pr.totalPayable || netSalary);
        const tds = Number(pr.deductions?.tds || 0);
        const isPaid = (pr.status || '').toLowerCase() === 'paid';

        return {
          id: pr._id,
          type: 'salary',
          date: dateObj,
          periodStr: `${new Date(0, pr.month - 1).toLocaleString('en-US', { month: 'short' })} ${pr.year}`,
          number: pr.employeeSnapshot?.employeeId || pr.employee?.employeeId || '—',
          partyName: empName,
          clientOrMethod: pr.paymentMethod || 'Bank Transfer',
          status: pr.status?.toUpperCase() || 'DRAFT',
          amount: totalGross,
          taxTotal: 0,
          tds: tds,
          tdsSection: '192',
          amountPaid: isPaid ? netSalary : 0,
          balanceDue: isPaid ? 0 : netSalary,
          rawItem: pr
        };
      });

      const combined = [...formattedExpenses, ...formattedPayrolls].sort((a, b) => new Date(b.date) - new Date(a.date));
      setCombinedItems(combined);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchData();
    } catch (e) {
      if (e.response?.status === 403 || e.response?.data?.message?.toLowerCase().includes('pro')) {
        setShowPremiumModal(true);
      } else {
        alert(e.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    if (item.status === newStatus || item.status?.toLowerCase() === newStatus.toLowerCase()) return;
    try {
      setUpdatingStatusId(item.id);
      if (item.type === 'salary') {
        if (newStatus.toLowerCase() === 'paid') {
          await api.post(`/payroll/${item.id}/mark-paid`);
        } else if (newStatus.toLowerCase() === 'draft') {
          await api.post(`/payroll/${item.id}/reopen`);
        } else {
          await api.put(`/payroll/${item.id}`, { status: newStatus.toLowerCase() });
        }
        setCombinedItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      } else {
        const res = await api.put(`/expenses/${item.id}`, { status: newStatus });
        const updatedDoc = res.data;
        setCombinedItems(prev => prev.map(i => i.id === item.id ? {
          ...i,
          status: updatedDoc?.status || newStatus,
          amountPaid: updatedDoc?.amountPaid !== undefined ? updatedDoc.amountPaid : i.amountPaid,
          balanceDue: updatedDoc?.balanceDue !== undefined ? updatedDoc.balanceDue : i.balanceDue,
        } : i));
      }
    } catch (e) {
      console.error('Error updating status:', e);
      if (e.response?.status === 403 || e.response?.data?.message?.toLowerCase().includes('pro')) {
        setShowPremiumModal(true);
      } else {
        alert(e.response?.data?.message || 'Failed to update status');
      }
      fetchData();
    } finally {
      setUpdatingStatusId(null);
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

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const filteredItems = useMemo(() => {
    return combinedItems.filter(item => {
      // 1. Type tab filter
      if (filterType !== 'all' && item.type !== filterType) return false;

      // 2. Status filter
      if (statusFilter) {
        const itemStatusUpper = String(item.status || '').toUpperCase();
        const filterUpper = statusFilter.toUpperCase();
        if (itemStatusUpper !== filterUpper) {
          // Allow loose match for unpaid/processed/approved or sent/unpaid
          if (filterUpper === 'UNPAID' && (itemStatusUpper === 'PROCESSED' || itemStatusUpper === 'APPROVED' || itemStatusUpper === 'SENT')) {
            // matches
          } else {
            return false;
          }
        }
      }

      // 3. Date range filter
      if (startDate) {
        const itemDate = new Date(item.date);
        const start = new Date(startDate);
        if (itemDate < start) return false;
      }
      if (endDate) {
        const itemDate = new Date(item.date);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [combinedItems, filterType, statusFilter, startDate, endDate]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA, valB;
      if (sortBy === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (sortBy === 'amount') {
        valA = Number(a.amount) || 0;
        valB = Number(b.amount) || 0;
      } else if (sortBy === 'number') {
        valA = String(a.number || '');
        valB = String(b.number || '');
      } else if (sortBy === 'partyName') {
        valA = String(a.partyName || '');
        valB = String(b.partyName || '');
      } else if (sortBy === 'taxTotal') {
        valA = Number(a.taxTotal) || 0;
        valB = Number(b.taxTotal) || 0;
      } else if (sortBy === 'tds') {
        valA = Number(a.tds) || 0;
        valB = Number(b.tds) || 0;
      } else if (sortBy === 'balanceDue') {
        valA = Number(a.balanceDue) || 0;
        valB = Number(b.balanceDue) || 0;
      } else if (sortBy === 'status') {
        valA = String(a.status || '');
        valB = String(b.status || '');
      } else {
        // Fallback: createdAt
        valA = new Date(a.rawItem?.createdAt || a.date).getTime();
        valB = new Date(b.rawItem?.createdAt || b.date).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortBy, sortOrder]);

  const totalRecords = sortedItems.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const displayedItems = sortedItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const toggleAll = () => {
    const selectables = displayedItems.filter(x => x.type !== 'salary');
    const allSelected = selectables.length > 0 && selectables.every(item => selectedIds.includes(item.id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !selectables.some(item => item.id === id)));
    } else {
      setSelectedIds(prev => {
        const toAdd = selectables.filter(item => !prev.includes(item.id)).map(item => item.id);
        return [...prev, ...toAdd];
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!isPro) {
      setShowPremiumModal(true);
      return;
    }
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete the ${selectedIds.length} selected expenses?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedIds.map(id => api.delete(`/expenses/${id}`)));
        setSelectedIds([]);
        fetchData();
      } catch (error) {
        console.error('Error deleting expenses:', error);
        alert(error.response?.data?.message || 'Failed to delete some expenses');
      } finally {
        setLoading(false);
      }
    }
  };

  const getCombinedExportData = () => {
    return filteredItems.map(item => ({
      type: item.type.toUpperCase(),
      date: item.type === 'salary' ? item.periodStr : fmtDate(item.date),
      number: item.number,
      partyName: item.partyName,
      info: item.clientOrMethod,
      status: item.status,
      amount: item.amount,
      taxTotal: item.taxTotal || 0,
      tds: item.tds || 0,
      balanceDue: item.balanceDue || 0
    }));
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
    PAID: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/60',
    PARTIAL: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    UNPAID: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60',
    CANCELLED: 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-300 dark:border-slate-700',
  };

  const PAYROLL_STATUS_STYLES = {
    draft: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
    processed: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    approved: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    paid: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/60',
  };

  return (
    <div className="w-full px-4 py-4 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Expenses</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Record and manage your company purchases, outgoings, and payroll</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <FaTrash size={12} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <ExportDropdown 
              data={filteredItems}
              getExportData={getCombinedExportData}
              filename="Flance_Expenses"
              columns={[
                 { header: 'Type', key: 'type' },
                 { header: 'Date', key: 'date' },
                 { header: 'Number / ID', key: 'number' },
                 { header: 'Vendor / Employee', key: 'partyName' },
                 { header: 'Status', key: 'status' },
                 { header: 'Amount', key: 'amount' },
                 { header: 'Total GST', key: 'taxTotal' },
                 { header: 'TDS', key: 'tds' },
                 { header: 'Balance', key: 'balanceDue' }
              ]}
          />
          <button
            type="button"
            onClick={() => setIsPdfScannerOpen(true)}
            className="bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <FaFilePdf size={13} /> Scan PDF
          </button>
          <Link to="/payroll/process"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm transition-all text-xs">
            <FaPlus size={12} /> Process Payroll
          </Link>
          <Link to="/expenses/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm transition-all text-xs">
            <FaPlus size={12} /> New Expense
          </Link>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-slate-800 mb-4 gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border shadow-sm transition-colors text-xs">
        {[
          { key: 'all', label: 'All Expenses' },
          { key: 'vendor', label: 'Vendor Expense' },
          { key: 'category', label: 'Category Expense' },
          { key: 'salary', label: 'Salaries Expense' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterType(tab.key)}
            className={`pb-1.5 pt-1 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              filterType === tab.key
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Table Toolbar & Filters */}
        <div className="p-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <input 
                type="text" 
                placeholder="Search expenses and payroll..." 
                className="w-full pl-3 pr-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm font-sans"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Showing {displayedItems.length} of {totalRecords} results
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm text-xs">
            <div className="flex flex-col min-w-[120px]">
              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer font-sans"
              >
                <option value="">All Statuses</option>
                <option value="PAID">PAID / Paid</option>
                <option value="UNPAID">UNPAID / Dues</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="flex flex-col min-w-[130px]">
              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Business Unit</span>
              <select
                value={businessUnitFilter}
                onChange={(e) => { setBusinessUnitFilter(e.target.value); setPage(1); }}
                className="border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer font-sans"
              >
                <option value="">All Business Units</option>
                {businessUnits.map(bu => (
                  <option key={bu._id} value={bu._id}>{bu.name} ({bu.code})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col min-w-[115px]">
              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">From Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="border border-gray-200 dark:border-slate-700 rounded-md px-2 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer font-sans"
              />
            </div>

            <div className="flex flex-col min-w-[115px]">
              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">To Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="border border-gray-200 dark:border-slate-700 rounded-md px-2 py-0.5 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer font-sans"
              />
            </div>

            <div className="flex flex-col min-w-[130px]">
              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase mb-0.5 tracking-wider">Sort By</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                  setPage(1);
                }}
                className="border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer font-sans"
              >
                <option value="date-desc">Date (Latest first)</option>
                <option value="date-asc">Date (Oldest first)</option>
                <option value="amount-desc">Amount (Highest first)</option>
                <option value="amount-asc">Amount (Lowest first)</option>
                <option value="taxTotal-desc">GST (Highest first)</option>
                <option value="tds-desc">TDS (Highest first)</option>
                <option value="balanceDue-desc">Payable (Highest first)</option>
                <option value="number-desc">ID / Number (Z-A)</option>
                <option value="number-asc">ID / Number (A-Z)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setSortBy('date');
                setSortOrder('desc');
                setPage(1);
              }}
              className="mt-4 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md px-3 py-1 transition-colors text-xs font-semibold self-end font-sans cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 font-sans text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-2 py-2 w-8 text-center">
                  <button onClick={toggleAll} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                    {selectedIds.length === displayedItems.filter(x => x.type !== 'salary').length && displayedItems.filter(x => x.type !== 'salary').length > 0 ? <FaCheckSquare size={14} /> : <FaRegSquare size={14} />}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  Type
                </th>
                <th 
                  onClick={() => handleSort('number')}
                  className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Number / ID {renderSortIcon('number')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('partyName')}
                  className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Vendor / Employee {renderSortIcon('partyName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-1.5 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Status {renderSortIcon('status')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('amount')}
                  className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Amount {renderSortIcon('amount')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('taxTotal')}
                  className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Total GST {renderSortIcon('taxTotal')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('tds')}
                  className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    TDS {renderSortIcon('tds')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('balanceDue')}
                  className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Payable {renderSortIcon('balanceDue')}
                  </div>
                </th>
                <th className="px-1.5 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800/60">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                    <td className="px-2 py-1.5 text-center"><Skeleton width="14px" height="14px" className="mx-auto" /></td>
                    <td className="px-2 py-1.5"><Skeleton width="60px" height="14px" /></td>
                    <td className="px-1.5 py-1.5"><Skeleton width="50px" height="14px" /></td>
                    <td className="px-2 py-1.5"><Skeleton width="70px" height="14px" /></td>
                    <td className="px-2 py-1.5"><Skeleton width="110px" height="14px" /></td>
                    <td className="px-1.5 py-1.5"><Skeleton width="50px" height="16px" className="rounded-full" /></td>
                    <td className="px-2 py-1.5 text-right"><Skeleton width="55px" height="14px" className="ml-auto" /></td>
                    <td className="px-2 py-1.5 text-right"><Skeleton width="45px" height="14px" className="ml-auto" /></td>
                    <td className="px-2 py-1.5 text-right"><Skeleton width="45px" height="14px" className="ml-auto" /></td>
                    <td className="px-2 py-1.5 text-right"><Skeleton width="55px" height="14px" className="ml-auto" /></td>
                    <td className="px-1.5 py-1.5 text-center"><Skeleton width="45px" height="14px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayedItems.length === 0 ? (
                <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 text-xs">No expenses found.</td></tr>
              ) : displayedItems.map(item => (
                <tr key={`${item.type}-${item.id}`} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-2 py-1.5 text-center">
                    {item.type !== 'salary' ? (
                      <button onClick={() => toggleSelect(item.id)} className={selectedIds.includes(item.id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400 dark:hover:text-slate-500'}>
                        {selectedIds.includes(item.id) ? <FaCheckSquare size={14} /> : <FaRegSquare size={14} />}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-slate-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-gray-500 dark:text-slate-400">
                    {item.type === 'salary' ? item.periodStr : fmtDate(item.date)}
                  </td>
                  <td className="px-1.5 py-1.5 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      item.type === 'vendor' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50' :
                      item.type === 'category' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/50' :
                      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {item.type !== 'salary' ? (
                      <Link to={`/expenses/edit/${item.id}`} className="text-blue-600 dark:text-blue-400 font-semibold text-xs hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                        {item.number}
                      </Link>
                    ) : (
                      <span className="text-gray-500 dark:text-slate-400 font-mono text-xs">{item.number}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap max-w-[150px]">
                    <div className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate max-w-[150px]" title={item.partyName}>
                      {item.partyName}
                    </div>
                  </td>
                  <td className="px-1.5 py-1.5 whitespace-nowrap">
                    {item.type === 'salary' ? (
                      <select
                        value={item.status.toUpperCase()}
                        disabled={updatingStatusId === item.id}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          PAYROLL_STATUS_STYLES[item.status.toLowerCase()] || PAYROLL_STATUS_STYLES.draft
                        }`}
                        title="Click to change status"
                      >
                        <option value="DRAFT" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">DRAFT</option>
                        <option value="PROCESSED" className="bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300">PROCESSED</option>
                        <option value="APPROVED" className="bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300">APPROVED</option>
                        <option value="PAID" className="bg-white dark:bg-slate-800 text-green-700 dark:text-green-300">PAID</option>
                      </select>
                    ) : (
                      <select
                        value={item.status}
                        disabled={updatingStatusId === item.id}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                          STATUS_STYLES[item.status] || STATUS_STYLES.DRAFT
                        }`}
                        title="Click to change status"
                      >
                        <option value="PAID" className="bg-white dark:bg-slate-800 text-green-700 dark:text-green-300">PAID</option>
                        <option value="UNPAID" className="bg-white dark:bg-slate-800 text-red-700 dark:text-red-300">UNPAID</option>
                        <option value="PARTIAL" className="bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300">PARTIAL</option>
                        <option value="DRAFT" className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200">DRAFT</option>
                        <option value="CANCELLED" className="bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400">CANCELLED</option>
                      </select>
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-bold text-gray-900 dark:text-slate-100 font-mono">
                    ₹{fmt(item.amount)}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-mono">
                    {item.taxTotal > 0 ? (
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-[11px]">
                        ₹{fmt(item.taxTotal)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-mono">
                    {item.tds > 0 ? (
                      <div>
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                          ₹{fmt(item.tds)}
                        </span>
                        {item.tdsSection && (
                          <span className="text-[8px] text-gray-400 dark:text-slate-500 block">
                            Sec {item.tdsSection}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-mono">
                    <div className="flex flex-col items-end">
                      <span className={`font-bold text-xs ${
                        (item.balanceDue <= 0 || item.status?.toUpperCase() === 'PAID')
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}>
                        ₹{fmt(item.balanceDue)}
                      </span>
                      {item.amountPaid > 0 && (
                        <span className="text-[9px] text-gray-400 dark:text-slate-500">
                          Paid: ₹{fmt(item.amountPaid)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1.5 py-1.5 whitespace-nowrap text-center text-xs font-medium">
                    <div className="flex justify-center gap-1.5 items-center">
                      {item.type !== 'salary' ? (
                        <>
                          <Link to={`/expenses/edit/${item.id}`} className="text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5" title="Edit">
                            <FaEdit size={13} />
                          </Link>
                          <button 
                            onClick={() => {
                              if (!isPro) return setShowPremiumModal(true);
                              handleDelete(item.id);
                            }} 
                            className={`transition-colors p-0.5 ${isPro ? 'text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-500'}`} 
                            title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                          >
                            <FaTrash size={13} />
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/payroll/${item.id}/payslip`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold hover:underline text-xs"
                          title="View Payslip"
                        >
                          <FaEye size={13} /> View
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {displayedItems.length > 0 && (
              <tfoot className="bg-gray-50/90 dark:bg-slate-800/80 border-t-2 border-gray-200 dark:border-slate-700 font-semibold text-xs text-gray-900 dark:text-slate-100">
                <tr>
                  <td colSpan={6} className="px-2 py-2 text-right text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    Page Total ({displayedItems.length}):
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-xs">
                    ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                    ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.taxTotal) || 0), 0))}
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                    ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.tds) || 0), 0))}
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                    ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.balanceDue) || 0), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">Rows per page:</span>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 dark:border-slate-700 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Page <span className="font-semibold text-gray-900 dark:text-slate-200">{page}</span> of <span className="font-semibold text-gray-900 dark:text-slate-200">{totalPages}</span>
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
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Upgrade to Pro</h3>
          <p className="text-gray-500 dark:text-slate-400 mb-6">
            Deleting expenses is a premium feature. Upgrade to Pro to unlock unlimited document management.
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
        targetType="expense"
      />

    </div>
  );
};

export default ExpenseList;
