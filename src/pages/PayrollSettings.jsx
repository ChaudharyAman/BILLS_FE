import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import { DEFAULT_PAYROLL_CONFIG } from '../utils/payroll';

const CONFIG_FIELD_TO_COMPONENT_ID = {
  basicPercent: 'basic',
  hraPercent: 'hra',
  pfRate: 'pf_rate_employee',
  pfEmployerRate: 'pf_rate_employer',
  pfCap: 'pf_salary_ceiling',
  esiEmployeeRate: 'esi_rate_employee',
  esiEmployerRate: 'esi_rate_employer',
  esiBasicThreshold: 'esi_threshold',
  lwfEmployer: 'lwf_employer',
  lwfEmployee: 'lwf_employee',
  gratuityRate: 'gratuity_rate',
  defaultWorkingDays: 'default_working_days',
  defaultInsurance: 'default_insurance_amount',
  ltaMaxPercent: 'lta_max_percent',
};

const COMPONENT_ID_TO_CONFIG_FIELD = Object.fromEntries(
  Object.entries(CONFIG_FIELD_TO_COMPONENT_ID).map(([k, v]) => [v, k])
);

const getBaselineComponents = (config) => [
  { id: 'basic',                    name: 'Basic Salary',                  type: 'earning',   taxable: true,  linkedTo: 'ctc_percent',   linkValue: config.basicPercent ?? 0.5,           frequency: 'monthly' },
  { id: 'hra',                      name: 'HRA',                           type: 'earning',   taxable: false, linkedTo: 'basic_percent', linkValue: config.hraPercent ?? 0.5,             frequency: 'monthly' },
  { id: 'pf_rate_employee',         name: 'PF Rate - Employee',            type: 'deduction', taxable: false, linkedTo: 'basic_percent', linkValue: config.pfRate ?? 0.12,               frequency: 'monthly' },
  { id: 'pf_rate_employer',         name: 'PF Rate - Employer',            type: 'deduction', taxable: false, linkedTo: 'basic_percent', linkValue: config.pfEmployerRate ?? 0.12,       frequency: 'monthly' },
  { id: 'pf_salary_ceiling',        name: 'PF Salary Ceiling',             type: 'deduction', taxable: false, linkedTo: 'fixed',         linkValue: config.pfCap ?? 15000,                frequency: 'monthly' },
  { id: 'esi_rate_employee',        name: 'ESI Rate - Employee',           type: 'deduction', taxable: false, linkedTo: 'ctc_percent',   linkValue: config.esiEmployeeRate ?? 0.0075,     frequency: 'monthly' },
  { id: 'esi_rate_employer',        name: 'ESI Rate - Employer',           type: 'deduction', taxable: false, linkedTo: 'ctc_percent',   linkValue: config.esiEmployerRate ?? 0.0325,     frequency: 'monthly' },
  { id: 'esi_threshold',            name: 'ESI Applicable if Basic below', type: 'deduction', taxable: false, linkedTo: 'fixed',         linkValue: config.esiBasicThreshold ?? 21000,    frequency: 'monthly' },
  { id: 'lwf_employer',             name: 'LWF - Employer',                type: 'deduction', taxable: false, linkedTo: 'fixed',         linkValue: config.lwfEmployer ?? 35,             frequency: 'monthly' },
  { id: 'lwf_employee',             name: 'LWF - Employee',                type: 'deduction', taxable: false, linkedTo: 'fixed',         linkValue: config.lwfEmployee ?? 15,             frequency: 'monthly' },
  { id: 'gratuity_rate',            name: 'Gratuity Rate',                 type: 'deduction', taxable: false, linkedTo: 'basic_percent', linkValue: config.gratuityRate ?? 0.12,         frequency: 'monthly' },
  { id: 'default_working_days',     name: 'Default Working Days per Month',type: 'earning',   taxable: false, linkedTo: 'fixed',         linkValue: config.defaultWorkingDays ?? 30,      frequency: 'monthly' },
  { id: 'default_insurance_amount', name: 'Default Insurance Amount',       type: 'deduction', taxable: false, linkedTo: 'fixed',         linkValue: config.defaultInsurance ?? 0,         frequency: 'monthly' },
  { id: 'lta_max_percent',          name: 'LTA Max % of Basic',            type: 'earning',   taxable: false, linkedTo: 'basic_percent', linkValue: config.ltaMaxPercent ?? 0.0833,       frequency: 'monthly' },
];

const mergeSalaryComponents = (loadedComponents, config) => {
  const baselines = getBaselineComponents(config);
  const others = [
    { id: 'special',          name: 'Special Allowance',  type: 'earning',   taxable: true,  linkedTo: 'remainder',   linkValue: 0, frequency: 'monthly' },
    { id: 'flexi',            name: 'Flexi Allowance',    type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'broadband',        name: 'Broadband',          type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'petrol',           name: 'Petrol',             type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'lta',              name: 'LTA',                type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'conveyance',       name: 'Conveyance',         type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'medical',          name: 'Medical Allowance',  type: 'earning',   taxable: false, linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
  ];

  // Build a canonical map keyed by id — last write wins
  const map = new Map();

  if (!loadedComponents || loadedComponents.length === 0) {
    // No saved data — build default ordering: basic, hra, earnings, statutory
    const basicComp = baselines.find(b => b.id === 'basic');
    const hraComp = baselines.find(b => b.id === 'hra');
    if (basicComp) map.set('basic', basicComp);
    if (hraComp) map.set('hra', hraComp);
    others.forEach(o => map.set(o.id, o));
    baselines.forEach(b => {
      if (!map.has(b.id)) map.set(b.id, b);
    });
    return Array.from(map.values());
  }

  // Seed with loaded components (preserve user ordering)
  loadedComponents.forEach(c => {
    if (c.id) map.set(c.id, { ...c });
  });

  // Merge baselines — update linkValue from config, enforce canonical fields
  baselines.forEach(b => {
    if (map.has(b.id)) {
      const existing = map.get(b.id);
      map.set(b.id, { ...b, ...existing, linkValue: b.linkValue });
    } else {
      map.set(b.id, b);
    }
  });

  // Ensure default earning components exist
  others.forEach(o => {
    if (!map.has(o.id)) map.set(o.id, o);
  });

  return Array.from(map.values());
};

const isStatutoryOrSpecial = (id) => {
  return !!COMPONENT_ID_TO_CONFIG_FIELD[id] || id === 'special';
};

const PayrollSettings = () => {
  const [form, setForm] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchConfig = async () => {
      try {
        const res = await api.get('/payroll/config', { signal: controller.signal });
        const data = res.data || {};
        const mergedConfig = {
          ...DEFAULT_PAYROLL_CONFIG,
          ...data
        };
        const mergedComponents = mergeSalaryComponents(data.salaryComponents, mergedConfig);

        setForm({
          ...mergedConfig,
          salaryComponents: mergedComponents
        });
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


  const addComponent = () => {
    setForm((prev) => {
      const current = prev.salaryComponents || [];
      const newId = `custom_${Date.now()}`;
      return {
        ...prev,
        salaryComponents: [
          ...current,
          { id: newId, name: '', type: 'earning', taxable: true, linkedTo: 'fixed', linkValue: 0, frequency: 'monthly' }
        ]
      };
    });
  };

  const updateComponent = (index, key, value) => {
    setForm((prev) => {
      const current = prev.salaryComponents ? [...prev.salaryComponents] : [];
      if (current[index]) {
        current[index] = {
          ...current[index],
          [key]: value
        };
        if (key === 'name' && current[index].id?.startsWith('custom_')) {
          const generatedId = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
          current[index].id = generatedId || current[index].id;
        }

        // Two-way binding: If linkValue is updated and it matches a config field, sync it
        if (key === 'linkValue') {
          const configField = COMPONENT_ID_TO_CONFIG_FIELD[current[index].id];
          if (configField) {
            return {
              ...prev,
              [configField]: value,
              salaryComponents: current
            };
          }
        }
      }
      return { ...prev, salaryComponents: current };
    });
  };

  const deleteComponent = (index) => {
    setForm((prev) => {
      const current = prev.salaryComponents ? [...prev.salaryComponents] : [];
      current.splice(index, 1);
      return { ...prev, salaryComponents: current };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {};
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'salaryComponents') {
          const seen = new Set();
          payload[key] = Array.isArray(value) ? value
            .filter(c => c.id) // skip entries with no id
            .map(c => ({
              id: c.id,
              name: c.name || '',
              type: c.type || 'earning',
              taxable: !!c.taxable,
              linkedTo: c.linkedTo || 'fixed',
              linkValue: c.linkedTo === 'remainder' ? 0 : Number(c.linkValue) || 0,
              frequency: c.frequency || 'monthly'
            }))
            .filter(c => {
              if (seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            }) : [];
        } else {
          payload[key] = Number(value);
        }
      });

      await api.put('/payroll/config', payload);
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

      <div className="grid grid-cols-1 gap-6">
        {/* Salary Components Section */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Salary Components</h2>
            <button
              type="button"
              onClick={addComponent}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              + Add Component
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-2">Component Name</th>
                  <th className="py-3 px-2">Type</th>
                  <th className="py-3 px-2">Taxable</th>
                  <th className="py-3 px-2">Linked to</th>
                  <th className="py-3 px-2">Link Value</th>
                  <th className="py-3 px-2">Frequency</th>
                  <th className="py-3 px-2 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {form.salaryComponents?.map((c, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateComponent(index, 'name', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Component name"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={c.type}
                        onChange={(e) => updateComponent(index, 'type', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="earning">Earning</option>
                        <option value="deduction">Deduction</option>
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={!!c.taxable}
                          onChange={(e) => updateComponent(index, 'taxable', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={c.linkedTo}
                        onChange={(e) => updateComponent(index, 'linkedTo', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ctc_percent">CTC %</option>
                        <option value="basic_percent">Basic %</option>
                        <option value="fixed">Fixed</option>
                        <option value="remainder">Remainder</option>
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      {c.linkedTo !== 'remainder' ? (
                        <div className="relative rounded-lg shadow-sm w-full">
                          {c.linkedTo === 'fixed' && (
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">
                              ₹
                            </div>
                          )}
                          <input
                            type="number"
                            step={['ctc_percent', 'basic_percent'].includes(c.linkedTo) ? '1' : '0.01'}
                            min="0"
                            value={
                              ['ctc_percent', 'basic_percent'].includes(c.linkedTo)
                                ? (c.linkValue !== undefined && c.linkValue !== null ? Math.round(Number(c.linkValue) * 10000) / 100 : '')
                                : c.linkValue
                            }
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              const finalVal = ['ctc_percent', 'basic_percent'].includes(c.linkedTo)
                                ? (val === '' ? 0 : val / 100)
                                : val;
                              updateComponent(index, 'linkValue', finalVal);
                            }}
                            className={`border border-gray-300 rounded-lg py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              c.linkedTo === 'fixed' ? 'pl-8 pr-3' : (['ctc_percent', 'basic_percent'].includes(c.linkedTo) ? 'pl-3 pr-8' : 'px-3')
                            }`}
                            placeholder="0.00"
                          />
                          {['ctc_percent', 'basic_percent'].includes(c.linkedTo) && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 text-sm font-semibold">
                              %
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          disabled
                          value="Calculated remainder"
                          className="border border-gray-200 bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-sm w-full cursor-not-allowed"
                        />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={c.frequency || 'monthly'}
                        onChange={(e) => updateComponent(index, 'frequency', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="semi_annually">Semi-Annually (6M)</option>
                        <option value="annually">Annually</option>
                      </select>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {isStatutoryOrSpecial(c.id) ? (
                        <span className="text-gray-300 cursor-not-allowed p-1 inline-block" title="Statutory/Core components cannot be deleted">
                          <svg className="w-5 h-5 inline-block opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => deleteComponent(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete component"
                        >
                          <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!form.salaryComponents || form.salaryComponents.length === 0) && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-500 text-sm">
                      No components configured. Will fall back to hardcoded default rules.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-semibold disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default PayrollSettings;
