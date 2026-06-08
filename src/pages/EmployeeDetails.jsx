import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaEdit, FaHistory, FaTrash } from 'react-icons/fa';
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
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [config, setConfig] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const earningsList = useMemo(() => {
    const comps = config?.salaryComponents && config.salaryComponents.length > 0
      ? config.salaryComponents
      : [
          { id: 'basic', name: 'Basic Salary', type: 'earning' },
          { id: 'hra', name: 'HRA', type: 'earning' },
          { id: 'special', name: 'Special Allowance', type: 'earning' },
          { id: 'flexi', name: 'Flexi Allowance', type: 'earning' },
          { id: 'broadband', name: 'Broadband', type: 'earning' },
          { id: 'petrol', name: 'Petrol', type: 'earning' },
          { id: 'lta', name: 'LTA', type: 'earning' },
          { id: 'conveyance', name: 'Conveyance', type: 'earning' },
          { id: 'medical', name: 'Medical Allowance', type: 'earning' }
        ];
    return comps.filter(c => c.type === 'earning');
  }, [config]);

  const getEarningValue = (cId) => {
    if (salaryPreview.earningsMap && salaryPreview.earningsMap[cId] !== undefined) {
      return salaryPreview.earningsMap[cId];
    }
    if (cId === 'basic') return salaryPreview.basicMaster;
    if (cId === 'hra') return salaryPreview.hraMaster;
    if (cId === 'special') return salaryPreview.specialAllowance;
    if (cId === 'flexi') return salaryPreview.flexi;
    if (cId === 'broadband') return salaryPreview.broadband;
    if (cId === 'petrol') return salaryPreview.petrol;
    if (cId === 'lta') return salaryPreview.lta;
    if (cId === 'conveyance') return salaryPreview.conveyance;
    if (cId === 'medical') return salaryPreview.medicalAllowance;
    return employee?.salaryStructure?.[cId] || employee?.[cId] || 0;
  };


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

  const handleDelete = async () => {
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deleted successfully');
      navigate('/employees');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to delete employee');
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
          <h1 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h1>
          <p className="text-xs text-gray-500 mt-1">{employee.employeeId} · {employee.designation || 'No designation'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteModal(true)} className="bg-white border border-red-300 hover:bg-red-50 text-red-600 px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold">
            <FaTrash /> Delete
          </button>
          <button onClick={() => setShowRevisionModal(true)} className="bg-white border border-gray-300 hover:bg-gray-50 px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold">
            <FaHistory /> Revise Salary
          </button>
          <Link to={`/employees/${employee._id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold">
            <FaEdit /> Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-sm text-gray-700 mb-4">Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
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
          <h2 className="font-semibold text-sm text-gray-700 mb-4">CTC Snapshot</h2>
          <div className="space-y-2 text-xs">
            <Info label="Monthly CTC" value={fmtMoney(employee.monthlyCTC)} strong />
            <Info label="Gross Salary" value={fmtMoney(salaryPreview.grossSalary)} />
            
            {earningsList.map(c => {
              const val = getEarningValue(c.id);
              // Always show basic and HRA, show others if they are non-zero
              if (c.id === 'basic' || c.id === 'hra' || val > 0) {
                return (
                  <Info key={c.id} label={c.name || c.id} value={fmtMoney(val)} />
                );
              }
              return null;
            })}

            <Info label="PF Employer" value={fmtMoney(salaryPreview.pfEmployer)} />
            <Info label="Gratuity" value={fmtMoney(salaryPreview.gratuity)} />
            <Info label="Insurance" value={fmtMoney(salaryPreview.insurance)} />
            {salaryPreview.employerNPS > 0 && (
              <Info label="Employer NPS" value={fmtMoney(salaryPreview.employerNPS)} />
            )}
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

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Employee">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</span>?
          </p>
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            This will also remove all associated payroll records, expenses, loans, reimbursement claims, and project team references. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg border bg-white text-sm font-semibold">Cancel</button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete Permanently</button>
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
