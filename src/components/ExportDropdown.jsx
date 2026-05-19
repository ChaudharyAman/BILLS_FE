import React, { useState, useRef, useEffect } from 'react';
import { FaDownload, FaFileCsv, FaFileExcel, FaChevronDown } from 'react-icons/fa';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Reusable Dropdown for handling CSV and Excel Exports.
 * @param {Array} data - The array of objects to export.
 * @param {String} filename - The base name for the downloaded file (without extension).
 * @param {Array} columns - (Optional) Array of column keys to include, or an array of { header, key } objects.
 */
const ExportDropdown = ({ data, filename = 'export', columns = null, testId = '', getExportData = null, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const prepareData = (sourceData = data) => {
    if (!sourceData || sourceData.length === 0) return [];

    // If no explicit columns map is given, just return the raw data
    if (!columns) return sourceData;

    // Map data to the requested columns
    return sourceData.map((item) => {
      const row = {};
      columns.forEach(col => {
        if (typeof col === 'string') {
          row[col] = item[col];
        } else if (col && col.key && col.header) {
          // Flatten nested objects by supporting dot notation (e.g. 'client.name')
          let val = item;
          const parts = col.key.split('.');
          for (const part of parts) {
            val = val ? val[part] : undefined;
          }

          // Format ISO date strings perfectly into Excel/CSV friendly format
          if (typeof val === 'string' && val.match(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/)) {
             val = new Date(val).toLocaleDateString();
          }

          row[col.header] = val !== undefined && val !== null ? val : '';
        }
      });
      return row;
    });
  };

  const resolveExportData = async () => {
    if (typeof getExportData !== 'function') {
      return prepareData();
    }

    setIsExporting(true);
    try {
      const exportSource = await getExportData();
      return prepareData(exportSource);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    const exportData = await resolveExportData();
    if (exportData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsOpen(false);
  };

  const handleExportExcel = async () => {
    const exportData = await resolveExportData();
    if (exportData.length === 0) {
       alert("No data available to export.");
       return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    
    // Generate file and trigger download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => !disabled && !isExporting && setIsOpen(!isOpen)}
        data-testid={testId || undefined}
        disabled={disabled || isExporting}
        className="bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <FaDownload size={14} className="text-slate-400" /> 
        {isExporting ? 'Exporting...' : 'Export'}
        <FaChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              data-testid={testId ? `${testId}-csv` : undefined}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:text-slate-400 disabled:bg-white flex items-center gap-2 transition-colors"
              role="menuitem"
            >
              <FaFileCsv size={16} className="text-emerald-600" />
              Download as CSV
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              data-testid={testId ? `${testId}-excel` : undefined}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:text-slate-400 disabled:bg-white flex items-center gap-2 transition-colors"
              role="menuitem"
            >
              <FaFileExcel size={16} className="text-green-600" />
              Download as Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
