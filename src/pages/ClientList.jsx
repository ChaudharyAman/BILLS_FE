import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaSearch, FaChevronDown, FaSort, FaTrash, FaPencilAlt } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import ExportDropdown from '../components/ExportDropdown';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';

const ClientList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClients();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/clients?page=${page}&limit=${rowsPerPage}&search=${encodeURIComponent(searchTerm)}`);
      setClients(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvParsed = async (data) => {
    setIsUploading(true);
    
    // Map CSV/Excel rows to Client JSON Objects
    const formattedClients = data.map(row => {
      // Handle variations in column headers for Name
      const name = row['Company Name'] || row['Company'] || row['Name'] || row['Client Name'] || row.name;
      // Handle variations for Email
      const email = row['Email'] || row['Email Address'] || row.email;
      // Handle variations for Phone
      const phone = row['Phone'] || row['Phone Number'] || row['Contact'] || row.phone;
      // Handle variations for City
      const city = row['City'] || row['Billing City'] || row.city;
      // Handle variations for State
      const state = row['State'] || row['Billing State'] || row.state;
      // Handle variations for Balance
      const balanceRaw = row['Opening Balance'] || row['Balance'] || row.openingBalance || 0;
      const openingBalance = parseFloat(balanceRaw) || 0;

      return {
        name: name ? String(name).trim() : 'Unnamed Client', // Name is required in schema
        email: email ? String(email).trim() : undefined,
        phone: phone ? String(phone).trim() : undefined,
        billingAddress: {
          city: city ? String(city).trim() : undefined,
          state: state ? String(state).trim() : undefined,
        },
        openingBalance: openingBalance,
        isClient: true,
        isVendor: false
      };
    });

    try {
      const response = await api.post('/clients/bulk', { clients: formattedClients });
      fetchClients(); // Refresh list after upload
      alert(`Success: ${response.data.message}`);
    } catch (error) {
      console.error('Error uploading clients:', error);
      if (error.response?.status === 207) {
         // Partial success
         alert(`Partial Success: ${error.response.data.message}. Check console for details.`);
         console.warn("Upload Errors:", error.response.data.errors);
         fetchClients(); // Still refresh to show successful ones
      } else {
         alert(error.response?.data?.message || 'Failed to import clients.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await api.delete(`/clients/${id}`);
        setClients(prev => prev.filter(c => c._id !== id));
        setSelectedClients(prev => prev.filter(c => c !== id));
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Failed to delete client');
      }
    }
  };

  const filteredClients = clients; // Backend pagination

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClients(filteredClients.map(c => c._id));
    } else {
      setSelectedClients([]);
    }
  };

  const toggleSelectClient = (id) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(c => c !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  // Helper to get display name for contact
  const getContactName = (client) => {
    if (client.contacts && client.contacts.length > 0) {
      return `${client.contacts[0].firstName || ''} ${client.contacts[0].lastName || ''}`.trim();
    }
    // Fallback if needed
    return '-';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="container mx-auto p-6 max-w-[1600px]"> {/* Detailed table needs more width */}
      
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left Side: Filter & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
             {/* Filter Dropdown Mock */}
            <div className="relative">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 font-medium whitespace-nowrap">
                   Filter Clients / Customers 
                   <FaChevronDown size={14} className="text-slate-400" />
                </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
                <FaSearch className="absolute right-3 top-2.5 text-slate-400 h-4 w-4" />
            </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
             <div onClick={() => !isPro && setShowPremiumModal(true)} className={!isPro ? 'cursor-pointer' : ''}>
               <ExportDropdown 
                  disabled={!isPro}
                  testId="clients-export"
                  data={filteredClients} 
                  filename="Flance_Clients_Export" 
                  columns={[
                     { header: 'Company Name', key: 'name' },
                     { header: 'Email', key: 'email' },
                     { header: 'Phone', key: 'phone' },
                     { header: 'City', key: 'billingAddress.city' },
                     { header: 'State', key: 'billingAddress.state' },
                     { header: 'Opening Balance', key: 'openingBalance' }
                  ]}
               />
             </div>
             
             <div onClick={() => !isPro && setShowPremiumModal(true)} className={!isPro ? 'cursor-pointer' : ''}>
               <CsvAndExcelUploader 
                 onDataParsed={handleCsvParsed} 
                 isLoading={isUploading}
                 compact={true}
                 disabled={!isPro}
               />
             </div>

             <Link
              to="/clients/new"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold shadow-sm"
            >
              <FaPlus size={18} />
              New
            </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8f9fa] border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 w-10"><Skeleton width="16px" height="16px" /></th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">Company name</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">Contact name</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">Balance</th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">City</th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">Email</th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">Phone</th>
                             <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {[...Array(5)].map((_, i) => (
                            <tr key={i} className="bg-white">
                                <td className="px-4 py-4"><Skeleton width="16px" height="16px" /></td>
                                <td className="px-4 py-4"><Skeleton width="140px" height="20px" /></td>
                                <td className="px-4 py-4"><Skeleton width="120px" height="20px" /></td>
                                <td className="px-4 py-4"><Skeleton width="80px" height="20px" /></td>
                                <td className="px-4 py-4"><Skeleton width="100px" height="20px" /></td>
                                <td className="px-4 py-4"><Skeleton width="160px" height="20px" /></td>
                                <td className="px-4 py-4"><Skeleton width="100px" height="20px" /></td>
                                <td className="px-4 py-4"><Skeleton width="20px" height="20px" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8f9fa] border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    onChange={toggleSelectAll}
                                    checked={filteredClients.length > 0 && selectedClients.length === filteredClients.length}
                                />
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide cursor-pointer group select-none">
                                <div className="flex items-center gap-1">
                                    Company name 
                                    <FaSort size={12} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Contact name
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Balance
                            </th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">
                                City
                            </th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide cursor-pointer group select-none">
                                 <div className="flex items-center gap-1">
                                    Email
                                    <FaSort size={12} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                                </div>
                            </th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Phone
                            </th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredClients.map((client) => (
                            <tr key={client._id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        checked={selectedClients.includes(client._id)}
                                        onChange={() => toggleSelectClient(client._id)}
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <Link to={`/clients/edit/${client._id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                        {client.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500">
                                    {getContactName(client)}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600">
                                     {formatCurrency(client.openingBalance)}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600">
                                     {client.billingAddress?.city || client.address?.city || '-'}
                                </td>
                                <td className="px-4 py-4 text-sm text-blue-500 hover:underline">
                                     {client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : '-'}
                                </td>
                                 <td className="px-4 py-4 text-sm text-slate-600">
                                     {client.phone || '-'}
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                      <Link to={`/clients/edit/${client._id}`} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                                        <FaPencilAlt size={14} />
                                      </Link>
                                      <button 
                                          onClick={() => {
                                              if (!isPro) return setShowPremiumModal(true);
                                              handleDelete(client._id);
                                          }} 
                                          className={`transition-colors ${isPro ? 'text-slate-300 hover:text-red-500' : 'text-slate-200 hover:text-slate-400'}`}
                                          title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                                      >
                                          <FaTrash size={14} />
                                      </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {filteredClients.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center py-8 text-slate-500 text-sm">
                                    No clients found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}
        
        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-200 bg-white gap-4">
            <div className="text-sm text-slate-500">
                Showing {clients.length} of {totalRecords} records
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Rows per page:</span>
                    <select 
                      value={rowsPerPage} 
                      onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                      className="border border-slate-200 rounded text-sm text-slate-600 px-2 py-1 outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">
                        Page {page} of {totalPages || 1}
                    </span>
                    <div className="flex gap-1">
                        <button 
                          disabled={page <= 1}
                          onClick={() => setPage(p => p - 1)}
                          className="px-3 py-1 border border-slate-200 text-sm text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prev
                        </button>
                        <button 
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => p + 1)}
                          className="px-3 py-1 border border-slate-200 text-sm text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
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
            Bulk operations and data management are premium features. Upgrade to Pro to unlock unlimited document management, including bulk import/export and deleting clients.
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

    </div>
  );
};

export default ClientList;
