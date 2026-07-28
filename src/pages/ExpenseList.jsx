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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [filterType, rowsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const expenseParams = new URLSearchParams({ limit: 1000, search: searchTerm });
      if (categoryFilter) expenseParams.set('category', categoryFilter);
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
        return {
          id: exp._id,
          type: isCategory ? 'category' : 'vendor',
          date: exp.date,
          number: exp.expenseNumber,
          partyName: exp.vendor?.name || '—',
          clientOrMethod: exp.client?.name || '—',
          status: exp.status,
          amount: exp.grandTotal,
          balanceDue: exp.balanceDue,
          rawItem: exp
        };
      });

      const formattedPayrolls = loadedPayrolls.map(pr => {
        const empName = `${pr.employee?.firstName || pr.employeeSnapshot?.firstName || ''} ${pr.employee?.lastName || pr.employeeSnapshot?.lastName || ''}`.trim() || 'Unknown Employee';
        const dateObj = pr.createdAt || new Date(pr.year, pr.month - 1, 1).toISOString();
        return {
          id: pr._id,
          type: 'salary',
          date: dateObj,
          periodStr: `${new Date(0, pr.month - 1).toLocaleString('en-US', { month: 'short' })} ${pr.year}`,
          number: pr.employeeSnapshot?.employeeId || pr.employee?.employeeId || '—',
          partyName: empName,
          clientOrMethod: pr.paymentMethod || 'Bank Transfer',
          status: pr.status?.toUpperCase() || 'DRAFT',
          amount: pr.netSalary,
          balanceDue: 0,
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
      amount: item.amount
    }));
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    PAID: 'bg-green-100 text-green-700 border-green-200',
    PARTIAL: 'bg-amber-100 text-amber-700 border-amber-200',
    UNPAID: 'bg-red-100 text-red-700 border-red-200',
    CANCELLED: 'bg-gray-200 text-gray-500 border-gray-300',
  };

  const PAYROLL_STATUS_STYLES = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    processed: 'bg-blue-100 text-blue-700 border-blue-200',
    approved: 'bg-purple-100 text-purple-700 border-purple-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Expenses</h1>
          <p className="text-xs text-gray-500 mt-0.5">Record and manage your company purchases, outgoings, and payroll</p>
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
              data={filteredItems}
              getExportData={getCombinedExportData}
              filename="Flance_Expenses"
              columns={[
                 { header: 'Type', key: 'type' },
                 { header: 'Date', key: 'date' },
                 { header: 'Number / ID', key: 'number' },
                 { header: 'Vendor / Employee', key: 'partyName' },
                 { header: 'Client / Method', key: 'info' },
                 { header: 'Status', key: 'status' },
                 { header: 'Amount', key: 'amount' }
              ]}
          />
          <button
            type="button"
            onClick={() => setIsPdfScannerOpen(true)}
            className="bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FaFilePdf size={16} /> Scan PDF
          </button>
          <Link to="/payroll/process"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
            <FaPlus size={16} /> Process Payroll
          </Link>
          <Link to="/expenses/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
            <FaPlus size={16} /> New Expense
          </Link>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-wrap border-b border-gray-200 mb-6 gap-2 bg-white px-4 py-2.5 rounded-xl border shadow-sm">
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
            className={`pb-2.5 pt-2 px-4 text-sm font-semibold border-b-2 transition-all ${
              filterType === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        {/* Table Toolbar & Filters */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-xs w-full">
              <input 
                type="text" 
                placeholder="Search expenses and payroll..." 
                className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm font-sans"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Showing {displayedItems.length} of {totalRecords} results
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
                <option value="PAID">PAID / Paid</option>
                <option value="UNPAID">UNPAID / Dues</option>
                <option value="CANCELLED">CANCELLED</option>
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
                <option value="date-desc">Date (Latest first)</option>
                <option value="date-asc">Date (Oldest first)</option>
                <option value="amount-desc">Amount (Highest first)</option>
                <option value="amount-asc">Amount (Lowest first)</option>
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
              className="mt-5 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-4 py-1.5 transition-colors font-medium self-end font-sans"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 w-12 text-center">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {selectedIds.length === displayedItems.filter(x => x.type !== 'salary').length && displayedItems.filter(x => x.type !== 'salary').length > 0 ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('date')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">
                  Type
                </th>
                <th 
                  onClick={() => handleSort('number')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Number / ID {renderSortIcon('number')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('partyName')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Vendor / Employee {renderSortIcon('partyName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('clientOrMethod')}
                  className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center">
                    Ref Client / Method {renderSortIcon('clientOrMethod')}
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
                  onClick={() => handleSort('amount')}
                  className="px-4 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center justify-end">
                    Amount {renderSortIcon('amount')}
                  </div>
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-gray-100">
                    <td className="px-4 py-2 text-center"><Skeleton width="18px" height="16px" className="mx-auto" /></td>
                    <td className="px-4 py-2"><Skeleton width="80px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="60px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="85px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="140px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="100px" height="16px" /></td>
                    <td className="px-4 py-2"><Skeleton width="80px" height="20px" className="rounded-full" /></td>
                    <td className="px-4 py-2 text-right"><Skeleton width="80px" height="16px" className="ml-auto" /></td>
                    <td className="px-4 py-2 text-center"><Skeleton width="100px" height="16px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayedItems.length === 0 ? (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500 text-xs">No expenses found.</td></tr>
              ) : displayedItems.map(item => (
                <tr key={`${item.type}-${item.id}`} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-2 text-center">
                    {item.type !== 'salary' ? (
                      <button onClick={() => toggleSelect(item.id)} className={selectedIds.includes(item.id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}>
                        {selectedIds.includes(item.id) ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                      </button>
                    ) : (
                      <span className="text-gray-200">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.type === 'salary' ? item.periodStr : fmtDate(item.date)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      item.type === 'vendor' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      item.type === 'category' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {item.type !== 'salary' ? (
                      <Link to={`/expenses/edit/${item.id}`} className="text-blue-600 font-semibold text-xs hover:text-blue-800 hover:underline">
                        {item.number}
                      </Link>
                    ) : (
                      <span className="text-gray-500 font-mono text-xs">{item.number}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-xs font-semibold text-gray-900">{item.partyName}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                    {item.clientOrMethod}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {item.type === 'salary' ? (
                      <select
                        value={item.status.toUpperCase()}
                        disabled={updatingStatusId === item.id}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          PAYROLL_STATUS_STYLES[item.status.toLowerCase()] || PAYROLL_STATUS_STYLES.draft
                        }`}
                        title="Click to change status"
                      >
                        <option value="DRAFT" className="bg-white text-gray-700">DRAFT</option>
                        <option value="PROCESSED" className="bg-white text-blue-700">PROCESSED</option>
                        <option value="APPROVED" className="bg-white text-purple-700">APPROVED</option>
                        <option value="PAID" className="bg-white text-green-700">PAID</option>
                      </select>
                    ) : (
                      <select
                        value={item.status}
                        disabled={updatingStatusId === item.id}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                          STATUS_STYLES[item.status] || STATUS_STYLES.DRAFT
                        }`}
                        title="Click to change status"
                      >
                        <option value="PAID" className="bg-white text-green-700">PAID</option>
                        <option value="UNPAID" className="bg-white text-red-700">UNPAID</option>
                        <option value="PARTIAL" className="bg-white text-amber-700">PARTIAL</option>
                        <option value="DRAFT" className="bg-white text-gray-700">DRAFT</option>
                        <option value="CANCELLED" className="bg-white text-gray-500">CANCELLED</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                    ₹{fmt(item.amount)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-center text-xs">
                    <div className="flex justify-center gap-3 items-center">
                      {item.type !== 'salary' ? (
                        <>
                          <Link to={`/expenses/edit/${item.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><FaEdit size={16} /></Link>
                          <button 
                            onClick={() => {
                              if (!isPro) return setShowPremiumModal(true);
                              handleDelete(item.id);
                            }} 
                            className={`transition-colors ${isPro ? 'text-gray-400 hover:text-red-600' : 'text-gray-300 hover:text-gray-500'}`} 
                            title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                          >
                            <FaTrash size={16} />
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/payroll/${item.id}/payslip`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                          title="View Payslip"
                        >
                          <FaEye size={15} /> View Payslip
                        </Link>
                      )}
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
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
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

      {/* Premium Feature Modal */}
      <Modal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} title="Premium Feature">
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upgrade to Pro</h3>
          <p className="text-gray-500 mb-6">
            Deleting expenses is a premium feature. Upgrade to Pro to unlock unlimited document management.
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
        targetType="expense"
      />

    </div>
  );
};

export default ExpenseList;
