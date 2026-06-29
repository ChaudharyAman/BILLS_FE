/**
 * PublicSubmitPage.jsx
 *
 * Standalone public page — NO auth required, NO sidebar, NO app shell.
 * Accessed via /submit/:token by anyone with the shareable link.
 *
 * Mobile-first design: assumes many submitters are on a phone camera-uploading
 * a photographed receipt.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FaCloudUploadAlt, FaFilePdf, FaImage, FaTimes, FaCheckCircle,
  FaExclamationCircle, FaSpinner, FaBuilding, FaPhone, FaEnvelope,
  FaUser, FaStickyNote, FaTag,
} from 'react-icons/fa';

// ── Bare axios (no auth interceptors) ────────────────────────────────────────
const apiUrl = import.meta.env.VITE_API_URL;
const baseURL = import.meta.env.DEV
  ? '/api'
  : (apiUrl ? `${apiUrl}/api` : '/api');

const publicApi = axios.create({ baseURL });

// ── Helpers ───────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  invoice:       'Invoice',
  expense:       'Expense / Bill',
  income:        'Income / Receipt',
  purchaseorder: 'Purchase Order',
};

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE  = 10 * 1024 * 1024; // 10 MB
const MAX_FILES      = 5;

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(file) {
  if (file.type === 'application/pdf') return <FaFilePdf className="text-red-500" />;
  return <FaImage className="text-blue-500" />;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicSubmitPage() {
  const { token } = useParams();

  // Portal info state
  const [portalInfo, setPortalInfo]  = useState(null);
  const [portalError, setPortalError] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(true);

  // Form state
  const [files, setFiles]               = useState([]);
  const [submitterName, setSubmitterName]   = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');
  const [submitterNote, setSubmitterNote]   = useState('');
  const [category, setCategory]             = useState('');
  const [isDragging, setIsDragging]         = useState(false);

  // Submission state
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitError, setSubmitError]   = useState('');
  const [fileErrors, setFileErrors]     = useState([]);

  const fileInputRef = useRef(null);

  // ── Load portal info ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setPortalError('Invalid link — no token found.');
      setLoadingPortal(false);
      return;
    }

    publicApi.get(`/public/submit/${token}`)
      .then((res) => {
        setPortalInfo(res.data);
        // Default category selection
        const cats = res.data.allowedCategories || [];
        if (cats.length === 1) setCategory(cats[0]);
        else if (cats.includes('expense')) setCategory('expense');
        else if (cats.length > 0) setCategory(cats[0]);
      })
      .catch((err) => {
        if (err.response?.status === 404 || err.response?.status === 410) {
          setPortalError('This submission link is no longer active.');
        } else {
          setPortalError('Unable to load this page. Please try again later.');
        }
      })
      .finally(() => setLoadingPortal(false));
  }, [token]);

  // ── File handling ──────────────────────────────────────────────────────────
  const validateAndAddFiles = useCallback((incoming) => {
    const errors = [];
    const valid  = [];

    for (const f of incoming) {
      if (files.length + valid.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed.`);
        break;
      }
      const ext = f.name.split('.').pop().toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
        errors.push(`"${f.name}" — only PDF, JPG, PNG files are accepted.`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`"${f.name}" exceeds the 10 MB size limit (${formatBytes(f.size)}).`);
        continue;
      }
      valid.push(f);
    }

    setFileErrors(errors);
    setFiles((prev) => [...prev, ...valid]);
  }, [files]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndAddFiles(Array.from(e.dataTransfer.files));
  }, [validateAndAddFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()  => setIsDragging(false);

  const handleFileInput = (e) => {
    validateAndAddFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setFileErrors([]);

    if (files.length === 0) {
      setFileErrors(['Please attach at least one file before submitting.']);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      if (submitterName)  formData.append('submitterName',  submitterName);
      if (submitterEmail) formData.append('submitterEmail', submitterEmail);
      if (submitterPhone) formData.append('submitterPhone', submitterPhone);
      if (submitterNote)  formData.append('submitterNote',  submitterNote);
      if (category)       formData.append('category', category);

      const res = await publicApi.post(`/public/submit/${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setReferenceNumber(res.data.referenceNumber || '');
      setSubmitted(true);
    } catch (err) {
      const status  = err.response?.status;
      const message = err.response?.data?.message || 'An error occurred. Please try again.';

      if (status === 429) {
        setSubmitError('Too many submissions. Please wait a moment and try again.');
      } else if (status === 404) {
        setSubmitError('This link is no longer active.');
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loadingPortal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (portalError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationCircle className="text-3xl text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Link Unavailable</h1>
          <p className="text-slate-500 text-sm">{portalError}</p>
          <p className="text-slate-400 text-xs mt-4">
            If you believe this is an error, please contact the company directly.
          </p>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <FaCheckCircle className="text-4xl text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Submitted!</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your documents have been received by{' '}
            <span className="font-medium text-slate-700">{portalInfo?.companyDisplayName}</span>.
          </p>
          {referenceNumber && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-1">
                Your Reference Number
              </p>
              <p className="text-2xl font-mono font-bold text-indigo-700">{referenceNumber}</p>
              <p className="text-xs text-slate-400 mt-2">
                Please save this number in case you need to follow up.
              </p>
            </div>
          )}
          <button
            onClick={() => {
              setSubmitted(false);
              setFiles([]);
              setSubmitterName('');
              setSubmitterEmail('');
              setSubmitterPhone('');
              setSubmitterNote('');
              setSubmitError('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline mt-2"
          >
            Submit another document
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  const allowedCats = portalInfo?.allowedCategories || [];
  const showCategoryPicker = allowedCats.length > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-6 text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
          <FaBuilding className="text-indigo-600 text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {portalInfo?.companyDisplayName || 'Submit Documents'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload your invoices, bills, or receipts securely.
        </p>
        {portalInfo?.instructionsText && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left">
            <p className="text-amber-800 text-sm whitespace-pre-line">{portalInfo.instructionsText}</p>
          </div>
        )}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── File Dropzone ─────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Documents <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${isDragging
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }
                ${files.length >= MAX_FILES ? 'pointer-events-none opacity-50' : ''}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => files.length < MAX_FILES && fileInputRef.current?.click()}
            >
              <FaCloudUploadAlt className="text-3xl text-indigo-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isDragging ? 'Drop files here' : 'Tap to upload or drag & drop'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG — up to 10 MB each, max {MAX_FILES} files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <span className="text-lg flex-shrink-0">{fileIcon(f)}</span>
                    <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{f.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-red-500 flex-shrink-0 p-1"
                      aria-label="Remove file"
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* File errors */}
            {fileErrors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {fileErrors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-red-600 text-xs">
                    <FaExclamationCircle className="mt-0.5 flex-shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Category Picker (only if > 1 option) ──────────── */}
          {showCategoryPicker && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <FaTag className="inline mr-1 text-slate-400" />
                Document Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allowedCats.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all text-left
                      ${category === cat
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Optional submitter fields ──────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Your Details (optional)
            </p>
            <div className="space-y-3">
              <div className="relative">
                <FaUser className="absolute left-3 top-3 text-slate-300 text-sm" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  maxLength={200}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-3 text-slate-300 text-sm" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  maxLength={200}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <FaPhone className="absolute left-3 top-3 text-slate-300 text-sm" />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={submitterPhone}
                  onChange={(e) => setSubmitterPhone(e.target.value)}
                  maxLength={50}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <FaStickyNote className="absolute left-3 top-3 text-slate-300 text-sm" />
                <textarea
                  placeholder="Any notes for the recipient (optional)"
                  value={submitterNote}
                  onChange={(e) => setSubmitterNote(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* ── Submit error ───────────────────────────────────── */}
          {submitError && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
              <FaExclamationCircle className="mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* ── Submit button ──────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting || files.length === 0}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
              ${submitting || files.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-[0.98]'
              }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <FaSpinner className="animate-spin" />
                Uploading & processing…
              </span>
            ) : (
              `Submit Document${files.length > 1 ? 's' : ''}`
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            Your files are processed securely. No account required.
          </p>
        </form>
      </div>
    </div>
  );
}
