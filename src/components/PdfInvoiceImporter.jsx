import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaFilePdf, FaTimes, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaSpinner, FaEdit, FaCloudUploadAlt, FaTrash, FaPlus, FaInfoCircle } from 'react-icons/fa';

const STATUS_CONFIG = {
  'auto-approved': { color: 'emerald', icon: FaCheckCircle, label: 'Auto-Approved', desc: 'High confidence — ready to save' },
  'needs-review':  { color: 'amber',   icon: FaExclamationTriangle, label: 'Needs Review', desc: 'Please verify before saving' },
  'low-confidence':{ color: 'orange',  icon: FaExclamationTriangle, label: 'Low Confidence', desc: 'Multiple issues detected' },
  'rejected':      { color: 'red',     icon: FaTimesCircle, label: 'Rejected', desc: 'Could not parse — enter manually' },
};

const TARGET_CONFIG = {
  invoice: {
    title: 'PDF Invoice Scanner',
    subtitle: 'Upload a PDF invoice to auto-extract data',
    uploadText: 'Drag & drop a PDF invoice here',
    extractLabel: 'Extract Invoice Data',
    extractingLabel: 'Extracting invoice data...',
    detailsTitle: 'Invoice Details',
    sendLabel: 'Send to Invoice Form',
    storageKey: 'pdfImportData',
    navigateTo: '/invoices/new?source=pdf',
    numberLabel: 'Invoice Number',
    dateLabel: 'Invoice Date',
    primaryPartyLabel: 'Client Name',
  },
  expense: {
    title: 'PDF Expense Scanner',
    subtitle: 'Upload a bill or receipt to prefill an expense',
    uploadText: 'Drag & drop an expense PDF here',
    extractLabel: 'Extract Expense Data',
    extractingLabel: 'Extracting expense data...',
    detailsTitle: 'Expense Details',
    sendLabel: 'Send to Expense Form',
    storageKey: 'expensePdfImportData',
    navigateTo: '/expenses/new?source=pdf',
    numberLabel: 'Bill Number',
    dateLabel: 'Bill Date',
    primaryPartyLabel: 'Vendor Name',
  },
  income: {
    title: 'PDF Income Scanner',
    subtitle: 'Upload an invoice or receipt to prefill income',
    uploadText: 'Drag & drop an income PDF here',
    extractLabel: 'Extract Income Data',
    extractingLabel: 'Extracting income data...',
    detailsTitle: 'Income Details',
    sendLabel: 'Send to Income Form',
    storageKey: 'incomePdfImportData',
    navigateTo: '/incomes/new?source=pdf',
    numberLabel: 'Reference Number',
    dateLabel: 'Reference Date',
    primaryPartyLabel: 'Customer / Payer',
  },
  purchaseOrder: {
    title: 'PDF Purchase Order Scanner',
    subtitle: 'Upload a purchase order PDF to prefill the form',
    uploadText: 'Drag & drop a purchase order PDF here',
    extractLabel: 'Extract Purchase Order Data',
    extractingLabel: 'Extracting purchase order data...',
    detailsTitle: 'Purchase Order Details',
    sendLabel: 'Send to Purchase Order Form',
    storageKey: 'purchaseOrderPdfImportData',
    navigateTo: '/purchase-orders/new?source=pdf',
    numberLabel: 'Reference Number',
    dateLabel: 'Purchase Order Date',
    primaryPartyLabel: 'Vendor Name',
  },
};

const calculateItemTaxable = (item) => {
  const quantity = Number(item?.quantity) || 0;
  const price = Number(item?.price) || 0;
  const discount = Number(item?.discount) || 0;
  return quantity * price * (1 - discount / 100);
};

const calculateItemAmount = (item) => {
  const taxable = calculateItemTaxable(item);
  const gstRate = Number(item?.gst) || 0;
  return Number((taxable + (taxable * gstRate) / 100).toFixed(2));
};

const PdfInvoiceImporter = ({ isOpen, onClose, onImportSuccess, targetType = 'invoice' }) => {
  const navigate = useNavigate();
  const config = TARGET_CONFIG[targetType] || TARGET_CONFIG.invoice;
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [extractionSource, setExtractionSource] = useState(null);

  // ─── File Handling ──────────────────────────────────────
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setExtractedData(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    handleFileSelect(droppedFile);
  }, [targetType]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  // ─── Extraction ─────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setError(null);
    setExtractedData(null);

    try {
      console.log('Starting extraction for file:', file.name, file.type, file.size);
      const formData = new FormData();
      formData.append('pdf', file);

      // We use a dedicated axios instance to avoid global header interference (like Content-Type: application/json)
      // which can break FormData/Multer boundary detection.
      const uploadApi = await import('axios').then(m => m.default.create({
        baseURL: api.defaults.baseURL,
        headers: api.defaults.headers, // Inherit auth but we will override Content-Type
        withCredentials: true
      }));

      const requestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      };

      let response;
      let source = 'AI';
      const targetQuery = encodeURIComponent(targetType || 'invoice');

      try {
        response = await uploadApi.post(`/pdf/extract-ai?target=${targetQuery}`, formData, requestConfig);
      } catch (aiErr) {
        source = 'Standard';
        response = await uploadApi.post('/pdf/extract', formData, requestConfig);
        const fallbackMessage = aiErr.response?.data?.message || aiErr.message;
        if (fallbackMessage) {
          console.warn('AI invoice parser unavailable, used standard parser instead:', fallbackMessage);
        }
        if (response?.data) {
          response.data.warnings = [
            ...(response.data.warnings || []),
            `AI parser was unavailable or slow, so the standard parser was used instead.`,
          ];
        }
      }

      setExtractionSource(source);
      setExtractedData(response.data);
    } catch (err) {
      setExtractionSource(null);
      setError(err.response?.data?.message || err.message || 'Failed to extract invoice data.');
    } finally {
      setIsExtracting(false);
    }
  };

  // ─── Editable Field Handling ────────────────────────────
  const updateField = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setExtractedData(prev => {
      const items = [...prev.items];
      const nextItem = { ...items[index], [field]: value };
      nextItem.amount = calculateItemAmount(nextItem);
      items[index] = nextItem;
      return { ...prev, items };
    });
  };

  const removeItem = (index) => {
    setExtractedData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const addItem = () => {
    setExtractedData(prev => ({
      ...prev,
      items: [...(prev.items || []), { name: '', quantity: 1, unit: 'pcs', price: 0, gst: 0, discount: 0, amount: 0 }],
    }));
  };

  // ─── Save to Invoice Form ──────────────────────────────
  const handleSaveToForm = () => {
    if (!extractedData) return;
    const roundOff = Number(extractedData.roundOff) || 0;
    const items = (extractedData.items || []).map(item => ({
      name: item.name || '',
      description: '',
      unit: item.unit && item.unit !== '-' ? item.unit : 'pcs',
      qty: item.quantity || 1,
      rate: item.price || 0,
      taxRate: item.gst || 0,
      discount: item.discount || 0,
    }));

    const commonPayload = {
      documentNumber: extractedData.invoiceNumber || '',
      documentDate: extractedData.invoiceDate || '',
      dueDate: extractedData.dueDate || '',
      vendorName: extractedData.vendorName || '',
      vendorGST: extractedData.vendorGST || '',
      clientName: extractedData.clientName || '',
      clientGST: extractedData.clientGST || '',
      placeOfSupply: extractedData.placeOfSupply || '',
      paymentMethod: extractedData.paymentMode || '',
      paymentMode: extractedData.paymentMode || '',
      poNumber: extractedData.poNumber || '',
      poDate: extractedData.poDate || '',
      items,
      subTotal: extractedData.subTotal || 0,
      taxTotal: extractedData.taxAmount || 0,
      grandTotal: extractedData.totalAmount || 0,
      _fromPdfImport: true,
    };

    const payload = targetType === 'invoice'
      ? {
          ...commonPayload,
          invoiceNo: extractedData.invoiceNumber || '',
          invoiceDate: extractedData.invoiceDate || '',
          customChargeLabel: roundOff ? 'Round Off' : '',
          packagingCharges: roundOff,
        }
      : commonPayload;

    sessionStorage.setItem(config.storageKey, JSON.stringify(payload));
    onClose();
    if (onImportSuccess) onImportSuccess();
    navigate(config.navigateTo);
  };

  // ─── Reset ─────────────────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setError(null);
    setExtractionSource(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const statusCfg = extractedData ? STATUS_CONFIG[extractedData.status] || STATUS_CONFIG['rejected'] : null;
  const computedSubTotal = extractedData
    ? Number((extractedData.items || []).reduce((sum, item) => sum + calculateItemTaxable(item), 0).toFixed(2))
    : 0;
  const computedTaxAmount = extractedData
    ? Number((extractedData.items || []).reduce((sum, item) => sum + (calculateItemAmount(item) - calculateItemTaxable(item)), 0).toFixed(2))
    : 0;
  const computedGrandTotal = extractedData
    ? Number((computedSubTotal + computedTaxAmount + (Number(extractedData.roundOff) || 0)).toFixed(2))
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <FaFilePdf className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{config.title}</h2>
              <p className="text-xs text-gray-500">{config.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload Zone */}
          {!extractedData && (
            <div className="space-y-4">
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
                  ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : file ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files?.[0])}
                />

                {file ? (
                  <div className="space-y-2">
                    <FaFilePdf className="mx-auto text-red-500" size={48} />
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="text-xs text-red-500 hover:text-red-700 underline mt-2"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FaCloudUploadAlt className="mx-auto text-gray-400" size={48} />
                    <p className="text-base font-medium text-gray-700">
                      {isDragging ? 'Drop your PDF here...' : config.uploadText}
                    </p>
                    <p className="text-xs text-gray-400">or click to browse • Max 10MB</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <FaTimesCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {file && (
                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isExtracting ? (
                    <>
                      <FaSpinner className="animate-spin" size={18} />
                      {config.extractingLabel}
                    </>
                  ) : (
                    <>
                      <FaFilePdf size={18} />
                      {config.extractLabel}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Extracted Data Preview */}
          {extractedData && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                ${extractedData.status === 'auto-approved' ? 'bg-emerald-50 border-emerald-200' :
                  extractedData.status === 'needs-review' ? 'bg-amber-50 border-amber-200' :
                  extractedData.status === 'low-confidence' ? 'bg-orange-50 border-orange-200' :
                  'bg-red-50 border-red-200'}`}
              >
                {statusCfg && <statusCfg.icon className={`text-${statusCfg.color}-600 flex-shrink-0`} size={22} />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{statusCfg?.label}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {extractionSource || (extractedData.metadata?.parsedWithAI ? 'AI' : 'Standard')} parser
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${extractedData.confidence >= 90 ? 'bg-emerald-200 text-emerald-800' :
                        extractedData.confidence >= 75 ? 'bg-amber-200 text-amber-800' :
                        extractedData.confidence >= 50 ? 'bg-orange-200 text-orange-800' :
                        'bg-red-200 text-red-800'}`}
                    >{extractedData.confidence}% confidence</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{statusCfg?.desc}</p>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  {extractedData.metadata?.processingTime}
                  <br />
                  {extractedData.metadata?.totalLines} lines parsed
                </div>
              </div>

              {/* Warnings & Errors */}
              {extractedData.warnings?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                  {extractedData.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <FaExclamationTriangle className="mt-0.5 flex-shrink-0" size={14} />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
              {extractedData.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
                  {extractedData.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                      <FaTimesCircle className="mt-0.5 flex-shrink-0" size={14} />
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FaEdit size={14} /> {config.detailsTitle}
                  <span className="text-xs font-normal text-gray-400">(click any field to edit)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <EditableField label={config.numberLabel} value={extractedData.invoiceNumber} onChange={v => updateField('invoiceNumber', v)} />
                  <EditableField label={config.dateLabel} value={extractedData.invoiceDate} onChange={v => updateField('invoiceDate', v)} type="date" />
                  <EditableField label="Due Date" value={extractedData.dueDate} onChange={v => updateField('dueDate', v)} type="date" />
                  {targetType === 'income' && (
                    <EditableField label="Vendor / Issuer" value={extractedData.vendorName} onChange={v => updateField('vendorName', v)} />
                  )}
                  <EditableField
                    label={config.primaryPartyLabel}
                    value={targetType === 'expense' || targetType === 'purchaseOrder' ? extractedData.vendorName : extractedData.clientName}
                    onChange={v => updateField(targetType === 'expense' || targetType === 'purchaseOrder' ? 'vendorName' : 'clientName', v)}
                  />
                  {targetType === 'expense' && (
                    <EditableField label="Client / Buyer" value={extractedData.clientName} onChange={v => updateField('clientName', v)} />
                  )}
                  <EditableField label="Client GSTIN" value={extractedData.clientGST} onChange={v => updateField('clientGST', v)} />
                  <EditableField label="Place of Supply" value={extractedData.placeOfSupply} onChange={v => updateField('placeOfSupply', v)} />
                  <EditableField label="Payment Mode" value={extractedData.paymentMode} onChange={v => updateField('paymentMode', v)} />
                  {targetType === 'invoice' && (
                    <>
                      <EditableField label="P.O. Number" value={extractedData.poNumber} onChange={v => updateField('poNumber', v)} />
                      <EditableField label="P.O. Date" value={extractedData.poDate} onChange={v => updateField('poDate', v)} type="date" />
                    </>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <FaInfoCircle size={14} /> Line Items ({extractedData.items?.length || 0})
                  </h3>
                  <button onClick={addItem} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 font-semibold flex items-center gap-1 transition-colors">
                    <FaPlus size={10} /> Add Item
                  </button>
                </div>

                {extractedData.items?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 text-xs font-bold uppercase">
                          <th className="px-3 py-2 text-left rounded-l-lg">#</th>
                          <th className="px-3 py-2 text-left">Item / Description</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Rate</th>
                          <th className="px-3 py-2 text-right">GST %</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-center rounded-r-lg">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {extractedData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/80 transition-colors">
                            <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.name || ''}
                                onChange={e => updateItem(idx, 'name', e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 text-sm px-0 py-0.5 outline-none transition-colors"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.quantity || ''}
                                onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 text-sm text-right px-0 py-0.5 outline-none transition-colors"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.price || ''}
                                onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                className="w-24 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 text-sm text-right px-0 py-0.5 outline-none transition-colors"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.gst || ''}
                                onChange={e => updateItem(idx, 'gst', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 text-sm text-right px-0 py-0.5 outline-none transition-colors"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">
                              ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors" title="Remove item">
                                <FaTrash size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No items extracted. Add items manually or try another PDF.</p>
                )}
              </div>

              {/* Totals Summary */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Financial Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                    <p className="text-xs text-gray-400 mb-1">Subtotal</p>
                    <p className="font-bold text-gray-900">₹{computedSubTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                    <p className="text-xs text-gray-400 mb-1">Tax</p>
                    <p className="font-bold text-gray-900">₹{computedTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                    <p className="text-xs text-blue-500 mb-1">Grand Total</p>
                    <p className="font-bold text-blue-900 text-lg">₹{computedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          {extractedData ? (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Scan Another
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToForm}
                  disabled={extractedData.status === 'rejected' && (extractedData.items || []).length === 0}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaCheckCircle size={16} />
                  {config.sendLabel}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Reusable Editable Field ────────────────────────────────────────────────

const EditableField = ({ label, value, onChange, type = 'text' }) => {
  const displayValue = value === null || value === undefined ? '' : value;
  const isEmpty = !displayValue;

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-2.5 hover:border-blue-200 transition-colors group">
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={displayValue}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className={`w-full bg-transparent border-0 text-sm font-medium px-0 py-0 outline-none focus:ring-0 transition-colors
          ${isEmpty ? 'text-red-400 italic placeholder:text-red-300' : 'text-gray-900 placeholder:text-gray-300'}`}
      />
    </div>
  );
};

export default PdfInvoiceImporter;
