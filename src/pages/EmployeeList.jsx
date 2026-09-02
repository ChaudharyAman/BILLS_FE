import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaEdit, FaEye, FaFileImport, FaPlus, FaUserSlash, FaTrash, FaChartLine } from 'react-icons/fa';
import api from '../api/axios';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import { fmtMoney } from '../utils/payroll';
import * as XLSX from 'xlsx';

const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmEmployee, setConfirmEmployee] = useState(null);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreviewCount, setImportPreviewCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [payrollConfig, setPayrollConfig] = useState(null);

  // States for bulk selection and bulk delete
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // States for bulk salary revision
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionStep, setRevisionStep] = useState('configure'); // 'configure' | 'preview' | 'result'
  const [revisionForm, setRevisionForm] = useState({
    incrementType: 'percentage',
    incrementValue: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: '',
  });
  const [revisionPreview, setRevisionPreview] = useState([]);
  const [revisionResult, setRevisionResult] = useState(null);
  const [revisionLoading, setRevisionLoading] = useState(false);

  const downloadImportTemplate = async () => {
    try {
      const response = await api.get('/employees/import-template', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employee_import_template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Sample import template downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to download import template');
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [deptRes, configRes] = await Promise.all([
          api.get('/departments', { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
        ]);
        setDepartments(deptRes.data || []);
        setPayrollConfig(configRes.data || null);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
      }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [search, status, department, page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: 20 });
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (department) params.set('department', department);

        const res = await api.get(`/employees?${params.toString()}`, { signal: controller.signal });
        setEmployees(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, status, department, page]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (employees.length === 0) return;
    const allVisibleSelected = employees.every((emp) => selectedIds.includes(emp._id));
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !employees.some((emp) => emp._id === id)));
    } else {
      setSelectedIds((prev) => {
        const newSelection = [...prev];
        employees.forEach((emp) => {
          if (!newSelection.includes(emp._id)) {
            newSelection.push(emp._id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      const res = await api.post('/employees/bulk-delete', { ids: selectedIds });
      toast.success(res.data.message || 'Selected employees deleted successfully');
      setEmployees((current) => current.filter((emp) => !selectedIds.includes(emp._id)));
      setTotal((prev) => Math.max(prev - selectedIds.length, 0));
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to bulk delete employees');
    } finally {
      setBulkDeleting(false);
    }
  };

  const openRevisionModal = () => {
    if (selectedIds.length === 0) { toast.error('Select at least one employee first'); return; }
    setRevisionStep('configure');
    setRevisionPreview([]);
    setRevisionResult(null);
    setRevisionForm({ incrementType: 'percentage', incrementValue: '', effectiveDate: new Date().toISOString().slice(0, 10), reason: '' });
    setShowRevisionModal(true);
  };

  const handleRevisionPreview = async () => {
    const val = Number(revisionForm.incrementValue);
    if (!val || val <= 0) { toast.error('Enter a positive increment value'); return; }
    if (!revisionForm.effectiveDate) { toast.error('Effective date is required'); return; }
    try {
      setRevisionLoading(true);
      const res = await api.post('/employees/bulk-salary-revision', {
        employeeIds: selectedIds,
        incrementType: revisionForm.incrementType,
        incrementValue: val,
        effectiveDate: revisionForm.effectiveDate,
        reason: revisionForm.reason || 'Bulk Salary Increment',
        preview: true,
        previewOnly: true,
      });
      setRevisionPreview(res.data.preview || res.data.success || []);
      setRevisionStep('preview');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed');
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleRevisionCommit = async () => {
    try {
      setRevisionLoading(true);
      const res = await api.post('/employees/bulk-salary-revision', {
        employeeIds: selectedIds,
        incrementType: revisionForm.incrementType,
        incrementValue: Number(revisionForm.incrementValue),
        effectiveDate: revisionForm.effectiveDate,
        reason: revisionForm.reason || 'Bulk Salary Increment',
      });
      setRevisionResult(res.data);
      setRevisionStep('result');
      // Refresh list to show updated CTC values
      const refreshed = await api.get(`/employees?page=${page}&limit=20`);
      setEmployees(refreshed.data.data || []);
      setSelectedIds([]);
      toast.success(`Salary revision applied to ${res.data.success?.length || 0} employee(s)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Revision failed');
    } finally {
      setRevisionLoading(false);
    }
  };

  const importSummary = useMemo(() => {
    if (!importResult) return '';
    return `${importResult.imported} employees imported, ${importResult.skipped} skipped, ${importResult.errors?.length || 0} errors`;
  }, [importResult]);

  const markInactive = async () => {
    if (!confirmEmployee) return;
    try {
      await api.put(`/employees/${confirmEmployee._id}`, { status: 'inactive' });
      setEmployees((current) => current.map((employee) => (
        employee._id === confirmEmployee._id ? { ...employee, status: 'inactive' } : employee
      )));
      toast.success('Employee marked inactive');
      setConfirmEmployee(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to mark employee inactive');
    }
  };

  const handleDelete = async () => {
    if (!deleteEmployee) return;
    try {
      await api.delete(`/employees/${deleteEmployee._id}`);
      setEmployees((current) => current.filter((employee) => employee._id !== deleteEmployee._id));
      toast.success('Employee deleted successfully');
      setDeleteEmployee(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete employee');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/employees/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employees.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Employee export downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export employees');
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Choose an Excel file first');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/employees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      
      const summaryMsg = `Import completed. Imported: ${res.data.imported}, Skipped: ${res.data.skipped}, Errors: ${res.data.errors?.length || 0}`;
      if (res.data.imported > 0) {
        toast.success(summaryMsg);
      } else {
        toast.error(summaryMsg);
      }

      setPage(1);
      const refreshed = await api.get('/employees?page=1&limit=20');
      setEmployees(refreshed.data.data || []);
      setTotalPages(refreshed.data.totalPages || 1);
      setTotal(refreshed.data.total || 0);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to import employees');
    } finally {
      setImporting(false);
    }
  };

  const getInitials = (firstName = '', lastName = '') => {
    const f = (firstName || '').trim()[0] || '';
    const l = (lastName || '').trim()[0] || '';
    return (f + l).toUpperCase() || 'E';
  };

  const activeCount = useMemo(
    () => employees.filter((e) => e.status === 'active').length,
    [employees]
  );

  const totalMonthlyCTC = useMemo(
    () => employees.reduce((sum, e) => sum + (Number(e.monthlyCTC) || 0), 0),
    [employees]
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl font-sans text-slate-900 dark:text-slate-100 space-y-5 transition-colors">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            🏢 Employee Directory
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage employee profiles, designations, department assignments, and compensation records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          {selectedIds.length > 0 && (
            <>
              <button
                type="button"
                id="btn-bulk-salary-revision"
                onClick={openRevisionModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <FaChartLine size={13} /> Salary Revision ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <FaTrash size={13} /> Delete ({selectedIds.length})
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setShowImportModal(true);
              setImportFile(null);
              setImportPreviewCount(0);
              setImportResult(null);
            }}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <FaFileImport size={13} className="text-indigo-600 dark:text-indigo-400" /> Import Excel
          </button>
          <Link
            to="/employees/bulk-salary-revision"
            className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors shadow-2xs border border-transparent dark:border-slate-700"
          >
            <FaChartLine size={13} className="text-emerald-400" /> Bulk Revision
          </Link>
          <button
            type="button"
            onClick={handleExport}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <FaDownload size={13} className="text-slate-500 dark:text-slate-400" /> Export
          </button>
          <Link
            to="/employees/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-sm"
          >
            <FaPlus size={13} /> Add Employee
          </Link>
        </div>
      </div>

      {/* Keka Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Headcount</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Workforce</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{activeCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Departments</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{departments.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly CTC Outflow</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{fmtMoney(totalMonthlyCTC)}</div>
        </div>
      </div>

      {/* Main Content Card with Keka Tabs & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        {/* Status Tabs */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 px-4 pt-3 flex flex-wrap gap-1 bg-slate-50/50 dark:bg-slate-800/40">
          {[
            { id: '', label: 'All Employees' },
            { id: 'active', label: 'Active' },
            { id: 'inactive', label: 'Inactive' },
            { id: 'terminated', label: 'Terminated' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                status === tab.id
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-lg'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-t-lg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <input
            aria-label="Search employees"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, ID, email, designation..."
            className="border border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-300 focus:outline-none rounded-xl px-3.5 py-2 text-xs md:col-span-3 font-medium"
          />
          <select
            aria-label="Filter by department"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-300 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60">
              <tr>
                <th className="px-4 py-3.5 text-left w-10">
                  <input
                    type="checkbox"
                    checked={employees.length > 0 && employees.every((emp) => selectedIds.includes(emp._id))}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
                    aria-label="Select all employees"
                  />
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PAN / Aadhaar</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monthly CTC</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`employee-skeleton-${index}`}>
                    <td className="px-6 py-4" colSpan="8">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="text-3xl mb-2">🔍</div>
                    <div className="font-semibold text-slate-600 dark:text-slate-300">No employees found.</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting search filters or onboarding new hires.</div>
                  </td>
                </tr>
              ) : (
                employees.map((employee) => {
                  const isSelected = selectedIds.includes(employee._id);
                  const initials = getInitials(employee.firstName, employee.lastName);
                  return (
                    <tr
                      key={employee._id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/30' : ''}`}
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(employee._id)}
                          className="h-4 w-4 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
                          aria-label={`Select ${employee.firstName} ${employee.lastName}`}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <Link
                              to={`/employees/${employee._id}`}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm"
                            >
                              {employee.firstName} {employee.lastName}
                            </Link>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {employee.employeeId} · <span className="text-slate-400 dark:text-slate-500">{employee.email}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                              {employee.designation || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {employee.department?.name ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                            {employee.department.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">{employee.location || '-'}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {employee.panNumber != null && String(employee.panNumber).trim() !== ''
                            ? (String(employee.panNumber).startsWith('enc:') ? <span className="text-[10px] text-amber-600 font-sans italic">Encrypted</span> : String(employee.panNumber))
                            : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {employee.aadharNumber != null && String(employee.aadharNumber).trim() !== ''
                            ? (String(employee.aadharNumber).startsWith('enc:') ? <span className="text-[10px] text-amber-600 font-sans italic">Encrypted</span> : String(employee.aadharNumber))
                            : '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {fmtMoney(employee.monthlyCTC)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                            employee.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80'
                              : employee.status === 'inactive'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              employee.status === 'active'
                                ? 'bg-emerald-500'
                                : employee.status === 'inactive'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                          <Link
                            to={`/employees/${employee._id}`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="View Profile"
                          >
                            <FaEye size={13} />
                          </Link>
                          <Link
                            to={`/employees/${employee._id}/edit`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Edit Profile"
                          >
                            <FaEdit size={13} />
                          </Link>
                          {employee.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => setConfirmEmployee(employee)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                              title="Mark Inactive"
                            >
                              <FaUserSlash size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteEmployee(employee)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Employee"
                          >
                            <FaTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-100">{employees.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-100">{total}</strong> employees
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>


      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Employees">
        <div className="space-y-5">
          <div className="flex justify-between items-center bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300">
            <div>
              <span className="font-bold block mb-0.5 text-blue-900 dark:text-blue-200">Need a sample sheet?</span>
              <span className="text-blue-700 dark:text-blue-300/80">Download our pre-formatted template with all the required columns.</span>
            </div>
            <button
              type="button"
              onClick={downloadImportTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap text-[11px] transition-colors"
            >
              Download Template
            </button>
          </div>

          <CsvAndExcelUploader
            onDataParsed={(rows) => setImportPreviewCount(rows.length)}
            onFileSelected={(file) => setImportFile(file)}
            isLoading={importing}
            title="Upload Employee Sheet"
            subtitle="Upload the payroll master sheet or a clean employee workbook."
            hint="Make sure your file contains headers like Employee ID, First Name, Last Name, Email, Phone, Joining Date, Monthly CTC, Location, Designation, PAN, Aadhar, etc."
            detectGroupedHeader={true}
          />

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 text-sm shadow-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Selected file:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{importFile?.name || 'None'}</span>
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Detected rows:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{importPreviewCount}</span>
            </div>
          </div>

          {importResult && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  ['Imported', importResult.imported, 'text-emerald-700 dark:text-emerald-400', 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'],
                  ['Skipped', importResult.skipped, 'text-amber-700 dark:text-amber-400', 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'],
                  ['Errors', importResult.errors?.length || 0, 'text-rose-700 dark:text-rose-400', 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'],
                  ['Warnings', importResult.warnings?.length || 0, 'text-orange-700 dark:text-orange-400', 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60'],
                ].map(([label, count, textCls, bgCls]) => (
                  <div key={label} className={`p-3 rounded-xl border text-center ${bgCls}`}>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">{label}</div>
                    <div className={`text-xl font-extrabold mt-0.5 ${textCls}`}>{count}</div>
                  </div>
                ))}
              </div>

              {/* CTC & Totals */}
              {importResult.summary && importResult.imported > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Payroll Impact</div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Total Rows Parsed</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{importResult.totalRows}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Total Monthly CTC</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtMoney(importResult.summary.totalMonthlyCTC)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Total Annual CTC</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtMoney(importResult.summary.totalAnnualCTC)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-Created Departments */}
              {importResult.createdDepartments?.length > 0 && (
                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-4">
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">
                    Auto-Created Departments ({importResult.createdDepartments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {importResult.createdDepartments.map((dept, i) => (
                      <span key={i} className="text-xs bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-semibold shadow-2xs">
                        {dept.name} <span className="text-indigo-400 dark:text-indigo-400/80 font-mono">({dept.code})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Department & Status Breakdown */}
              {importResult.summary && importResult.imported > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {importResult.summary.byDepartment && Object.keys(importResult.summary.byDepartment).length > 0 && (
                    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">By Department</div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {Object.entries(importResult.summary.byDepartment).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                          <div key={dept} className="flex justify-between items-center text-xs">
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate mr-2">{dept}</span>
                            <span className="text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-full min-w-[24px] text-center">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {importResult.summary.byStatus && Object.keys(importResult.summary.byStatus).length > 0 && (
                    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">By Status</div>
                      <div className="space-y-1.5">
                        {Object.entries(importResult.summary.byStatus).map(([st, count]) => (
                          <div key={st} className="flex justify-between items-center text-xs">
                            <span className={`capitalize font-medium ${st === 'active' ? 'text-emerald-700 dark:text-emerald-400' : st === 'inactive' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{st}</span>
                            <span className="text-slate-900 dark:text-slate-100 font-bold bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-full min-w-[24px] text-center">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Successfully Imported Employees Table */}
              {importResult.importedEmployees?.length > 0 && (
                <div className="border border-emerald-200 dark:border-emerald-800/60 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/50 px-4 py-2.5 border-b border-emerald-200 dark:border-emerald-800/60 flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Successfully Imported ({importResult.importedEmployees.length})</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-emerald-50/40 dark:bg-emerald-950/30 sticky top-0 border-b border-emerald-100 dark:border-emerald-900/40">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold">Row</th>
                          <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold">Employee</th>
                          <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold">Department</th>
                          <th className="text-right px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold">Monthly CTC</th>
                          <th className="text-left px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {importResult.importedEmployees.map((emp, i) => (
                          <tr key={i} className={`${emp.warnings?.length ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
                            <td className="px-3 py-1.5 text-slate-400 dark:text-slate-500 font-mono">{emp.row}</td>
                            <td className="px-3 py-1.5">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{emp.employeeName}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">{emp.employeeId} · {emp.email}</div>
                            </td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{emp.department || '-'}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-slate-800 dark:text-slate-200">{emp.monthlyCTC ? fmtMoney(emp.monthlyCTC) : '-'}</td>
                            <td className="px-3 py-1.5">
                              {emp.warnings?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {emp.warnings.map((w, wi) => (
                                    <span key={wi} className="text-[9px] bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 px-1.5 py-0.5 rounded-full font-medium">{w}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">✓ Clean</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Quality Warnings */}
              {importResult.warnings?.length > 0 && (
                <div className="border border-orange-200 dark:border-orange-800/60 bg-orange-50/80 dark:bg-orange-950/40 rounded-xl p-4">
                  <div className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider mb-2">
                    Data Quality Warnings ({importResult.warnings.length} employees)
                  </div>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 mb-2">These employees were imported successfully but have incomplete data that should be fixed.</p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {importResult.warnings.map((w, i) => (
                      <div key={i} className="text-xs border-b border-orange-100 dark:border-orange-900/40 last:border-b-0 pb-1.5 last:pb-0">
                        <span className="font-semibold text-orange-800 dark:text-orange-200">Row {w.row} — {w.employeeName}</span>
                        <span className="text-orange-600 dark:text-orange-400 ml-1.5 font-mono">({w.employeeId})</span>
                        <div className="flex flex-wrap gap-1 mt-0.5 ml-2">
                          {w.issues.map((issue, ii) => (
                            <span key={ii} className="text-[9px] bg-white/70 dark:bg-slate-800/80 border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full">{issue}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {importResult?.errors?.length ? (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/40 p-4 text-sm text-rose-700 dark:text-rose-300 max-h-48 overflow-y-auto space-y-2">
              <div className="font-bold text-xs uppercase tracking-wider mb-1 text-rose-800 dark:text-rose-200">Failed Rows ({importResult.errors.length})</div>
              {importResult.errors.map((item, index) => (
                <div key={`import-error-${index}`} className="border-b border-rose-100 dark:border-rose-900/40 last:border-b-0 pb-1.5 last:pb-0">
                  <div className="font-semibold text-xs text-rose-800 dark:text-rose-200">
                    {item.row ? `Row ${item.row}: ` : ''}{item.message}
                  </div>
                  {(item.employeeName || item.employeeId || item.email) && (
                    <div className="text-[10px] text-rose-600/90 dark:text-rose-400/90 font-mono mt-0.5 ml-2">
                      [ {item.employeeName && `Name: ${item.employeeName}`}
                        {item.employeeId && ` | ID: ${item.employeeId}`}
                        {item.email && ` | Email: ${item.email}`} ]
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-sm font-semibold transition-colors shadow-2xs"
            >
              Close
            </button>
            {!importResult && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !importFile}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-2xs"
              >
                {importing ? 'Importing...' : 'Start Import'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(confirmEmployee)} onClose={() => setConfirmEmployee(null)} title="Mark Employee Inactive">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Mark <span className="font-semibold text-slate-900 dark:text-slate-100">{confirmEmployee?.firstName} {confirmEmployee?.lastName}</span> as inactive?
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmEmployee(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors">Cancel</button>
            <button type="button" onClick={markInactive} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors">Confirm</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deleteEmployee)} onClose={() => setDeleteEmployee(null)} title="Delete Employee">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete <span className="font-semibold text-slate-900 dark:text-slate-100">{deleteEmployee?.firstName} {deleteEmployee?.lastName}</span>?
          </p>
          <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-lg p-3">
            This will also remove all associated payroll records, expenses, loans, reimbursement claims, and project team references. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteEmployee(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors">Cancel</button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">Delete Permanently</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} title="Delete Selected Employees">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete the <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedIds.length} selected employees</span>?
          </p>
          <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-lg p-3">
            This will also remove all associated payroll records, expenses, loans, reimbursement claims, and project team references for **all** selected employees. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowBulkDeleteModal(false)} disabled={bulkDeleting} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors">Cancel</button>
            <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
              {bulkDeleting ? 'Deleting...' : 'Delete Selected Permanently'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Salary Revision Modal */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => !revisionLoading && setShowRevisionModal(false)}
        title={revisionStep === 'configure' ? `Salary Revision — ${selectedIds.length} Employee(s)` : revisionStep === 'preview' ? 'Preview Changes' : 'Revision Complete'}
      >
        {revisionStep === 'configure' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Increment Type</label>
                <select
                  value={revisionForm.incrementType}
                  onChange={e => setRevisionForm(f => ({ ...f, incrementType: e.target.value }))}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat_amount">Flat Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {revisionForm.incrementType === 'percentage' ? 'Increment %' : 'Flat Amount (₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={revisionForm.incrementType === 'percentage' ? '0.1' : '100'}
                  value={revisionForm.incrementValue}
                  onChange={e => setRevisionForm(f => ({ ...f, incrementValue: e.target.value }))}
                  placeholder={revisionForm.incrementType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Effective Date</label>
              <input
                type="date"
                value={revisionForm.effectiveDate}
                onChange={e => setRevisionForm(f => ({ ...f, effectiveDate: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={revisionForm.reason}
                onChange={e => setRevisionForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Annual increment, promotion, etc."
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowRevisionModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors">Cancel</button>
              <button type="button" onClick={handleRevisionPreview} disabled={revisionLoading} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                {revisionLoading ? 'Loading...' : 'Preview Changes →'}
              </button>
            </div>
          </div>
        )}

        {revisionStep === 'preview' && (() => {
          const validItems = revisionPreview.filter((item) => !item.validationError);
          const erroredItems = revisionPreview.filter((item) => item.validationError);

          const totalCostChange = validItems.reduce((sum, item) => {
            if (item.compensationType === 'hourly' || item.compensationType === 'daily_wage') return sum;
            return sum + (Number(item.newCTC || 0) - Number(item.previousCTC || 0));
          }, 0);

          return (
            <div className="space-y-4">
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-300 font-medium">
                <span className="font-bold text-blue-950 dark:text-blue-200">{validItems.length} employees will be revised</span>
                {erroredItems.length > 0 && <span>, <span className="font-bold text-amber-700 dark:text-amber-400">{erroredItems.length} skipped due to validation errors</span></span>}
                <span>, total monthly payroll cost change: <span className={`font-bold ${totalCostChange >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{totalCostChange >= 0 ? '+' : ''}{fmtMoney(totalCostChange)}</span></span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700/60">
                    <tr>
                      <th className="px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold">Employee</th>
                      <th className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 font-semibold">Current Pay</th>
                      <th className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 font-semibold">New Pay</th>
                      <th className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 font-semibold">Change</th>
                      <th className="px-3 py-2 text-center text-slate-600 dark:text-slate-400 font-semibold">Type</th>
                      <th className="px-3 py-2 text-slate-600 dark:text-slate-400 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {revisionPreview.map((item, i) => {
                      const isHourly = item.compensationType === 'hourly';
                      const isDaily = item.compensationType === 'daily_wage';
                      const prev = isHourly ? (item.previousHourlyRate || 0) : isDaily ? (item.previousDailyRate || 0) : (item.previousCTC || 0);
                      const next = isHourly ? (item.newHourlyRate || 0) : isDaily ? (item.newDailyRate || 0) : (item.newCTC || 0);
                      const diff = next - prev;
                      const pctChange = prev > 0 ? ((diff / prev) * 100).toFixed(1) : '0.0';
                      const hasErr = Boolean(item.validationError);

                      return (
                        <tr key={i} className={`${hasErr ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/60 dark:hover:bg-rose-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'} transition-colors`}>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{item.employeeName}</div>
                            <div className="text-slate-400 dark:text-slate-500 text-[10px]">{item.employeeCode}</div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{fmtMoney(prev)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">{fmtMoney(next)}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {diff >= 0 ? '+' : ''}{fmtMoney(diff)} <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">({diff >= 0 ? '+' : ''}{pctChange}%)</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold">
                              {(item.compensationType || 'monthly').slice(0, 7)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {hasErr ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">⚠️ {item.validationError}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">✅ Ready</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setRevisionStep('configure')} disabled={revisionLoading} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors">← Back</button>
                <button type="button" onClick={handleRevisionCommit} disabled={revisionLoading || validItems.length === 0} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                  {revisionLoading ? 'Applying...' : `Apply Revision to ${validItems.length} Employee(s)`}
                </button>
              </div>
            </div>
          );
        })()}

        {revisionStep === 'result' && revisionResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-center">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Applied</div>
                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{revisionResult.success?.length || 0}</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3 text-center">
                <div className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold">Errors</div>
                <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">{revisionResult.errors?.length || 0}</div>
              </div>
            </div>
            {revisionResult.errors?.length > 0 && (
              <div className="border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 rounded-xl p-3 max-h-40 overflow-y-auto">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-2">Errors</div>
                {revisionResult.errors.map((e, i) => (
                  <div key={i} className="text-xs text-rose-600 dark:text-rose-400 py-0.5">{e.employeeName}: {e.error}</div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowRevisionModal(false)} className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-sm font-semibold transition-colors">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeList;
