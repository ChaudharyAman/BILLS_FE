import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaSearch, FaBox, FaChevronLeft, FaChevronRight, FaPencilAlt, FaUpload } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentPage, itemsPerPage]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/items?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}`);
      setItems(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvParsed = async (data) => {
    setIsImporting(true);
    try {
      const formattedItems = data.map(row => {
        const getVal = (keys) => {
           for (const key of keys) {
             if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
               return row[key];
             }
           }
           return undefined;
        };

        const typeStr = (getVal(['Type', 'type', 'Item Type']) || '').toString().toLowerCase();
        const isService = typeStr === 'service';

        const cessPercent = Number(getVal(['CESS (%)', 'Cess (%)', 'cess (%)', 'CESS Rate', 'Cess Rate'])) || 0;
        const cessAmt = Number(getVal(['CESS', 'Cess', 'cess', 'CESS Amount', 'Cess Amount'])) || 0;

        return {
          name: getVal(['Product Name', 'Item Name', 'Name', 'name', 'Item', 'item']),
          description: getVal(['Description', 'description', 'Desc', 'desc']) || '',
          sku: getVal(['SKU', 'sku', 'Item Code']) || '',
          hsnCode: getVal(['HSN/SAC', 'HSN/SAC Code', 'HSNCode', 'hsnCode', 'HSN', 'hsn', 'SAC']) || '',
          type: isService ? 'Service' : 'Goods',
          unit: getVal(['UoM', 'UOM', 'Unit', 'unit']) || 'pcs',
          salesInfo: { 
            price: Number(getVal(['Unit Price', 'Price', 'price', 'Rate', 'rate'])) || 0,
            currency: getVal(['Unit Price C', 'Currency', 'currency']) || 'INR',
            cessPercent: cessPercent,
            cessAmount: cessAmt
          },
          purchaseInfo: { 
            price: Number(getVal(['Purchase Rate', 'Purchase R', 'Purchase Price', 'purchasePrice'])) || 0,
            cessPercent: cessPercent,
            cessAmount: cessAmt
          },
          defaultTaxRate: Number(getVal(['Tax (%)', 'TaxRate', 'taxRate', 'Tax', 'tax', 'GST', 'IGST'])) || 0,
          openingQuantity: Number(getVal(['Quantity', 'QTY', 'Qty', 'qty', 'quantity'])) || 0,
        };
      }).filter(item => item.name);

      if (formattedItems.length === 0) {
        alert('No valid items found in the file. Please ensure the "Name" column exists.');
        setIsImporting(false);
        return;
      }

      await api.post('/items/bulk', { items: formattedItems });
      alert(`Successfully imported ${formattedItems.length} items!`);
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(items.map(i => i._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const fetchItemsForExport = async () => {
    const params = new URLSearchParams({
      all: 'true',
      search: searchTerm,
    });
    const res = await api.get(`/items?${params.toString()}`);
    const exportItems = res.data.data || [];

    if (selectedItems.length > 0) {
      return exportItems.filter((item) => selectedItems.includes(item._id));
    }

    return exportItems;
  };

  const formatCurrency = (val) =>
    `₹ ${(val || 0).toFixed(2)}`;

  return (
    <div className="container mx-auto p-6 max-w-7xl text-slate-800 dark:text-slate-100 transition-colors">

      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search inventory..."
            className="w-full pl-4 pr-10 py-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          <FaSearch className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-400 h-4 w-4" />
        </div>
        <div className="flex gap-3">
          <ExportDropdown 
              testId="items-export"
              data={items}
              getExportData={fetchItemsForExport}
              filename="Flance_Items_Master" 
              columns={[
                 { header: 'Name', key: 'name' },
                 { header: 'Description', key: 'description' },
                 { header: 'SKU', key: 'sku' },
                 { header: 'Type', key: 'type' },
                 { header: 'Price', key: 'salesInfo.price' },
                 { header: 'Unit', key: 'unit' },
                 { header: 'Qty', key: 'openingQuantity' }
              ]}
          />
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FaUpload size={16} /> Bulk Import
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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? (
          <div className="p-10 text-center"><Skeleton width="100%" height="200px" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <FaBox size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No inventory found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 dark:bg-slate-800"
                      checked={selectedItems.length === items.length && items.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right">Quantity</th>
                  <th className="px-4 py-3 w-20 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => handleSelectOne(item._id)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 dark:bg-slate-800"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => navigate(`/items/edit/${item._id}`)}>
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{item.sku || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium">{formatCurrency(item.salesInfo?.price || item.rate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 text-right font-medium">{item.openingQuantity ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/items/edit/${item._id}`)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><FaPencilAlt size={14} /></button>
                        <button onClick={() => handleDelete(item._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-lg transition-colors">×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isCsvModalOpen} onClose={() => !isImporting && setIsCsvModalOpen(false)} title="Bulk Import Inventory">
        <CsvAndExcelUploader onDataParsed={handleCsvParsed} isLoading={isImporting} />
      </Modal>
    </div>
  );
};

export default ItemList;
