import React, { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const CATEGORIES = [
  { id: 'All', label: 'All Documents', icon: LucideIcons.Folder, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  { id: 'Registration & Legal', label: 'Registration & Legal', icon: LucideIcons.Building2, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  { id: 'Tax & GST', label: 'Tax & GST', icon: LucideIcons.Receipt, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  { id: 'Banking & Finance', label: 'Banking & Finance', icon: LucideIcons.Landmark, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
  { id: 'Licenses & Compliance', label: 'Licenses & Compliance', icon: LucideIcons.ShieldCheck, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
  { id: 'Brand & Letterheads', label: 'Brand & Letterheads', icon: LucideIcons.Palette, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30' },
  { id: 'Contracts & Policies', label: 'Contracts & Policies', icon: LucideIcons.FileCheck, color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/30' },
  { id: 'General Documents', label: 'General Documents', icon: LucideIcons.FileText, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
];

const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const getFileMeta = (mimeType = '', filename = '') => {
  const lower = (filename || '').toLowerCase();
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(lower)) {
    return {
      icon: LucideIcons.Image,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      type: 'Image',
    };
  }
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    return {
      icon: LucideIcons.FileText,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      type: 'PDF',
    };
  }
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
    return {
      icon: LucideIcons.Sheet,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      type: 'Spreadsheet',
    };
  }
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return {
      icon: LucideIcons.FileCheck,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      type: 'Document',
    };
  }
  return {
    icon: LucideIcons.File,
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    type: 'File',
  };
};

export default function CompanyDocumentsVault({ isCompact = false, hideBanner = false }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryCounts, setCategoryCounts] = useState({});
  const [totalStorage, setTotalStorage] = useState(0);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Registration & Legal');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadRefNo, setUploadRefNo] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory && selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/company-documents', { params });
      if (res.data?.success) {
        setDocuments(res.data.data || []);
        setCategoryCounts(res.data.categoryCounts || {});
        setTotalStorage(res.data.totalStorageBytes || 0);
      }
    } catch (err) {
      console.error('Error fetching company documents:', err);
      toast.error(err.response?.data?.message || 'Failed to load company documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error('File size exceeds maximum 25MB limit.');
        return;
      }
      setSelectedFile(file);
      if (!uploadTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setUploadTitle(cleanName);
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast.error('Please enter a document title.');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle.trim());
      formData.append('category', uploadCategory);
      if (uploadNotes.trim()) formData.append('notes', uploadNotes.trim());
      if (uploadRefNo.trim()) formData.append('referenceNumber', uploadRefNo.trim());
      if (uploadExpiry) formData.append('expiryDate', uploadExpiry);

      const res = await api.post('/company-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data?.message || 'Document uploaded successfully!');
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadCategory('Registration & Legal');
      setUploadNotes('');
      setUploadRefNo('');
      setUploadExpiry('');
      setSelectedFile(null);
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await api.delete(`/company-documents/${docId}`);
      toast.success('Document deleted successfully');
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Failed to delete document');
    }
  };

  const downloadFile = (docId, filename) => {
    const downloadUrl = `${api.defaults.baseURL || '/api'}/company-documents/${docId}/download`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Fetch with auth or direct window open
    api.get(`/company-documents/${docId}/download`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error('Download error:', err);
        toast.error('Failed to download document');
      });
  };

  const openPreview = (doc) => {
    setPreviewDoc(doc);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Header (Rendered only when not embedded or requested) */}
      {!hideBanner && !isCompact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-indigo-500/10 dark:from-teal-950/40 dark:via-blue-950/30 dark:to-indigo-950/30 p-5 rounded-3xl border border-teal-500/20 dark:border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <LucideIcons.FolderArchive size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Company Documents &amp; Files Vault
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure centralized repository for all official registration, tax, banking, license, and compliance files.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-500/25 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <LucideIcons.Plus size={15} />
            <span>+ Upload Company Doc</span>
          </button>
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Documents
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {documents.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Storage Used
          </div>
          <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
            {formatBytes(totalStorage)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Categories
          </div>
          <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
            {Object.keys(categoryCounts).length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Vault Status
          </div>
          <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted &amp; Ready</span>
          </div>
        </div>
      </div>

      {/* Search Bar, Upload Action & Category Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <LucideIcons.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title, filename, reference #, notes..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </form>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <LucideIcons.Plus size={15} />
            <span>+ Upload Document</span>
          </button>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === 'All' ? documents.length : (categoryCounts[cat.id] || 0);
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 shadow-xs'
                    : 'bg-white/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading company documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
            <LucideIcons.FolderPlus size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No documents found in this folder
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Upload your Certificate of Incorporation, GST Registration, PAN Card, MSME Certificate, or cancelled cheque.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <LucideIcons.Upload size={13} />
            <span>Upload First Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const meta = getFileMeta(doc.mimeType, doc.originalName);
            const Icon = meta.icon;
            const uploadDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

            return (
              <div
                key={doc._id}
                className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md hover:border-teal-500/30 transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={doc.title}>
                          {doc.title}
                        </h4>
                        <div className="text-[11px] text-slate-400 truncate" title={doc.originalName}>
                          {doc.originalName}
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0">
                      {doc.category}
                    </span>
                  </div>

                  {/* Reference number & notes */}
                  {(doc.referenceNumber || doc.notes) && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 text-[11px] space-y-1">
                      {doc.referenceNumber && (
                        <div className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                          <span className="text-slate-400">Ref:</span>
                          <span className="font-bold">{doc.referenceNumber}</span>
                        </div>
                      )}
                      {doc.notes && (
                        <div className="text-slate-500 dark:text-slate-400 italic line-clamp-2">
                          &quot;{doc.notes}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Info & Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                    <span>{formatBytes(doc.sizeBytes)}</span>
                    <span>•</span>
                    <span>{uploadDate}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openPreview(doc)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors cursor-pointer"
                      title="View / Preview Document"
                    >
                      <LucideIcons.Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadFile(doc._id, doc.originalName)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Download File"
                    >
                      <LucideIcons.Download size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc._id, doc.title)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Delete Document"
                    >
                      <LucideIcons.Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsUploadOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 flex items-center justify-center">
                  <LucideIcons.UploadCloud size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upload Company Document
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Store official registration, certificate, or legal record.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              {/* File Dropzone */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  File / Document <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-teal-500/60 bg-slate-50/50 dark:bg-slate-800/30 text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 font-semibold">
                      <LucideIcons.CheckCircle2 size={16} />
                      <span className="truncate max-w-[280px]">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-400">({formatBytes(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <LucideIcons.Upload size={20} className="mx-auto text-slate-400 group-hover:text-teal-500 transition-colors" />
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        Click to choose file or drag &amp; drop
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        PDF, PNG, JPG, Word, Excel up to 25MB
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Certificate of Incorporation, GST Registration, MSME Udyam"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
                />
              </div>

              {/* Category & Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'All').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reference / ID No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadRefNo}
                    onChange={(e) => setUploadRefNo(e.target.value)}
                    placeholder="e.g. 06AAFCR2424P1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500/30 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Additional notes, authorized signatory, or validity info..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500/30 focus:outline-none resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-xs shadow-md shadow-teal-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcons.Upload size={13} />
                      <span>Save to Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document In-App Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="w-full max-w-4xl h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <LucideIcons.FileText size={18} className="text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {previewDoc.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 truncate">
                    {previewDoc.originalName} • {formatBytes(previewDoc.sizeBytes)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadFile(previewDoc._id, previewDoc.originalName)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/25 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <LucideIcons.Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950/50 p-2 overflow-auto flex items-center justify-center">
              {previewDoc.mimeType?.startsWith('image/') ? (
                <img
                  src={`${api.defaults.baseURL || '/api'}/company-documents/${previewDoc._id}/view`}
                  alt={previewDoc.title}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-md"
                />
              ) : previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={`${api.defaults.baseURL || '/api'}/company-documents/${previewDoc._id}/view`}
                  title={previewDoc.title}
                  className="w-full h-full rounded-xl border border-slate-200 dark:border-white/10"
                />
              ) : (
                <div className="text-center space-y-3 p-8">
                  <LucideIcons.File size={48} className="mx-auto text-slate-400" />
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Preview not available for this file type
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadFile(previewDoc._id, previewDoc.originalName)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    <LucideIcons.Download size={14} />
                    <span>Download to View ({previewDoc.originalName})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
