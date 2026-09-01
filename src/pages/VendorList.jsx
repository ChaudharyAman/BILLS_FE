import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaSearch, FaChevronDown, FaSort, FaTrash, FaPencilAlt } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';

const VendorList = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVendors();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/vendors?page=${page}&limit=${rowsPerPage}&search=${encodeURIComponent(searchTerm)}`);
      setVendors(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvParsed = async (data) => {
    setIsUploading(true);
    
    // Map CSV/Excel rows to Vendor JSON Objects
    const formattedVendors = data.map(row => {
      // Handle variations in column headers for Name
      const name = row['Company Name'] || row['Company'] || row['Name'] || row['Vendor Name'] || row.name;
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
        name: name ? String(name).trim() : 'Unnamed Vendor', // Name is required in schema
        email: email ? String(email).trim() : undefined,
        phone: phone ? String(phone).trim() : undefined,
        billingAddress: {
          city: city ? String(city).trim() : undefined,
          state: state ? String(state).trim() : undefined,
        },
        openingBalance: openingBalance,
        isClient: false,
        isVendor: true // Mark as vendor
      };
    });

    try {
      const response = await api.post('/vendors/bulk', { clients: formattedVendors }); // Controller expects req.body.clients array
      fetchVendors(); // Refresh list after upload
      alert(`Success: ${response.data.message}`);
    } catch (error) {
      console.error('Error uploading vendors:', error);
      if (error.response?.status === 207) {
         // Partial success
         alert(`Partial Success: ${error.response.data.message}. Check console for details.`);
         console.warn("Upload Errors:", error.response.data.errors);
         fetchVendors(); // Still refresh to show successful ones
      } else {
         alert(error.response?.data?.message || 'Failed to import vendors.');
      }
    } finally {
      setIsUploading(false);
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

  const filteredVendors = vendors; // Backend pagination

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

  const handleBulkDelete = async () => {
    if (selectedVendors.length === 0) return;
    if (window.confirm(`Are you sure you want to delete the ${selectedVendors.length} selected vendors?`)) {
      try {
        setLoading(true);
        await Promise.all(selectedVendors.map(id => api.delete(`/clients/${id}`)));
        setSelectedVendors([]);
        fetchVendors();
      } catch (error) {
        console.error('Error deleting vendors:', error);
        alert(error.response?.data?.message || 'Failed to delete some vendors');
      } finally {
        setLoading(false);
      }
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
    <div className="container mx-auto p-6 max-w-[1600px] text-slate-800 dark:text-slate-100 transition-colors"> {/* Detailed table needs more width */}
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
        
        {/* Left Side: Filter & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
             {/* Filter Dropdown Mock */}
            <div className="relative">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium whitespace-nowrap transition-colors">
                   Filter Vendors / Suppliers 
                   <FaChevronDown size={14} className="text-slate-400 dark:text-slate-400" />
                </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
                <FaSearch className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-400 h-4 w-4" />
            </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
             {selectedVendors.length > 0 && (
               <button
                 onClick={handleBulkDelete}
                 className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
               >
                 <FaTrash size={14} /> Delete Selected ({selectedVendors.length})
               </button>
             )}
             <ExportDropdown 
                data={filteredVendors} 
                filename="Flance_Vendors_Export" 
                columns={[
                   { header: 'Company Name', key: 'name' },
                   { header: 'Email', key: 'email' },
                   { header: 'Phone', key: 'phone' },
                   { header: 'City', key: 'billingAddress.city' },
                   { header: 'State', key: 'billingAddress.state' },
                   { header: 'Opening Balance', key: 'openingBalance' }
                ]}
             />
             
             <CsvAndExcelUploader 
               onDataParsed={handleCsvParsed} 
               isLoading={isUploading}
               compact={true}
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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? (
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8f9fa] dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800">
                        <tr>
                            <th className="px-4 py-3 w-10"><Skeleton width="16px" height="16px" /></th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Company name</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Contact name</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Balance</th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">City</th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Email</th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Phone</th>
                             <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                        {[...Array(5)].map((_, i) => (
                            <tr key={i} className="bg-white dark:bg-slate-900">
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
                    <thead className="bg-[#f8f9fa] dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 dark:bg-slate-800"
                                    onChange={toggleSelectAll}
                                    checked={filteredVendors.length > 0 && selectedVendors.length === filteredVendors.length}
                                />
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide cursor-pointer group select-none">
                                <div className="flex items-center gap-1">
                                    Company name 
                                    <FaSort size={12} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Contact name
                            </th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Balance
                            </th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                City
                            </th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide cursor-pointer group select-none">
                                 <div className="flex items-center gap-1">
                                    Email
                                    <FaSort size={12} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                                </div>
                            </th>
                             <th className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                Phone
                            </th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                        {filteredVendors.map((vendor) => (
                            <tr key={vendor._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-4">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 dark:bg-slate-800"
                                        checked={selectedVendors.includes(vendor._id)}
                                        onChange={() => toggleSelectVendor(vendor._id)}
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <Link to={`/vendors/edit/${vendor._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm">
                                        {vendor.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                                    {getContactName(vendor)}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                                     {formatCurrency(vendor.openingBalance)}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                     {vendor.billingAddress?.city || vendor.address?.city || '-'}
                                </td>
                                <td className="px-4 py-4 text-sm text-blue-500 dark:text-blue-400 hover:underline">
                                     {vendor.email ? <a href={`mailto:${vendor.email}`}>{vendor.email}</a> : '-'}
                                </td>
                                 <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                     {vendor.phone || '-'}
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                      <Link to={`/vendors/edit/${vendor._id}`} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit">
                                        <FaPencilAlt size={14} />
                                      </Link>
                                      <button 
                                          onClick={() => handleDelete(vendor._id)} 
                                          className="text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
                                <td colSpan="8" className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                                    No vendors found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}
        
        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-4 transition-colors">
            <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing {vendors.length} of {totalRecords} records
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Rows per page:</span>
                    <select 
                      value={rowsPerPage} 
                      onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                      className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-300 px-2 py-1 outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                        Page {page} of {totalPages || 1}
                    </span>
                    <div className="flex gap-1">
                        <button 
                          disabled={page <= 1}
                          onClick={() => setPage(p => p - 1)}
                          className="px-3 py-1 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Prev
                        </button>
                        <button 
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => p + 1)}
                          className="px-3 py-1 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default VendorList;
