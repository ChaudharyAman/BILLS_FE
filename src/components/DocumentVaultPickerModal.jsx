import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (mimeType = '', filename = '') => {
  const lower = (filename || '').toLowerCase();
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(lower)) {
    return <LucideIcons.Image size={16} className="text-amber-500 shrink-0" />;
  }
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    return <LucideIcons.FileText size={16} className="text-rose-500 shrink-0" />;
  }
  if (/\.(xlsx|xls|csv)$/.test(lower)) {
    return <LucideIcons.FileSpreadsheet size={16} className="text-emerald-500 shrink-0" />;
  }
  return <LucideIcons.File size={16} className="text-teal-500 shrink-0" />;
};

const DocumentVaultPickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  alreadySelectedIds = [],
}) => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMap, setSelectedMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Initialize map with already selected items if any
      const initialMap = {};
      alreadySelectedIds.forEach((id) => {
        initialMap[String(id)] = true;
      });
      setSelectedMap(initialMap);
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/company-documents');
      if (res.data?.success) {
        const docs = res.data.data || [];
        setDocuments(docs);
        setCategoryCounts(res.data.categoryCounts || {});

        const cats = ['All'];
        if (res.data.categoryCounts) {
          Object.keys(res.data.categoryCounts).forEach((cat) => {
            if (!cats.includes(cat)) cats.push(cat);
          });
        }
        if (Array.isArray(res.data.customFolders)) {
          res.data.customFolders.forEach((f) => {
            if (f.name && !cats.includes(f.name)) cats.push(f.name);
          });
        }
        setCategories(cats);
      }
    } catch (err) {
      console.error('Error fetching vault documents:', err);
      toast.error('Failed to load documents from vault');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchCategory = activeCategory === 'All' || doc.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc.originalName && doc.originalName.toLowerCase().includes(q)) ||
      (doc.category && doc.category.toLowerCase().includes(q)) ||
      (doc.referenceNumber && doc.referenceNumber.toLowerCase().includes(q));
    return matchCategory && matchSearch;
  });

  const toggleSelect = (doc) => {
    const id = String(doc._id);
    setSelectedMap((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = doc;
      }
      return copy;
    });
  };

  const selectedCount = Object.keys(selectedMap).length;

  const handleSelectAllVisible = () => {
    const allVisibleSelected = filteredDocs.every((d) => selectedMap[String(d._id)]);
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        filteredDocs.forEach((d) => delete next[String(d._id)]);
      } else {
        filteredDocs.forEach((d) => {
          next[String(d._id)] = d;
        });
      }
      return next;
    });
  };

  const handleConfirm = () => {
    // Collect all selected document objects
    const selectedList = Object.values(selectedMap).filter(Boolean);
    onConfirm(selectedList);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-teal-500/15 to-transparent text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-xs">
              <LucideIcons.Folder size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Select Documents from Vault
              </h3>
              <p className="text-[11px] text-slate-400">
                Choose official records, compliance documents, or certificates to attach
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <LucideIcons.X size={16} />
          </button>
        </div>

        {/* Search & Folder Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-white/10 space-y-3 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="relative">
            <LucideIcons.Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by document title, filename, or reference..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Folder Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => {
              const count = cat === 'All' ? documents.length : (categoryCounts[cat] || 0);
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-xl font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-teal-500/40'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Document List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-slate-400">Loading documents from vault...</div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <LucideIcons.FolderOpen size={24} />
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No documents found
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {documents.length === 0
                  ? 'No documents currently stored in the Documents module. Upload records in the Documents module to access them here.'
                  : 'No documents match the current folder or search filter.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs pb-1 px-1">
                <span className="text-slate-500 dark:text-slate-400">
                  Showing {filteredDocs.length} document{filteredDocs.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-medium"
                >
                  {filteredDocs.every((d) => selectedMap[String(d._id)])
                    ? 'Deselect Visible'
                    : 'Select All Visible'}
                </button>
              </div>

              <div className="space-y-1.5">
                {filteredDocs.map((doc) => {
                  const idStr = String(doc._id);
                  const isChecked = Boolean(selectedMap[idStr]);
                  return (
                    <div
                      key={idStr}
                      onClick={() => toggleSelect(doc)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-500/50 shadow-xs'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(doc)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 shrink-0"
                        />
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/10">
                          {getFileIcon(doc.mimeType, doc.originalName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                            <span title={doc.title}>{doc.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={doc.originalName}>
                            {doc.originalName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          {doc.category || 'General'}
                        </span>
                        {doc.sizeBytes && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {formatFileSize(doc.sizeBytes)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
              {selectedCount}
            </span>{' '}
            document{selectedCount === 1 ? '' : 's'} selected
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LucideIcons.Paperclip size={13} />
              <span>Attach Selected ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVaultPickerModal;
