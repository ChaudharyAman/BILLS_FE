import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FaDownload } from 'react-icons/fa';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';

// Premium Multi-Select Dropdown Component
const MultiSelect = ({ label, options, selected, onChange, placeholder = "Select items", searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => {
    onChange(options.map(o => o.value));
  };

  const deselectAll = () => {
    onChange([]);
  };

  const filteredOptions = options.filter(o =>
    String(o.label).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative select-none" ref={containerRef}>
      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">{label}</label>

      {/* Trigger Area */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-white/60 rounded-xl px-3.5 py-2.5 text-sm bg-white/90 text-gray-900 font-semibold cursor-pointer focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all flex items-center justify-between min-h-[46px]"
      >
        <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto no-scrollbar py-0.5">
          {selected.length === 0 ? (
            <span className="text-gray-500 font-medium">{placeholder}</span>
          ) : (
            selected.map(val => {
              const opt = options.find(o => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-lg text-xs font-bold border border-indigo-300 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                >
                  {opt ? opt.label : val}
                  <button className="hover:text-indigo-900 font-bold focus:outline-none ml-1 text-xs">&times;</button>
                </span>
              );
            })
          )}
        </div>
        <span className="text-gray-500 ml-2 select-none text-[10px] font-bold">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Options Dropdown Menu - Solid High Contrast Background */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-2xl shadow-2xl overflow-hidden animate-rise-in max-h-[300px] flex flex-col">
          {/* Action Header Controls */}
          <div className="p-2.5 border-b border-gray-200 flex items-center justify-between text-xs bg-slate-50 select-none">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); selectAll(); }}
                className="text-indigo-700 hover:text-indigo-900 font-extrabold px-2 py-1 rounded-lg hover:bg-indigo-50 transition-all duration-150"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deselectAll(); }}
                className="text-slate-700 hover:text-slate-900 font-extrabold px-2 py-1 rounded-lg hover:bg-slate-100 transition-all duration-150"
              >
                Clear
              </button>
            </div>
            <span className="text-slate-700 font-extrabold bg-slate-100 px-2 py-0.5 rounded-md">{selected.length} selected</span>
          </div>

          {/* Search box if enabled */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 bg-white">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold text-gray-900"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Scrolling Options Panel */}
          <div className="overflow-y-auto flex-1 no-scrollbar p-1 max-h-[200px] bg-white">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 font-bold">No options found</div>
            ) : (
              filteredOptions.map(opt => {
                const isChecked = selected.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={(e) => { e.stopPropagation(); toggleOption(opt.value); }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${isChecked
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-900 hover:bg-slate-100 bg-white'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => { }}
                      className={`rounded cursor-pointer pointer-events-none ${isChecked ? 'accent-indigo-600' : 'border-gray-400 text-indigo-600'}`}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PayrollReports = () => {
  const today = new Date();
  const [selectedMonths, setSelectedMonths] = useState([today.getMonth() + 1]);
  const [selectedYears, setSelectedYears] = useState([today.getFullYear()]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees?limit=200', { signal: controller.signal });
        setEmployees(res.data.data || []);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
    return () => controller.abort();
  }, []);

  const downloadReport = async (url, filename) => {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleDownloadRegister = async () => {
    if (selectedMonths.length === 0 || selectedYears.length === 0) {
      toast.error('Select at least one month and one year');
      return;
    }
    setDownloading('payroll-sheet');
    try {
      for (const y of selectedYears) {
        for (const m of selectedMonths) {
          const monthName = new Date(0, m - 1).toLocaleString('en-US', { month: 'short' });
          await downloadReport(`/payroll/export?month=${m}&year=${y}`, `payroll-register-${y}-${monthName}.xlsx`);
        }
      }
      toast.success('Payroll register(s) downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download some registers');
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadBankTransfer = async () => {
    if (selectedMonths.length === 0 || selectedYears.length === 0) {
      toast.error('Select at least one month and one year');
      return;
    }
    setDownloading('bank-transfer');
    try {
      for (const y of selectedYears) {
        for (const m of selectedMonths) {
          const monthName = new Date(0, m - 1).toLocaleString('en-US', { month: 'short' });
          await downloadReport(`/reports/payroll-summary/bank-transfer?month=${m}&year=${y}&format=excel`, `bank-transfer-${y}-${monthName}.xlsx`);
        }
      }
      toast.success('Bank transfer sheet(s) downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download some transfer sheets');
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadPFChallan = async () => {
    if (selectedMonths.length === 0 || selectedYears.length === 0) {
      toast.error('Select at least one month and one year');
      return;
    }
    setDownloading('pf-challan');
    try {
      for (const y of selectedYears) {
        for (const m of selectedMonths) {
          const monthName = new Date(0, m - 1).toLocaleString('en-US', { month: 'short' });
          await downloadReport(`/reports/payroll-summary/pf-challan?month=${m}&year=${y}&format=excel`, `pf-challan-${y}-${monthName}.xlsx`);
        }
      }
      toast.success('PF Challan summary downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download PF summary');
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadESIChallan = async () => {
    if (selectedMonths.length === 0 || selectedYears.length === 0) {
      toast.error('Select at least one month and one year');
      return;
    }
    setDownloading('esi-challan');
    try {
      for (const y of selectedYears) {
        for (const m of selectedMonths) {
          const monthName = new Date(0, m - 1).toLocaleString('en-US', { month: 'short' });
          await downloadReport(`/reports/payroll-summary/esi-challan?month=${m}&year=${y}&format=excel`, `esi-challan-${y}-${monthName}.xlsx`);
        }
      }
      toast.success('ESI Challan summary downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download ESI summary');
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadStatutorySummary = async () => {
    if (selectedMonths.length === 0 || selectedYears.length === 0) {
      toast.error('Select at least one month and one year');
      return;
    }
    setDownloading('statutory-summary');
    try {
      for (const y of selectedYears) {
        for (const m of selectedMonths) {
          const monthName = new Date(0, m - 1).toLocaleString('en-US', { month: 'short' });
          await downloadReport(`/reports/payroll-summary/statutory-summary?month=${m}&year=${y}&format=excel`, `statutory-summary-${y}-${monthName}.xlsx`);
        }
      }
      toast.success('Statutory summary downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download statutory summary');
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadTDSRegister = async () => {
    if (selectedYears.length === 0) {
      toast.error('Select at least one year');
      return;
    }
    setDownloading('tds-summary');
    try {
      for (const y of selectedYears) {
        await downloadReport(`/reports/payroll-summary/tds-summary?year=${y}&format=excel`, `tds-summary-fy-${y}-${y + 1}.xlsx`);
      }
      toast.success('TDS Register(s) downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download TDS summary');
    } finally {
      setDownloading('');
    }
  };

  const handleDownloadEmployeeSummary = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Select target employee(s) first');
      return;
    }
    if (selectedYears.length === 0) {
      toast.error('Select year(s) first');
      return;
    }
    setDownloading('employee-summary');
    try {
      for (const empId of selectedEmployees) {
        const emp = employees.find(e => e._id === empId);
        const empName = emp ? `${emp.firstName}_${emp.lastName}`.replace(/\s+/g, '_') : empId;
        for (const y of selectedYears) {
          await downloadReport(`/reports/payroll-summary/annual-employee-summary?employeeId=${empId}&year=${y}&format=excel`, `annual-summary-${empName}-${y}.xlsx`);
        }
      }
      toast.success('Employee summary report(s) downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download employee summary');
    } finally {
      setDownloading('');
    }
  };

  // Generate Month Options
  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const val = index + 1;
    return {
      value: val,
      label: new Date(0, index).toLocaleString('en-US', { month: 'long' })
    };
  });

  // Generate Dynamic Year Options (Current year - 3 to Current year + 4)
  const currentYear = today.getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, idx) => {
    const y = currentYear - 3 + idx;
    return { value: y, label: String(y) };
  });

  // Generate Employee Options
  const employeeOptions = employees.map(emp => ({
    value: emp._id,
    label: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unnamed Employee'
  }));

  if (loading) {
    return (
      <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans space-y-6">
        <Skeleton className="h-12 w-72 rounded-2xl animate-pulse" />
        <Skeleton className="h-40 w-full rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-water-bg min-h-full p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between animate-rise-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">Payroll Reports</h1>
          <p className="text-gray-400 text-sm mt-1">Generate month-end payroll sheets, bank transfer files, and compliance registers.</p>
        </div>
      </div>

      {/* Premium Multi-Select Control Panel Card */}
      <div className="glass-water-card p-5 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-rise-in relative z-30">
        <div className="relative">
          <MultiSelect
            label="Select Month"
            options={monthOptions}
            selected={selectedMonths}
            onChange={setSelectedMonths}
            placeholder="Select months"
          />
        </div>

        <div className="relative">
          <MultiSelect
            label="Select Year"
            options={yearOptions}
            selected={selectedYears}
            onChange={setSelectedYears}
            placeholder="Select years"
          />
        </div>

        <div className="lg:col-span-2 relative">
          <MultiSelect
            label="Target Employee (For Annual Summary)"
            options={employeeOptions}
            selected={selectedEmployees}
            onChange={setSelectedEmployees}
            placeholder="Select employees for annual summary"
            searchable={true}
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-rise-in" style={{ animationDelay: '100ms' }}>
        <ReportCard
          title="📄 Payroll Register"
          description="Complete consolidated payroll summary sheet for all active/processed employees in the selected months and years."
          onClick={handleDownloadRegister}
          loading={downloading === 'payroll-sheet'}
        />
        <ReportCard
          title="🏦 Bank Transfer Sheet"
          description="Ready-to-upload Excel sheet containing employee account numbers, bank details, IFSC codes, and net salary payouts."
          onClick={handleDownloadBankTransfer}
          loading={downloading === 'bank-transfer'}
        />
        <ReportCard
          title="🛡️ PF Challan Summary"
          description="Aggregated statutory Provident Fund summary report detailing processed employer and employee PF contributions."
          onClick={handleDownloadPFChallan}
          loading={downloading === 'pf-challan'}
        />
        <ReportCard
          title="🛡️ ESI Challan Summary"
          description="Consolidated statutory Employee State Insurance (ESI) summary report detailing employer and employee ESI contributions."
          onClick={handleDownloadESIChallan}
          loading={downloading === 'esi-challan'}
        />
        <ReportCard
          title="📈 Consolidated Statutory Summary"
          description="A single sheet detailing all monthly statutory contributions (PF Employee/Employer, ESI Employee/Employer, PT, LWF) per employee."
          onClick={handleDownloadStatutorySummary}
          loading={downloading === 'statutory-summary'}
        />
        <ReportCard
          title="📊 Monthly TDS Register"
          description="Complete log of monthly TDS deductions made per employee for tax accounting and compliance auditing."
          onClick={handleDownloadTDSRegister}
          loading={downloading === 'tds-summary'}
        />
        <ReportCard
          title="👤 Annual Employee Summary"
          description="Chronological, year-long financial ledger report detailing monthly payouts, CTC allocations, and deductions."
          onClick={handleDownloadEmployeeSummary}
          loading={downloading === 'employee-summary'}
        />
      </div>
    </div>
  );
};

const ReportCard = ({ title, description, onClick, loading }) => (
  <div className="glass-water-card p-6 flex flex-col justify-between hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
    <div>
      <h2 className="text-lg font-extrabold text-gray-800 group-hover:text-indigo-600 transition-colors duration-300">{title}</h2>
      <p className="mt-2 text-xs text-gray-400 font-semibold leading-relaxed">{description}</p>
    </div>
    <button onClick={onClick} disabled={loading} className="mt-5 w-full bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-60 transition-all duration-200">
      <FaDownload className="text-[10px]" /> {loading ? 'Generating Excel...' : 'Export Excel Sheet'}
    </button>
  </div>
);

export default PayrollReports;
