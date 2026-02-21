import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { FaFileCsv, FaUpload, FaSpinner } from 'react-icons/fa';

/**
 * Reusable Drag & Drop CSV Uploader Component
 * @param {function} onDataParsed - Callback receiving the parsed array of objects
 * @param {boolean} isLoading - External loading state
 * @param {string} title - Main text to show (e.g. "Bulk Add Items")
 * @param {string} subtitle - Secondary text (e.g. "Upload a CSV file...")
 */
const CsvUploader = ({ 
  onDataParsed, 
  isLoading = false,
  title = "Upload CSV",
  subtitle = "Drag & drop a file here, or click to select"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    setError('');
    if (!file) return;
    
    // Check if it's a CSV by extension (type can sometimes be empty on Windows)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    Papa.parse(file, {
      header: true,      // Requires the first row to be headers
      skipEmptyLines: true, // Ignore blank lines
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error("PapaParse Errors:", results.errors);
          setError(`Error parsing CSV: \${results.errors[0].message}`);
          return;
        }
        
        if (results.data.length === 0) {
           setError('The CSV file appears to be empty.');
           return;
        }

        onDataParsed(results.data);
      },
      error: (err) => {
        setError(`Failed to read file: \${err.message}`);
      }
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`relative w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer \${
          isDragging 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center text-blue-500 py-4">
            <FaSpinner className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-medium">Processing rows...</p>
          </div>
        ) : (
          <>
            <div className={`p-4 rounded-full mb-4 \${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
              <FaFileCsv className="w-8 h-8" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-700 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 mb-4">{subtitle}</p>
            
            <button 
              type="button" 
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
            >
              <FaUpload /> Browse files
            </button>
            <p className="text-xs text-slate-400 mt-4 text-center max-w-xs">
              Make sure your CSV contains a header row with columns like Name, Rate, Qty, Tax.
            </p>
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start gap-2">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}
    </div>
  );
};

export default CsvUploader;
