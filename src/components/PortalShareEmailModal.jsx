import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import {
  FaEnvelope, FaPaperPlane, FaTimes, FaCopy, FaCheck,
  FaExternalLinkAlt, FaServer, FaInfoCircle, FaCheckCircle
} from 'react-icons/fa';

export default function PortalShareEmailModal({
  isOpen,
  onClose,
  portalLink,
  companyName = 'Our Company',
  allowedCategories = [],
}) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [smtpConfigId, setSmtpConfigId] = useState('');
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [loadingSmtp, setLoadingSmtp] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load SMTP configs whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setRecipientEmail('');
    setCustomSubject(`Document Upload Request: ${companyName || 'Our Company'}`);
    setCustomMessage('');
    setErrorMsg('');
    setSuccessMsg('');
    setSending(false);

    loadSmtpSettings();
  }, [isOpen, companyName]);

  const loadSmtpSettings = async () => {
    setLoadingSmtp(true);
    try {
      const res = await api.get('/settings');
      const sData = res.data;
      const configs = [];

      if (Array.isArray(sData?.smtpConfigs) && sData.smtpConfigs.length > 0) {
        configs.push(...sData.smtpConfigs);
      } else if (sData?.smtp?.host) {
        configs.push({
          _id: 'default',
          title: 'Default SMTP Server',
          host: sData.smtp.host,
          port: sData.smtp.port || 587,
          secure: Boolean(sData.smtp.secure),
          fromEmail: sData.smtp.fromEmail || sData.smtp.auth?.user || sData.email || '',
          fromName: sData.smtp.fromName || sData.companyName || '',
          replyTo: sData.smtp.replyTo || '',
          isDefault: true,
        });
      }

      setSmtpConfigs(configs);

      // Select default SMTP configuration
      const defaultSmtp =
        configs.find((c) => c.isDefault && c.enabled !== false) ||
        configs.find((c) => c.enabled !== false) ||
        configs.find((c) => c.isDefault) ||
        configs[0];

      if (defaultSmtp) {
        setSmtpConfigId(defaultSmtp._id ? String(defaultSmtp._id) : defaultSmtp.title);
      }
    } catch (err) {
      console.warn('Failed to load SMTP settings for email modal:', err);
    } finally {
      setLoadingSmtp(false);
    }
  };

  const selectedSmtp = useMemo(() => {
    if (!smtpConfigId || smtpConfigId === 'system') return null;
    return (
      smtpConfigs.find(
        (c) => (c._id && String(c._id) === String(smtpConfigId)) || c.title === smtpConfigId
      ) || null
    );
  }, [smtpConfigs, smtpConfigId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!portalLink) return;
    navigator.clipboard.writeText(portalLink);
    setCopied(true);
    toast.success('Portal link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!recipientEmail || !recipientEmail.trim()) {
      setErrorMsg('Please enter a recipient email address.');
      return;
    }

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/settings/public-submissions/send-email', {
        recipientEmail: recipientEmail.trim(),
        customSubject: customSubject.trim(),
        customMessage: customMessage.trim(),
        smtpConfigId,
        portalLink,
      });

      const msg = res.data.message || `Portal link successfully emailed to ${recipientEmail.trim()}`;
      setSuccessMsg(msg);
      toast.success(msg);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send portal email. Please verify SMTP settings.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center text-lg">
              <FaEnvelope />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Share Submission Portal via Email
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send a direct upload link to vendors, clients, or partners.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Portal Information Card */}
          <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                {companyName || 'Public Submission Portal'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-teal-200/70 dark:border-teal-800/60 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate flex-1 select-all">
                {portalLink}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 cursor-pointer shrink-0"
              >
                {copied ? <FaCheck size={11} className="text-emerald-500" /> : <FaCopy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={portalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer shrink-0"
                title="Preview portal link"
              >
                <FaExternalLinkAlt size={10} />
              </a>
            </div>
          </div>

          {/* Error / Success Feedback */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <FaInfoCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <FaCheckCircle size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Send From (SMTP Server Account) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FaServer size={11} className="text-teal-600 dark:text-teal-400" />
                <span>Send From (Sender Account)</span>
              </label>
              <button
                type="button"
                onClick={() => window.open('/settings', '_blank')}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>Configure SMTP</span>
                <FaExternalLinkAlt size={9} />
              </button>
            </div>

            {smtpConfigs && smtpConfigs.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={smtpConfigId}
                  onChange={(e) => setSmtpConfigId(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 cursor-pointer transition-colors"
                >
                  {smtpConfigs.map((cfg, idx) => {
                    const idVal = cfg._id ? String(cfg._id) : (cfg.title || String(idx));
                    const fromAddr = cfg.fromEmail || cfg.auth?.user || cfg.user || 'no-reply';
                    const defaultTag = cfg.isDefault ? ' [Default]' : '';
                    const disabledTag = cfg.enabled === false ? ' (Disabled)' : '';
                    return (
                      <option key={cfg._id || idx} value={idVal}>
                        {cfg.title || 'SMTP Relay'} — {fromAddr}{defaultTag}{disabledTag}
                      </option>
                    );
                  })}
                  <option value="system">System Default Mailer (Server Environment)</option>
                </select>

                {/* Selected Sender Info pill */}
                {selectedSmtp && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="truncate">
                      <strong>Host:</strong> {selectedSmtp.host}:{selectedSmtp.port}
                    </span>
                    <span className="truncate text-teal-600 dark:text-teal-400 font-semibold ml-2">
                      {selectedSmtp.fromEmail || selectedSmtp.auth?.user}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                {loadingSmtp ? 'Loading mail configurations...' : 'No custom SMTP configured. System default mailer will be used.'}
              </div>
            )}
          </div>

          {/* Recipient Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. vendor@company.com, billing@client.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Custom Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Document Upload Request..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Personal Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Note / Message <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Hi, please upload your invoices and receipts for this month here..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !recipientEmail}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
          >
            <FaPaperPlane size={11} className={sending ? 'animate-bounce' : ''} />
            <span>{sending ? 'Sending...' : 'Send Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
