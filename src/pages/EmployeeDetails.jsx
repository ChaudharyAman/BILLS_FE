import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaEdit, FaHistory } from 'react-icons/fa';
import api from '../api/axios';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import { buildMasterSalaryStructure, DEFAULT_PAYROLL_CONFIG, fmtMoney, payrollStatusClass } from '../utils/payroll';

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-IN') : '-';
};

const EmployeeDetails = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState({
    newCTC: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchPageData = async () => {
      try {
        setLoading(true);
        const [employeeRes, payrollRes, configRes] = await Promise.all([
          api.get(`/employees/${id}`, { signal: controller.signal }),
          api.get(`/payroll?employeeId=${id}&limit=12`, { signal: controller.signal }),
          api.get('/payroll/config', { signal: controller.signal }),
        ]);
        setEmployee(employeeRes.data);
        setPayrolls(payrollRes.data.data || []);
        setConfig({ ...DEFAULT_PAYROLL_CONFIG, ...(configRes.data || {}) });
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
        toast.error('Failed to load employee details');
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
    return () => controller.abort();
  }, [id]);

  const salaryPreview = useMemo(() => buildMasterSalaryStructure(employee || {}, config), [employee, config]);

  const handleSalaryRevision = async () => {
    try {
      await api.post(`/employees/${id}/salary-revision`, revisionDraft);
      const res = await api.get(`/employees/${id}`);
      setEmployee(res.data);
      setRevisionDraft({
        newCTC: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: '',
      });
      setShowRevisionModal(false);
      toast.success('Salary revised successfully');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to revise salary');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 font-sans text-gray-900 space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!employee) {
    return <div className="container mx-auto p-6 text-red-600">Employee not found.</div>;
  }

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">{employee.firstName} {employee.lastName}</h1>
          <p className="text-gray-500 mt-1">{employee.employeeId} · {employee.designation || 'No designation'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowRevisionModal(true)} className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
            <FaHistory /> Revise Salary
          </button>
          <Link to={`/employees/${employee._id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
            <FaEdit /> Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Email" value={employee.email} />
            <Info label="Phone" value={employee.phone || '-'} />
            <Info label="Department" value={employee.department?.name || '-'} />
            <Info label="Joining Date" value={fmtDate(employee.joiningDate)} />
            <Info label="Date of Leaving" value={fmtDate(employee.dateOfLeaving)} />
            <Info label="Location" value={employee.location || '-'} />
            <Info label="Employment Type" value={employee.employmentType} />
            <Info label="Status" value={employee.status} />
            <Info label="PAN" value={employee.panNumber || '-'} />
            <Info label="UAN" value={employee.uanNumber || '-'} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">CTC Snapshot</h2>
          <div className="space-y-3 text-sm">
            <Info label="Monthly CTC" value={fmtMoney(employee.monthlyCTC)} strong />
            <Info label="Gross Salary" value={fmtMoney(salaryPreview.grossSalary)} />
            <Info label="Basic" value={fmtMoney(salaryPreview.basicMaster)} />
            <Info label="HRA" value={fmtMoney(salaryPreview.hraMaster)} />
            <Info label="PF Employer" value={fmtMoney(salaryPreview.pfEmployer)} />
            <Info label="Gratuity" value={fmtMoney(salaryPreview.gratuity)} />
            <Info label="Net Take-Home" value={fmtMoney(salaryPreview.netTakeHome)} strong />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-6 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold">Salary Revision History</div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Effective Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Previous CTC</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">New CTC</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employee.salaryRevisions?.length ? employee.salaryRevisions.map((revision, index) => (
              <tr key={`revision-${index}`}>
                <td className="px-6 py-4 text-sm">{fmtDate(revision.effectiveDate)}</td>
                <td className="px-6 py-4 text-sm text-right">{fmtMoney(revision.previousCTC)}</td>
                <td className="px-6 py-4 text-sm text-right font-semibold">{fmtMoney(revision.newCTC)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{revision.reason || '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No salary revisions recorded yet.</td></tr>
            )}
          </tbody>
        </table>
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
            ) : payrolls.map((payroll) => (
              <tr key={payroll._id}>
                <td className="px-6 py-4">
                  {new Date(0, payroll.month - 1).toLocaleString('en-US', { month: 'long' })} {payroll.year}
                </td>
                <td className="px-6 py-4 text-right font-semibold">{fmtMoney(payroll.netSalary)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${payrollStatusClass[payroll.status] || payrollStatusClass.draft}`}>
                    {payroll.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Link to={`/payroll/${payroll._id}/payslip`} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showRevisionModal} onClose={() => setShowRevisionModal(false)} title="Revise Salary">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">New Monthly CTC</label>
            <input
              type="number"
              min="0"
              value={revisionDraft.newCTC}
              onChange={(e) => setRevisionDraft((prev) => ({ ...prev, newCTC: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Effective Date</label>
            <input
              type="date"
              value={revisionDraft.effectiveDate}
              onChange={(e) => setRevisionDraft((prev) => ({ ...prev, effectiveDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 inline-block">Reason</label>
            <textarea
              value={revisionDraft.reason}
              onChange={(e) => setRevisionDraft((prev) => ({ ...prev, reason: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-24"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowRevisionModal(false)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={handleSalaryRevision} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Save Revision</button>
          </div>
        </div>
      </Modal>
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
