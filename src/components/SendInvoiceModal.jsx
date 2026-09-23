import React, { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (mimeType = '', filename = '') => {
  const lower = (filename || '').toLowerCase();
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(lower)) {
    return <LucideIcons.Image size={15} className="text-amber-500 shrink-0" />;
  }
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    return <LucideIcons.FileText size={15} className="text-rose-500 shrink-0" />;
  }
  return <LucideIcons.Paperclip size={15} className="text-teal-500 shrink-0" />;
};

const SendInvoiceModal = ({ isOpen, onClose, invoice, settings, template = 'classic', onEmailSent }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachInvoiceFiles, setAttachInvoiceFiles] = useState(true);
  const [invoiceAttachments, setInvoiceAttachments] = useState([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState([]);
  const [extraAttachments, setExtraAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);
  const companyName = settings?.companyName || 'Flance';

  useEffect(() => {
    if (invoice) {
      const clientEmail = invoice.client?.email || invoice.clientEmail || '';
      setRecipientEmail(clientEmail);
      setSubject(`Invoice ${invoice.invoiceNo || ''} from ${companyName}`);
      setMessage(
        `Hi ${invoice.client?.name || invoice.clientName || 'there'},\n\nPlease find attached invoice #${invoice.invoiceNo || ''}. Let us know if you have any questions.\n\nBest regards,\n${companyName}`
      );
      setAttachPdf(true);
      setAttachInvoiceFiles(true);
      setExtraAttachments([]);
      setCcEmail('');
      setShowCc(false);
      setErrorMessage('');

      // If attachments are already present on the invoice object
      if (Array.isArray(invoice.attachments) && invoice.attachments.length > 0) {
        setInvoiceAttachments(invoice.attachments);
        setSelectedAttachmentIds(invoice.attachments.map((a) => String(a._id || a.id)));
      } else if (invoice._id) {
        // Fetch invoice details to ensure internal attachments are loaded
        api.get(`/invoices/${invoice._id}`)
          .then((res) => {
            const inv = res.data?.data || res.data;
            if (inv?.attachments && Array.isArray(inv.attachments)) {
              setInvoiceAttachments(inv.attachments);
              setSelectedAttachmentIds(inv.attachments.map((a) => String(a._id || a.id)));
            }
          })
          .catch((err) => {
            console.warn('[SendInvoiceModal] Could not fetch invoice attachment details:', err.message);
          });
      }
    }
  }, [invoice, companyName]);

  if (!isOpen || !invoice) return null;

  const toggleAttachment = (id) => {
    const idStr = String(id);
    setSelectedAttachmentIds((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );
  };

  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > 12 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 12MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setExtraAttachments((prev) => [
          ...prev,
          {
            id: 'extra_' + Math.random().toString(36).substring(2, 9),
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            content: reader.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeExtraAttachment = (id) => {
    setExtraAttachments((prev) => prev.filter((x) => x.id !== id));
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!recipientEmail.trim()) {
      toast.error('Please provide a recipient email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        recipientEmail: recipientEmail.trim(),
        cc: ccEmail.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        attachPdf,
        attachInvoiceFiles,
        selectedAttachmentIds,
        extraAttachments: extraAttachments.map(({ filename, contentType, content }) => ({
          filename,
          contentType,
          content,
        })),
        template: template || 'classic',
      };

      const res = await api.post(`/invoices/${invoice._id}/send-email`, payload);
      toast.success(res.data?.message || 'Invoice sent successfully!');
      if (onEmailSent) {
        onEmailSent(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Error sending invoice email:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to send invoice email.';
      setErrorMessage(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const activeSmtpHost = settings?.smtp?.host || 'smtp.gmail.com';
  const isCustomSmtp = settings?.smtp?.enabled !== false;
  const isAuthError = /535|5\.7\.8|app password|authentication failed|invalid login/i.test(errorMessage);

  const totalFilesToSend =
    (attachPdf ? 1 : 0) +
    (attachInvoiceFiles ? selectedAttachmentIds.length : 0) +
    extraAttachments.length;

  const inputCls =
    'w-full bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-all';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[92vh] flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl border border-white/80 dark:border-white/10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)] text-slate-900 dark:text-slate-100 transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Fixed Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/15 via-white/80 to-white/40 dark:from-teal-500/20 dark:via-slate-800/80 dark:to-slate-800/40 backdrop-blur-xl text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 dark:border-white/10 shadow-[0_4px_16px_rgba(20,184,166,0.15),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] shrink-0">
              <LucideIcons.Mail size={19} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Send Invoice via Email
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Direct delivery</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Using {activeSmtpHost}
                </span>
              </p>
            </div>
          </div>

          {/* High-Contrast Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all border border-slate-300/70 dark:border-white/15 cursor-pointer shadow-xs shrink-0"
            title="Close"
          >
            <LucideIcons.X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
            {/* Invoice Summary Chip */}
            <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/70 dark:border-white/10 flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/20">
                  #{invoice.invoiceNo}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans truncate max-w-[200px]">
                  {invoice.client?.name || invoice.clientName || 'Client'}
                </span>
              </div>
              <div className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                ₹{(Number(invoice.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Error Alert Box */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-rose-500/5 dark:from-rose-950/40 dark:via-amber-950/20 dark:to-rose-950/30 border border-rose-500/20 dark:border-rose-400/20 backdrop-blur-xl shadow-[0_8px_24px_rgba(244,63,94,0.08)] space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-semibold border border-rose-500/20">
                    <LucideIcons.AlertCircle size={13} className="shrink-0" />
                    <span>{isAuthError ? 'Authentication Required (535)' : 'Mail Delivery Failed'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {isAuthError ? (
                  <div className="text-xs space-y-2.5 text-slate-700 dark:text-slate-200 leading-relaxed">
                    <p className="font-medium text-rose-800 dark:text-rose-200">
                      Google rejected the connection. Gmail requires a 16-character <strong>App Password</strong> rather than your regular login password.
                    </p>
                    <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-rose-200/60 dark:border-white/10 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1">
                        <span>⚡ Quick Setup in Google:</span>
                      </div>
                      <div>1. Go to <strong>Google Account → Security</strong> &amp; turn ON 2-Step Verification</div>
                      <div>2. Search for <strong>App passwords</strong> and create one for &quot;Mail&quot;</div>
                      <div>3. Copy the 16 characters and save it under <strong>Settings → SMTP Server</strong></div>
                    </div>
                    <div className="pt-1">
                      <a
                        href="/settings?tab=smtp"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-all"
                      >
                        <span>Configure SMTP in Settings</span>
                        <LucideIcons.ArrowUpRight size={13} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-800 dark:text-rose-200 font-medium leading-relaxed">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}

            {/* Recipient Email */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@company.com"
                required
                className={inputCls}
              />
            </div>

            {/* CC Toggle */}
            {!showCc ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium cursor-pointer transition-colors"
                >
                  <LucideIcons.Plus size={13} />
                  <span>Add CC Recipient</span>
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    CC Email (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowCc(false); setCcEmail(''); }}
                    className="text-[11px] text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                  >
                    Remove CC
                  </button>
                </div>
                <input
                  type="email"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  placeholder="accounts@yourcompany.com"
                  className={inputCls}
                />
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                Personal Message / Note (Optional)
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a custom note to your client..."
                className="w-full min-h-[120px] bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-all leading-relaxed resize-y"
              />
            </div>

            {/* ATTACHMENTS SECTION */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/10 backdrop-blur-md space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <LucideIcons.Paperclip size={15} className="text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Attachments &amp; Documents
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  {totalFilesToSend} file{totalFilesToSend === 1 ? '' : 's'} included
                </span>
              </div>

              {/* 1. Official PDF Document Toggle */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs hover:border-teal-500/30 transition-all">
                <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                  <input
                    type="checkbox"
                    checked={attachPdf}
                    onChange={(e) => setAttachPdf(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 shrink-0"
                  />
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                      <LucideIcons.FileText size={15} />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>Attach Official PDF Document</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20 uppercase">
                          PDF
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {invoice.invoiceNo || 'Invoice'}.pdf • Official GST layout
                      </div>
                    </div>
                  </div>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                  Auto Generated
                </span>
              </div>

              {/* 2. Files Stored Inside Invoice */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={attachInvoiceFiles}
                      onChange={(e) => setAttachInvoiceFiles(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                    />
                    <span>Attached files inside this invoice ({invoiceAttachments.length})</span>
                  </label>
                  {invoiceAttachments.length > 0 && attachInvoiceFiles && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAttachmentIds.length === invoiceAttachments.length) {
                          setSelectedAttachmentIds([]);
                        } else {
                          setSelectedAttachmentIds(invoiceAttachments.map((a) => String(a._id || a.id)));
                        }
                      }}
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      {selectedAttachmentIds.length === invoiceAttachments.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {invoiceAttachments.length > 0 ? (
                  <div className={`space-y-1.5 ${!attachInvoiceFiles ? 'opacity-50 pointer-events-none' : ''}`}>
                    {invoiceAttachments.map((att, idx) => {
                      const idStr = String(att._id || att.id || idx);
                      const isChecked = selectedAttachmentIds.includes(idStr);
                      return (
                        <div
                          key={idStr}
                          onClick={() => attachInvoiceFiles && toggleAttachment(idStr)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-white dark:bg-slate-900/80 border-teal-500/40 shadow-xs'
                              : 'bg-white/40 dark:bg-slate-900/30 border-slate-200/50 dark:border-white/5 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAttachment(idStr)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 shrink-0"
                            />
                            {getFileIcon(att.mimeType, att.originalName)}
                            <span 
                              className="font-medium text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0 pr-2"
                              title={att.originalName}
                            >
                              {att.originalName || 'Invoice Attachment'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {att.sizeBytes && (
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                {formatFileSize(att.sizeBytes)}
                              </span>
                            )}
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                              Inside Invoice
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-white/10 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    No files currently stored inside this invoice.
                  </div>
                )}
              </div>

              {/* 3. Extra On-the-Fly Uploads */}
              <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Additional Attachments
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 cursor-pointer transition-colors"
                  >
                    <LucideIcons.Upload size={12} />
                    <span>+ Upload File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAddFiles}
                  />
                </div>

                {extraAttachments.length > 0 && (
                  <div className="space-y-1.5">
                    {extraAttachments.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-teal-500/30 flex items-center justify-between gap-2 text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getFileIcon(item.contentType, item.filename)}
                          <span 
                            className="font-medium text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0 pr-2"
                            title={item.filename}
                          >
                            {item.filename}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {formatFileSize(item.sizeBytes)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExtraAttachment(item.id)}
                            className="w-5 h-5 rounded-md hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove attachment"
                          >
                            <LucideIcons.X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SMTP Status Footer Note */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Delivering via <strong>{activeSmtpHost}</strong> (Port {settings?.smtp?.port || 587})</span>
              </div>
              <a
                href="/settings?tab=smtp"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline"
              >
                <span>SMTP Settings</span>
                <LucideIcons.ArrowUpRight size={11} />
              </a>
            </div>
          </div>

          {/* Sticky Fixed Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalFilesToSend}</span> attachment{totalFilesToSend === 1 ? '' : 's'} ready
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5 font-medium text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold text-xs shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.45)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Invoice...</span>
                  </>
                ) : (
                  <>
                    <LucideIcons.Send size={14} />
                    <span>Send Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendInvoiceModal;
