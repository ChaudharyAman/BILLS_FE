import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaSearch, FaChevronDown, FaSort, FaTrash, FaPencilAlt } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const ClientList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClients, setSelectedClients] = useState([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setLoading(false);
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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch className="absolute right-3 top-2.5 text-slate-400 h-4 w-4" />
            </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
             <Link
              to="/clients/new"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-semibold shadow-sm"
            >
              <FaPlus size={18} />
              New
            </Link>
             <button className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                Export
            </button>
             <button className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                Import
            </button>
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
                                          onClick={() => handleDelete(client._id)} 
                                          className="text-slate-300 hover:text-red-500 transition-colors"
                                          title="Delete"
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
        <div className="flex justify-end p-4 border-t border-slate-200 bg-white">
            <div className="relative">
                 <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50">
                    10 per page
                    <FaChevronDown size={14} />
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;
