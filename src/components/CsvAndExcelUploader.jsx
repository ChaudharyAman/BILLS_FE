import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FaFileCsv, FaFileExcel, FaUpload, FaSpinner } from 'react-icons/fa';

/**
 * Reusable Drag & Drop CSV & Excel Uploader Component
 * @param {function} onDataParsed - Callback receiving the parsed array of objects
 * @param {boolean} isLoading - External loading state
 * @param {string} title - Main text to show
 * @param {string} subtitle - Secondary text
 */
const CsvAndExcelUploader = ({ 
  onDataParsed, 
  onFileSelected,
  isLoading = false,
  title = "Upload File",
  subtitle = "Drag & drop a .csv, .xlsx, or .xls file here, or click to select",
  compact = false,
  hint = "Make sure your file contains a header row with columns like Name, Rate, Qty, Tax.",
  detectGroupedHeader = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setError('');
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      parseExcel(file);
    } else {
      setError('Please upload a valid .csv, .xlsx, or .xls file.');
    }
  };

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error("PapaParse Errors:", results.errors);
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          return;
        }
        
        if (results.data.length === 0) {
           setError('The CSV file appears to be empty.');
           return;
        }
        onDataParsed(results.data);
        onFileSelected?.(file, results.data);
      },
      error: (err) => {
        setError(`Failed to read file: ${err.message}`);
      }
    });
  };

  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Use the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        let rangeStart = 0;
        if (detectGroupedHeader && sheet) {
          const firstCellAddress = XLSX.utils.encode_cell({ r: 0, c: 0 }); // A1
          const firstCell = sheet[firstCellAddress] || sheet['A1'];
          const firstCellValue = firstCell ? String(firstCell.v).trim().toLowerCase() : '';
          if (firstCellValue && !['employee id', 'employeeid', 'employee_id'].includes(firstCellValue)) {
            rangeStart = 1;
          }
        }

        // Convert sheet to JSON array of objects
        const results = XLSX.utils.sheet_to_json(sheet, { defval: "", range: rangeStart });
        
        if (results.length === 0) {
          setError('The Excel file appears to be empty.');
          return;
        }
        onDataParsed(results);
        onFileSelected?.(file, results);
      } catch (err) {
        console.error("Excel Parse Error:", err);
        setError(`Error parsing Excel: ${err.message}`);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the Excel file.');
    };
    reader.readAsBinaryString(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!compact) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!compact) setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!compact) setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      // Reset input value to allow uploading the same file again
      e.target.value = null;
    }
  };

  if (compact) {
    return (
      <div className="w-full">
         <input 
          type="file" 
          accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-200 font-medium whitespace-nowrap transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:text-blue-600 dark:hover:text-blue-400'} shadow-sm`}
        >
          {isLoading ? <FaSpinner className="animate-spin" /> : <FaUpload />} 
          {isLoading ? 'Importing...' : 'Import'}
        </button>
        {error && (
          <div className="absolute mt-2 p-2 bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-300 text-xs rounded border border-red-100 dark:border-red-800 whitespace-nowrap z-10 shadow-lg">
             {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div 
        className={`relative w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30' 
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/70'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center text-blue-500 dark:text-blue-400 py-4">
            <FaSpinner className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-medium">Processing rows...</p>
          </div>
        ) : (
          <>
            <div className={`p-4 rounded-full mb-4 flex gap-2 ${isDragging ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700'}`}>
              <FaFileCsv className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <FaFileExcel className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>
            
            <button 
              type="button" 
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2"
            >
              <FaUpload /> Browse files
            </button>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center max-w-xs">
              {hint}
            </p>
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-300 text-sm rounded-lg border border-red-100 dark:border-red-800 flex items-start gap-2">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}
    </div>
  );
};

export default CsvAndExcelUploader;
