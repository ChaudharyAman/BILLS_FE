import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaFilePdf, FaSlidersH, FaUndo, FaPaperclip } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import PdfInvoiceImporter from '../components/PdfInvoiceImporter';
import { getStoredFilter, setStoredFilters, clearStoredFilters } from '../utils/filterStorage';
import { PAYMENT_METHODS } from '../utils/paymentMethods';

const FILTER_STORAGE_KEY = 'flance_expenses_filters_pref';
const COLUMN_STORAGE_KEY = 'flance_expenses_columns_pref';

const ALL_EXPENSE_COLUMNS = [
  { id: 'date', label: 'Date', group: 'Primary', default: true, desc: 'Expense or payroll period date' },
  { id: 'type', label: 'Type', group: 'Primary', default: true, desc: 'Vendor, Category, or Salary' },
  { id: 'number', label: 'Number / ID', group: 'Primary', default: true, required: true, desc: 'Expense number or employee ID' },
  { id: 'partyName', label: 'Vendor / Employee', group: 'Primary', default: true, desc: 'Payee vendor or employee name' },
  { id: 'category', label: 'Category', group: 'Primary', default: false, desc: 'Expense category / subcategory' },
  { id: 'client', label: 'Client', group: 'Primary', default: false, desc: 'Linked billable client' },
  { id: 'reverseCharge', label: 'RCM', group: 'Primary', default: false, desc: 'Reverse Charge Mechanism applicability' },

  { id: 'dueDate', label: 'Due Date', group: 'Dates & Logistics', default: false, desc: 'Payment due date' },
  { id: 'paymentDate', label: 'Payment Date', group: 'Dates & Logistics', default: false, desc: 'Date when payment was made' },
  { id: 'paymentMethod', label: 'Payment Mode', group: 'Dates & Logistics', default: false, desc: 'Bank Transfer, UPI, Cash, etc.' },
  { id: 'businessUnit', label: 'Business Unit', group: 'Dates & Logistics', default: false, desc: 'Assigned branch or business unit' },
  { id: 'attachments', label: 'Receipt / Files', group: 'Dates & Logistics', default: false, desc: 'Uploaded receipts or bills' },

  { id: 'status', label: 'Status', group: 'Financials', default: true, desc: 'Payment and approval status' },
  { id: 'subTotal', label: 'Subtotal (Taxable)', group: 'Financials', default: false, desc: 'Taxable amount before GST' },
  { id: 'taxTotal', label: 'Total GST', group: 'Financials', default: true, desc: 'GST / tax portion' },
  { id: 'amount', label: 'Total Amount', group: 'Financials', default: true, desc: 'Gross total amount' },

  { id: 'tds', label: 'TDS Amount', group: 'TDS & Payables', default: true, desc: 'TDS deducted amount' },
  { id: 'tdsSection', label: 'TDS Section', group: 'TDS & Payables', default: false, desc: 'e.g. 194C, 194J, 192' },
  { id: 'tdsRate', label: 'TDS Rate %', group: 'TDS & Payables', default: false, desc: 'TDS rate percentage' },
  { id: 'amountPaid', label: 'Amount Paid', group: 'TDS & Payables', default: false, desc: 'Total amount paid to date' },
  { id: 'balanceDue', label: 'Payable (Balance Due)', group: 'TDS & Payables', default: true, desc: 'Outstanding amount to pay' },
];

const DEFAULT_VISIBLE_COLUMNS = ALL_EXPENSE_COLUMNS.reduce((acc, col) => {
  acc[col.id] = col.default;
  return acc;
}, {});

const getStoredVisibleColumns = () => {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_COLUMNS;
    const parsed = JSON.parse(raw);
    const result = { ...DEFAULT_VISIBLE_COLUMNS };
    ALL_EXPENSE_COLUMNS.forEach((col) => {
      if (typeof parsed[col.id] === 'boolean') {
        result[col.id] = parsed[col.id];
      }
    });
    result.number = true; // mandatory column
    return result;
  } catch (e) {
    return DEFAULT_VISIBLE_COLUMNS;
  }
};

const ExpenseList = () => {
  const navigate = useNavigate();
  const initialCategory = new URLSearchParams(window.location.search).get('category') || '';
  const [filterType, setFilterType] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'filterType', 'all'));
  
  const [combinedItems, setCombinedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'searchTerm', ''));
  const [categoryFilter] = useState(initialCategory);
  const [rowsPerPage, setRowsPerPage] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'rowsPerPage', 50));
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPdfScannerOpen, setIsPdfScannerOpen] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => getStoredVisibleColumns());
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  const toggleColumn = (colId) => {
    if (colId === 'number') return;
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
    ALL_EXPENSE_COLUMNS.forEach((c) => { all[c.id] = true; });
    setVisibleColumns(all);
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
  };

  const isCustomColumns = ALL_EXPENSE_COLUMNS.some(
    (col) => Boolean(visibleColumns[col.id]) !== Boolean(DEFAULT_VISIBLE_COLUMNS[col.id])
  );
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    item: null,
    newStatus: 'PAID',
    paymentMethod: 'Bank Transfer',
    paymentDate: '',
    amountPaid: 0,
    reference: '',
    submitting: false,
    error: '',
  });

  // Filters & Sorting State
  const [statusFilter, setStatusFilter] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'statusFilter', ''));
  const [businessUnitFilter, setBusinessUnitFilter] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'businessUnitFilter', ''));
  const [businessUnits, setBusinessUnits] = useState([]);
  const [startDate, setStartDate] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'startDate', ''));
  const [endDate, setEndDate] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'endDate', ''));
  const [sortBy, setSortBy] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'sortBy', 'date'));
  const [sortOrder, setSortOrder] = useState(() => getStoredFilter(FILTER_STORAGE_KEY, 'sortOrder', 'desc'));

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isSharedSession = sessionStorage.getItem('isSharedSession') === 'true' || sessionStorage.getItem('isSharedViewOnly') === 'true';
  const isPro = isSharedSession || (userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active') || userObj?.role === 'superadmin';

  useEffect(() => {
    setStoredFilters(FILTER_STORAGE_KEY, {
      filterType,
      rowsPerPage,
      searchTerm,
      statusFilter,
      businessUnitFilter,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });
  }, [filterType, rowsPerPage, searchTerm, statusFilter, businessUnitFilter, startDate, endDate, sortBy, sortOrder]);

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
        const subTotal = Number(exp.subTotal || Math.max(0, gross - tax));
        const tds = Number(exp.tds_amount || exp.tdsAmount || 0);
        const tdsSec = exp.tds_section || exp.tdsSection || '';
        const tdsRate = Number(exp.tds_rate || exp.tdsRate || 0);
        const paid = Number(exp.amountPaid || 0);
        const net = Math.max(0, gross - tds);
        const bal = typeof exp.balanceDue === 'number' && exp.balanceDue !== null ? exp.balanceDue : Math.max(0, net - paid);
        const buName = exp.businessUnit?.name || (typeof exp.businessUnit === 'string' && businessUnits.find(b => b._id === exp.businessUnit)?.name) || '—';

        return {
          id: exp._id,
          type: isCategory ? 'category' : 'vendor',
          date: exp.date,
          dueDate: exp.dueDate || '',
          number: exp.expenseNumber,
          partyName: exp.vendor?.name || '—',
          clientOrMethod: exp.client?.name || exp.paymentMethod || '—',
          clientName: exp.client?.name || '',
          categoryName: exp.category?.name || exp.categoryName || '',
          subCategoryName: exp.subCategory?.name || '',
          businessUnit: buName,
          paymentMethod: exp.paymentMethod || '',
          paymentDate: exp.paymentDate || '',
          reverseCharge: Boolean(exp.reverseCharge),
          attachmentsCount: exp.attachments?.length || 0,
          status: exp.status,
          subTotal: subTotal,
          amount: gross,
          taxTotal: tax,
          tds: tds,
          tdsSection: tdsSec,
          tdsRate: tdsRate,
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
        const buName = pr.employee?.businessUnit?.name || pr.employeeSnapshot?.businessUnit?.name || pr.businessUnit?.name || '—';

        return {
          id: pr._id,
          type: 'salary',
          date: dateObj,
          dueDate: '',
          periodStr: `${new Date(0, pr.month - 1).toLocaleString('en-US', { month: 'short' })} ${pr.year}`,
          number: pr.employeeSnapshot?.employeeId || pr.employee?.employeeId || '—',
          partyName: empName,
          clientOrMethod: pr.paymentMethod || 'Bank Transfer',
          clientName: '—',
          categoryName: 'Payroll / Salaries',
          subCategoryName: '',
          businessUnit: buName,
          paymentMethod: pr.paymentMethod || 'Bank Transfer',
          paymentDate: pr.paymentDate || '',
          reverseCharge: false,
          attachmentsCount: 0,
          status: pr.status?.toUpperCase() || 'DRAFT',
          subTotal: totalGross,
          amount: totalGross,
          taxTotal: 0,
          tds: tds,
          tdsSection: '192',
          tdsRate: 0,
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

  const openPaymentModal = (item, targetStatus = 'PAID') => {
    const basePayable = item.rawItem?.reverseCharge
      ? Math.max(0, Number(item.amount || 0) - Number(item.taxTotal || 0))
      : Number(item.amount || 0);
    const netPayable = item.rawItem?.net_vendor_payment !== undefined && item.rawItem?.net_vendor_payment !== null
      ? Number(item.rawItem.net_vendor_payment)
      : Math.max(0, basePayable - Number(item.tds || 0));

    const fullPayable = item.balanceDue > 0 ? item.balanceDue : netPayable;
    let initialPaid = fullPayable;
    if (targetStatus === 'PARTIAL') {
      initialPaid = item.amountPaid > 0 && item.amountPaid < netPayable
        ? item.amountPaid
        : Math.round((netPayable / 2) * 100) / 100;
    }

    setPaymentModal({
      isOpen: true,
      item,
      newStatus: targetStatus,
      paymentMethod: item.paymentMethod || item.rawItem?.paymentMethod || 'Bank Transfer',
      paymentDate: item.paymentDate ? new Date(item.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amountPaid: initialPaid,
      reference: '',
      submitting: false,
      error: '',
    });
  };

  const handleConfirmPayment = async (e) => {
    if (e) e.preventDefault();
    if (!paymentModal.item) return;

    const { item, newStatus, paymentMethod, paymentDate, amountPaid, reference } = paymentModal;

    if (!paymentMethod) {
      setPaymentModal(prev => ({ ...prev, error: 'Please select a payment method.' }));
      return;
    }

    const basePayable = item.rawItem?.reverseCharge
      ? Math.max(0, Number(item.amount || 0) - Number(item.taxTotal || 0))
      : Number(item.amount || 0);
    const netPayable = item.rawItem?.net_vendor_payment !== undefined && item.rawItem?.net_vendor_payment !== null
      ? Number(item.rawItem.net_vendor_payment)
      : Math.max(0, basePayable - Number(item.tds || 0));

    const numericAmount = Number(amountPaid) || 0;

    if (newStatus === 'PARTIAL' && (numericAmount <= 0 || numericAmount >= netPayable)) {
      setPaymentModal(prev => ({
        ...prev,
        error: `For partial payment, amount must be greater than 0 and less than ₹${fmt(netPayable)}.`
      }));
      return;
    }

    setPaymentModal(prev => ({ ...prev, submitting: true, error: '' }));
    setUpdatingStatusId(item.id);

    try {
      if (item.type === 'salary') {
        await api.post(`/payroll/${item.id}/mark-paid`, {
          paymentMethod,
          paymentDate,
          transactionId: reference || undefined,
        });

        setCombinedItems(prev => prev.map(i => i.id === item.id ? {
          ...i,
          status: 'PAID',
          paymentMethod,
          paymentDate,
          clientOrMethod: paymentMethod,
          amountPaid: item.amount - item.tds,
          balanceDue: 0,
        } : i));
      } else {
        const payload = {
          status: newStatus,
          paymentMethod,
          paymentDate,
        };

        if (newStatus === 'PARTIAL') {
          payload.amountPaid = numericAmount;
        } else {
          payload.amountPaid = netPayable;
        }

        if (reference) {
          const prevNotes = item.rawItem?.privateNotes || '';
          payload.privateNotes = prevNotes ? `${prevNotes} | Payment Ref: ${reference}` : `Payment Ref: ${reference}`;
        }

        const res = await api.put(`/expenses/${item.id}`, payload);
        const updatedDoc = res.data;

        setCombinedItems(prev => prev.map(i => i.id === item.id ? {
          ...i,
          status: updatedDoc?.status || newStatus,
          amountPaid: updatedDoc?.amountPaid !== undefined ? updatedDoc.amountPaid : payload.amountPaid,
          balanceDue: updatedDoc?.balanceDue !== undefined ? updatedDoc.balanceDue : Math.max(0, netPayable - payload.amountPaid),
          paymentMethod: updatedDoc?.paymentMethod || paymentMethod,
          paymentDate: updatedDoc?.paymentDate || paymentDate,
          clientOrMethod: updatedDoc?.client?.name || updatedDoc?.paymentMethod || paymentMethod,
          rawItem: { ...i.rawItem, ...updatedDoc }
        } : i));
      }

      setPaymentModal(prev => ({ ...prev, isOpen: false, submitting: false }));
    } catch (err) {
      console.error('Error confirming payment:', err);
      setPaymentModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to update payment status'
      }));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    if (item.status === newStatus || item.status?.toLowerCase() === newStatus.toLowerCase()) return;

    const normalizedStatus = newStatus.toUpperCase();

    // If changing to PAID or PARTIAL, prompt for payment method and payment details
    if (normalizedStatus === 'PAID' || normalizedStatus === 'PARTIAL') {
      openPaymentModal(item, normalizedStatus);
      return;
    }

    // If currently PAID or PARTIAL and changing to UNPAID, prompt confirmation
    if (item.status === 'PAID' || item.status === 'PARTIAL') {
      if (!window.confirm(`Marking this as ${normalizedStatus} will reset the recorded payment. Do you want to proceed?`)) {
        return;
      }
    }

    try {
      setUpdatingStatusId(item.id);
      if (item.type === 'salary') {
        if (newStatus.toLowerCase() === 'draft') {
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
          paymentMethod: updatedDoc?.paymentMethod !== undefined ? updatedDoc.paymentMethod : i.paymentMethod,
          clientOrMethod: updatedDoc?.client?.name || updatedDoc?.paymentMethod || i.clientOrMethod,
          rawItem: { ...i.rawItem, ...updatedDoc }
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
      } else if (sortBy === 'dueDate') {
        valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      } else if (sortBy === 'paymentDate') {
        valA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
        valB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
      } else if (sortBy === 'amount') {
        valA = Number(a.amount) || 0;
        valB = Number(b.amount) || 0;
      } else if (sortBy === 'subTotal') {
        valA = Number(a.subTotal) || 0;
        valB = Number(b.subTotal) || 0;
      } else if (sortBy === 'taxTotal') {
        valA = Number(a.taxTotal) || 0;
        valB = Number(b.taxTotal) || 0;
      } else if (sortBy === 'tds') {
        valA = Number(a.tds) || 0;
        valB = Number(b.tds) || 0;
      } else if (sortBy === 'tdsRate') {
        valA = Number(a.tdsRate) || 0;
        valB = Number(b.tdsRate) || 0;
      } else if (sortBy === 'tdsSection') {
        valA = String(a.tdsSection || '');
        valB = String(b.tdsSection || '');
      } else if (sortBy === 'amountPaid') {
        valA = Number(a.amountPaid) || 0;
        valB = Number(b.amountPaid) || 0;
      } else if (sortBy === 'balanceDue') {
        valA = Number(a.balanceDue) || 0;
        valB = Number(b.balanceDue) || 0;
      } else if (sortBy === 'number') {
        valA = String(a.number || '');
        valB = String(b.number || '');
      } else if (sortBy === 'partyName') {
        valA = String(a.partyName || '');
        valB = String(b.partyName || '');
      } else if (sortBy === 'category') {
        valA = String(a.categoryName || '');
        valB = String(b.categoryName || '');
      } else if (sortBy === 'client') {
        valA = String(a.clientName || '');
        valB = String(b.clientName || '');
      } else if (sortBy === 'paymentMethod') {
        valA = String(a.paymentMethod || '');
        valB = String(b.paymentMethod || '');
      } else if (sortBy === 'businessUnit') {
        valA = String(a.businessUnit || '');
        valB = String(b.businessUnit || '');
      } else if (sortBy === 'reverseCharge') {
        valA = a.reverseCharge ? 1 : 0;
        valB = b.reverseCharge ? 1 : 0;
      } else if (sortBy === 'type') {
        valA = String(a.type || '');
        valB = String(b.type || '');
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
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Showing {displayedItems.length} of {totalRecords} results
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
                clearStoredFilters(FILTER_STORAGE_KEY);
                setFilterType('all');
                setSearchTerm('');
                setStatusFilter('');
                setBusinessUnitFilter('');
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

                {visibleColumns.date && (
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Date {renderSortIcon('date')}
                    </div>
                  </th>
                )}

                {visibleColumns.type && (
                  <th 
                    onClick={() => handleSort('type')}
                    className="px-1.5 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Type {renderSortIcon('type')}
                    </div>
                  </th>
                )}

                {visibleColumns.number && (
                  <th 
                    onClick={() => handleSort('number')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Number / ID {renderSortIcon('number')}
                    </div>
                  </th>
                )}

                {visibleColumns.partyName && (
                  <th 
                    onClick={() => handleSort('partyName')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Vendor / Employee {renderSortIcon('partyName')}
                    </div>
                  </th>
                )}

                {visibleColumns.category && (
                  <th 
                    onClick={() => handleSort('category')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Category {renderSortIcon('category')}
                    </div>
                  </th>
                )}

                {visibleColumns.client && (
                  <th 
                    onClick={() => handleSort('client')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Client {renderSortIcon('client')}
                    </div>
                  </th>
                )}

                {visibleColumns.reverseCharge && (
                  <th 
                    onClick={() => handleSort('reverseCharge')}
                    className="px-1.5 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-center">
                      RCM {renderSortIcon('reverseCharge')}
                    </div>
                  </th>
                )}

                {visibleColumns.dueDate && (
                  <th 
                    onClick={() => handleSort('dueDate')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Due Date {renderSortIcon('dueDate')}
                    </div>
                  </th>
                )}

                {visibleColumns.paymentDate && (
                  <th 
                    onClick={() => handleSort('paymentDate')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Payment Date {renderSortIcon('paymentDate')}
                    </div>
                  </th>
                )}

                {visibleColumns.paymentMethod && (
                  <th 
                    onClick={() => handleSort('paymentMethod')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Payment Mode {renderSortIcon('paymentMethod')}
                    </div>
                  </th>
                )}

                {visibleColumns.businessUnit && (
                  <th 
                    onClick={() => handleSort('businessUnit')}
                    className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Business Unit {renderSortIcon('businessUnit')}
                    </div>
                  </th>
                )}

                {visibleColumns.attachments && (
                  <th className="px-1.5 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider select-none">
                    Files
                  </th>
                )}

                {visibleColumns.status && (
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-1.5 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      Status {renderSortIcon('status')}
                    </div>
                  </th>
                )}

                {visibleColumns.subTotal && (
                  <th 
                    onClick={() => handleSort('subTotal')}
                    className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Subtotal {renderSortIcon('subTotal')}
                    </div>
                  </th>
                )}

                {visibleColumns.taxTotal && (
                  <th 
                    onClick={() => handleSort('taxTotal')}
                    className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Total GST {renderSortIcon('taxTotal')}
                    </div>
                  </th>
                )}

                {visibleColumns.amount && (
                  <th 
                    onClick={() => handleSort('amount')}
                    className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Amount {renderSortIcon('amount')}
                    </div>
                  </th>
                )}

                {visibleColumns.tds && (
                  <th 
                    onClick={() => handleSort('tds')}
                    className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      TDS {renderSortIcon('tds')}
                    </div>
                  </th>
                )}

                {visibleColumns.tdsSection && (
                  <th 
                    onClick={() => handleSort('tdsSection')}
                    className="px-1.5 py-2 text-left text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center">
                      TDS Sec {renderSortIcon('tdsSection')}
                    </div>
                  </th>
                )}

                {visibleColumns.tdsRate && (
                  <th 
                    onClick={() => handleSort('tdsRate')}
                    className="px-1.5 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-center">
                      TDS % {renderSortIcon('tdsRate')}
                    </div>
                  </th>
                )}

                {visibleColumns.amountPaid && (
                  <th 
                    onClick={() => handleSort('amountPaid')}
                    className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Paid {renderSortIcon('amountPaid')}
                    </div>
                  </th>
                )}

                {visibleColumns.balanceDue && (
                  <th 
                    onClick={() => handleSort('balanceDue')}
                    className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group"
                  >
                    <div className="flex items-center justify-end">
                      Payable {renderSortIcon('balanceDue')}
                    </div>
                  </th>
                )}

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
                    {ALL_EXPENSE_COLUMNS.map((col) => {
                      if (!visibleColumns[col.id]) return null;
                      const isRight = ['subTotal', 'taxTotal', 'amount', 'tds', 'amountPaid', 'balanceDue'].includes(col.id);
                      const isCenter = ['type', 'reverseCharge', 'tdsRate', 'attachments'].includes(col.id);
                      return (
                        <td key={col.id} className={`px-2 py-1.5 ${isRight ? 'text-right' : isCenter ? 'text-center' : 'text-left'}`}>
                          <Skeleton 
                            width={isCenter ? '45px' : isRight ? '60px' : '85px'} 
                            height="14px" 
                            className={isRight ? 'ml-auto' : isCenter ? 'mx-auto' : ''} 
                          />
                        </td>
                      );
                    })}
                    <td className="px-1.5 py-1.5 text-center"><Skeleton width="45px" height="14px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td 
                    colSpan={ALL_EXPENSE_COLUMNS.filter(c => visibleColumns[c.id]).length + 2} 
                    className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 text-xs"
                  >
                    No expenses found.
                  </td>
                </tr>
              ) : (
                displayedItems.map(item => (
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

                    {/* Date */}
                    {visibleColumns.date && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-gray-500 dark:text-slate-400">
                        {item.type === 'salary' ? item.periodStr : fmtDate(item.date)}
                      </td>
                    )}

                    {/* Type */}
                    {visibleColumns.type && (
                      <td className="px-1.5 py-1.5 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                          item.type === 'vendor' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/50' :
                          item.type === 'category' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/50' :
                          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                    )}

                    {/* Number / ID */}
                    {visibleColumns.number && (
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {item.type !== 'salary' ? (
                          <Link to={`/expenses/edit/${item.id}`} className="text-blue-600 dark:text-blue-400 font-semibold text-xs hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                            {item.number}
                          </Link>
                        ) : (
                          <span className="text-gray-500 dark:text-slate-400 font-mono text-xs">{item.number}</span>
                        )}
                      </td>
                    )}

                    {/* Party Name */}
                    {visibleColumns.partyName && (
                      <td className="px-2 py-1.5 whitespace-nowrap max-w-[150px]">
                        <div className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate max-w-[150px]" title={item.partyName}>
                          {item.partyName}
                        </div>
                      </td>
                    )}

                    {/* Category */}
                    {visibleColumns.category && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[10px] font-medium border border-gray-200 dark:border-slate-700">
                          {item.categoryName || '—'}
                        </span>
                      </td>
                    )}

                    {/* Client */}
                    {visibleColumns.client && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300 truncate max-w-[120px]" title={item.clientName || '—'}>
                        {item.clientName || '—'}
                      </td>
                    )}

                    {/* Reverse Charge (RCM) */}
                    {visibleColumns.reverseCharge && (
                      <td className="px-1.5 py-1.5 whitespace-nowrap text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          item.reverseCharge
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                            : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700'
                        }`}>
                          {item.reverseCharge ? 'YES' : 'NO'}
                        </span>
                      </td>
                    )}

                    {/* Due Date */}
                    {visibleColumns.dueDate && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-gray-500 dark:text-slate-400 font-sans">
                        {fmtDate(item.dueDate)}
                      </td>
                    )}

                    {/* Payment Date */}
                    {visibleColumns.paymentDate && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-gray-500 dark:text-slate-400 font-sans">
                        {fmtDate(item.paymentDate)}
                      </td>
                    )}

                    {/* Payment Method */}
                    {visibleColumns.paymentMethod && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-gray-600 dark:text-slate-300 font-sans">
                        {item.paymentMethod || '—'}
                      </td>
                    )}

                    {/* Business Unit */}
                    {visibleColumns.businessUnit && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-[11px] text-gray-600 dark:text-slate-300 font-sans">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                          {item.businessUnit || '—'}
                        </span>
                      </td>
                    )}

                    {/* Attachments / Files */}
                    {visibleColumns.attachments && (
                      <td className="px-1.5 py-1.5 whitespace-nowrap text-center text-xs">
                        {item.attachmentsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-100 dark:border-blue-900/50">
                            <FaPaperclip size={10} /> {item.attachmentsCount}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.status && (
                      <td className="px-1.5 py-1.5 whitespace-nowrap">
                        {item.type === 'salary' ? (
                          <div className="flex flex-col items-start gap-0.5">
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
                            {item.status.toUpperCase() === 'PAID' && (
                              <span className="text-[9px] text-gray-500 dark:text-slate-400 font-medium">
                                via {item.paymentMethod || 'Bank Transfer'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-0.5">
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
                            {(item.status === 'PAID' || item.status === 'PARTIAL') && (
                              <button
                                type="button"
                                onClick={() => openPaymentModal(item, item.status)}
                                title="Click to change payment method"
                                className="text-[9px] text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-0.5 transition-colors cursor-pointer group"
                              >
                                <span>via {item.paymentMethod || item.rawItem?.paymentMethod || 'Method'}</span>
                                <span className="text-[8px] opacity-60 group-hover:opacity-100">✏️</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Subtotal */}
                    {visibleColumns.subTotal && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-semibold text-gray-700 dark:text-slate-200 font-mono">
                        ₹{fmt(item.subTotal)}
                      </td>
                    )}

                    {/* Tax Total (GST) */}
                    {visibleColumns.taxTotal && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-mono">
                        {item.taxTotal > 0 ? (
                          <span className="font-semibold text-slate-700 dark:text-slate-200 text-[11px]">
                            ₹{fmt(item.taxTotal)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    )}

                    {/* Total Amount */}
                    {visibleColumns.amount && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-bold text-gray-900 dark:text-slate-100 font-mono">
                        ₹{fmt(item.amount)}
                      </td>
                    )}

                    {/* TDS Amount */}
                    {visibleColumns.tds && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-mono">
                        {item.tds > 0 ? (
                          <div>
                            <span className="font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                              ₹{fmt(item.tds)}
                            </span>
                            {!visibleColumns.tdsSection && item.tdsSection && (
                              <span className="text-[8px] text-gray-400 dark:text-slate-500 block">
                                Sec {item.tdsSection}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    )}

                    {/* TDS Section */}
                    {visibleColumns.tdsSection && (
                      <td className="px-1.5 py-1.5 whitespace-nowrap text-left text-xs font-mono text-amber-700 dark:text-amber-400 font-semibold">
                        {item.tdsSection ? `Sec ${item.tdsSection}` : '—'}
                      </td>
                    )}

                    {/* TDS Rate % */}
                    {visibleColumns.tdsRate && (
                      <td className="px-1.5 py-1.5 whitespace-nowrap text-center text-xs font-mono text-gray-600 dark:text-slate-300">
                        {item.tdsRate > 0 ? `${item.tdsRate}%` : '—'}
                      </td>
                    )}

                    {/* Amount Paid */}
                    {visibleColumns.amountPaid && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {item.amountPaid > 0 ? `₹${fmt(item.amountPaid)}` : '—'}
                      </td>
                    )}

                    {/* Balance Due (Payable) */}
                    {visibleColumns.balanceDue && (
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-mono">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-xs ${
                            (item.balanceDue <= 0 || item.status?.toUpperCase() === 'PAID')
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}>
                            ₹{fmt(item.balanceDue)}
                          </span>
                          {!visibleColumns.amountPaid && item.amountPaid > 0 && (
                            <span className="text-[9px] text-gray-400 dark:text-slate-500">
                              Paid: ₹{fmt(item.amountPaid)}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Actions */}
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
                ))
              )}
            </tbody>
            {displayedItems.length > 0 && (
              <tfoot className="bg-gray-50/90 dark:bg-slate-800/80 border-t-2 border-gray-200 dark:border-slate-700 font-semibold text-xs text-gray-900 dark:text-slate-100">
                <tr>
                  <td 
                    colSpan={
                      1 + ['date', 'type', 'number', 'partyName', 'category', 'client', 'reverseCharge', 'dueDate', 'paymentDate', 'paymentMethod', 'businessUnit', 'attachments', 'status']
                        .reduce((acc, id) => acc + (visibleColumns[id] ? 1 : 0), 0)
                    } 
                    className="px-2 py-2 text-right text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold"
                  >
                    Page Total ({displayedItems.length}):
                  </td>
                  {visibleColumns.subTotal && (
                    <td className="px-2 py-2 text-right font-mono font-bold text-xs text-gray-800 dark:text-slate-200">
                      ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.subTotal) || 0), 0))}
                    </td>
                  )}
                  {visibleColumns.taxTotal && (
                    <td className="px-2 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.taxTotal) || 0), 0))}
                    </td>
                  )}
                  {visibleColumns.amount && (
                    <td className="px-2 py-2 text-right font-mono font-bold text-xs">
                      ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}
                    </td>
                  )}
                  {visibleColumns.tds && (
                    <td className="px-2 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                      ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.tds) || 0), 0))}
                    </td>
                  )}
                  {visibleColumns.tdsSection && <td className="px-1.5 py-2"></td>}
                  {visibleColumns.tdsRate && <td className="px-1.5 py-2"></td>}
                  {visibleColumns.amountPaid && (
                    <td className="px-2 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0))}
                    </td>
                  )}
                  {visibleColumns.balanceDue && (
                    <td className="px-2 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                      ₹{fmt(displayedItems.reduce((sum, i) => sum + (Number(i.balanceDue) || 0), 0))}
                    </td>
                  )}
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

      {/* Payment Method / Payment Details Modal */}
      <Modal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        title={
          paymentModal.item
            ? `${paymentModal.newStatus === paymentModal.item.status ? 'Update Payment Details' : 'Record Payment'} — ${paymentModal.item.number}`
            : 'Record Payment'
        }
      >
        {paymentModal.item && (() => {
          const item = paymentModal.item;
          const basePayable = item.rawItem?.reverseCharge
            ? Math.max(0, Number(item.amount || 0) - Number(item.taxTotal || 0))
            : Number(item.amount || 0);
          const netPayable = item.rawItem?.net_vendor_payment !== undefined && item.rawItem?.net_vendor_payment !== null
            ? Number(item.rawItem.net_vendor_payment)
            : Math.max(0, basePayable - Number(item.tds || 0));
          const currentPaid = paymentModal.newStatus === 'PAID' ? netPayable : Number(paymentModal.amountPaid || 0);
          const remainingBal = Math.max(0, netPayable - currentPaid);

          return (
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              {/* Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      {item.type === 'salary' ? 'Employee & Payroll ID' : (item.type === 'category' ? 'Category Expense' : 'Vendor & Expense Number')}
                    </span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{item.number}</span>
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({item.partyName})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Date</span>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.type === 'salary' ? item.periodStr : fmtDate(item.date)}
                    </div>
                  </div>
                </div>

                {/* Financial Numbers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total Amount</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">₹{fmt(item.amount)}</div>
                  </div>
                  {item.taxTotal > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total GST</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">₹{fmt(item.taxTotal)}</div>
                    </div>
                  )}
                  {item.tds > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        TDS {item.tdsSection ? `(Sec ${item.tdsSection})` : ''}
                      </div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">-₹{fmt(item.tds)}</div>
                    </div>
                  )}
                  <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/50 shadow-sm">
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">Net Vendor Payable</div>
                    <div className="text-sm font-extrabold text-blue-800 dark:text-blue-200 font-mono">₹{fmt(netPayable)}</div>
                  </div>
                </div>
              </div>

              {paymentModal.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-lg text-xs font-medium">
                  {paymentModal.error}
                </div>
              )}

              {/* Form Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentModal.paymentMethod}
                    onChange={(e) => setPaymentModal(prev => ({ ...prev, paymentMethod: e.target.value, error: '' }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans cursor-pointer shadow-sm"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                    {paymentModal.paymentMethod && !PAYMENT_METHODS.includes(paymentModal.paymentMethod) && (
                      <option value={paymentModal.paymentMethod}>{paymentModal.paymentMethod}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentModal.paymentDate}
                    onChange={(e) => setPaymentModal(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans shadow-sm"
                  />
                </div>

                {paymentModal.newStatus === 'PARTIAL' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Amount Paid Now (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={netPayable}
                      value={paymentModal.amountPaid}
                      onChange={(e) => setPaymentModal(prev => ({ ...prev, amountPaid: e.target.value, error: '' }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-sm"
                      required
                    />
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Remaining Due: <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">₹{fmt(remainingBal)}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Amount to Record as Paid
                    </label>
                    <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono flex items-center justify-between">
                      <span>₹{fmt(netPayable)}</span>
                      <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">Full Net Vendor Payment</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reference / Cheque / UTR No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR12345678 or Cheque #98765"
                    value={paymentModal.reference}
                    onChange={(e) => setPaymentModal(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans shadow-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentModal.submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {paymentModal.submitting ? 'Recording...' : (paymentModal.newStatus === paymentModal.item.status ? 'Update Details' : `Confirm & Mark as ${paymentModal.newStatus}`)}
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      <PdfInvoiceImporter
        isOpen={isPdfScannerOpen}
        onClose={() => setIsPdfScannerOpen(false)}
        targetType="expense"
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
              Choose which columns to show or hide in the expenses table. Your preference is saved automatically.
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
            {Array.from(new Set(ALL_EXPENSE_COLUMNS.map((c) => c.group))).map((groupName) => {
              const cols = ALL_EXPENSE_COLUMNS.filter((c) => c.group === groupName);
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
                          className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-gray-800 dark:text-slate-200'
                              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
                          } ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isLocked}
                            onChange={() => toggleColumn(col.id)}
                            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-gray-900 dark:text-slate-100">
                                {col.label}
                              </span>
                              {isLocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  Required
                                </span>
                              )}
                              {col.default && !isLocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                                  Default
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

export default ExpenseList;
