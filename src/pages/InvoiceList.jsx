import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Plus, Download, CheckSquare, Square, Edit, Trash2, Eye, ChevronDown } from 'lucide-react';

const DOC_TYPES = [
  {
    section: 'Invoices',
    items: [
      { label: 'Tax Invoice',     desc: 'GST invoice with CGST/SGST/IGST',  path: '/invoices/new?type=Tax+Invoice' },
      { label: 'Invoice',         desc: 'Simple invoice without GST',         path: '/invoices/new?type=Invoice' },
      { label: 'Retail Invoice',  desc: 'For retail / B2C sales',             path: '/invoices/new?type=Retail+Invoice' },
      { label: 'Excise Invoice',  desc: 'Tax invoice with excise duty',        path: '/invoices/new?type=Excise+Invoice' },
    ],
  },
  {
    section: 'Estimates',
    items: [
      { label: 'Quotation',         desc: 'Send a price quote to your client', path: '/quotes/new' },
      { label: 'Proforma Invoice',  desc: 'Advance invoice before final bill',  path: '/proformas/new' },
    ],
  },
];

const InvoiceList = () => {
  const navigate = useNavigate();
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (typeMenuRef.current && !typeMenuRef.current.contains(e.target)) setTypeMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    console.log('Fetching invoices...'); // DEBUG LOG
    try {
      const response = await api.get('/invoices');
      console.log('Invoices response:', response.data); // DEBUG LOG
      setInvoices(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(i => i._id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter(i => i !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };


  
  // --- Filtering & Pagination ---
  const filteredInvoices = invoices.filter(inv => 
      inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const displayedInvoices = filteredInvoices.slice(0, rowsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };
  
  const getStatusBadge = (status, balance) => {
      // Logic for status if not explicit in DB (or use DB status)
      // Assuming 'status' field exists or derived
      let finalStatus = status || 'SENT';
      if (balance === 0) finalStatus = 'PAID';
      
      const styles = {
          'PAID': 'bg-green-100 text-green-700 border-green-200',
          'DRAFT': 'bg-gray-100 text-gray-700 border-gray-200',
          'SENT': 'bg-blue-100 text-blue-700 border-blue-200',
          'OVERDUE': 'bg-red-100 text-red-700 border-red-200',
          'PARTIAL': 'bg-yellow-100 text-yellow-700 border-yellow-200',
          'UNPAID': 'bg-orange-100 text-orange-700 border-orange-200',
      };
      
      return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[finalStatus] || styles['SENT']}`}>
              {finalStatus}
          </span>
      );
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Invoices</h1>
            <p className="text-gray-500 mt-1">Manage and track your invoice history</p>
        </div>
        <div className="flex gap-3">
           {selectedInvoices.length > 0 && (
              <button className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-300 shadow-sm transition-all text-sm font-medium">
                  <Download size={16} /> Export Selected
              </button>
           )}

          {/* Unified New Document button */}
          <div className="relative" ref={typeMenuRef}>
            <div className="flex">
              <button
                onClick={() => navigate('/invoices/new?type=Tax+Invoice')}
                className="bg-blue-600 hover:bg-blue-700 text-white pl-4 pr-3 py-2 rounded-l-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm border-r border-blue-500"
              >
                <Plus size={16} /> New Document
              </button>
              <button
                onClick={() => setTypeMenuOpen(o => !o)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 rounded-r-lg shadow-sm transition-all"
                title="Choose document type"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {typeMenuOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {DOC_TYPES.map(({ section, items }) => (
                  <div key={section}>
                    <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                      {section}
                    </div>
                    {items.map(({ label, desc, path }) => (
                      <button
                        key={label}
                        onClick={() => { navigate(path); setTypeMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group border-b border-gray-50 last:border-0"
                      >
                        <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      


      {/* Modern Table Section */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
             <div className="relative max-w-sm w-full">
                 {/* Search placeholder could go here */}
                 <input 
                    type="text" 
                    placeholder="Search invoices..." 
                    className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
             <div className="text-sm text-gray-500">
                 Showing {displayedInvoices.length} of {filteredInvoices.length} results
             </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {selectedInvoices.length === invoices.length && invoices.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm">Loading invoices...</td></tr>
              ) : displayedInvoices.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm">No invoices found.</td></tr>
              ) : (
                displayedInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleSelect(inv._id)} className={`${selectedInvoices.includes(inv._id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}>
                         {selectedInvoices.includes(inv._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    
                    {/* Invoice No */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/invoices/${inv._id}/print`} className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                            {inv.invoiceNo}
                        </Link>
                    </td>
                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {inv.invoiceType || 'Tax Invoice'}
                        </span>
                    </td>
                    
                    {/* Client */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{inv.client?.name}</div>
                        {inv.client?.gstin && <div className="text-xs text-gray-400 mt-0.5">{inv.client.gstin}</div>}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(inv.date)}
                        <div className="text-xs text-gray-400 mt-0.5">Due: {formatDate(inv.dueDate)}</div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(inv.status, inv.balanceDue)}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <span className={inv.balanceDue > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            ₹{inv.balanceDue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center gap-3">
                            <Link to={`/invoices/${inv._id}/print`} className="text-gray-400 hover:text-blue-600 transition-colors" title="View">
                                <Eye size={18} />
                            </Link>
                            <Link to={`/invoices/edit/${inv._id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                                <Edit size={18} />
                            </Link>
                            <button 
                                onClick={async () => {
                                    if(window.confirm('Are you sure you want to delete this invoice?')) {
                                        try {
                                            await api.delete(`/invoices/${inv._id}`);
                                            fetchInvoices();
                                        } catch(err) {
                                            alert('Failed to delete');
                                        }
                                    }
                                }} 
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer / Pagination */}
         <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
           <div className="text-sm text-gray-500">
               Page 1 of {Math.ceil(filteredInvoices.length / rowsPerPage)}
           </div>
           <div className="flex items-center gap-2">
               <span className="text-sm text-gray-500">Rows per page:</span>
               <select 
                 value={rowsPerPage}
                 onChange={(e) => setRowsPerPage(Number(e.target.value))}
                 className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
               >
                 <option value={10}>10</option>
                 <option value={20}>20</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
               </select>
           </div>
         </div>
      </div>
    </div>
  );
};

export default InvoiceList;
