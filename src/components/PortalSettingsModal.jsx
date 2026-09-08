import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import {
  FaLink, FaCopy, FaSync, FaInfoCircle, FaSave,
  FaExternalLinkAlt, FaCheck, FaTimes, FaShieldAlt,
} from 'react-icons/fa';
import Modal from './Modal';

const inputCls = 'w-full border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 p-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors';

export default function PortalSettingsModal({ isOpen, onClose, onSaved }) {
  const [config, setConfig] = useState({
    enabled: false,
    portalLink: null,
    token: null,
    companyDisplayName: '',
    allowedCategories: ['invoice', 'expense', 'income', 'purchaseorder'],
    instructionsText: '',
    maxSubmissionsPerDay: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.get('/settings/public-submissions')
      .then((res) => {
        setConfig(res.data);
      })
      .catch(() => {
        toast.error('Failed to load portal settings');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const shareableLink = config.token
    ? `${window.location.origin}/submit/${config.token}`
    : config.portalLink;

  const handleCopy = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    toast.success('Portal link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/settings/public-submissions', {
        enabled: config.enabled,
        companyDisplayName: config.companyDisplayName,
        allowedCategories: config.allowedCategories,
        instructionsText: config.instructionsText,
        maxSubmissionsPerDay: config.maxSubmissionsPerDay,
      });
      setConfig(res.data);
      toast.success('Portal settings updated successfully');
      if (onSaved) onSaved(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure you want to regenerate the submission link? The current link will stop working immediately.')) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await api.post('/settings/public-submissions/regenerate-token');
      setConfig(res.data);
      toast.success('New submission link generated');
      if (onSaved) onSaved(res.data);
    } catch {
      toast.error('Failed to regenerate token');
    } finally {
      setRegenerating(false);
    }
  };

  const toggleCategory = (cat) => {
    setConfig((prev) => {
      const exists = prev.allowedCategories.includes(cat);
      const updated = exists
        ? prev.allowedCategories.filter((c) => c !== cat)
        : [...prev.allowedCategories, cat];
      return { ...prev, allowedCategories: updated };
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Public Submission Portal Settings"
    >
      {loading ? (
        <div className="space-y-4 py-6 animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Allow vendors, clients, and partners to securely upload invoices, bills, and receipts directly to your inbox without logging in.
            </p>
          </div>

          {/* Toggle Enable */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                Enable Submission Link
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Toggle public submissions on or off.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                ${config.enabled ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {config.enabled && (
            <>
              {/* Shareable Link Input */}
              <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Your Shareable Submission Link
                  </span>
                  {shareableLink && (
                    <a
                      href={shareableLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                    >
                      <span>Open Link</span>
                      <FaExternalLinkAlt size={10} />
                    </a>
                  )}
                </div>

                {shareableLink ? (
                  <div className="flex gap-2.5 items-center flex-wrap sm:flex-nowrap">
                    <div className="relative flex-1 flex items-center min-w-[200px]">
                      <input
                        type="text"
                        readOnly
                        value={shareableLink}
                        onClick={(e) => e.target.select()}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-22 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 truncate select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="absolute right-1 px-3 py-1 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {copied ? <FaCheck size={11} className="text-emerald-200" /> : <FaCopy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap flex-shrink-0"
                    >
                      <FaSync className={regenerating ? 'animate-spin' : ''} /> Regenerate Link
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-teal-700 dark:text-teal-400">Save the settings first to generate your link.</p>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                  <FaInfoCircle className="mt-0.5 flex-shrink-0 text-amber-500" />
                  Regenerating the link immediately invalidates the old one.
                </p>
              </div>

              {/* Config Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Display Name
                  </label>
                  <input
                    type="text"
                    value={config.companyDisplayName || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, companyDisplayName: e.target.value }))}
                    placeholder="e.g. Acme Corp Inc."
                    required
                    maxLength={200}
                    className={inputCls}
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    This name is visible to public uploaders on the portal landing page.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Submissions per Day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={config.maxSubmissionsPerDay || 100}
                    onChange={(e) => setConfig((prev) => ({ ...prev, maxSubmissionsPerDay: Math.max(1, parseInt(e.target.value, 10) || 0) }))}
                    required
                    className={inputCls}
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Daily submission limit to guard against system abuse.
                  </p>
                </div>
              </div>

              {/* Allowed Categories checkboxes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Allowed Document Categories
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'invoice', label: 'Invoice' },
                    { id: 'expense', label: 'Expense / Bill' },
                    { id: 'income', label: 'Income / Receipt' },
                    { id: 'purchaseorder', label: 'Purchase Order' },
                  ].map((cat) => {
                    const checked = config.allowedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`border-2 rounded-xl p-2.5 text-sm font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1.5
                          ${checked
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
                          }`}
                      >
                        {checked && <FaCheck size={11} className="text-teal-600 dark:text-teal-400" />}
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                {config.allowedCategories.length === 0 && (
                  <p className="text-red-500 text-xs mt-1">Please select at least one document category.</p>
                )}
              </div>

              {/* Instructions Text */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instructions for Submitters (Optional)
                </label>
                <textarea
                  value={config.instructionsText || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, instructionsText: e.target.value }))}
                  placeholder="e.g. Please upload clear scans of your invoices and ensure the GSTIN is visible."
                  rows={3}
                  maxLength={2000}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 p-2.5 text-sm resize-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Provide clear guidelines that will show at the top of the upload form.
                </p>
              </div>
            </>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (config.enabled && config.allowedCategories.length === 0)}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-all hover:shadow cursor-pointer"
            >
              {saving ? <FaSync className="animate-spin" /> : <FaSave />} Save Portal Settings
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
