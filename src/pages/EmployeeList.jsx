import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaEdit, FaEye, FaFileImport, FaPlus, FaUserSlash } from 'react-icons/fa';
import api from '../api/axios';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import CsvAndExcelUploader from '../components/CsvAndExcelUploader';
import { fmtMoney } from '../utils/payroll';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreviewCount, setImportPreviewCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments', { signal: controller.signal });
        setDepartments(res.data || []);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
      }
    };

    fetchDepartments();
    return () => controller.abort();
  }, []);

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
      toast.success('Employee import completed');
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

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-gray-500 mt-1">Manage employee records, salary structures, and payroll-ready onboarding data</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setShowImportModal(true);
              setImportFile(null);
              setImportPreviewCount(0);
              setImportResult(null);
            }}
            className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold"
          >
            <FaFileImport size={14} /> Import Excel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold"
          >
            <FaDownload size={14} /> Export
          </button>
          <Link to="/employees/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
            <FaPlus size={14} /> Add Employee
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/60 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            aria-label="Search employees"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, ID, email, PAN..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm md:col-span-2"
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
          <select
            aria-label="Filter by department"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">PAN / Aadhar</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">DOL</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monthly CTC</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`employee-skeleton-${index}`}>
                    <td className="px-6 py-4" colSpan="8">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-500">No employees found.</td></tr>
              ) : employees.map((employee) => (
                <tr key={employee._id} className="hover:bg-blue-50/40">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</div>
                    <div className="text-xs text-gray-500">{employee.employeeId} · {employee.email}</div>
                    <div className="text-xs text-gray-400">{employee.designation || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.department?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.location || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{employee.panNumber || '-'}</div>
                    <div className="text-xs text-gray-400">{employee.aadharNumber || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{fmtDate(employee.dateOfLeaving)}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold">{fmtMoney(employee.monthlyCTC)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      employee.status === 'active' ? 'bg-green-100 text-green-700' :
                      employee.status === 'inactive' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <Link to={`/employees/${employee._id}`} className="text-gray-400 hover:text-blue-600" title="View">
                        <FaEye />
                      </Link>
                      <Link to={`/employees/${employee._id}/edit`} className="text-gray-400 hover:text-blue-600" title="Edit">
                        <FaEdit />
                      </Link>
                      {employee.status === 'active' && (
                        <button onClick={() => setConfirmEmployee(employee)} className="text-gray-400 hover:text-amber-600" title="Mark inactive">
                          <FaUserSlash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-500">Showing {employees.length} of {total}</span>
          <div className="flex items-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Employees">
        <div className="space-y-5">
          <CsvAndExcelUploader
            onDataParsed={(rows) => setImportPreviewCount(rows.length)}
            onFileSelected={(file) => setImportFile(file)}
            isLoading={importing}
            title="Upload Employee Sheet"
            subtitle="Upload the payroll master sheet or a clean employee workbook."
          />

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            <div>Selected file: {importFile?.name || 'None'}</div>
            <div>Detected rows: {importPreviewCount}</div>
            {importSummary && <div className="mt-2 font-semibold text-gray-800">{importSummary}</div>}
          </div>

          {importResult?.errors?.length ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 max-h-48 overflow-y-auto">
              {importResult.errors.map((item, index) => (
                <div key={`import-error-${index}`}>{item.row ? `Row ${item.row}: ` : ''}{item.message}</div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Close</button>
            <button type="button" onClick={handleImport} disabled={importing || !importFile} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
              {importing ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(confirmEmployee)} onClose={() => setConfirmEmployee(null)} title="Mark Employee Inactive">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Mark <span className="font-semibold text-gray-900">{confirmEmployee?.firstName} {confirmEmployee?.lastName}</span> as inactive?
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmEmployee(null)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={markInactive} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold">Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeList;
