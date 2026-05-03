import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { FaEdit } from 'react-icons/fa';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

const EmployeeDetails = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [payrolls, setPayrolls] = useState([]);

  useEffect(() => {
    api.get(`/employees/${id}`).then(res => setEmployee(res.data)).catch(() => alert('Failed to load employee'));
    api.get(`/payroll?employeeId=${id}&limit=10`).then(res => setPayrolls(res.data.data || [])).catch(() => {});
  }, [id]);

  if (!employee) {
    return <div className="container mx-auto p-6 text-gray-500">Loading employee...</div>;
  }

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{employee.firstName} {employee.lastName}</h1>
          <p className="text-gray-500 mt-1">{employee.employeeId} · {employee.designation || 'No designation'}</p>
        </div>
        <Link to={`/employees/${employee._id}/edit`} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <FaEdit /> Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Email" value={employee.email} />
            <Info label="Phone" value={employee.phone || '-'} />
            <Info label="Department" value={employee.department?.name || '-'} />
            <Info label="Joining Date" value={fmtDate(employee.joiningDate)} />
            <Info label="Employment Type" value={employee.employmentType} />
            <Info label="Status" value={employee.status} />
            <Info label="PAN" value={employee.panNumber || '-'} />
            <Info label="UAN" value={employee.uanNumber || '-'} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">Salary</h2>
          <div className="space-y-3 text-sm">
            <Info label="Basic" value={fmtMoney(employee.salaryStructure?.basic)} />
            <Info label="HRA" value={fmtMoney(employee.salaryStructure?.hra)} />
            <Info label="Gross Salary" value={fmtMoney(employee.salaryStructure?.grossSalary)} strong />
            <Info label="CTC" value={fmtMoney(employee.salaryStructure?.ctc)} strong />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-6 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold">Payroll History</div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Salary</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Payslip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payrolls.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No payroll records yet.</td></tr>
            ) : payrolls.map(payroll => (
              <tr key={payroll._id}>
                <td className="px-6 py-4">{new Date(0, payroll.month - 1).toLocaleString('en-US', { month: 'long' })} {payroll.year}</td>
                <td className="px-6 py-4 text-right font-semibold">{fmtMoney(payroll.netSalary)}</td>
                <td className="px-6 py-4 capitalize">{payroll.status}</td>
                <td className="px-6 py-4 text-center">
                  <Link to={`/payroll/${payroll._id}/payslip`} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Info = ({ label, value, strong }) => (
  <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
    <span className="text-gray-500">{label}</span>
    <span className={strong ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}>{value}</span>
  </div>
);

export default EmployeeDetails;
