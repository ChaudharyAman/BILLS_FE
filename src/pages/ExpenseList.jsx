import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaFileAlt, FaFilePdf } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import PdfInvoiceImporter from '../components/PdfInvoiceImporter';

const ExpenseList = () => {
  const navigate = useNavigate();
  const initialCategory = new URLSearchParams(window.location.search).get('category') || '';
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter] = useState(initialCategory);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchExpenses();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: rowsPerPage, search: searchTerm });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await api.get(`/expenses?${params.toString()}`);
      setExpenses(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
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
      fetchExpenses();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === expenses.length ? [] : expenses.map(e => e._id));

  const displayed = expenses; // Backend pagination
  const fetchExpensesForExport = async () => {
    const params = new URLSearchParams({
      all: 'true',
      search: searchTerm,
    });
    if (categoryFilter) params.set('category', categoryFilter);

    const res = await api.get(`/expenses?${params.toString()}`);
    const exportExpenses = res.data.data || [];

    if (selectedIds.length > 0) {
      return exportExpenses.filter((expense) => selectedIds.includes(expense._id));
    }

    return exportExpenses;
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

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expenses</h1>
          <p className="text-gray-500 mt-1">Record and manage your company purchases and outgoings</p>
        </div>
        <div className="flex gap-3">
          <ExportDropdown 
              data={displayed}
              getExportData={fetchExpensesForExport}
              filename="Flance_Expenses"
              columns={[
                 { header: 'Expense No', key: 'expenseNumber' },
                 { header: 'Vendor Name', key: 'vendor.name' },
                 { header: 'Date', key: 'date' },
                 { header: 'Status', key: 'status' },
                 { header: 'Amount', key: 'grandTotal' },
                 { header: 'Paid', key: 'amountPaid' },
                 { header: 'Payable', key: 'balanceDue' }
              ]}
          />
          <button
            type="button"
            onClick={() => setIsPdfScannerOpen(true)}
            className="bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FaFilePdf size={16} /> Scan PDF
          </button>
          <Link to="/expenses/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
            <FaPlus size={16} /> New Expense
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <input type="text" placeholder="Search expenses..."
            className="w-full max-w-sm pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          <div className="text-sm text-gray-500 ml-4">Showing {displayed.length} of {totalRecords}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {selectedIds.length === expenses.length && expenses.length > 0 ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Payable</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-gray-100">
                    <td className="px-6 py-4 text-center"><Skeleton width="18px" height="18px" className="mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="140px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="24px" className="rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton width="100px" height="20px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500 text-sm">No expenses found.</td></tr>
              ) : displayed.map(exp => (
                <tr key={exp._id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleSelect(exp._id)} className={selectedIds.includes(exp._id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}>
                      {selectedIds.includes(exp._id) ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(exp.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/expenses/edit/${exp._id}`} className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                      {exp.expenseNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{exp.vendor?.name || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exp.client?.name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[exp.status] || STATUS_STYLES.DRAFT}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    ₹{fmt(exp.grandTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                    ₹{fmt(exp.balanceDue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-3 items-center">
                      <Link to={`/expenses/edit/${exp._id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><FaEdit size={17} /></Link>
                      <button 
                        onClick={() => {
                          if (!isPro) return setShowPremiumModal(true);
                          handleDelete(exp._id);
                        }} 
                        className={`transition-colors ${isPro ? 'text-gray-400 hover:text-red-600' : 'text-gray-300 hover:text-gray-500'}`} 
                        title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
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

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
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
