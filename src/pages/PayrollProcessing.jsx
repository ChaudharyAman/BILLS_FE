import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaCheck } from 'react-icons/fa';

const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const PayrollProcessing = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState({});
  const [rows, setRows] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/employees/active').then(res => {
      const active = res.data || [];
      setEmployees(active);
      setSelected(Object.fromEntries(active.map(emp => [emp._id, true])));
      setRows(Object.fromEntries(active.map(emp => [emp._id, {
        workingDays: 26,
        presentDays: 26,
        overtime: 0,
        bonus: 0,
        incentives: 0,
        loanDeduction: 0,
        advanceDeduction: 0,
      }])));
    }).catch(() => alert('Failed to load active employees'));
  }, []);

  const selectedEmployees = useMemo(() => employees.filter(emp => selected[emp._id]), [employees, selected]);
  const calculateNet = (emp) => {
    const row = rows[emp._id] || {};
    const gross = Number(emp.salaryStructure?.grossSalary) || 0;
    const additions = (Number(row.overtime) || 0) + (Number(row.bonus) || 0) + (Number(row.incentives) || 0);
    const pf = (emp.deductions?.pf !== undefined && emp.deductions?.pf !== null && emp.deductions?.pf !== '')
      ? Number(emp.deductions.pf)
      : (Number(emp.salaryStructure?.basic) || 0) * 0.12;
    const baseDeductions = pf + (Number(emp.deductions?.esi) || 0) + (Number(emp.deductions?.professionalTax) || 0) + (Number(emp.deductions?.tds) || 0);
    const adjustments = (Number(row.loanDeduction) || 0) + (Number(row.advanceDeduction) || 0);
    return gross + additions - baseDeductions - adjustments;
  };
  const totalPreview = useMemo(() => selectedEmployees.reduce((sum, emp) => {
    return sum + calculateNet(emp);
  }, 0), [selectedEmployees, rows]);

  const updateRow = (employeeId, field, value) => {
    setRows(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [field]: value,
      },
    }));
  };

  const submit = async () => {
    try {
      setSaving(true);
      const payload = {
        month,
        year,
        employees: selectedEmployees.map(emp => ({
          employeeId: emp._id,
          workingDays: Number(rows[emp._id]?.workingDays) || 26,
          presentDays: Number(rows[emp._id]?.presentDays) || Number(rows[emp._id]?.workingDays) || 26,
          adjustments: {
            overtime: Number(rows[emp._id]?.overtime) || 0,
            bonus: Number(rows[emp._id]?.bonus) || 0,
            incentives: Number(rows[emp._id]?.incentives) || 0,
            loanDeduction: Number(rows[emp._id]?.loanDeduction) || 0,
            advanceDeduction: Number(rows[emp._id]?.advanceDeduction) || 0,
          },
        })),
      };
      const res = await api.post('/payroll/process', payload);
      if (res.data.errors?.length) {
        const errorDetails = res.data.errors.map(err => 
          `${err.employeeName || 'Unknown Employee'}: ${err.error}`
        ).join('\n');
        alert(`Processed ${res.data.success.length}. ${res.data.errors.length} skipped or failed:\n\n${errorDetails}`);
      }
      navigate('/payroll');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process payroll');
    } finally {
      setSaving(false);
    }
  };

  const monthName = (m) => new Date(0, m - 1).toLocaleString('en-US', { month: 'long' });

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process Payroll</h1>
          <p className="text-gray-500 mt-1">Select active employees and create payroll records</p>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="text-sm text-gray-500">Selected Employees</div>
          <div className="text-2xl font-bold mt-2">{selectedEmployees.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm md:col-span-2">
          <div className="text-sm text-gray-500">Estimated Net Payroll</div>
          <div className="text-2xl font-bold mt-2">{fmtMoney(totalPreview)}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Include</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Working</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Present</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Overtime</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Bonus</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.length === 0 ? (
              <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-500">No active employees found.</td></tr>
            ) : employees.map(emp => (
              <tr key={emp._id} className="hover:bg-blue-50/40">
                <td className="px-6 py-4">
                  <input type="checkbox" checked={Boolean(selected[emp._id])} onChange={e => setSelected(prev => ({ ...prev, [emp._id]: e.target.checked }))} className="w-4 h-4" />
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold">{emp.firstName} {emp.lastName}</div>
                  <div className="text-xs text-gray-500">{emp.employeeId} · {emp.designation || '-'}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.department?.name || '-'}</td>
                <td className="px-6 py-4 text-right text-sm">{fmtMoney(emp.salaryStructure?.grossSalary)}</td>
                {['workingDays', 'presentDays', 'overtime', 'bonus'].map(field => (
                  <td key={field} className="px-3 py-4 text-right">
                    <input
                      type="number"
                      min="0"
                      value={rows[emp._id]?.[field] ?? 0}
                      onChange={e => updateRow(emp._id, field, e.target.value)}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                    />
                  </td>
                ))}
                <td className="px-6 py-4 text-right text-sm font-bold">{fmtMoney(calculateNet(emp))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/payroll')} className="px-4 py-2 rounded-lg bg-white border text-sm font-semibold">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || selectedEmployees.length === 0} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            <FaCheck /> Process Payroll
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessing;
