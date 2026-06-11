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
  const [payrollConfig, setPayrollConfig] = useState(null);

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
            <div className="space-y-4 animate-fadeIn">
              {/* Header Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  ['Imported', importResult.imported, 'text-green-700', 'bg-green-50 border-green-200'],
                  ['Skipped', importResult.skipped, 'text-amber-600', 'bg-amber-50 border-amber-200'],
                  ['Errors', importResult.errors?.length || 0, 'text-red-600', 'bg-red-50 border-red-200'],
                  ['Warnings', importResult.warnings?.length || 0, 'text-orange-600', 'bg-orange-50 border-orange-200'],
                ].map(([label, count, textCls, bgCls]) => (
                  <div key={label} className={`p-3 rounded-xl border text-center ${bgCls}`}>
                    <div className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">{label}</div>
                    <div className={`text-xl font-extrabold mt-0.5 ${textCls}`}>{count}</div>
                  </div>
                ))}
              </div>

              {/* CTC & Totals */}
              {importResult.summary && importResult.imported > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payroll Impact</div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-[10px] text-gray-400">Total Rows Parsed</div>
                      <div className="text-sm font-bold text-slate-800">{importResult.totalRows}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">Total Monthly CTC</div>
                      <div className="text-sm font-bold text-slate-800">{fmtMoney(importResult.summary.totalMonthlyCTC)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">Total Annual CTC</div>
                      <div className="text-sm font-bold text-slate-800">{fmtMoney(importResult.summary.totalAnnualCTC)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-Created Departments */}
              {importResult.createdDepartments?.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
                    Auto-Created Departments ({importResult.createdDepartments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {importResult.createdDepartments.map((dept, i) => (
                      <span key={i} className="text-xs bg-white border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
                        {dept.name} <span className="text-indigo-400 font-mono">({dept.code})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Department & Status Breakdown */}
              {importResult.summary && importResult.imported > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {importResult.summary.byDepartment && Object.keys(importResult.summary.byDepartment).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">By Department</div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {Object.entries(importResult.summary.byDepartment).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                          <div key={dept} className="flex justify-between items-center text-xs">
                            <span className="text-gray-700 font-medium truncate mr-2">{dept}</span>
                            <span className="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded-full min-w-[24px] text-center">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {importResult.summary.byStatus && Object.keys(importResult.summary.byStatus).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">By Status</div>
                      <div className="space-y-1.5">
                        {Object.entries(importResult.summary.byStatus).map(([st, count]) => (
                          <div key={st} className="flex justify-between items-center text-xs">
                            <span className={`capitalize font-medium ${st === 'active' ? 'text-green-700' : st === 'inactive' ? 'text-amber-600' : 'text-red-600'}`}>{st}</span>
                            <span className="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded-full min-w-[24px] text-center">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Successfully Imported Employees Table */}
              {importResult.importedEmployees?.length > 0 && (
                <div className="border border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-50 px-4 py-2.5 border-b border-green-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Successfully Imported ({importResult.importedEmployees.length})</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-green-50/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold">Row</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold">Employee</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold">Department</th>
                          <th className="text-right px-3 py-2 text-gray-500 font-semibold">Monthly CTC</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importResult.importedEmployees.map((emp, i) => (
                          <tr key={i} className={`${emp.warnings?.length ? 'bg-orange-50/40' : ''} hover:bg-gray-50`}>
                            <td className="px-3 py-1.5 text-gray-400 font-mono">{emp.row}</td>
                            <td className="px-3 py-1.5">
                              <div className="font-semibold text-gray-900">{emp.employeeName}</div>
                              <div className="text-[10px] text-gray-400">{emp.employeeId} · {emp.email}</div>
                            </td>
                            <td className="px-3 py-1.5 text-gray-600">{emp.department || '-'}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-gray-800">{emp.monthlyCTC ? fmtMoney(emp.monthlyCTC) : '-'}</td>
                            <td className="px-3 py-1.5">
                              {emp.warnings?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {emp.warnings.map((w, wi) => (
                                    <span key={wi} className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">{w}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-green-600 text-[10px] font-semibold">✓ Clean</span>
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
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
                  <div className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">
                    Data Quality Warnings ({importResult.warnings.length} employees)
                  </div>
                  <p className="text-[10px] text-orange-600 mb-2">These employees were imported successfully but have incomplete data that should be fixed.</p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {importResult.warnings.map((w, i) => (
                      <div key={i} className="text-xs border-b border-orange-100 last:border-b-0 pb-1.5 last:pb-0">
                        <span className="font-semibold text-orange-800">Row {w.row} — {w.employeeName}</span>
                        <span className="text-orange-600 ml-1.5">({w.employeeId})</span>
                        <div className="flex flex-wrap gap-1 mt-0.5 ml-2">
                          {w.issues.map((issue, ii) => (
                            <span key={ii} className="text-[9px] bg-white/60 border border-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">{issue}</span>
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
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 max-h-48 overflow-y-auto space-y-2">
              <div className="font-bold text-xs uppercase tracking-wider mb-1">Failed Rows ({importResult.errors.length})</div>
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
            {!importResult && (
              <button type="button" onClick={handleImport} disabled={importing || !importFile} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
                {importing ? 'Importing...' : 'Start Import'}
              </button>
            )}
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
