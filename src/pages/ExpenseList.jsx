import React, { useEffect, useState } from 'react';
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);

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
      alert('Failed to delete');
    }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const filteredItems = combinedItems.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const totalRecords = filteredItems.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  const displayedItems = filteredItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);

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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expenses</h1>
          <p className="text-gray-500 mt-1">Record and manage your company purchases, outgoings, and payroll</p>
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
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <input type="text" placeholder="Search expenses and payroll..."
            className="w-full max-w-sm pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          <div className="text-sm text-gray-500 ml-4">
            Showing {displayedItems.length} of {totalRecords}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {selectedIds.length === displayedItems.filter(x => x.type !== 'salary').length && displayedItems.filter(x => x.type !== 'salary').length > 0 ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Number / ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor / Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref Client / Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-gray-100">
                    <td className="px-6 py-4 text-center"><Skeleton width="18px" height="18px" className="mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="60px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="85px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="140px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="24px" className="rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton width="100px" height="20px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayedItems.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500 text-sm">No expenses found.</td></tr>
              ) : displayedItems.map(item => (
                <tr key={`${item.type}-${item.id}`} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4 text-center">
                    {item.type !== 'salary' ? (
                      <button onClick={() => toggleSelect(item.id)} className={selectedIds.includes(item.id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}>
                        {selectedIds.includes(item.id) ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                      </button>
                    ) : (
                      <span className="text-gray-200">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.type === 'salary' ? item.periodStr : fmtDate(item.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      item.type === 'vendor' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      item.type === 'category' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.type !== 'salary' ? (
                      <Link to={`/expenses/edit/${item.id}`} className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                        {item.number}
                      </Link>
                    ) : (
                      <span className="text-gray-500 font-mono text-sm">{item.number}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.partyName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.clientOrMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${
                      item.type === 'salary'
                        ? (PAYROLL_STATUS_STYLES[item.status.toLowerCase()] || PAYROLL_STATUS_STYLES.draft)
                        : (STATUS_STYLES[item.status] || STATUS_STYLES.DRAFT)
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    ₹{fmt(item.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <div className="flex justify-center gap-3 items-center">
                      {item.type !== 'salary' ? (
                        <>
                          <Link to={`/expenses/edit/${item.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><FaEdit size={17} /></Link>
                          <button 
                            onClick={() => {
                              if (!isPro) return setShowPremiumModal(true);
                              handleDelete(item.id);
                            }} 
                            className={`transition-colors ${isPro ? 'text-gray-400 hover:text-red-600' : 'text-gray-300 hover:text-gray-500'}`} 
                            title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                          >
                            <FaTrash size={17} />
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/payroll/${item.id}/payslip`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                          title="View Payslip"
                        >
                          <FaEye size={16} /> View Payslip
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
