import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaEdit, FaEye, FaFileImport, FaPlus, FaUserSlash, FaTrash } from 'react-icons/fa';
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

  const downloadImportTemplate = () => {
    const headers = [
      'Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Date of Birth', 'Gender',
      'Joining Date', 'Date of Leaving', 'Location', 'Designation', 'Department', 'Employment Type', 'Status',
      'Monthly CTC', 'Basic %', 'HRA %',
      'Flexi Amount', 'Broadband', 'Petrol', 'LTA', 'Employer NPS', 'Insurance Amount', 'Joining Bonus',
      'Professional Tax', 'TDS',
      'Account Name', 'Account Number', 'IFSC Code', 'Bank Name', 'Branch',
      'PAN Number', 'UAN Number', 'Aadhar Number',
      'Tax Regime',
      'PF Enabled', 'ESI Enabled', 'PT Enabled', 'LWF Enabled', 'Gratuity Enabled',
      'Include PF in CTC', 'Include Gratuity in CTC',
      'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip', 'Country',
      'Section 80C', 'Section 80D', 'Section 24b', 'Section 80CCD(1B)', 'Rent Paid Monthly', 'Is Metro City', 'Other Exemptions'
    ];
    
    const data = [
      headers,
      [
        'EMP-001', 'John', 'Doe', 'john.doe@example.com', '9876543210', '1990-01-01', 'Male',
        '2026-06-01', '', 'Delhi', 'Software Engineer', 'Engineering', 'full-time', 'active',
        '50000', '', '',
        '0', '0', '0', '0', '0', '0', '0',
        '200', '0',
        'John Doe', '1234567890', 'UTIB0000123', 'Axis Bank', 'Delhi',
        'ABCDE1234F', '', '123456789012',
        'new',
        'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
        'Yes', 'Yes',
        '123 Street Name', '', 'Delhi', 'Delhi', '110001', 'India',
        '0', '0', '0', '0', '0', 'No', '0'
      ]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    worksheet['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'employee_import_template.xlsx');
    toast.success('Sample import template downloaded');
  };

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
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monthly CTC</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`employee-skeleton-${index}`}>
                    <td className="px-6 py-4" colSpan="7">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500">No employees found.</td></tr>
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
                      <button onClick={() => setDeleteEmployee(employee)} className="text-gray-400 hover:text-red-600" title="Delete">
                        <FaTrash />
                      </button>
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
          <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
            <div>
              <span className="font-bold block mb-0.5">Need a sample sheet?</span>
              Download our pre-formatted template with all the required columns.
            </div>
            <button
              type="button"
              onClick={downloadImportTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap text-[11px]"
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
          />

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-655 shadow-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Selected file:</span>
              <span className="font-semibold text-gray-800">{importFile?.name || 'None'}</span>
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-gray-500 font-medium">Detected rows:</span>
              <span className="font-semibold text-gray-800">{importPreviewCount}</span>
            </div>
          </div>

          {importResult && (
            <div className={`p-4 rounded-xl border animate-fadeIn ${importResult.errors?.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
              <div className="font-bold text-xs mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                <span className={`w-2 h-2 rounded-full ${importResult.errors?.length ? 'bg-amber-500' : 'bg-green-500'}`} />
                Import Complete
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-center mt-3">
                <div className="bg-white/80 p-2.5 rounded-xl border border-black/5 shadow-sm">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">Imported</div>
                  <div className="text-lg font-extrabold text-green-700 mt-0.5">{importResult.imported}</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-black/5 shadow-sm">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">Skipped</div>
                  <div className="text-lg font-extrabold text-amber-600 mt-0.5">{importResult.skipped}</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-black/5 shadow-sm">
                  <div className="text-[9px] text-gray-400 uppercase tracking-wider">Errors</div>
                  <div className="text-lg font-extrabold text-red-600 mt-0.5">{importResult.errors?.length || 0}</div>
                </div>
              </div>
            </div>
          )}

          {importResult?.errors?.length ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 max-h-48 overflow-y-auto space-y-2">
              <div className="font-bold text-xs uppercase tracking-wider mb-1">Import Errors & Details</div>
              {importResult.errors.map((item, index) => (
                <div key={`import-error-${index}`} className="border-b border-red-100 last:border-b-0 pb-1.5 last:pb-0">
                  <div className="font-semibold text-xs text-red-800">
                    {item.row ? `Row ${item.row}: ` : ''}{item.message}
                  </div>
                  {(item.employeeName || item.employeeId || item.email) && (
                    <div className="text-[10px] text-red-600/80 font-mono mt-0.5 ml-2">
                      [ {item.employeeName && `Name: ${item.employeeName}`}
                        {item.employeeId && ` | ID: ${item.employeeId}`}
                        {item.email && ` | Email: ${item.email}`} ]
                    </div>
                  )}
                </div>
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

      <Modal isOpen={Boolean(deleteEmployee)} onClose={() => setDeleteEmployee(null)} title="Delete Employee">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{deleteEmployee?.firstName} {deleteEmployee?.lastName}</span>?
          </p>
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            This will also remove all associated payroll records, expenses, loans, reimbursement claims, and project team references. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteEmployee(null)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete Permanently</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeList;
