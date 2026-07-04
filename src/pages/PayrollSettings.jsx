import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
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
    { id: 'special',          name: 'Special Allowance',  type: 'earning',   taxable: true,  linkedTo: 'fixed',       linkValue: 0, frequency: 'monthly' },
    { id: 'flexi',            name: 'Flexi Allowance',    type: 'earning',   taxable: false, linkedTo: 'remainder',   linkValue: 0, frequency: 'monthly' },
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

  // We do not force other default earning components if the user has custom saved components
  // others.forEach(o => {
  //   if (!map.has(o.id)) map.set(o.id, o);
  // });

  return Array.from(map.values());
};

const isStatutoryOrSpecial = (id) => {
  return ['basic', 'hra'].includes(id);
};

const PayrollSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [form, setForm] = useState(DEFAULT_PAYROLL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [integration, setIntegration] = useState({
    enabled: false,
    externalTenantId: '',
    apiUrl: '',
    apiKey: '',
    encryptionSecret: '',
    webhookSecret: ''
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchConfig = async () => {
      try {
        const [configRes, settingsRes] = await Promise.all([
          api.get('/payroll/config', { signal: controller.signal }),
          api.get('/settings', { signal: controller.signal })
        ]);
        
        const data = configRes.data || {};
        const mergedConfig = {
          ...DEFAULT_PAYROLL_CONFIG,
          ...data
        };
        const mergedComponents = mergeSalaryComponents(data.salaryComponents, mergedConfig);

        setForm({
          ...mergedConfig,
          salaryComponents: mergedComponents
        });

        if (settingsRes.data?.integration) {
          setIntegration({
            enabled: !!settingsRes.data.integration.enabled,
            externalTenantId: settingsRes.data.integration.externalTenantId || '',
            apiUrl: settingsRes.data.integration.apiUrl || '',
            apiKey: settingsRes.data.integration.apiKey || '',
            encryptionSecret: settingsRes.data.integration.encryptionSecret || '',
            webhookSecret: settingsRes.data.integration.webhookSecret || ''
          });
        }
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

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const res = await api.get('/roles');
      setRoles(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchRoles();
    }
  }, [activeTab]);

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      if (!editingRole.name.trim()) {
        toast.error('Role name is required');
        return;
      }
      const payload = {
        ...editingRole,
        monthlyCTC: editingRole.payType === 'salaried' ? Number(editingRole.monthlyCTC) : 0,
        hourlyRate: editingRole.payType === 'hourly' ? Number(editingRole.hourlyRate) : 0,
        basicPercent: editingRole.basicPercent !== '' && editingRole.basicPercent !== null ? Number(editingRole.basicPercent) : null,
        hraPercent: editingRole.hraPercent !== '' && editingRole.hraPercent !== null ? Number(editingRole.hraPercent) : null,
      };
      if (editingRole._id) {
        await api.put(`/roles/${editingRole._id}`, payload);
        toast.success('Role updated successfully');
      } else {
        await api.post('/roles', payload);
        toast.success('Role created successfully');
      }
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete role');
    }
  };

  const handleNewRole = () => {
    setEditingRole({
      name: '',
      description: '',
      employmentType: 'full-time',
      payType: 'salaried',
      useSalaryComponents: true,
      monthlyCTC: 0,
      hourlyRate: 0,
      basicPercent: '',
      hraPercent: '',
      pfEnabled: true,
      esiEnabled: true,
      ptEnabled: true,
      lwfEnabled: true,
      gratuityEnabled: true,
      includePfInCTC: false,
      includeGratuityInCTC: true,
    });
  };

  const handleSyncEmployees = async () => {
    try {
      setSyncing(true);
      // Auto-save integration settings first to ensure DB state matches UI before sync runs
      await api.put('/settings', { integration });
      const res = await api.post('/payroll/integration/sync-employees');
      setSyncResult(res.data);
      setIsModalOpen(true);
      toast.success(`Sync Complete! Created: ${res.data.created}, Updated: ${res.data.updated}`);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to sync employee directory');
    } finally {
      setSyncing(false);
    }
  };



  const addComponent = () => {
    setForm((prev) => {
      const current = prev.salaryComponents || [];
      const newId = `custom_${Date.now()}`;
      return {
        ...prev,
        salaryComponents: [
          ...current,
          // _idFrozen=false: ID may still be set from the name on first entry
          { id: newId, name: '', type: 'earning', taxable: true, linkedTo: 'fixed', linkValue: 0, frequency: 'monthly', isCustom: true, _idFrozen: false }
        ]
      };
    });
  };

  const resetToDefaults = () => {
    const mergedComponents = mergeSalaryComponents(null, DEFAULT_PAYROLL_CONFIG);
    setForm({
      ...DEFAULT_PAYROLL_CONFIG,
      salaryComponents: mergedComponents
    });
    toast.success('Initialized defaults. Click Save Settings to persist.');
  };

  const updateComponent = (index, key, value) => {
    setForm((prev) => {
      const current = prev.salaryComponents ? [...prev.salaryComponents] : [];
      if (current[index]) {
        current[index] = {
          ...current[index],
          [key]: value
        };
        // Only derive ID from name if the component ID has NOT yet been frozen.
        // Once an ID is frozen (component was saved or name was first set), renaming
        // must never change the ID — doing so would orphan all payroll records
        // that reference the old ID.
        if (key === 'name' && current[index].isCustom && !current[index]._idFrozen) {
          if (value.trim()) {
            const cleanName = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
            current[index].id = cleanName ? `custom_${cleanName}` : current[index].id;
            current[index]._idFrozen = true; // Freeze ID now that a real name has been entered
          }
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
      const components = form.salaryComponents || [];
      const remainderComps = components.filter(c => c.linkedTo === 'remainder');
      if (remainderComps.length > 1) {
        toast.error(`Only one salary component can be linked to 'Remainder'. Found: ${remainderComps.map(c => c.name || 'Unnamed').join(', ')}`);
        return;
      }

      const names = new Set();
      for (const c of components) {
        const trimmedName = (c.name || '').trim();
        if (!trimmedName) {
          toast.error('Component name cannot be empty');
          return;
        }
        const lowerName = trimmedName.toLowerCase();
        if (names.has(lowerName)) {
          toast.error(`Component name "${trimmedName}" is duplicated. All component names must be unique.`);
          return;
        }
        names.add(lowerName);
      }

      const hasBasic = components.some(c => c.id === 'basic');
      const hasHra = components.some(c => c.id === 'hra');
      if (!hasBasic || !hasHra) {
        toast.error('Basic Salary and HRA are core components and must be present.');
        return;
      }

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
        } else if (key === 'pfCalculationType') {
          payload[key] = value;
        } else {
          payload[key] = Number(value);
        }
      });

      await Promise.all([
        api.put('/payroll/config', payload),
        api.put('/settings', { integration })
      ]);
      toast.success('Payroll settings saved successfully');
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('general');
            setEditingRole(null);
          }}
          className={`py-2 px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`py-2 px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors ${
            activeTab === 'roles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Job Roles & Pay Grades
        </button>
      </div>

      {activeTab === 'general' && (
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
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Calculation Type</label>
                  <select
                    value={form.pfCalculationType || 'percent'}
                    onChange={(e) => handleFieldChange('pfCalculationType', e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="percent">Percentage of Ceiling</option>
                    <option value="fixed">Fixed Flat Amount</option>
                  </select>
                </div>

                {form.pfCalculationType === 'fixed' ? (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employee PF Amount</label>
                        <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-amber-50 text-amber-700">Deducted from Salary</span>
                      </div>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">₹</div>
                        <input
                          type="number"
                          value={form.pfAmountEmployee !== undefined ? form.pfAmountEmployee : ''}
                          onChange={(e) => handleFieldChange('pfAmountEmployee', e.target.value === '' ? 0 : Number(e.target.value))}
                          className="border border-gray-300 rounded-md pl-7 pr-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Employer PF Amount</label>
                        <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-blue-50 text-blue-700">Paid by Company</span>
                      </div>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400 text-xs font-semibold">₹</div>
                        <input
                          type="number"
                          value={form.pfAmountEmployer !== undefined ? form.pfAmountEmployer : ''}
                          onChange={(e) => handleFieldChange('pfAmountEmployer', e.target.value === '' ? 0 : Number(e.target.value))}
                          className="border border-gray-300 rounded-md pl-7 pr-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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

        {/* HRMS Integration Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <div>
                <h2 className="text-base font-bold">HRMS & Attendance Integration</h2>
                <p className="text-[11px] text-gray-500">Configure connection settings to securely sync employee directories and monthly attendance from your external multi-tenant HRMS.</p>
              </div>
            </div>
            {integration.enabled && (
              <button
                type="button"
                onClick={handleSyncEmployees}
                disabled={syncing}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60 transition-colors"
              >
                {syncing ? 'Syncing...' : 'Sync Employee Profiles Now'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hrms-enabled"
                  checked={integration.enabled}
                  onChange={(e) => setIntegration(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="hrms-enabled" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">Enable HRMS Integration</label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">HRMS API Base URL</label>
                <input
                  type="text"
                  placeholder="https://api.myhrms.com"
                  value={integration.apiUrl}
                  onChange={(e) => setIntegration(prev => ({ ...prev, apiUrl: e.target.value }))}
                  className="border border-gray-300 rounded-md px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={!integration.enabled}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">External Tenant ID / Organisation ID</label>
                <input
                  type="text"
                  placeholder="org_12345"
                  value={integration.externalTenantId}
                  onChange={(e) => setIntegration(prev => ({ ...prev, externalTenantId: e.target.value }))}
                  className="border border-gray-300 rounded-md px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={!integration.enabled}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">External API Secret Token / API Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={integration.apiKey}
                  onChange={(e) => setIntegration(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="border border-gray-300 rounded-md px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={!integration.enabled}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">AES-256 Symmetric Payload Encryption Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={integration.encryptionSecret}
                  onChange={(e) => setIntegration(prev => ({ ...prev, encryptionSecret: e.target.value }))}
                  className="border border-gray-300 rounded-md px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={!integration.enabled}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">HMAC Signature Webhook Secret Verification Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={integration.webhookSecret}
                  onChange={(e) => setIntegration(prev => ({ ...prev, webhookSecret: e.target.value }))}
                  className="border border-gray-300 rounded-md px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={!integration.enabled}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={resetToDefaults} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded-md text-xs font-semibold">
            Reset to Defaults
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-semibold disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          {editingRole ? (
            /* Create / Edit Role Form */
            <form onSubmit={handleSaveRole} className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h2 className="text-lg font-bold text-gray-800">
                  {editingRole._id ? 'Edit Job Role' : 'Create New Job Role'}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="text-gray-500 hover:text-gray-700 text-xs font-semibold flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side: General Profile Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                      placeholder="e.g. Senior Software Engineer"
                      className="border border-gray-300 rounded-md px-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Employment Type
                    </label>
                    <select
                      value={editingRole.employmentType || 'full-time'}
                      onChange={(e) => {
                        const et = e.target.value;
                        setEditingRole(prev => ({
                          ...prev,
                          employmentType: et,
                          // Auto-configure intern defaults
                          ...(et === 'intern' ? {
                            useSalaryComponents: false,
                            pfEnabled: false,
                            esiEnabled: false,
                            ptEnabled: false,
                            lwfEnabled: false,
                            gratuityEnabled: false,
                            includePfInCTC: false,
                            includeGratuityInCTC: false,
                          } : {}),
                          // Restore salaried defaults when switching away from intern
                          ...(prev.employmentType === 'intern' && et !== 'intern' ? {
                            useSalaryComponents: true,
                            pfEnabled: true,
                            esiEnabled: true,
                            ptEnabled: true,
                            lwfEnabled: true,
                            gratuityEnabled: true,
                            includePfInCTC: false,
                            includeGratuityInCTC: true,
                          } : {}),
                        }));
                      }}
                      className="border border-gray-300 rounded-md px-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern / Trainee</option>
                    </select>
                    {editingRole.employmentType === 'intern' && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">🎓 Auto-configured: flat stipend, statutory deductions disabled.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      value={editingRole.description || ''}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      placeholder="Brief description of the job responsibilities and pay guidelines"
                      rows="2"
                      className="border border-gray-300 rounded-md px-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  {/* Pay Contract Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Pay Contract Type
                    </label>
                    <select
                      value={editingRole.payType}
                      onChange={(e) => setEditingRole({ ...editingRole, payType: e.target.value })}
                      className="border border-gray-300 rounded-md px-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="salaried">Salaried (Monthly)</option>
                      <option value="hourly">Hourly Contractor</option>
                    </select>
                  </div>

                  {/* Hourly Rate — only for hourly */}
                  {editingRole.payType === 'hourly' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Hourly Rate
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 text-xs font-semibold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={editingRole.hourlyRate}
                          onChange={(e) => setEditingRole({ ...editingRole, hourlyRate: e.target.value })}
                          className="border border-gray-300 rounded-md pl-6 pr-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Paid per hour logged. No salary breakdown applied.</p>
                    </div>
                  )}

                  {/* Salaried fields */}
                  {editingRole.payType === 'salaried' && (
                    <>
                      {/* Salary mode toggle */}
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <div>
                          <p className="text-xs font-bold text-gray-700">Use Salary Components</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Break salary into Basic, HRA, etc. Disable for a flat monthly amount.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingRole({ ...editingRole, useSalaryComponents: !editingRole.useSalaryComponents })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            editingRole.useSalaryComponents !== false ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            editingRole.useSalaryComponents !== false ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Monthly CTC */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Monthly CTC
                        </label>
                        <div className="relative rounded-md shadow-sm">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 text-xs font-semibold">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={editingRole.monthlyCTC}
                            onChange={(e) => setEditingRole({ ...editingRole, monthlyCTC: e.target.value })}
                            className="border border-gray-300 rounded-md pl-6 pr-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        {editingRole.useSalaryComponents === false && (
                          <p className="text-[10px] text-gray-400 mt-1">Paid as a single flat amount. No component breakdown.</p>
                        )}
                      </div>

                      {/* Basic % / HRA % — only when using components */}
                      {editingRole.useSalaryComponents !== false && (
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                              Basic Salary % (Override)
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 50"
                              min="0"
                              max="100"
                              value={editingRole.basicPercent ?? ''}
                              onChange={(e) => setEditingRole({ ...editingRole, basicPercent: e.target.value })}
                              className="border border-gray-300 rounded-md px-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Leave empty to use org default.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                              HRA % (Override)
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 50"
                              min="0"
                              max="100"
                              value={editingRole.hraPercent ?? ''}
                              onChange={(e) => setEditingRole({ ...editingRole, hraPercent: e.target.value })}
                              className="border border-gray-300 rounded-md px-3 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Leave empty to use org default.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Right Side: Statutory Switches — salaried only */}
                {editingRole.payType === 'salaried' ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center">
                      <span className="w-1.5 h-3 bg-blue-600 rounded-full mr-2"></span>
                      Statutory Rules & Deductions
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 cursor-pointer" htmlFor="pfEnabled">Enable Provident Fund (PF)</label>
                          <p className="text-[10px] text-gray-500">Calculate employee & employer PF contributions</p>
                        </div>
                        <input
                          type="checkbox"
                          id="pfEnabled"
                          checked={editingRole.pfEnabled}
                          onChange={(e) => setEditingRole({ ...editingRole, pfEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      {editingRole.pfEnabled && (
                        <div className="flex items-start justify-between pl-4 border-l-2 border-blue-200 py-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 cursor-pointer" htmlFor="includePfInCTC">Include Employer PF in CTC</label>
                            <p className="text-[9px] text-gray-400">Employer contribution is balanced from Special Allowance</p>
                          </div>
                          <input
                            type="checkbox"
                            id="includePfInCTC"
                            checked={editingRole.includePfInCTC}
                            onChange={(e) => setEditingRole({ ...editingRole, includePfInCTC: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="flex items-start justify-between border-t border-gray-150 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 cursor-pointer" htmlFor="esiEnabled">Enable ESI (Health Insurance)</label>
                          <p className="text-[10px] text-gray-500">Calculate ESIC employee & employer shares</p>
                        </div>
                        <input
                          type="checkbox"
                          id="esiEnabled"
                          checked={editingRole.esiEnabled}
                          onChange={(e) => setEditingRole({ ...editingRole, esiEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-start justify-between border-t border-gray-150 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 cursor-pointer" htmlFor="ptEnabled">Enable Professional Tax (PT)</label>
                          <p className="text-[10px] text-gray-500">Apply monthly state Professional Tax deduction</p>
                        </div>
                        <input
                          type="checkbox"
                          id="ptEnabled"
                          checked={editingRole.ptEnabled}
                          onChange={(e) => setEditingRole({ ...editingRole, ptEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-start justify-between border-t border-gray-150 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 cursor-pointer" htmlFor="lwfEnabled">Enable Labour Welfare Fund (LWF)</label>
                          <p className="text-[10px] text-gray-500">Apply monthly state LWF deduction</p>
                        </div>
                        <input
                          type="checkbox"
                          id="lwfEnabled"
                          checked={editingRole.lwfEnabled}
                          onChange={(e) => setEditingRole({ ...editingRole, lwfEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-start justify-between border-t border-gray-150 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 cursor-pointer" htmlFor="gratuityEnabled">Enable Gratuity Accrual</label>
                          <p className="text-[10px] text-gray-500">Accrue gratuity monthly based on basic salary</p>
                        </div>
                        <input
                          type="checkbox"
                          id="gratuityEnabled"
                          checked={editingRole.gratuityEnabled}
                          onChange={(e) => setEditingRole({ ...editingRole, gratuityEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      {editingRole.gratuityEnabled && (
                        <div className="flex items-start justify-between pl-4 border-l-2 border-blue-200 py-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 cursor-pointer" htmlFor="includeGratuityInCTC">Include Gratuity in CTC</label>
                            <p className="text-[9px] text-gray-400">Accrued gratuity is balanced from Special Allowance</p>
                          </div>
                          <input
                            type="checkbox"
                            id="includeGratuityInCTC"
                            checked={editingRole.includeGratuityInCTC}
                            onChange={(e) => setEditingRole({ ...editingRole, includeGratuityInCTC: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-bold text-amber-800">Hourly Contractor</p>
                      <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">Statutory deductions (PF, ESI, PT, LWF, Gratuity) are not applicable for hourly contractors. Only the hours worked × hourly rate is paid.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded-md text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-semibold"
                >
                  Save Job Role
                </button>
              </div>
            </form>
          ) : (
            /* Roles Grid / Table view */
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold">Job Role & Pay Grade Templates</h2>
                  <p className="text-[11px] text-gray-500">Configure standardized roles that define pay type, statutory switches, and basic salary override defaults.</p>
                </div>
                <button
                  type="button"
                  onClick={handleNewRole}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-semibold"
                >
                  + Add Job Role
                </button>
              </div>

              {rolesLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-gray-300 rounded-lg">
                  No Job Roles configured yet. Click "+ Add Job Role" to set up your first template.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Role Name</th>
                        <th className="py-2.5 px-3">Employment Type</th>
                        <th className="py-2.5 px-3">Pay Type</th>
                        <th className="py-2.5 px-3">Standard Pay Rate</th>
                        <th className="py-2.5 px-3">Statutory</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {roles.map((role) => (
                        <tr key={role._id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 font-semibold text-gray-800">{role.name}</td>
                          <td className="py-3 px-3">
                            {(() => {
                              const ET_LABELS = { 'full-time': 'Full Time', 'part-time': 'Part Time', 'contract': 'Contract', 'intern': 'Intern' };
                              const ET_COLORS = { 'full-time': 'bg-green-100 text-green-800', 'part-time': 'bg-teal-100 text-teal-800', 'contract': 'bg-purple-100 text-purple-800', 'intern': 'bg-amber-100 text-amber-800' };
                              const et = role.employmentType || 'full-time';
                              return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ET_COLORS[et] || 'bg-gray-100 text-gray-700'}`}>{ET_LABELS[et] || et}</span>;
                            })()}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              role.payType === 'hourly'
                                ? 'bg-amber-100 text-amber-800'
                                : role.useSalaryComponents === false ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {role.payType === 'hourly' ? 'Hourly' : role.useSalaryComponents === false ? 'Flat' : 'Salaried'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700">
                            {role.payType === 'hourly'
                              ? `₹${(role.hourlyRate || 0).toLocaleString()}/hr`
                              : `₹${(role.monthlyCTC || 0).toLocaleString()}/mo`
                            }
                          </td>
                          <td className="py-3 px-3 space-x-1">
                            {role.pfEnabled && <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">PF</span>}
                            {role.esiEnabled && <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">ESI</span>}
                            {role.ptEnabled && <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">PT</span>}
                            {role.lwfEnabled && <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">LWF</span>}
                            {role.gratuityEnabled && <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[9px]">Gratuity</span>}
                            {!role.pfEnabled && !role.esiEnabled && !role.ptEnabled && !role.lwfEnabled && !role.gratuityEnabled && (
                              <span className="text-gray-400 italic text-[10px]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingRole(role)}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role._id)}
                              className="text-red-600 hover:text-red-800 font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sync Summary Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="HRMS Directory Sync Summary"
      >
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-slate-500">Total Synced</div>
              <div className="text-2xl font-bold text-slate-900">
                {(syncResult?.details?.length || 0) + (syncResult?.errors?.length || 0)}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-green-700">Created</div>
              <div className="text-2xl font-bold text-green-900">{syncResult?.created || 0}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-blue-700">Updated</div>
              <div className="text-2xl font-bold text-blue-900">{syncResult?.updated || 0}</div>
            </div>
            <div className={`p-4 rounded-lg text-center border ${syncResult?.errors?.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`text-sm font-medium ${syncResult?.errors?.length > 0 ? 'text-red-700' : 'text-slate-500'}`}>Failed / Skipped</div>
              <div className={`text-2xl font-bold ${syncResult?.errors?.length > 0 ? 'text-red-900' : 'text-slate-900'}`}>{syncResult?.errors?.length || 0}</div>
            </div>
          </div>

          {/* Sync Success Table */}
          {syncResult?.details?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Successfully Synced Employees</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-medium">
                    <tr>
                      <th className="py-3 px-4 text-left">Employee Name & ID</th>
                      <th className="py-3 px-4 text-left">Email</th>
                      <th className="py-3 px-4 text-left">Job Role Template</th>
                      <th className="py-3 px-4 text-right">Monthly CTC</th>
                      <th className="py-3 px-4 text-center">Statutory (PF/ESI)</th>
                      <th className="py-3 px-4 text-left">Extracted Allowances</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                    {syncResult.details.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px]">{emp.email}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {emp.roleTemplateName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          ₹{Number(emp.monthlyCTC).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-center space-x-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${emp.pfEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                            PF: {emp.pfEnabled ? 'ON' : 'OFF'}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${emp.esiEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                            ESI: {emp.esiEnabled ? 'ON' : 'OFF'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {emp.flexiAmount > 0 && (
                              <div className="text-[10px]"><span className="text-slate-400 font-medium">Flexi:</span> ₹{emp.flexiAmount.toLocaleString('en-IN')}</div>
                            )}
                            <div className="text-[10px]"><span className="text-slate-400 font-medium">Others:</span> {emp.customAllowances}</div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sync Errors List */}
          {syncResult?.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                ⚠️ Sync Failures / Skipped Records
              </h4>
              <div className="overflow-y-auto max-h-40 space-y-2 text-xs">
                {syncResult.errors.map((err, index) => (
                  <div key={index} className="flex justify-between border-b border-red-100 pb-1 last:border-0 last:pb-0">
                    <span className="font-mono text-red-900 font-semibold">{err.id}</span>
                    <span className="text-red-700">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PayrollSettings;
