import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaSearch, FaChevronDown, FaSort, FaTrash, FaPencilAlt } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';

const VendorList = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await api.delete(`/clients/${id}`); // Client endpoint handles delete, no need for separate route
        setVendors(prev => prev.filter(c => c._id !== id));
        setSelectedVendors(prev => prev.filter(c => c !== id));
      } catch (error) {
        console.error('Error deleting vendor:', error);
        alert('Failed to delete vendor');
      }
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    String(vendor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVendors(filteredVendors.map(c => c._id));
    } else {
      setSelectedVendors([]);
    }
  };

  const toggleSelectVendor = (id) => {
    if (selectedVendors.includes(id)) {
      setSelectedVendors(selectedVendors.filter(c => c !== id));
    } else {
      setSelectedVendors([...selectedVendors, id]);
    }
  };

  // Helper to get display name for contact
  const getContactName = (vendor) => {
    if (vendor.contacts && vendor.contacts.length > 0) {
      return `${vendor.contacts[0].firstName || ''} ${vendor.contacts[0].lastName || ''}`.trim();
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
                   Filter Vendors / Suppliers 
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
             <ExportDropdown 
                data={filteredVendors} 
                filename="MyBill_Vendors_Export" 
                columns={[
                   { header: 'Company Name', key: 'name' },
                   { header: 'Email', key: 'email' },
                   { header: 'Phone', key: 'phone' },
                   { header: 'City', key: 'billingAddress.city' },
                   { header: 'State', key: 'billingAddress.state' },
                   { header: 'Opening Balance', key: 'openingBalance' }
                ]}
             />
             <Link
              to="/vendors/new"
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
                                    checked={filteredVendors.length > 0 && selectedVendors.length === filteredVendors.length}
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
                        {filteredVendors.map((vendor) => (
                            <tr key={vendor._id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        checked={selectedVendors.includes(vendor._id)}
                                        onChange={() => toggleSelectVendor(vendor._id)}
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <Link to={`/vendors/edit/${vendor._id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                        {vendor.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500">
                                    {getContactName(vendor)}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600">
                                     {formatCurrency(vendor.openingBalance)}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600">
                                     {vendor.billingAddress?.city || vendor.address?.city || '-'}
                                </td>
                                <td className="px-4 py-4 text-sm text-blue-500 hover:underline">
                                     {vendor.email ? <a href={`mailto:${vendor.email}`}>{vendor.email}</a> : '-'}
                                </td>
                                 <td className="px-4 py-4 text-sm text-slate-600">
                                     {vendor.phone || '-'}
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                      <Link to={`/vendors/edit/${vendor._id}`} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                                        <FaPencilAlt size={14} />
                                      </Link>
                                      <button 
                                          onClick={() => handleDelete(vendor._id)} 
                                          className="text-slate-300 hover:text-red-500 transition-colors"
                                          title="Delete"
                                      >
                                          <FaTrash size={14} />
                                      </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {filteredVendors.length === 0 && (
                            <tr>
                                <td colSpan="8" className="text-center py-8 text-slate-500 text-sm">
                                    No vendors found matching your search.
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

export default VendorList;
