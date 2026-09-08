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
  FaUser, FaStickyNote, FaTag, FaLock, FaShieldAlt,
  FaClock, FaExclamationTriangle, FaTimesCircle, FaRedo, FaListUl,
  FaPlus, FaChevronRight, FaFileAlt, FaHistory, FaCheck, FaCopy,
} from 'react-icons/fa';
import GoogleSignInButton from '../components/GoogleSignInButton';

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

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: 'amber',
    icon: FaClock,
    badgeCls: 'bg-amber-100 text-amber-800 border-amber-200',
    desc: 'Under review by company personnel',
  },
  approved: {
    label: 'Approved',
    color: 'emerald',
    icon: FaCheckCircle,
    badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'Approved & added to company records',
  },
  'needs-changes': {
    label: 'Needs Changes',
    color: 'orange',
    icon: FaExclamationTriangle,
    badgeCls: 'bg-orange-100 text-orange-800 border-orange-200',
    desc: 'Reviewer requested adjustments',
  },
  rejected: {
    label: 'Rejected',
    color: 'rose',
    icon: FaTimesCircle,
    badgeCls: 'bg-rose-100 text-rose-800 border-rose-200',
    desc: 'Submission was declined',
  },
};

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtAmount(val) {
  if (val == null || isNaN(val)) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
}

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';
const MAX_FILE_SIZE  = 10 * 1024 * 1024; // 10 MB per file
const MAX_TOTAL_SIZE = 14 * 1024 * 1024; // 14 MB total per submission
const MAX_FILES      = 5;

function formatBytes(bytes) {
  if (!bytes)             return '0 B';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(file) {
  const type = file?.type || file?.mimeType || '';
  const name = file?.name || file?.originalName || '';
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
    return <FaFilePdf className="text-red-500" />;
  }
  return <FaImage className="text-blue-500" />;
}

function parseJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse Google JWT payload', err);
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PublicSubmitPage() {
  const { token } = useParams();

  // Portal info state
  const [portalInfo, setPortalInfo]  = useState(null);
  const [portalError, setPortalError] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(true);

  // Submitter Google auth state
  const [googleUser, setGoogleUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('flance_submitter_google');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authError, setAuthError] = useState('');

  // Active tab ('upload' | 'history')
  const [activeTab, setActiveTab] = useState('upload');

  // Submissions history state
  const [mySubmissions, setMySubmissions]         = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError]   = useState('');
  const [statusFilter, setStatusFilter]           = useState('all');
  const [copiedRef, setCopiedRef]                 = useState('');

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

  // Synchronize Google user info into submitter details
  useEffect(() => {
    if (googleUser) {
      if (googleUser.name && !submitterName) {
        setSubmitterName(googleUser.name);
      }
      if (googleUser.email && !submitterEmail) {
        setSubmitterEmail(googleUser.email);
      }
    }
  }, [googleUser]);

  // Fetch previous submissions for this Google user on this portal
  const fetchMySubmissions = useCallback(async () => {
    if (!token || !googleUser?.email) return;
    setLoadingSubmissions(true);
    setSubmissionsError('');
    try {
      const res = await publicApi.get(`/public/submit/${token}/my-submissions`, {
        params: { email: googleUser.email },
        headers: googleUser.credential
          ? { 'x-google-credential': googleUser.credential }
          : {},
      });
      setMySubmissions(res.data?.submissions || []);
    } catch (err) {
      console.error('Failed to fetch past submissions:', err);
      setSubmissionsError(
        err.response?.data?.message || 'Could not load your previous submissions.'
      );
    } finally {
      setLoadingSubmissions(false);
    }
  }, [token, googleUser]);

  useEffect(() => {
    if (googleUser?.email && token) {
      fetchMySubmissions();
    }
  }, [fetchMySubmissions, googleUser?.email, token]);

  const handleGoogleSuccess = (credential) => {
    setAuthError('');
    const payload = parseJwtPayload(credential);
    if (!payload || !payload.email) {
      setAuthError('Unable to retrieve verified account details from Google. Please try again.');
      return;
    }

    const userObj = {
      name: payload.name || '',
      email: (payload.email || '').toLowerCase().trim(),
      picture: payload.picture || '',
      credential,
    };

    try {
      sessionStorage.setItem('flance_submitter_google', JSON.stringify(userObj));
    } catch {}

    setGoogleUser(userObj);
    setSubmitterName(userObj.name);
    setSubmitterEmail(userObj.email);
  };

  const handleGoogleError = (err) => {
    setAuthError(typeof err === 'string' ? err : 'Google Sign-In was cancelled or encountered an issue.');
  };

  const handleSignOut = () => {
    try {
      sessionStorage.removeItem('flance_submitter_google');
    } catch {}
    setGoogleUser(null);
    setSubmitterName('');
    setSubmitterEmail('');
    setMySubmissions([]);
    setActiveTab('upload');
  };

  const handleCopyRef = (refNum) => {
    if (!refNum) return;
    navigator.clipboard.writeText(refNum).then(() => {
      setCopiedRef(refNum);
      setTimeout(() => setCopiedRef(''), 2500);
    });
  };

  const handleResubmitCategory = (cat) => {
    if (cat) setCategory(cat);
    setActiveTab('upload');
  };

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
    let currentTotalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

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
        errors.push(`"${f.name}" exceeds the 10 MB single file limit (${formatBytes(f.size)}).`);
        continue;
      }
      if (currentTotalSize + f.size > MAX_TOTAL_SIZE) {
        errors.push(`Adding "${f.name}" exceeds the 14 MB total submission limit.`);
        continue;
      }
      currentTotalSize += f.size;
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
      if (googleUser?.credential) formData.append('googleCredential', googleUser.credential);

      const res = await publicApi.post(`/public/submit/${token}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setReferenceNumber(res.data.referenceNumber || '');
      setSubmitted(true);
      // Refresh submissions in background so history tab is immediately up to date
      fetchMySubmissions();
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
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
            <FaCheckCircle className="text-4xl text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your documents have been received by{' '}
            <span className="font-semibold text-slate-700">{portalInfo?.companyDisplayName}</span>.
          </p>
          {referenceNumber && (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[11px] text-indigo-600 font-semibold uppercase tracking-wider mb-1">
                Your Reference Number
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold text-indigo-700 tracking-wide">
                  {referenceNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyRef(referenceNumber)}
                  className="flex items-center gap-1.5 text-xs text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-xs font-semibold transition-all active:scale-95"
                  title="Copy reference number"
                >
                  {copiedRef === referenceNumber ? (
                    <>
                      <FaCheck className="text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <FaCopy />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Save this reference number to easily track your submission status.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                setSubmitted(false);
                setActiveTab('history');
                fetchMySubmissions();
              }}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <FaHistory size={14} />
              <span>View in My Submissions</span>
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setActiveTab('upload');
                setFiles([]);
                if (googleUser) {
                  setSubmitterName(googleUser.name || '');
                  setSubmitterEmail(googleUser.email || '');
                } else {
                  setSubmitterName('');
                  setSubmitterEmail('');
                }
                setSubmitterPhone('');
                setSubmitterNote('');
                setSubmitError('');
              }}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all flex items-center justify-center gap-1.5"
            >
              <FaPlus size={12} />
              <span>Submit Another Document</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitter Google Authentication Gate ──────────────────────────────────
  // Per user requirement: this page only opens after login with google or sign in with google only
  if (!googleUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center py-10 px-4 font-sans">
        {/* Header */}
        <div className="w-full max-w-md mb-6 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-500/10">
            <FaBuilding className="text-indigo-600 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {portalInfo?.companyDisplayName || 'Submit Documents'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload your invoices, bills, or receipts securely.
          </p>
          {portalInfo?.instructionsText && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                <span>Instructions for Submitters</span>
              </div>
              <p className="text-amber-800 text-xs whitespace-pre-line leading-relaxed">
                {portalInfo.instructionsText}
              </p>
            </div>
          )}
        </div>

        {/* Login Gate Card */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
            <FaLock size={20} />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Sign In to Upload
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
            Please sign in with Google to access this upload portal and submit documents to{' '}
            <span className="font-semibold text-slate-700">{portalInfo?.companyDisplayName}</span>.
          </p>

          {authError && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left flex items-start gap-2">
              <FaExclamationCircle className="text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              theme="outline"
              size="large"
              shape="rectangular"
              width={320}
            />
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <FaShieldAlt className="text-emerald-500 text-xs" />
            <span>Google verified submitter identity • TLS Encrypted</span>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400 font-medium select-none">
          © 2026 Flance. All rights reserved.
        </p>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  const allowedCats = portalInfo?.allowedCategories || [];
  const showCategoryPicker = allowedCats.length > 1;

  // Status counts for filter pills
  const statusCounts = mySubmissions.reduce(
    (acc, s) => {
      acc.all = (acc.all || 0) + 1;
      const st = s.status || 'pending';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { all: 0, pending: 0, approved: 0, 'needs-changes': 0, rejected: 0 }
  );

  const filteredSubmissions = mySubmissions.filter((sub) => {
    if (statusFilter === 'all') return true;
    return sub.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center py-8 px-4 font-sans">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6 text-center">
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
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        {/* Verified Google Account Bar */}
        <div className="bg-slate-50/90 border-b border-slate-100 px-5 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {googleUser.picture ? (
              <img
                src={googleUser.picture}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {googleUser.name?.[0] || 'G'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {googleUser.name || 'Verified User'}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  <FaCheckCircle size={9} /> Google Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{googleUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex-shrink-0 ml-2"
          >
            Switch account
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/50 px-4 sm:px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FaCloudUploadAlt size={16} />
            <span>Upload Document</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              if (mySubmissions.length === 0) fetchMySubmissions();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FaHistory size={13} />
            <span>My Submissions</span>
            {mySubmissions.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'history'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {mySubmissions.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' ? (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
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

            {/* ── Submitter fields ──────────────────────────────── */}
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
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-slate-50/50"
                  />
                  <div className="absolute right-3 top-3 text-emerald-500" title="Verified Google Email">
                    <FaCheckCircle size={14} />
                  </div>
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
              Authenticated via Google ({googleUser?.email}) • Your files are processed securely.
            </p>

            {/* Previous submissions indicator */}
            {mySubmissions.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FaHistory className="text-indigo-500" />
                  <span>
                    You have <strong>{mySubmissions.length}</strong> previous submission{mySubmissions.length > 1 ? 's' : ''}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1"
                >
                  View status & history <FaChevronRight size={10} />
                </button>
              </div>
            )}
          </form>
        ) : (
          /* ── My Submissions History View ─────────────────────────────── */
          <div className="p-5 sm:p-6 space-y-4">
            {/* Header & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Submission History
                </h3>
                <p className="text-xs text-slate-500">
                  Track the status and company review notes for documents you've uploaded.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={fetchMySubmissions}
                  disabled={loadingSubmissions}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 transition-all"
                  title="Refresh submissions"
                >
                  <FaRedo className={`text-xs ${loadingSubmissions ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all"
                >
                  <FaPlus size={11} />
                  <span>New Upload</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { id: 'all', label: 'All', count: statusCounts.all },
                { id: 'pending', label: 'Pending', count: statusCounts.pending },
                { id: 'needs-changes', label: 'Needs Changes', count: statusCounts['needs-changes'] },
                { id: 'approved', label: 'Approved', count: statusCounts.approved },
                { id: 'rejected', label: 'Rejected', count: statusCounts.rejected },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === pill.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      statusFilter === pill.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Error state */}
            {submissionsError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaExclamationCircle className="text-rose-500 flex-shrink-0" />
                  <span>{submissionsError}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchMySubmissions}
                  className="font-semibold text-rose-800 underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading state */}
            {loadingSubmissions && mySubmissions.length === 0 && (
              <div className="py-12 text-center">
                <FaSpinner className="animate-spin text-2xl text-indigo-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading your submissions…</p>
              </div>
            )}

            {/* Empty state */}
            {!loadingSubmissions && filteredSubmissions.length === 0 && (
              <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                  <FaListUl size={20} />
                </div>
                <h4 className="text-sm font-semibold text-slate-700">
                  {statusFilter === 'all'
                    ? 'No Submissions Yet'
                    : `No ${STATUS_CONFIG[statusFilter]?.label || statusFilter} Submissions`}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {statusFilter === 'all'
                    ? 'Documents you upload to this portal will appear here with live review statuses and reviewer feedback.'
                    : `You don't have any submissions marked as ${STATUS_CONFIG[statusFilter]?.label || statusFilter}.`}
                </p>
                {statusFilter === 'all' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
                  >
                    <FaCloudUploadAlt size={14} />
                    <span>Upload Your First Document</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}

            {/* Submissions List */}
            {filteredSubmissions.length > 0 && (
              <div className="space-y-3.5">
                {filteredSubmissions.map((sub) => {
                  const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <div
                      key={sub._id}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                        sub.status === 'needs-changes'
                          ? 'border-orange-200/90 bg-orange-50/20'
                          : sub.status === 'rejected'
                          ? 'border-rose-200/90 bg-rose-50/20'
                          : sub.status === 'approved'
                          ? 'border-emerald-200/90 bg-emerald-50/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Top Row: Reference + Status Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            {sub.referenceNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(sub.referenceNumber)}
                            className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
                            title="Copy reference number"
                          >
                            {copiedRef === sub.referenceNumber ? (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                <FaCheck size={9} /> Copied
                              </span>
                            ) : (
                              <FaCopy size={12} />
                            )}
                          </button>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeCls}`}
                        >
                          <StatusIcon size={12} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </div>

                      {/* Meta Details: Category, Date, Amount, Invoice Number */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        {sub.category && (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <FaTag size={10} className="text-slate-400" />
                            <span>{CATEGORY_LABELS[sub.category] || sub.category}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                          <FaClock size={10} />
                          <span>{fmtDateTime(sub.createdAt)}</span>
                        </span>
                        {sub.invoiceNumber && (
                          <span className="font-medium text-slate-600">
                            Inv #{sub.invoiceNumber}
                          </span>
                        )}
                        {sub.amount != null && (
                          <span className="font-bold text-slate-700">
                            {fmtAmount(sub.amount)}
                          </span>
                        )}
                      </div>

                      {/* Submitter note if present */}
                      {sub.submitterNote && (
                        <div className="mt-3 p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100 flex items-start gap-2">
                          <FaStickyNote className="text-slate-400 mt-0.5 flex-shrink-0" size={11} />
                          <span className="italic">"{sub.submitterNote}"</span>
                        </div>
                      )}

                      {/* Uploaded Files */}
                      {sub.files && sub.files.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Uploaded Document{sub.files.length > 1 ? 's' : ''} ({sub.files.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {sub.files.map((file, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 max-w-full"
                              >
                                <span className="flex-shrink-0">{fileIcon(file)}</span>
                                <span className="truncate max-w-[180px] sm:max-w-[240px] font-medium">
                                  {file.originalName}
                                </span>
                                {file.sizeBytes ? (
                                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                                    {formatBytes(file.sizeBytes)}
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status feedback alerts */}
                      {sub.status === 'needs-changes' && (
                        <div className="mt-4 p-3.5 bg-orange-50 border border-orange-200 rounded-xl text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-orange-900 mb-1">
                            <FaExclamationTriangle className="text-orange-600" />
                            <span>Reviewer Feedback — Action Required</span>
                          </div>
                          <p className="text-orange-800 leading-relaxed pl-5">
                            {sub.reviewerNote || 'The company reviewer requested adjustments. Please review notes and re-upload your document.'}
                          </p>
                          <div className="mt-2.5 pl-5">
                            <button
                              type="button"
                              onClick={() => handleResubmitCategory(sub.category)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800 hover:text-orange-950 bg-orange-100 hover:bg-orange-200/80 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <FaCloudUploadAlt size={13} />
                              <span>Upload Corrected Document</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {sub.status === 'rejected' && (
                        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1">
                            <FaTimesCircle className="text-rose-600" />
                            <span>Submission Declined</span>
                          </div>
                          <p className="text-rose-800 leading-relaxed pl-5">
                            {sub.reviewerNote || 'This document submission was declined by the reviewer.'}
                          </p>
                        </div>
                      )}

                      {sub.status === 'approved' && (
                        <div className="mt-4 p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-xl text-xs text-emerald-900">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <FaCheckCircle className="text-emerald-600" />
                            <span>Approved & added to company records</span>
                          </div>
                          {sub.reviewerNote && (
                            <p className="mt-1 text-emerald-800 pl-5">
                              Note: "{sub.reviewerNote}"
                            </p>
                          )}
                        </div>
                      )}

                      {sub.status === 'pending' && (
                        <div className="mt-3 py-2 px-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                          <FaClock className="text-amber-500 flex-shrink-0" size={11} />
                          <span>Under review. Reviewer feedback and status changes will appear here once processed.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
