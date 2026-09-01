import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { FaTrash, FaUndo, FaSearch, FaTrashRestore, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1'
);

const TYPE_LABELS = {
  Invoice: 'Invoices',
  Quote: 'Quotes',
  Proforma: 'Proformas',
  PurchaseOrder: 'Purchase Orders',
  Expense: 'Expenses',
  Income: 'Incomes',
  Client: 'Clients / Vendors',
  Item: 'Inventory Items',
  Employee: 'Employees',
  Project: 'Projects',
  Asset: 'Assets',
  Liability: 'Liabilities',
  Budget: 'Budgets',
  Category: 'Categories',
  Department: 'Departments',
  Role: 'Roles',
  ReimbursementClaim: 'Reimbursement Claims',
  RecurringTransaction: 'Recurring Transactions',
  Payroll: 'Payrolls',
  PayrollComponent: 'Payroll Components',
  PayrollVariableTransaction: 'Payroll Var Transactions',
  LeaveRequest: 'Leave Requests',
  BankStatement: 'Bank Statements',
  Loan: 'Employee Loans'
};

const TYPE_COLORS = {
  Invoice: 'bg-blue-100 text-blue-800 border-blue-200',
  Quote: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Proforma: 'bg-purple-100 text-purple-800 border-purple-200',
  PurchaseOrder: 'bg-pink-100 text-pink-800 border-pink-200',
  Expense: 'bg-red-100 text-red-800 border-red-200',
  Income: 'bg-green-100 text-green-800 border-green-200',
  Client: 'bg-amber-100 text-amber-800 border-amber-200',
  Item: 'bg-teal-100 text-teal-800 border-teal-200',
  Employee: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Project: 'bg-sky-100 text-sky-800 border-sky-200',
  Asset: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Liability: 'bg-rose-100 text-rose-800 border-rose-200',
  Budget: 'bg-lime-100 text-lime-800 border-lime-200',
  Category: 'bg-orange-100 text-orange-800 border-orange-200',
  Department: 'bg-violet-100 text-violet-800 border-violet-200',
  Role: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  ReimbursementClaim: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RecurringTransaction: 'bg-rose-100 text-rose-800 border-rose-200',
  Payroll: 'bg-teal-100 text-teal-800 border-teal-200',
  PayrollComponent: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PayrollVariableTransaction: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  LeaveRequest: 'bg-sky-100 text-sky-800 border-sky-200',
  BankStatement: 'bg-blue-100 text-blue-800 border-blue-200',
  Loan: 'bg-amber-100 text-amber-800 border-amber-200'
};

const RecycleBin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [actionLoading, setActionLoading] = useState(null); // id_type
  const [selectedMap, setSelectedMap] = useState({}); // `${id}_${type}`: boolean
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchRecycleBin();
  }, []);

  const fetchRecycleBin = async () => {
    try {
      setLoading(true);
      const res = await api.get('/recycle-bin');
      setItems(res.data || []);
      setSelectedMap({});
    } catch (error) {
      console.error('Error fetching recycle bin:', error);
      toast.error('Failed to load Recycle Bin items');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id, type) => {
    if (!window.confirm(`Are you sure you want to restore this ${type}?`)) return;
    
    const key = `${id}_${type}`;
    setActionLoading(key);
    try {
      await api.post('/recycle-bin/restore', { id, type });
      toast.success(`${type} restored successfully`);
      setItems(prev => prev.filter(item => !(item._id === id && item.type === type)));
      setSelectedMap(prev => { const next = { ...prev }; delete next[key]; return next; });
    } catch (error) {
      console.error('Error restoring item:', error);
      if (error.response?.status === 409) {
        const proceed = window.confirm(
          `WARNING: An active ${type} with the same unique name/number already exists.\n\nRestoring this item will PERMANENTLY delete and overwrite the active one with this version. Do you want to proceed?`
        );
        if (proceed) {
          try {
            await api.post('/recycle-bin/restore', { id, type, forceRestore: true });
            toast.success(`${type} restored and duplicate overwritten successfully`);
            setItems(prev => prev.filter(item => !(item._id === id && item.type === type)));
            setSelectedMap(prev => { const next = { ...prev }; delete next[key]; return next; });
            return;
          } catch (forceError) {
            console.error('Error during forced restore:', forceError);
            toast.error(forceError.response?.data?.message || 'Failed to overwrite and restore');
          }
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to restore item');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (id, type) => {
    if (!window.confirm(`WARNING: This will permanently delete this ${type} and cannot be undone! Are you sure you want to proceed?`)) return;

    const key = `${id}_${type}`;
    setActionLoading(key);
    try {
      await api.delete(`/recycle-bin/permanent?id=${id}&type=${type}`);
      toast.success(`${type} permanently deleted`);
      setItems(prev => prev.filter(item => !(item._id === id && item.type === type)));
      setSelectedMap(prev => { const next = { ...prev }; delete next[key]; return next; });
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      toast.error(error.response?.data?.message || 'Failed to delete item');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const distinctTypes = ['All', ...new Set(items.map(item => item.type))];

  const selectedCount = Object.values(selectedMap).filter(Boolean).length;
  const isAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedMap[`${item._id}_${item.type}`]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const next = { ...selectedMap };
      filteredItems.forEach(item => { delete next[`${item._id}_${item.type}`]; });
      setSelectedMap(next);
    } else {
      const next = { ...selectedMap };
      filteredItems.forEach(item => { next[`${item._id}_${item.type}`] = true; });
      setSelectedMap(next);
    }
  };

  const toggleSelectItem = (id, type) => {
    const key = `${id}_${type}`;
    setSelectedMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getSelectedItemsPayload = () => {
    const selectedKeys = new Set(Object.keys(selectedMap).filter(k => selectedMap[k]));
    return items
      .filter(item => selectedKeys.has(`${item._id}_${item.type}`))
      .map(item => ({ id: item._id, type: item.type }));
  };

  const handleBulkRestore = async () => {
    const selectedPayload = getSelectedItemsPayload();
    if (selectedPayload.length === 0) return;
    if (!window.confirm(`Are you sure you want to restore ${selectedPayload.length} selected item(s)?`)) return;

    try {
      setBulkLoading(true);
      const res = await api.post('/recycle-bin/bulk-restore', { items: selectedPayload });
      toast.success(res.data?.message || `${selectedPayload.length} item(s) restored successfully`);
      const removedKeys = new Set(selectedPayload.map(i => `${i.id}_${i.type}`));
      setItems(prev => prev.filter(item => !removedKeys.has(`${item._id}_${item.type}`)));
      setSelectedMap({});
    } catch (error) {
      console.error('Error in bulk restore:', error);
      toast.error(error.response?.data?.message || 'Failed to restore selected items');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    const selectedPayload = getSelectedItemsPayload();
    if (selectedPayload.length === 0) return;
    if (!window.confirm(`WARNING: This will PERMANENTLY delete ${selectedPayload.length} selected item(s). This action CANNOT be undone! Are you sure?`)) return;

    try {
      setBulkLoading(true);
      const res = await api.post('/recycle-bin/bulk-permanent', { items: selectedPayload });
      toast.success(res.data?.message || `${selectedPayload.length} item(s) permanently deleted`);
      const removedKeys = new Set(selectedPayload.map(i => `${i.id}_${i.type}`));
      setItems(prev => prev.filter(item => !removedKeys.has(`${item._id}_${item.type}`)));
      setSelectedMap({});
    } catch (error) {
      console.error('Error in bulk permanent delete:', error);
      toast.error(error.response?.data?.message || 'Failed to delete selected items');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (items.length === 0) return;
    if (!window.confirm(`⚠️ EXTREME CAUTION: Are you sure you want to PERMANENTLY DELETE ALL ${items.length} items in the Recycle Bin?\n\nThis will purge all deleted records from the database and CANNOT BE UNDONE!`)) return;

    try {
      setBulkLoading(true);
      const res = await api.post('/recycle-bin/empty');
      toast.success(res.data?.message || 'Recycle Bin emptied successfully!');
      setItems([]);
      setSelectedMap({});
    } catch (error) {
      console.error('Error emptying recycle bin:', error);
      toast.error(error.response?.data?.message || 'Failed to empty Recycle Bin');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl font-sans text-gray-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <FaTrash className="text-teal-600 dark:text-teal-400" size={28} />
            Recycle Bin
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            View, restore, or permanently delete items that you have deleted.
          </p>
        </div>
        {isLocalhost && items.length > 0 && (
          <button
            type="button"
            disabled={bulkLoading}
            onClick={handleEmptyRecycleBin}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 self-start md:self-auto cursor-pointer"
          >
            <FaTrash size={12} /> Empty Recycle Bin ({items.length})
          </button>
        )}
      </div>


      {/* Warning Alert Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm flex items-start gap-3">
        <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
        <div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Caution</h3>
          <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
            Restoring parent entities (e.g. Clients or Departments) is supported, but please ensure related details are verified. Permanently deleted items cannot be recovered.
          </p>
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400 dark:text-slate-500" size={16} />
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            placeholder="Search deleted items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-thin">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase flex-shrink-0">Filter:</span>
          {distinctTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedType === type
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
              }`}
            >
              {type === 'All' ? 'All Types' : (TYPE_LABELS[type] || type)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Toolbar Banner */}
      {selectedCount > 0 && (
        <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in duration-150">
          <div className="text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-2">
            <span className="bg-teal-600 text-white rounded-full px-2.5 py-0.5 text-[11px] font-bold">{selectedCount}</span>
            <span>item{selectedCount > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={bulkLoading}
              onClick={handleBulkRestore}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <FaUndo size={11} /> Restore Selected ({selectedCount})
            </button>
            {isLocalhost && (
              <button
                type="button"
                disabled={bulkLoading}
                onClick={handleBulkPermanentDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <FaTrash size={11} /> Delete Selected Permanently ({selectedCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedMap({})}
              className="text-xs text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 underline font-medium ml-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 mb-4 border border-gray-100 dark:border-slate-800">
              <FaTrashRestore size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Recycle Bin is Empty</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {searchTerm || selectedType !== 'All' 
                ? 'No deleted items matched your search filters.' 
                : 'Deleted items will appear here for you to restore or delete permanently.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800">
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                      aria-label="Select all filtered items"
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Item Type</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Details</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 text-right">Value</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Deleted On</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const key = `${item._id}_${item.type}`;
                  const isCurrentActionLoading = actionLoading === key;
                  const isSelected = Boolean(selectedMap[key]);
                  return (
                    <tr key={key} className={`${isSelected ? 'bg-teal-50/40 dark:bg-teal-950/30' : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/50'} transition-colors group`}>
                      {/* Selection Checkbox */}
                      <td className="w-12 px-4 py-4 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item._id, item.type)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          aria-label={`Select ${item.displayName}`}
                        />
                      </td>

                      {/* Badge Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${TYPE_COLORS[item.type] || 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-700'}`}>
                          {TYPE_LABELS[item.type] || item.type}
                        </span>
                      </td>

                      {/* Name / Description */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800 dark:text-slate-100 text-sm group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                          {item.displayName}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                          ID: {item._id}
                        </div>
                      </td>

                      {/* Display Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-700 dark:text-slate-200">
                        {item.amount !== null && item.amount !== undefined ? (
                          `₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Deleted Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        {new Date(item.deletedAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            disabled={isCurrentActionLoading}
                            onClick={() => handleRestore(item._id, item.type)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 border border-transparent hover:border-teal-200 dark:hover:border-teal-800 transition-all cursor-pointer"
                            title="Restore Item"
                          >
                            {isCurrentActionLoading ? (
                              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <FaUndo size={14} />
                            )}
                          </button>
                          {isLocalhost && (
                            <button
                              disabled={isCurrentActionLoading}
                              onClick={() => handlePermanentDelete(item._id, item.type)}
                              className="inline-flex items-center justify-center p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer"
                              title="Permanently Delete"
                            >
                              {isCurrentActionLoading ? (
                                <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <FaTrash size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecycleBin;
