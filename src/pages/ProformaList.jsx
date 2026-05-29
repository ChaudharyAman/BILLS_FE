import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaPlus, FaCheckSquare, FaRegSquare, FaEdit, FaTrash, FaEye, FaArrowRight } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import ExportDropdown from '../components/ExportDropdown';
import Modal from '../components/Modal';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import QuotaIndicator from '../components/QuotaIndicator';
import { FaFileAlt } from 'react-icons/fa';

const ProformaList = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedImportProformas, setParsedImportProformas] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const userStr = localStorage.getItem('user');
  let userObj = null;
  try { userObj = userStr ? JSON.parse(userStr).user : null; } catch(e) {}
  const isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProformas();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, rowsPerPage]);

  const fetchProformas = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/proformas?page=${page}&limit=${rowsPerPage}&search=${encodeURIComponent(searchTerm)}`);
      setProformas(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
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

  const resetImportModal = () => {
    if (isImporting) return;
    setIsCsvModalOpen(false);
    setParsedImportProformas([]);
    setImportResult(null);
  };

  const parseProformaRows = (data) => {
      const grouped = {};
      data.forEach((row, index) => {
        const getVal = (keys) => {
           for (const key of keys) {
             if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
               return row[key];
             }
           }
           return undefined;
        };

        const id = getVal(['Proforma No', 'Draft No', 'ID', 'Id', 'id', 'Proforma Number']) || Math.random().toString();
        if (!grouped[id]) {
          grouped[id] = {
            _importRowId: `proforma-import-${Date.now()}-${index}`,
            proformaNo: String(id || '').trim(),
            clientName: getVal(['Client Name', 'Client', 'Customer Name', 'Customer']),
            clientEmail: getVal(['Client Email', 'Email', 'Customer Email']) || '',
            clientPhone: getVal(['Client Phone', 'Phone', 'Customer Phone', 'Contact']) || '',
            clientState: getVal(['Client State', 'State', 'Place of Supply']) || '',
            placeOfSupply: getVal(['Place of Supply', 'Client State', 'State']) || '',
            invoiceType: getVal(['Invoice Type', 'Type', 'Document Type']) || 'Tax Invoice',
            date: getVal(['Date', 'Proforma Date', 'Issue Date']) || undefined,
            validUntil: getVal(['Valid Until', 'Valid']) || undefined,
            shippingCharges: Number(getVal(['Shipping Charges', 'Shipping', 'Freight'])) || 0,
            packagingCharges: Number(getVal(['Packaging Charges', 'Packaging'])) || 0,
            discountTotal: Number(getVal(['Discount Total', 'Discount'])) || 0,
            importedGrandTotal: Number(getVal(['Total', 'Grand Total'])) || 0,
            items: []
          };
        }
        
        const itemName = getVal(['Item Name', 'Item', 'Product Name', 'Product', 'Description']);
        if (itemName) {
           grouped[id].items.push({
             name: itemName,
             description: getVal(['Item Description', 'Desc', 'Details']) || '',
             qty: Number(getVal(['Qty', 'QTY', 'Quantity', 'Quantity '])) || 1,
             rate: Number(getVal(['Rate', 'Price', 'Unit Price'])) || 0,
             taxRate: Number(getVal(['Tax Rate', 'Tax', 'Tax %', 'GST', 'IGST'])) || 0,
             discount: Number(getVal(['Item Discount', 'Disc'])) || 0 
           });
        }
      });

      return Object.values(grouped).filter(p => p.clientName);
  };

  const handleCsvParsed = (data) => {
      const formattedProformas = parseProformaRows(data);

      if (formattedProformas.length === 0) {
        alert('No valid proformas found. Ensure the "Client Name" column exists.');
        return;
      }

      setParsedImportProformas(formattedProformas);
      setImportResult(null);
  };

  const handleImportParsedProformas = async () => {
    if (parsedImportProformas.length === 0) return;

    setIsImporting(true);
    try {
      const res = await api.post('/proformas/bulk', { proformas: parsedImportProformas });
      setImportResult(res.data);
      setLoading(true);
      fetchProformas();
    } catch (error) {
      console.error('Bulk import error:', error);
      setImportResult({
        message: 'Failed to import proformas.',
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: parsedImportProformas.length,
        failedProformas: parsedImportProformas.map((proforma, index) => ({
          importRowId: proforma._importRowId,
          row: index + 1,
          proformaNo: proforma.proformaNo,
          clientName: proforma.clientName,
          reason: error.response?.data?.message || error.message,
        })),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const buildImportOutcomeRows = () => {
    const importedByRow = new Map((importResult?.importedProformas || []).map((item) => [item.importRowId, item]));
    const skippedByRow = new Map((importResult?.skippedProformas || []).map((item) => [item.importRowId, item]));
    const failedByRow = new Map((importResult?.failedProformas || []).map((item) => [item.importRowId, item]));
    const renumberedByRow = new Map((importResult?.renumberedProformas || []).map((item) => [item.importRowId, item]));

    return parsedImportProformas.map((proforma, index) => {
      const imported = importedByRow.get(proforma._importRowId);
      const skipped = skippedByRow.get(proforma._importRowId);
      const failed = failedByRow.get(proforma._importRowId);
      const renumbered = renumberedByRow.get(proforma._importRowId);

      if (failed) return { ...proforma, row: index + 1, outcome: 'Failed', finalNo: proforma.proformaNo || 'Auto', reason: failed.reason };
      if (skipped) return { ...proforma, row: index + 1, outcome: 'Skipped', finalNo: skipped.proformaNo || proforma.proformaNo, reason: skipped.reason };
      if (imported) return { ...proforma, row: index + 1, outcome: renumbered || imported.renumbered ? 'Imported with new number' : 'Imported', finalNo: imported.proformaNo, reason: renumbered?.reason || 'Imported successfully' };
      return { ...proforma, row: index + 1, outcome: importResult ? 'Not processed' : 'Ready', finalNo: proforma.proformaNo || 'Auto', reason: '' };
    });
  };

  const importOutcomeClass = (outcome) => {
    if (outcome === 'Imported' || outcome === 'Imported with new number') return 'bg-green-50 text-green-700 border-green-200';
    if (outcome === 'Skipped') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (outcome === 'Failed') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const displayed = proformas; // Backend pagination
  const fetchProformasForExport = async () => {
    const params = new URLSearchParams({
      all: 'true',
      search: searchTerm,
    });
    const res = await api.get(`/proformas?${params.toString()}`);
    const exportProformas = res.data.data || [];

    if (selectedIds.length > 0) {
      return exportProformas.filter((proforma) => selectedIds.includes(proforma._id));
    }

    return exportProformas;
  };

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
        <div className="flex gap-3">
          <div onClick={() => !isPro && setShowPremiumModal(true)} className={!isPro ? 'cursor-pointer' : ''}>
            <ExportDropdown 
                disabled={!isPro}
                data={displayed}
                getExportData={fetchProformasForExport}
                filename="Flance_Proformas"
                columns={[
                   { header: 'Proforma No', key: 'proformaNo' },
                   { header: 'Client Name', key: 'client.name' },
                   { header: 'Date', key: 'date' },
                   { header: 'Valid Until', key: 'validUntil' },
                   { header: 'Status', key: 'status' },
                   { header: 'Grand Total', key: 'grandTotal' }
                ]}
            />
          </div>
          <button
             onClick={() => isPro ? setIsCsvModalOpen(true) : setShowPremiumModal(true)}
             className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm ${
               isPro 
                 ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200' 
                 : 'bg-gray-50 text-gray-400 border border-gray-200 opacity-70 cursor-not-allowed'
             }`}
           >
             <FaFileAlt size={16} /> Bulk Import
           </button>
          <Link to="/proformas/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all text-sm">
            <FaPlus size={16} /> New Proforma
          </Link>
        </div>
      </div>

      {/* Quota Indicator for Free Tier */}
      <QuotaIndicator type="quotes" />

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <input type="text" placeholder="Search proformas..."
            className="w-full max-w-sm pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          <div className="text-sm text-gray-500 ml-4">Showing {displayed.length} of {totalRecords}</div>
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
                      <button 
                        onClick={() => {
                          if (!isPro) return setShowPremiumModal(true);
                          handleDelete(p._id);
                        }} 
                        className={`transition-colors ${isPro ? 'text-gray-400 hover:text-red-600' : 'text-gray-300 hover:text-gray-500'}`} 
                        title={isPro ? "Delete" : "Pro Feature - Upgrade to Delete"}
                      >
                        <FaTrash size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                  Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages || 1}</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* Bulk Upload CSV Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={resetImportModal}
        title={importResult ? 'Proforma Import Result' : parsedImportProformas.length ? 'Parsed Proformas Ready to Import' : 'Bulk Import Proformas to Database'}
      >
        {parsedImportProformas.length === 0 ? (
          <>
            <CsvAndExcelUploader
              onDataParsed={handleCsvParsed}
              isLoading={isImporting}
              title="Upload Proformas File"
              subtitle="Group rows by 'Proforma No'. Columns must include 'Client Name', 'Item Name', 'Qty', 'Rate'."
            />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={resetImportModal} disabled={isImporting} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Parsed', parsedImportProformas.length, 'border-slate-200 text-slate-900 bg-white'],
                ['Imported', importResult?.imported ?? 0, 'border-green-200 text-green-700 bg-green-50'],
                ['Updated', importResult?.updated ?? 0, 'border-blue-200 text-blue-700 bg-blue-50'],
                ['Skipped', importResult?.skipped ?? 0, 'border-amber-200 text-amber-700 bg-amber-50'],
                ['Failed', importResult?.failed ?? 0, 'border-red-200 text-red-700 bg-red-50'],
              ].map(([label, value, cls]) => (
                <div key={label} className={`border rounded-lg p-3 ${cls}`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</div>
                  <div className="text-xl font-bold">{value}</div>
                </div>
              ))}
            </div>
            {importResult?.message && <div className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">{importResult.message}</div>}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[48vh]">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      {['Row', 'Proforma', 'Final No', 'Client', 'Date', 'Amount', 'Result', 'Reason'].map((header) => (
                        <th key={header} className={`px-4 py-3 text-${header === 'Amount' ? 'right' : 'left'} text-[10px] font-bold uppercase tracking-wider text-slate-500`}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {buildImportOutcomeRows().map((row) => (
                      <tr key={row._importRowId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500">{row.row}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.proformaNo || 'Auto'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.finalNo}</td>
                        <td className="px-4 py-3 text-slate-700">{row.clientName}</td>
                        <td className="px-4 py-3 text-slate-600">{row.date ? fmtDate(row.date) : '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{fmt(row.importedGrandTotal || row.grandTotal)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${importOutcomeClass(row.outcome)}`}>{row.outcome}</span></td>
                        <td className="px-4 py-3 text-slate-600 min-w-[220px]">{row.reason || 'Ready to import'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setParsedImportProformas([]); setImportResult(null); }} disabled={isImporting} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50">Upload Another File</button>
              <button type="button" onClick={resetImportModal} disabled={isImporting} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg disabled:opacity-50">Close</button>
              {!importResult && <button type="button" onClick={handleImportParsedProformas} disabled={isImporting} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">{isImporting ? 'Importing...' : `Import ${parsedImportProformas.length} Proformas`}</button>}
            </div>
          </div>
        )}
      </Modal>

      {/* Premium Feature Modal */}
      <Modal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} title="Premium Feature">
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upgrade to Pro</h3>
          <p className="text-gray-500 mb-6">
            Deleting proformas is a premium feature. Upgrade to Pro to unlock unlimited document management, including deleting and an unlimited edit quota.
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

export default ProformaList;
