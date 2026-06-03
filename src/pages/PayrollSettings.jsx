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
    // Strip out old duplicate statutory components if present in DB config
    if (c.id && ![
      'pf_rate_employee', 'pf_rate_employer', 'pf_salary_ceiling',
      'esi_rate_employee', 'esi_rate_employer', 'esi_threshold',
      'lwf_employer', 'lwf_employee', 'gratuity_rate',
      'default_working_days', 'default_insurance_amount', 'lta_max_percent'
    ].includes(c.id)) {
      map.set(c.id, { ...c });
    }
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
  return ['basic', 'hra', 'special'].includes(id);
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
          { id: newId, name: '', type: 'earning', taxable: true, linkedTo: 'fixed', linkValue: 0, frequency: 'monthly', isCustom: true }
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
        if (key === 'name' && (current[index].id?.startsWith('custom_') || current[index].isCustom)) {
          const cleanName = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
          current[index].id = cleanName ? `custom_${cleanName}` : `custom_${Date.now()}`;
          current[index].isCustom = true;
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

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
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
      <div className="container mx-auto p-4 font-sans text-gray-900 space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[580px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 font-sans text-gray-900">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Payroll Settings</h1>
        <p className="text-gray-500 text-xs mt-0.5">Changes take effect on the next payroll run. Existing payroll records are not affected.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Salary Components Section */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold">Salary Components</h2>
            <button
              type="button"
              onClick={addComponent}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md text-xs font-semibold"
            >
              + Add Component
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2 px-1.5">Component Name</th>
                  <th className="py-2 px-1.5">Type</th>
                  <th className="py-2 px-1.5">Taxable</th>
                  <th className="py-2 px-1.5">Linked to</th>
                  <th className="py-2 px-1.5">Link Value</th>
                  <th className="py-2 px-1.5">Frequency</th>
                  <th className="py-2 px-1.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {form.salaryComponents?.map((c, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="py-1 px-1.5">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateComponent(index, 'name', e.target.value)}
                        className="border border-gray-300 rounded-md px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Component name"
                      />
                    </td>
                    <td className="py-1 px-1.5">
                      <select
                        value={c.type}
                        onChange={(e) => updateComponent(index, 'type', e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="earning">Earning</option>
                        <option value="deduction">Deduction</option>
                      </select>
                    </td>
                    <td className="py-1 px-1.5">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={!!c.taxable}
                          onChange={(e) => updateComponent(index, 'taxable', e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="py-1 px-1.5">
                      <select
                        value={c.linkedTo}
                        onChange={(e) => updateComponent(index, 'linkedTo', e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ctc_percent">CTC %</option>
                        <option value="basic_percent">Basic %</option>
                        <option value="fixed">Fixed</option>
                        <option value="remainder">Remainder</option>
                      </select>
                    </td>
                    <td className="py-1 px-1.5">
                      {c.linkedTo !== 'remainder' ? (
                        <div className="relative rounded-md shadow-sm w-full">
                          {c.linkedTo === 'fixed' && (
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">
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
                            className={`border border-gray-300 rounded-md py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                              c.linkedTo === 'fixed' ? 'pl-7 pr-2.5' : (['ctc_percent', 'basic_percent'].includes(c.linkedTo) ? 'pl-2.5 pr-7' : 'px-2.5')
                            }`}
                            placeholder="0.00"
                          />
                          {['ctc_percent', 'basic_percent'].includes(c.linkedTo) && (
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">
                              %
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          disabled
                          value="Calculated remainder"
                          className="border border-gray-200 bg-gray-50 text-gray-400 rounded-md px-2.5 py-1 text-xs w-full cursor-not-allowed"
                        />
                      )}
                    </td>
                    <td className="py-1 px-1.5">
                      <select
                        value={c.frequency || 'monthly'}
                        onChange={(e) => updateComponent(index, 'frequency', e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="semi_annually">Semi-Annually (6M)</option>
                        <option value="annually">Annually</option>
                      </select>
                    </td>
                    <td className="py-1 px-1.5 text-right">
                      {isStatutoryOrSpecial(c.id) ? (
                        <span className="text-gray-300 cursor-not-allowed p-1 inline-block" title="Statutory/Core components cannot be deleted">
                          <svg className="w-4 h-4 inline-block opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!form.salaryComponents || form.salaryComponents.length === 0) && (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-gray-500 text-xs">
                      No components configured. Will fall back to hardcoded default rules.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statutory Rules & Compliance Section */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-gray-100">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h2 className="text-base font-bold">Statutory Rules & Compliance</h2>
              <p className="text-[11px] text-gray-500">Configure global statutory contribution rates, thresholds, caps and payroll defaults.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Provident Fund Card */}
            <div className="bg-gray-50/50 rounded-xl border border-gray-150 p-3 hover:border-blue-100 transition-colors">
              <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                <span className="w-1 h-2.5 bg-blue-600 rounded-full mr-1.5"></span>
                Provident Fund (PF)
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee PF Rate</label>
                    <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-amber-50 text-amber-700">Deducted from Salary</span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      step="0.01"
                      value={form.pfRate !== undefined ? Math.round(form.pfRate * 10000) / 100 : ''}
                      onChange={(e) => handleFieldChange('pfRate', e.target.value === '' ? 0 : Number(e.target.value) / 100)}
                      className="border border-gray-300 rounded-md pl-2.5 pr-7 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">%</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employer PF Rate</label>
                    <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-blue-50 text-blue-700">Paid by Company</span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      step="0.01"
                      value={form.pfEmployerRate !== undefined ? Math.round(form.pfEmployerRate * 10000) / 100 : ''}
                      onChange={(e) => handleFieldChange('pfEmployerRate', e.target.value === '' ? 0 : Number(e.target.value) / 100)}
                      className="border border-gray-300 rounded-md pl-2.5 pr-7 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">%</div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Monthly PF Salary Ceiling</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">₹</div>
                    <input
                      type="number"
                      value={form.pfCap !== undefined ? form.pfCap : ''}
                      onChange={(e) => handleFieldChange('pfCap', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="border border-gray-300 rounded-md pl-7 pr-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ESI Card */}
            <div className="bg-gray-50/50 rounded-xl border border-gray-150 p-3 hover:border-blue-100 transition-colors">
              <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                <span className="w-1 h-2.5 bg-blue-600 rounded-full mr-1.5"></span>
                State Insurance (ESI)
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee ESI Rate</label>
                    <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-amber-50 text-amber-700">Deducted from Salary</span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      step="0.01"
                      value={form.esiEmployeeRate !== undefined ? Math.round(form.esiEmployeeRate * 10000) / 100 : ''}
                      onChange={(e) => handleFieldChange('esiEmployeeRate', e.target.value === '' ? 0 : Number(e.target.value) / 100)}
                      className="border border-gray-300 rounded-md pl-2.5 pr-7 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">%</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employer ESI Rate</label>
                    <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-blue-50 text-blue-700">Paid by Company</span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      step="0.01"
                      value={form.esiEmployerRate !== undefined ? Math.round(form.esiEmployerRate * 10000) / 100 : ''}
                      onChange={(e) => handleFieldChange('esiEmployerRate', e.target.value === '' ? 0 : Number(e.target.value) / 100)}
                      className="border border-gray-300 rounded-md pl-2.5 pr-7 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">%</div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">ESI Applicability Threshold</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">₹</div>
                    <input
                      type="number"
                      value={form.esiBasicThreshold !== undefined ? form.esiBasicThreshold : ''}
                      onChange={(e) => handleFieldChange('esiBasicThreshold', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="border border-gray-300 rounded-md pl-7 pr-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* LWF & Gratuity Card */}
            <div className="bg-gray-50/50 rounded-xl border border-gray-150 p-3 hover:border-blue-100 transition-colors">
              <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                <span className="w-1 h-2.5 bg-blue-600 rounded-full mr-1.5"></span>
                LWF & Gratuity
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee LWF Share</label>
                    <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-amber-50 text-amber-700">Deducted from Salary</span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">₹</div>
                    <input
                      type="number"
                      value={form.lwfEmployee !== undefined ? form.lwfEmployee : ''}
                      onChange={(e) => handleFieldChange('lwfEmployee', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="border border-gray-300 rounded-md pl-7 pr-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employer LWF Share</label>
                    <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-blue-50 text-blue-700">Paid by Company</span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">₹</div>
                    <input
                      type="number"
                      value={form.lwfEmployer !== undefined ? form.lwfEmployer : ''}
                      onChange={(e) => handleFieldChange('lwfEmployer', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="border border-gray-300 rounded-md pl-7 pr-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Gratuity Accrual Rate</label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      step="0.0001"
                      value={form.gratuityRate !== undefined ? Math.round(form.gratuityRate * 1000000) / 10000 : ''}
                      onChange={(e) => handleFieldChange('gratuityRate', e.target.value === '' ? 0 : Number(e.target.value) / 100)}
                      className="border border-gray-300 rounded-md pl-2.5 pr-7 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Settings Card */}
            <div className="bg-gray-50/50 rounded-xl border border-gray-150 p-3 hover:border-blue-100 transition-colors">
              <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                <span className="w-1 h-2.5 bg-blue-600 rounded-full mr-1.5"></span>
                General Policies
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Default Working Days</label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      value={form.defaultWorkingDays !== undefined ? form.defaultWorkingDays : ''}
                      onChange={(e) => handleFieldChange('defaultWorkingDays', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Default Monthly Insurance</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">₹</div>
                    <input
                      type="number"
                      value={form.defaultInsurance !== undefined ? form.defaultInsurance : ''}
                      onChange={(e) => handleFieldChange('defaultInsurance', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="border border-gray-300 rounded-md pl-7 pr-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">LTA Maximum Percent</label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      step="0.01"
                      value={form.ltaMaxPercent !== undefined ? Math.round(form.ltaMaxPercent * 10000) / 100 : ''}
                      onChange={(e) => handleFieldChange('ltaMaxPercent', e.target.value === '' ? 0 : Number(e.target.value) / 100)}
                      className="border border-gray-300 rounded-md pl-2.5 pr-7 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="mt-4 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-semibold disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default PayrollSettings;
