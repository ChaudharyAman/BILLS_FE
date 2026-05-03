import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { FaEdit, FaEye, FaPlus, FaUserSlash } from 'react-icons/fa';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 250);
    return () => clearTimeout(timer);
  }, [search, status, department, page]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (department) params.set('department', department);
      const res = await api.get(`/employees?${params.toString()}`);
      setEmployees(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error(error);
      alert('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const markInactive = async (employee) => {
    if (!window.confirm(`Mark ${employee.firstName} ${employee.lastName} inactive?`)) return;
    await api.put(`/employees/${employee._id}`, { status: 'inactive' });
    fetchEmployees();
  };

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-gray-500 mt-1">Manage employee records and salary structures</p>
        </div>
        <Link to="/employees/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <FaPlus size={14} /> Add Employee
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/60 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, ID, email..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm md:col-span-2"
          />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
          <select value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All Departments</option>
            {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Gross Salary</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">Loading employees...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">No employees found.</td></tr>
              ) : employees.map(employee => (
                <tr key={employee._id} className="hover:bg-blue-50/40">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</div>
                    <div className="text-xs text-gray-500">{employee.employeeId} · {employee.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.designation || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.department?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      employee.status === 'active' ? 'bg-green-100 text-green-700' :
                      employee.status === 'inactive' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold">{fmtMoney(employee.salaryStructure?.grossSalary)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <Link to={`/employees/${employee._id}`} className="text-gray-400 hover:text-blue-600" title="View">
                        <FaEye />
                      </Link>
                      <Link to={`/employees/${employee._id}/edit`} className="text-gray-400 hover:text-blue-600" title="Edit">
                        <FaEdit />
                      </Link>
                      {employee.status === 'active' && (
                        <button onClick={() => markInactive(employee)} className="text-gray-400 hover:text-amber-600" title="Mark inactive">
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
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
