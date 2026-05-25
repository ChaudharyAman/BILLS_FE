import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import { DEFAULT_PAYROLL_CONFIG } from '../utils/payroll';

const PayrollSettings = () => {
  const [form, setForm] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchConfig = async () => {
      try {
        const res = await api.get('/payroll/config', { signal: controller.signal });
        setForm({ ...DEFAULT_PAYROLL_CONFIG, ...(res.data || {}) });
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error(error);
        toast.error('Failed to load payroll settings');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    return () => controller.abort();
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/payroll/config', Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])));
      toast.success('Payroll settings saved');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 font-sans text-gray-900 space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[620px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Payroll Settings</h1>
        <p className="text-gray-500 mt-1">Changes take effect on the next payroll run. Existing payroll records are not affected.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SettingsSection title="Salary Structure Rules" fields={[
          ['basicPercent', 'Basic % of Monthly CTC'],
          ['hraPercent', 'HRA % of Basic'],
        ]} form={form} updateField={updateField} />
        <SettingsSection title="Provident Fund" fields={[
          ['pfRate', 'PF Rate - Employee'],
          ['pfEmployerRate', 'PF Rate - Employer'],
          ['pfCap', 'PF Salary Ceiling'],
        ]} form={form} updateField={updateField} />
        <SettingsSection title="ESI" fields={[
          ['esiEmployeeRate', 'ESI Rate - Employee'],
          ['esiEmployerRate', 'ESI Rate - Employer'],
          ['esiBasicThreshold', 'ESI Applicable if Basic below'],
        ]} form={form} updateField={updateField} />
        <SettingsSection title="LWF (Labour Welfare Fund)" fields={[
          ['lwfEmployer', 'LWF - Employer'],
          ['lwfEmployee', 'LWF - Employee'],
        ]} form={form} updateField={updateField} />
        <SettingsSection title="Gratuity" fields={[
          ['gratuityRate', 'Gratuity Rate'],
        ]} form={form} updateField={updateField} />
        <SettingsSection title="Defaults" fields={[
          ['defaultWorkingDays', 'Default Working Days per Month'],
          ['defaultInsurance', 'Default Insurance Amount'],
          ['ltaMaxPercent', 'LTA Max % of Basic'],
        ]} form={form} updateField={updateField} />
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-semibold disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

const SettingsSection = ({ title, fields, form, updateField }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
    <h2 className="text-lg font-bold mb-4">{title}</h2>
    <div className="space-y-4">
      {fields.map(([key, label]) => (
        <div key={key}>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={form[key]}
            onChange={(e) => updateField(key, e.target.value)}
            className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      ))}
    </div>
  </div>
);

export default PayrollSettings;
