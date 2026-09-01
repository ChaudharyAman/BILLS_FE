import React, { useRef, useState } from 'react';
import { FaPaperclip, FaFilePdf, FaImage, FaFileAlt, FaTrash, FaDownload, FaEye, FaUpload } from 'react-icons/fa';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const AttachmentUploader = ({
  attachments = [],
  onChange,
  entityId = null,
  entityType = 'invoices',
  readOnly = false,
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingViewId, setLoadingViewId] = useState(null);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newAttachments = [...attachments];

    for (const file of Array.from(fileList)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 10MB limit.`);
        continue;
      }
      try {
        const base64 = await fileToBase64(file);
        newAttachments.push({
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          base64,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to read file:', err);
        toast.error(`Failed to load "${file.name}"`);
      }
    }

    onChange(newAttachments);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (readOnly) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index) => {
    if (readOnly) return;
    const next = attachments.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleView = async (att, index) => {
    if (att.base64) {
      const win = window.open();
      if (win) {
        if (att.mimeType.startsWith('image/')) {
          win.document.write(`<title>${att.originalName}</title><img src="${att.base64}" style="max-width:100%; height:auto; margin:20px auto; display:block;" />`);
        } else if (att.mimeType === 'application/pdf') {
          win.document.write(`<title>${att.originalName}</title><iframe src="${att.base64}" frameborder="0" style="width:100vw; height:100vh;"></iframe>`);
        } else {
          const a = document.createElement('a');
          a.href = att.base64;
          a.download = att.originalName;
          a.click();
        }
      }
      return;
    }

    if (entityId && att._id) {
      setLoadingViewId(att._id);
      try {
        const endpoint = `/${entityType}/${entityId}/attachments/${att._id}`;
        const response = await api.get(endpoint, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: att.mimeType || response.headers['content-type'] });
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        console.error('Failed to view attachment:', err);
        toast.error('Failed to open attachment');
      } finally {
        setLoadingViewId(null);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 space-y-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaPaperclip className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Attachments & Scanned Files</h3>
          <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
            {attachments.length} file{attachments.length !== 1 ? 's' : ''}
          </span>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
          >
            <FaUpload size={11} /> Attach File
          </button>
        )}
      </div>

      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[0.99]'
              : 'border-gray-200 dark:border-slate-700 hover:border-indigo-400 bg-gray-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/20'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            multiple
            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
          />
          <p className="text-xs text-gray-600 dark:text-slate-300 font-medium">
            Drag & drop scanned invoices, receipts, or bills here, or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">browse</span>
          </p>
          <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">Supports PDF, PNG, JPG up to 10MB</p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {attachments.map((att, idx) => {
            const isPdf = att.mimeType === 'application/pdf' || att.originalName?.toLowerCase().endsWith('.pdf');
            const isImg = att.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(att.originalName || '');

            return (
              <div
                key={att._id || idx}
                className="flex items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg ${isPdf ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' : isImg ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                    {isPdf ? <FaFilePdf size={16} /> : isImg ? <FaImage size={16} /> : <FaFileAlt size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate" title={att.originalName}>
                      {att.originalName}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-400">
                      {formatBytes(att.sizeBytes)} {att.base64 ? '· (Ready to save)' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleView(att, idx)}
                    disabled={loadingViewId === att._id}
                    title="View / Download"
                    className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-md transition-colors text-xs"
                  >
                    <FaEye size={13} />
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      title="Remove attachment"
                      className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-md transition-colors text-xs"
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
