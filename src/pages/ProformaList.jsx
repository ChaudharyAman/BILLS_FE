import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaArrowRight } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';

const ProformaList = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { fetchProformas(); }, []);

  const fetchProformas = async () => {
    try {
      const res = await api.get('/proformas');
      setProformas(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this proforma?')) return;
    try { await api.delete(`/proformas/${id}`); fetchProformas(); }
    catch (e) { alert('Failed to delete'); }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this Proforma Invoice to a Tax Invoice?')) return;
    try {
      const res = await api.post(`/proformas/${id}/convert`);
      alert(`Invoice ${res.data.invoice.invoiceNo} created!`);
      navigate(`/invoices/${res.data.invoice._id}/print`);
    } catch (e) { alert(e.response?.data?.message || 'Conversion failed'); }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === proformas.length ? [] : proformas.map(p => p._id));

  const filtered = proformas.filter(p =>
    p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proformaNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const displayed = filtered.slice(0, rowsPerPage);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    SENT: 'bg-blue-100 text-blue-700 border-blue-200',
    CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
    CONVERTED: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Proforma Invoices</h1>
          <p className="text-gray-500 mt-1">Advance invoices before final billing</p>
        </div>
        <Link to="/proformas/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
          <FaPlus size={16} /> New Proforma
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <input type="text" placeholder="Search proformas..."
            className="w-full max-w-sm pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <div className="text-sm text-gray-500 ml-4">Showing {displayed.length} of {filtered.length}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 w-12 text-center">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {selectedIds.length === proformas.length && proformas.length > 0 ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proforma No.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valid Until</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white border-b border-gray-100">
                    <td className="px-6 py-4 text-center"><Skeleton width="18px" height="18px" className="mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton width="100px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="140px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="20px" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="24px" className="rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton width="80px" height="20px" className="ml-auto" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton width="100px" height="20px" className="mx-auto" /></td>
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500 text-sm">No proforma invoices found.</td></tr>
              ) : displayed.map(p => (
                <tr key={p._id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleSelect(p._id)} className={selectedIds.includes(p._id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}>
                      {selectedIds.includes(p._id) ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/proformas/${p._id}/print`} className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                      {p.proformaNo}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{p.client?.name}</div>
                    {p.client?.gstin && <div className="text-xs text-gray-400 mt-0.5">{p.client.gstin}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(p.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(p.validUntil)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[p.status] || STATUS_STYLES.DRAFT}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    ₹{fmt(p.grandTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2 items-center">
                      <Link to={`/proformas/${p._id}/print`} className="text-gray-400 hover:text-blue-600 transition-colors" title="View"><FaEye size={17} /></Link>
                      <Link to={`/proformas/edit/${p._id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><FaEdit size={17} /></Link>
                      {p.status !== 'CONVERTED' && (
                        <button onClick={() => handleConvert(p._id)} className="text-gray-400 hover:text-purple-600 transition-colors" title="Convert to Invoice">
                          <FaArrowRight size={17} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(p._id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete"><FaTrash size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">Page 1 of {Math.ceil(filtered.length / rowsPerPage) || 1}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProformaList;
