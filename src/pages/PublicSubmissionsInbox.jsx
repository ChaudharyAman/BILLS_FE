/**
 * PublicSubmissionsInbox.jsx
 *
 * Authenticated review dashboard for the business owner.
 * Scoped entirely to the logged-in user (backend enforces this).
 *
 * Features:
 *   - Status tab bar (pending / needs-changes / approved / rejected) with badge
 *   - List view with submitter, category, date
 *   - Detail drawer: parsedData fields, file preview links, action buttons
 *   - Approve → pick final category → POST /approve → redirect to created record
 *   - Reject / Request Changes with note
 *   - Inline parsedData edit via PATCH before approving
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  FaInbox, FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
  FaClock, FaChevronRight, FaFileInvoice, FaReceipt,
  FaFilePdf, FaImage, FaExternalLinkAlt, FaSpinner,
  FaChevronLeft, FaEdit, FaCheck, FaTimes, FaArrowRight,
  FaBolt, FaTrash, FaLayerGroup,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  invoice:       'Invoice',
  expense:       'Expense / Bill',
  income:        'Income / Receipt',
  purchaseorder: 'Purchase Order',
  unknown:       'Unknown',
};

const STATUS_CONFIG = {
  pending:        { label: 'Pending',        color: 'amber',  icon: FaClock           },
  approved:       { label: 'Approved',       color: 'emerald', icon: FaCheckCircle     },
  rejected:       { label: 'Rejected',       color: 'red',    icon: FaTimesCircle      },
  'needs-changes':{ label: 'Needs Changes',  color: 'orange', icon: FaExclamationTriangle },
};

const RESULT_ROUTES = {
  expenses:       '/expenses/edit',
  invoices:       '/invoices/edit',
  incomes:        '/incomes/edit',
  purchaseorders: '/purchase-orders/edit',
};

const TABS = ['pending', 'needs-changes', 'approved', 'rejected'];

// ── Formatting helpers ────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'slate' };
  const colorMap = {
    amber:   'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    red:     'bg-red-100 dark:bg-rose-950/60 text-red-700 dark:text-rose-300 border-red-200 dark:border-rose-800',
    orange:  'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    slate:   'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${colorMap[cfg.color] || colorMap.slate}`}>
      {cfg.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PublicSubmissionsInbox() {
  const navigate = useNavigate();

  // List state
  const [activeTab, setActiveTab] = useState('pending');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const LIMIT = 20;

  // Detail pane state
  const [selected, setSelected]   = useState(null);   // full submission object
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Edit state
  const [editMode, setEditMode]   = useState(false);
  const [editData, setEditData]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [parsingFile, setParsingFile] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNote, setActionNote]       = useState('');
  const [approveCategory, setApproveCategory] = useState('');
  const [showApprovePanel, setShowApprovePanel] = useState(false);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: activeTab, page, limit: LIMIT };
      const res = await api.get('/submissions', { params });
      setSubmissions(res.data.data || []);
      setTotal(res.data.total || 0);
      if (res.data.pendingCount !== null && res.data.pendingCount !== undefined) {
        setPendingCount(res.data.pendingCount);
      }
    } catch (err) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { setPage(1); setSelected(null); }, [activeTab]);

  // ── Fetch detail ───────────────────────────────────────────────────────────
  const openDetail = async (sub) => {
    setSelected(null);
    setActiveFileIndex(0);
    setEditMode(false);
    setActionNote('');
    setShowApprovePanel(false);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/submissions/${sub._id}`);
      setSelected(res.data);
      const initialParsed = res.data.files?.[0]?.parsedData || res.data.parsedData || {};
      setEditData(initialParsed);
      setApproveCategory(res.data.suggestedCategory !== 'unknown' ? res.data.suggestedCategory : 'expense');
    } catch {
      toast.error('Failed to load submission detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectFileTab = (idx) => {
    setActiveFileIndex(idx);
    setEditMode(false);
    const targetParsed = selected?.files?.[idx]?.parsedData || (idx === 0 ? selected?.parsedData : {}) || {};
    setEditData(targetParsed);
  };

  // ── Save edited parsed data ────────────────────────────────────────────────
  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/submissions/${selected._id}`, {
        fileIndex: activeFileIndex,
        parsedData: editData,
      });
      setSelected(res.data.data);
      const updatedParsed = res.data.data.files?.[activeFileIndex]?.parsedData || (activeFileIndex === 0 ? res.data.data.parsedData : {}) || {};
      setEditData(updatedParsed);
      setEditMode(false);
      toast.success('Changes saved');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (approveMode = 'single') => {
    setActionLoading(true);
    try {
      const payload = {
        category: approveCategory,
      };
      if (approveMode === 'single' && (selected.files || []).length > 1) {
        payload.fileIndex = activeFileIndex;
      } else if (approveMode === 'all-individual') {
        payload.mode = 'all-individual';
      }

      const res = await api.post(`/submissions/${selected._id}/approve`, payload);
      toast.success(res.data.message || 'Approved successfully!');

      if (res.data.data) {
        setSelected(res.data.data);
      }
      fetchList();

      if (approveMode === 'single' && (selected.files || []).length > 1 && !res.data.allApproved) {
        const nextPending = (res.data.data?.files || []).findIndex(f => f.status !== 'approved');
        if (nextPending !== -1) {
          selectFileTab(nextPending);
        }
      } else {
        const { collection, recordId } = res.data.resultingRecord || {};
        const routeBase = RESULT_ROUTES[collection];
        if (routeBase && recordId && (selected.files || []).length <= 1) {
          navigate(`${routeBase}/${recordId}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
      setShowApprovePanel(false);
    }
  };

  // ── Reject / Request Changes ───────────────────────────────────────────────
  const handleDecision = async (endpoint, successMsg) => {
    setActionLoading(true);
    try {
      await api.post(`/submissions/${selected._id}/${endpoint}`, {
        reason: actionNote,
        note:   actionNote,
      });
      toast.success(successMsg);
      fetchList();
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── File View (authenticated blob URL) ──────────────────────────────────
  const handleViewFile = async (submissionId, fileIndex) => {
    // Open new tab synchronously to avoid browser popup blockers
    const newTab = window.open('', '_blank');
    try {
      const response = await api.get(`/submissions/${submissionId}/files/${fileIndex}`, {
        responseType: 'blob',
      });
      const mime = response.headers['content-type'] || 'application/pdf';
      const blob = new Blob([response.data], { type: mime });
      const blobUrl = window.URL.createObjectURL(blob);
      if (newTab) {
        newTab.location.href = blobUrl;
      } else {
        window.open(blobUrl, '_blank');
      }
    } catch (err) {
      if (newTab) newTab.close();
      toast.error('Failed to view file');
    }
  };

  // ── On-demand file extraction ────────────────────────────────────────────
  const handleParseFile = async (fileIndex) => {
    setParsingFile(true);
    try {
      const res = await api.post(`/submissions/${selected._id}/files/${fileIndex}/parse`);
      toast.success('Extracted data successfully!');
      if (res.data.submission) {
        setSelected(res.data.submission);
        setEditData(res.data.parsedData || {});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to extract data');
    } finally {
      setParsingFile(false);
    }
  };

  // ── Remove single file from multi-file submission ────────────────────────
  const handleRemoveFile = async (fileIndex) => {
    if (!selected) return;
    if (!window.confirm('Are you sure you want to remove this file from this submission?')) return;

    try {
      const res = await api.delete(`/submissions/${selected._id}/files/${fileIndex}`);
      toast.success('File removed');
      setSelected(res.data.data);
      if (activeFileIndex >= (res.data.data?.files?.length || 1)) {
        setActiveFileIndex(0);
      }
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove file');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-screen font-sans text-slate-900 dark:text-slate-100 bg-gray-50 dark:bg-slate-950 transition-colors">

      {/* ── List panel ─────────────────────────────────────────────────────── */}
      <div className={`flex flex-col w-full ${selected ? 'hidden lg:flex lg:w-2/5 xl:w-1/3' : 'flex'} border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors`}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <FaInbox className="text-indigo-600 dark:text-indigo-400 text-xl" />
            <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100">Submissions Inbox</h1>
            {pendingCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            {TABS.map((tab) => {
              const cfg = STATUS_CONFIG[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer
                    ${activeTab === tab
                      ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                >
                  {cfg.label}
                  {tab === 'pending' && pendingCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/60">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <FaSpinner className="animate-spin text-2xl text-indigo-400" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-6">
              <FaInbox className="text-3xl text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">No {activeTab} submissions</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">
                {activeTab === 'pending' ? 'New submissions will appear here.' : 'None to show.'}
              </p>
            </div>
          ) : (
            submissions.map((sub) => (
              <button
                key={sub._id}
                onClick={() => openDetail(sub)}
                className={`w-full text-left px-5 py-4 hover:bg-indigo-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer
                  ${selected?._id === sub._id ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-2 border-indigo-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                      {sub.submitterName || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {CATEGORY_LABELS[sub.suggestedCategory] || '—'}
                      {' · '}
                      {fmtDate(sub.createdAt)}
                    </p>
                    {sub.parsedData?.invoiceNumber && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        #{sub.parsedData.invoiceNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={sub.status} />
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {sub.files?.length || 0} file{(sub.files?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="disabled:opacity-40 flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
            >
              <FaChevronLeft /> Prev
            </button>
            <span>{page} / {Math.ceil(total / LIMIT)}</span>
            <button
              disabled={page >= Math.ceil(total / LIMIT)}
              onClick={() => setPage((p) => p + 1)}
              className="disabled:opacity-40 flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
            >
              Next <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* ── Detail panel ──────────────────────────────────────────────────── */}
      {(selected || loadingDetail) ? (
        <div className={`flex flex-col w-full lg:flex-1 bg-white dark:bg-slate-900 overflow-y-auto transition-colors`}>

          {/* Detail header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              className="lg:hidden flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
            >
              <FaChevronLeft /> Back
            </button>
            <div className="flex-1 min-w-0">
              {selected && (
                <>
                  <h2 className="font-bold text-gray-800 dark:text-slate-100 truncate">
                    {selected.submitterName || 'Anonymous'}&nbsp;
                    <span className="font-normal text-gray-400 dark:text-slate-500 text-sm">
                      (SUB-{selected._id.slice(-8).toUpperCase()})
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {fmtDate(selected.createdAt)}
                    {selected.submitterEmail && ` · ${selected.submitterEmail}`}
                  </p>
                </>
              )}
            </div>
            {selected && (
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Close details"
                  aria-label="Close details"
                >
                  <FaTimes className="text-base" />
                </button>
              </div>
            )}
          </div>

          {/* File Tabs for multi-file submissions in a single open menu */}
          {selected && (selected.files || []).length > 1 && (
            <div className="flex-shrink-0 bg-slate-100/90 dark:bg-slate-950/70 border-b border-gray-200 dark:border-slate-800 px-5 py-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 mr-2 flex-shrink-0">
                  <FaLayerGroup className="text-indigo-500" /> Files ({selected.files.length}):
                </span>
                {selected.files.map((file, idx) => {
                  const isApproved = file.status === 'approved';
                  const isActive = activeFileIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectFileTab(idx)}
                      className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <FaFilePdf className={isActive ? 'text-white' : isApproved ? 'text-emerald-500' : 'text-red-500'} />
                      <span className="max-w-[150px] truncate">{file.originalName}</span>
                      {isApproved ? (
                        <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-full">✓ Approved</span>
                      ) : (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-indigo-700 text-white' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          Pending
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <FaSpinner className="animate-spin text-3xl text-indigo-400" />
            </div>
          ) : selected && (() => {
            const currentFile = (selected.files || [])[activeFileIndex] || (selected.files || [])[0];
            const currentParsed = currentFile?.parsedData || (activeFileIndex === 0 ? selected.parsedData : {}) || {};
            const isCurrentFileApproved = currentFile?.status === 'approved';

            return (
            <div className="flex-1 p-5 space-y-5">

              {/* ── Submitter info ─────────────────────────────── */}
              <section className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-1.5 text-sm text-slate-800 dark:text-slate-200">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Submitter</h3>
                {selected.submitterName  && <p><span className="text-gray-500 dark:text-slate-400">Name:</span>  {selected.submitterName}</p>}
                {selected.submitterEmail && <p><span className="text-gray-500 dark:text-slate-400">Email:</span> {selected.submitterEmail}</p>}
                {selected.submitterPhone && <p><span className="text-gray-500 dark:text-slate-400">Phone:</span> {selected.submitterPhone}</p>}
                {selected.submitterNote  && <p><span className="text-gray-500 dark:text-slate-400">Note:</span>  <em>{selected.submitterNote}</em></p>}
                {!selected.submitterName && !selected.submitterEmail && !selected.submitterPhone && (
                  <p className="text-gray-400 dark:text-slate-500 italic">No submitter details provided</p>
                )}
              </section>

              {/* ── Active File Card ────────────────────────────── */}
              <section className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl text-red-500 flex-shrink-0">
                    {currentFile?.mimeType === 'application/pdf' ? <FaFilePdf /> : <FaImage />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{currentFile?.originalName}</p>
                      {isCurrentFileApproved && (
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex-shrink-0">
                          Approved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {currentFile?.sizeBytes ? `${Math.round(currentFile.sizeBytes / 1024)} KB` : ''}
                      </p>
                      {(selected.files || []).length > 1 && (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-0.5 shadow-sm">
                          <button
                            type="button"
                            disabled={activeFileIndex <= 0}
                            onClick={() => selectFileTab(activeFileIndex - 1)}
                            className="text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 disabled:opacity-20 cursor-pointer p-0.5"
                            title="Previous file"
                          >
                            <FaChevronLeft size={9} />
                          </button>
                          <span className="text-[11px] font-bold text-gray-700 dark:text-slate-200 px-1 select-none">
                            File {activeFileIndex + 1} of {selected.files.length}
                          </span>
                          <button
                            type="button"
                            disabled={activeFileIndex >= selected.files.length - 1}
                            onClick={() => selectFileTab(activeFileIndex + 1)}
                            className="text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 disabled:opacity-20 cursor-pointer p-0.5"
                            title="Next file"
                          >
                            <FaChevronRight size={9} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewFile(selected._id, activeFileIndex)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    View File <FaExternalLinkAlt size={10} />
                  </button>
                  {selected.status === 'pending' && (selected.files || []).length > 1 && !isCurrentFileApproved && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(activeFileIndex)}
                      className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Remove this file from submission"
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              </section>

              {/* ── Active File Resulting Record Link ─────────────── */}
              {isCurrentFileApproved && currentFile?.resultingRecord?.recordId && (
                <section>
                  <button
                    type="button"
                    onClick={() => {
                      const base = RESULT_ROUTES[currentFile.resultingRecord.collection];
                      if (base) navigate(`${base}/${currentFile.resultingRecord.recordId}`);
                    }}
                    className="w-full flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <FaCheckCircle />
                      View created {CATEGORY_LABELS[currentFile.resultingRecord.collection] || 'record'} for this file
                    </span>
                    <FaArrowRight />
                  </button>
                </section>
              )}

              {/* ── Parsed Data ────────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    Extracted Data {(selected.files || []).length > 1 ? `(File ${activeFileIndex + 1})` : ''}
                  </h3>
                  {!isCurrentFileApproved && (selected.status === 'pending' || selected.status === 'needs-changes') && !editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer font-medium"
                    >
                      <FaEdit /> Edit
                    </button>
                  )}
                  {editMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 cursor-pointer font-medium"
                      >
                        {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />} Save
                      </button>
                      <button
                        onClick={() => { setEditMode(false); setEditData(currentParsed); }}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 cursor-pointer"
                      >
                        <FaTimes /> Cancel
                      </button>
                    </div>
                  )}
                </div>

                {!isCurrentFileApproved && !currentFile?.parsedData && activeFileIndex > 0 && (
                  <div className="mb-3 p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
                    <div className="text-xs text-indigo-900 dark:text-indigo-200">
                      <span className="font-bold block flex items-center gap-1.5"><FaBolt className="text-amber-500" /> Data not yet extracted for File {activeFileIndex + 1}</span>
                      Extract invoice number, date, and totals with AI or fill them manually.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleParseFile(activeFileIndex)}
                      disabled={parsingFile}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 shadow-sm transition-all cursor-pointer"
                    >
                      {parsingFile ? <FaSpinner className="animate-spin" /> : <FaBolt />} Extract Data
                    </button>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-3 text-sm">
                  {[
                    { key: 'invoiceNumber', label: 'Number' },
                    { key: 'invoiceDate',   label: 'Date', type: 'date' },
                    { key: 'dueDate',       label: 'Due Date', type: 'date' },
                    { key: 'vendorName',    label: 'Vendor' },
                    { key: 'clientName',    label: 'Client' },
                    { key: 'subTotal',      label: 'Sub Total', type: 'number' },
                    { key: 'taxAmount',     label: 'Tax', type: 'number' },
                    { key: 'totalAmount',   label: 'Grand Total', type: 'number' },
                    { key: 'paymentMode',   label: 'Payment Mode' },
                  ].map(({ key, label, type }) => (
                    <div key={key} className="flex items-baseline gap-3">
                      <span className="text-gray-500 dark:text-slate-400 w-28 flex-shrink-0 text-xs">{label}</span>
                      {editMode ? (
                        <input
                          type={type || 'text'}
                          value={editData[key] ?? ''}
                          onChange={(e) => setEditData((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="flex-1 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      ) : (
                        <span className={`flex-1 text-gray-800 dark:text-slate-200 ${!currentParsed[key] ? 'text-gray-300 dark:text-slate-600 italic' : ''}`}>
                          {currentParsed[key] || '—'}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Confidence badge */}
                  {currentParsed.confidence !== undefined && (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-slate-700 mt-2">
                      <span className="text-gray-500 dark:text-slate-400 text-xs">Parse confidence</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${currentParsed.confidence >= 70 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' :
                          currentParsed.confidence >= 40 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' :
                          'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'}`}
                      >
                        {currentParsed.confidence}%
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Reviewer note (read-only for decided submissions) ─── */}
              {(selected.status === 'rejected' || selected.status === 'approved') && selected.reviewerNote && (
                <section className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 text-sm">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Internal Note</h3>
                  <p className="text-gray-600 dark:text-slate-300 italic">{selected.reviewerNote}</p>
                </section>
              )}

              {/* ── Action buttons ─── */}
              {(!isCurrentFileApproved || selected.status === 'pending' || selected.status === 'needs-changes') && (
                <section className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">

                  {/* Approve flow */}
                  {!showApprovePanel ? (
                    <button
                      onClick={() => setShowApprovePanel(true)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <FaCheckCircle /> Approve {(selected.files || []).length > 1 ? `File ${activeFileIndex + 1}` : 'Submission'}
                    </button>
                  ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Approve as:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['invoice', 'expense', 'income', 'purchaseorder'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setApproveCategory(cat)}
                            className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all cursor-pointer
                              ${approveCategory === cat
                                ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                              }`}
                          >
                            {CATEGORY_LABELS[cat]}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2 pt-1">
                        {/* 1. Approve active file */}
                        <button
                          onClick={() => handleApprove('single')}
                          disabled={actionLoading || isCurrentFileApproved}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold cursor-pointer shadow-sm transition-all"
                        >
                          {actionLoading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                          {(selected.files || []).length > 1
                            ? `Approve File ${activeFileIndex + 1} (${currentFile?.originalName}) as ${CATEGORY_LABELS[approveCategory]}`
                            : `Confirm Approve as ${CATEGORY_LABELS[approveCategory]}`}
                        </button>

                        {/* 2. Approve all files as separate records (if multiple) */}
                        {(selected.files || []).length > 1 && (
                          <button
                            onClick={() => handleApprove('all-individual')}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-xs font-semibold cursor-pointer shadow-sm transition-all"
                          >
                            <FaBolt /> Approve All ({selected.files.length}) as Separate {CATEGORY_LABELS[approveCategory]} Records
                          </button>
                        )}

                        {/* 3. Consolidate all files into 1 record (if multiple) */}
                        {(selected.files || []).length > 1 && (
                          <button
                            onClick={() => handleApprove('consolidate')}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg py-1.5 text-xs font-medium cursor-pointer transition-all"
                          >
                            Approve All as 1 Consolidated Record
                          </button>
                        )}

                        <button
                          onClick={() => setShowApprovePanel(false)}
                          className="w-full py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Request changes */}
                  <div className="space-y-2">
                    <textarea
                      placeholder="Internal note (for reject / request changes)…"
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision('request-changes', 'Marked as needs changes')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-orange-400 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-xl py-2.5 text-sm font-medium cursor-pointer"
                      >
                        {actionLoading ? <FaSpinner className="animate-spin" /> : <FaExclamationTriangle />}
                        Request Changes
                      </button>
                      <button
                        onClick={() => handleDecision('reject', 'Submission rejected')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl py-2.5 text-sm font-medium cursor-pointer"
                      >
                        {actionLoading ? <FaSpinner className="animate-spin" /> : <FaTimesCircle />}
                        Reject
                      </button>
                    </div>
                  </div>
                </section>
              )}

            </div>
            );
          })()}
        </div>
      ) : (
        /* ── Empty detail state for desktop ────────────────────────────── */
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
          <div className="text-center">
            <FaInbox className="text-5xl text-gray-200 dark:text-slate-800 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-slate-500 text-sm">Select a submission to review</p>
          </div>
        </div>
      )}
    </div>
  );
}
