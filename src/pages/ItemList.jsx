import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaSearch, FaBox, FaChevronLeft, FaChevronRight, FaPencilAlt, FaUpload } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import CsvUploader from '../components/CsvUploader';
import ExportDropdown from '../components/ExportDropdown';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

const ItemList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvParsed = async (data) => {
    setIsImporting(true);
    try {
      const formattedItems = data.map(row => ({
        name: row['Item Name'] || row.Name || row.name || row.Item || row.item,
        description: row.Description || row.description || row.Desc || row.desc || '',
        sku: row.SKU || row.sku || '',
        hsnCode: row.HSNCode || row.hsnCode || row.HSN || row.hsn || '',
        type: (row.Type || row.type || '').toLowerCase() === 'service' ? 'Service' : 'Product',
        unit: row.Unit || row.unit || 'pcs',
        salesInfo: { price: Number(row.Price || row.price || row.Rate || row.rate) || 0 },
        purchaseInfo: { price: Number(row.PurchasePrice || row.purchasePrice) || 0 },
        defaultTaxRate: Number(row.TaxRate || row.taxRate || row.Tax || row.tax) || 0,
        openingQuantity: Number(row.QTY || row.Qty || row.qty || row.Quantity || row.quantity) || 0,
      })).filter(item => item.name); // ensure a name exists

      if (formattedItems.length === 0) {
        alert('No valid items found in the CSV. Please ensure the "Name" column exists.');
        setIsImporting(false);
        return;
      }

      await api.post('/items/bulk', { items: formattedItems });
      alert(`Successfully imported \${formattedItems.length} items!`);
      setIsCsvModalOpen(false);
      setLoading(true);
      fetchItems();
    } catch (error) {
      console.error('Bulk import error:', error);
      alert('Failed to import items: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.delete(`/items/${id}`);
        setItems(prev => prev.filter(i => i._id !== id));
        setSelectedItems(prev => prev.filter(i => i !== id));
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
      }
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.hsnCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(paginatedItems.map(i => i._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatCurrency = (val) =>
    `₹ ${(val || 0).toFixed(2)}`;

  return (
    <div className="container mx-auto p-6 max-w-7xl">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search items..."
            className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          <FaSearch className="absolute right-3 top-2.5 text-slate-400 h-4 w-4" />
        </div>
        <div className="flex gap-3">
          <ExportDropdown 
              data={filteredItems} 
              filename="MyBill_Items_Master" 
              columns={[
                 { header: 'Name', key: 'name' },
                 { header: 'Description', key: 'description' },
                 { header: 'SKU', key: 'sku' },
                 { header: 'HSN Code', key: 'hsnCode' },
                 { header: 'Type', key: 'type' },
                 { header: 'Unit', key: 'unit' },
                 { header: 'Sales Price', key: 'salesInfo.price' },
                 { header: 'Opening Qty', key: 'openingQuantity' },
                 { header: 'Default Tax Rate', key: 'defaultTaxRate' }
              ]}
          />
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FaUpload size={16} /> Bulk Import Info
          </button>
          <Link
            to="/items/new"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FaPlus size={16} /> New Item
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                   <th className="px-4 py-3 w-10"><Skeleton width="16px" height="16px" /></th>
                   <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                   <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                   <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                   <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                   <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Price</th>
                   <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                   <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Quantity</th>
                   <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-4 py-3"><Skeleton width="16px" height="16px" /></td>
                    <td className="px-4 py-3"><Skeleton width="120px" height="20px" /></td>
                    <td className="px-4 py-3"><Skeleton width="180px" height="20px" /></td>
                    <td className="px-4 py-3"><Skeleton width="60px" height="20px" /></td>
                    <td className="px-4 py-3"><Skeleton width="60px" height="20px" /></td>
                    <td className="px-4 py-3"><Skeleton width="80px" height="20px" /></td>
                    <td className="px-4 py-3"><Skeleton width="40px" height="20px" /></td>
                    <td className="px-4 py-3"><Skeleton width="40px" height="20px" className="ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton width="20px" height="20px" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredItems.length === 0 ? (          <div className="text-center py-16">
            <FaBox size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No items found</p>
            <p className="text-slate-400 text-sm mt-1">Create your first item to get started</p>
            <Link to="/items/new" className="mt-4 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <FaPlus size={16} /> New Item
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      checked={selectedItems.length === paginatedItems.length && paginatedItems.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <span className="flex items-center gap-1">Name <span className="text-slate-400">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <span className="flex items-center gap-1">Price <span className="text-slate-400">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <span className="flex items-center gap-1">Unit <span className="text-slate-400">↕</span></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">
                    <span className="flex items-center gap-1 justify-end">Quantity <span className="text-slate-400">↕</span></span>
                  </th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => navigate(`/items/edit/${item._id}`)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedItems.includes(item._id) ? 'bg-teal-50/30' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => handleSelectOne(item._id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/items/edit/${item._id}`}
                        className="text-sm font-medium text-slate-800 hover:text-teal-600 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-orange-500 max-w-[180px] truncate">
                      {item.description || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {item.sku || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {item.type === 'Service' ? 'Service' : 'Product'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                      {formatCurrency(item.salesInfo?.price || item.rate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {item.unit || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium">
                      {item.openingQuantity ?? 0}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => navigate(`/items/edit/${item._id}`)}
                          className="text-slate-400 hover:text-teal-600 transition-colors"
                          title="Edit"
                        >
                          <FaPencilAlt size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-slate-300 hover:text-red-500 transition-colors font-bold text-lg leading-none"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} per page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span>{filteredItems.length} items total</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft size={14} />
                  </button>
                  <span className="px-2">Page {currentPage} of {totalPages || 1}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bulk Upload CSV Modal */}
      <Modal isOpen={isCsvModalOpen} onClose={() => !isImporting && setIsCsvModalOpen(false)} title="Bulk Import Items to Database">
        <CsvUploader 
          onDataParsed={handleCsvParsed} 
          isLoading={isImporting}
          title="Upload Items Master List"
          subtitle="Upload a CSV with columns like Name, Description, SKU, Price, Tax Rate."
        />
        <div className="mt-4 flex justify-end">
          <button 
            type="button" 
            onClick={() => setIsCsvModalOpen(false)} 
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ItemList;
