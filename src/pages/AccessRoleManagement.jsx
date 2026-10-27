import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Shield, Plus, Lock, Check, Edit2, Trash2, ArrowLeft, Globe, User, Building, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

const ALL_MODULES = [
  { id: 'clientProfiles', label: 'Client Profiles / Workspaces' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'quotes', label: 'Quotes & Estimates' },
  { id: 'proformas', label: 'Proforma Invoices' },
  { id: 'purchaseOrders', label: 'Purchase Orders' },
  { id: 'clients', label: 'Clients' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'items', label: 'Items / Catalog' },
  { id: 'projects', label: 'Projects' },
  { id: 'employees', label: 'Employees & HR' },
  { id: 'payroll', label: 'Payroll Processing' },
  { id: 'leaves', label: 'Leave Management' },
  { id: 'reimbursements', label: 'Reimbursements' },
  { id: 'loans', label: 'Employee Loans' },
  { id: 'jobRoles', label: 'Job Roles & Designations' },
  { id: 'liabilities', label: 'Liabilities' },
  { id: 'assets', label: 'Assets' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'businessUnits', label: 'Business Units' },
  { id: 'departments', label: 'Departments' },
  { id: 'categories', label: 'Categories' },
  { id: 'bankStatements', label: 'Bank Statements' },
  { id: 'recurringTransactions', label: 'Recurring Engine' },
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'settings', label: 'Company Settings' },
  { id: 'teamMembers', label: 'Team & Permissions' },
  { id: 'subscription', label: 'Billing Subscription' },
  { id: 'publicSubmissions', label: 'Public Submissions' },
];

export const APPROVABLE_MODULES = [
  'leaves',
  'loans',
  'payroll',
  'proformas',
  'purchaseOrders',
  'quotes',
  'reimbursements',
  'publicSubmissions',
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

const DATA_SCOPES = [
  { value: 'all', label: 'All Records', icon: '🌐', desc: 'Can view/manage all records across company' },
  { value: 'own', label: 'Own Records Only', icon: '👤', desc: 'Can ONLY view/manage records created by themselves' },
  { value: 'businessUnit', label: 'Assigned Business Units', icon: '🏢', desc: 'Can view records of assigned Business Unit(s)' },
  { value: 'client', label: 'Assigned Clients', icon: '👥', desc: 'Can view records of assigned Client(s)' },
];

export const MODULE_SCOPE_SUPPORT = {
  clientProfiles:        ['all'],
  expenses:              ['all', 'own', 'businessUnit', 'client'],
  income:                ['all', 'own', 'businessUnit', 'client'],
  invoices:              ['all', 'own', 'businessUnit', 'client'],
  quotes:                ['all', 'own', 'businessUnit', 'client'],
  proformas:             ['all', 'own', 'businessUnit', 'client'],
  purchaseOrders:        ['all', 'own', 'businessUnit'], // Vendors only, no client ref
  clients:               ['all', 'own', 'client'],       // Matches _id against assignedClients
  vendors:               ['all', 'own'],
  items:                 ['all', 'own'],
  projects:              ['all', 'own', 'client'],       // Project.client reference
  employees:             ['all', 'own'],
  payroll:               ['all', 'own'],                 // Client is plain text string; client scope unsupported
  leaves:                ['all', 'own'],
  reimbursements:        ['all', 'own'],
  loans:                 ['all', 'own'],
  liabilities:           ['all', 'own'],
  assets:                ['all', 'own'],
  budgets:               ['all', 'own', 'businessUnit'], // Budget.businessUnit
  businessUnits:         ['all', 'own', 'businessUnit'], // Matches _id against assignedBusinessUnits
  departments:           ['all', 'own'],
  categories:            ['all', 'own'],
  bankStatements:        ['all', 'own'],
  recurringTransactions: ['all', 'own', 'businessUnit', 'client'],
  reports:               ['all', 'own'],
  settings:              ['all'],
  teamMembers:           ['all', 'own'],
  subscription:          ['all'],
  jobRoles:              ['all', 'own'],
  publicSubmissions:     ['all', 'own'],
};

export const getScopeUnsupportedReason = (moduleId, scope) => {
  if (scope === 'businessUnit') {
    return 'This module does not have a Business Unit field';
  }
  if (scope === 'client') {
    if (moduleId === 'purchaseOrders') return 'Purchase Orders link to Vendors, not Clients';
    if (moduleId === 'payroll') return 'Payroll client field is text only, client scope unsupported';
    return 'This module does not have a Client reference';
  }
  if (scope === 'own') {
    return 'Organization-wide settings only support All Records';
  }
  return 'Scope not supported for this module';
};

const AccessRoleManagement = () => {
  const { can, isOwner, isModuleEnabled } = usePermissions();
  const canCreate = isOwner || can('teamMembers', 'create');
  const canDelete = isOwner || can('teamMembers', 'delete');

  // Filter modules to only those enabled for this company
  const visibleModules = React.useMemo(() => {
    return ALL_MODULES.filter((mod) => isModuleEnabled(mod.id));
  }, [isModuleEnabled]);

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissionsMap, setPermissionsMap] = useState({});

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/team-members/roles');
      setRoles(res.data || []);
    } catch (err) {
      console.error('Fetch roles error:', err);
      toast.error('Failed to fetch access roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    setEditingRole(role);
    if (role) {
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      const rawPerms = role.permissions || {};
      const newMap = {};
      ALL_MODULES.forEach((mod) => {
        const item = rawPerms[mod.id] || (rawPerms.get ? rawPerms.get(mod.id) : null) || {};
        newMap[mod.id] = {
          view: Boolean(item.view),
          create: Boolean(item.create),
          edit: Boolean(item.edit),
          delete: Boolean(item.delete),
          approve: Boolean(item.approve),
          dataScope: item.dataScope || 'all',
        };
      });
      setPermissionsMap(newMap);
    } else {
      setRoleName('');
      setRoleDescription('');
      const initialMap = {};
      ALL_MODULES.forEach((mod) => {
        initialMap[mod.id] = {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          dataScope: 'all',
        };
      });
      setPermissionsMap(initialMap);
    }
    setIsModalOpen(true);
  };

  const handleTogglePermission = (modId, action) => {
    setPermissionsMap((prev) => {
      const currentMod = prev[modId] || { view: false, create: false, edit: false, delete: false, approve: false, dataScope: 'all' };
      return {
        ...prev,
        [modId]: {
          ...currentMod,
          [action]: !currentMod[action],
        },
      };
    });
  };

  const handleChangeDataScope = (modId, scope) => {
    if (editingRole?.isSystemRole) return;
    const supported = MODULE_SCOPE_SUPPORT[modId] || ['all', 'own'];
    if (!supported.includes(scope)) {
      toast.error(`"${scope}" scope is not supported for ${modId}`);
      return;
    }
    setPermissionsMap((prev) => {
      const currentMod = prev[modId] || { view: false, create: false, edit: false, delete: false, approve: false, dataScope: 'all' };
      return {
        ...prev,
        [modId]: {
          ...currentMod,
          dataScope: scope,
        },
      };
    });
  };

  const handleSetGlobalDataScope = (scope) => {
    if (editingRole?.isSystemRole) return;
    let updatedCount = 0;
    let skippedCount = 0;
    setPermissionsMap((prev) => {
      const newMap = { ...prev };
      visibleModules.forEach((mod) => {
        const supported = MODULE_SCOPE_SUPPORT[mod.id] || ['all', 'own'];
        if (supported.includes(scope)) {
          newMap[mod.id] = {
            ...(newMap[mod.id] || { view: false, create: false, edit: false, delete: false, approve: false }),
            dataScope: scope,
          };
          updatedCount++;
        } else {
          skippedCount++;
        }
      });
      return newMap;
    });
    const scopeLabel = DATA_SCOPES.find((d) => d.value === scope)?.label || scope;
    if (skippedCount > 0) {
      toast.success(`Data scope "${scopeLabel}" applied to ${updatedCount} supported modules (${skippedCount} modules skipped - unsupported)`);
    } else {
      toast.success(`Data scope set to "${scopeLabel}" for all modules`);
    }
  };

  const handleToggleRowAll = (modId) => {
    if (editingRole?.isSystemRole) return;
    setPermissionsMap((prev) => {
      const currentMod = prev[modId] || { view: false, create: false, edit: false, delete: false, approve: false, dataScope: 'all' };
      const isApprovable = APPROVABLE_MODULES.includes(modId);
      const relevantActions = ACTIONS.filter((act) => act !== 'approve' || isApprovable);
      const isAllChecked = relevantActions.every((act) => Boolean(currentMod[act]));
      const nextVal = !isAllChecked;
      const updatedMod = { ...currentMod };
      ACTIONS.forEach((act) => {
        if (act === 'approve' && !isApprovable) {
          updatedMod[act] = false;
        } else {
          updatedMod[act] = nextVal;
        }
      });
      return {
        ...prev,
        [modId]: updatedMod,
      };
    });
  };

  const handleSelectAllModules = () => {
    if (editingRole?.isSystemRole) return;
    setPermissionsMap((prev) => {
      const newMap = { ...prev };
      visibleModules.forEach((mod) => {
        const isApprovable = APPROVABLE_MODULES.includes(mod.id);
        newMap[mod.id] = {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: isApprovable,
          dataScope: prev[mod.id]?.dataScope || 'all',
        };
      });
      return newMap;
    });
  };

  const handleClearAllModules = () => {
    if (editingRole?.isSystemRole) return;
    setPermissionsMap((prev) => {
      const newMap = { ...prev };
      visibleModules.forEach((mod) => {
        newMap[mod.id] = {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          dataScope: prev[mod.id]?.dataScope || 'all',
        };
      });
      return newMap;
    });
  };

  const areAllCheckedAcrossAllModules = visibleModules.length > 0 && visibleModules.every((mod) => {
    const modPerms = permissionsMap[mod.id] || {};
    const isApprovable = APPROVABLE_MODULES.includes(mod.id);
    const relevantActions = ACTIONS.filter((act) => act !== 'approve' || isApprovable);
    return relevantActions.every((act) => Boolean(modPerms[act]));
  });

  const areSomeCheckedAcrossAllModules = visibleModules.length > 0 && visibleModules.some((mod) => {
    const modPerms = permissionsMap[mod.id] || {};
    const isApprovable = APPROVABLE_MODULES.includes(mod.id);
    const relevantActions = ACTIONS.filter((act) => act !== 'approve' || isApprovable);
    return relevantActions.some((act) => Boolean(modPerms[act]));
  }) && !areAllCheckedAcrossAllModules;

  const handleToggleGlobalAll = () => {
    if (editingRole?.isSystemRole) return;
    if (areAllCheckedAcrossAllModules) {
      handleClearAllModules();
    } else {
      handleSelectAllModules();
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();

    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      const cleanedPermissions = { ...permissionsMap };
      ALL_MODULES.forEach((mod) => {
        const supported = MODULE_SCOPE_SUPPORT[mod.id] || ['all', 'own'];
        let scope = cleanedPermissions[mod.id]?.dataScope || 'all';
        if (!supported.includes(scope)) {
          scope = supported.includes('own') ? 'own' : 'all';
        }
        if (!isModuleEnabled(mod.id)) {
          cleanedPermissions[mod.id] = { view: false, create: false, edit: false, delete: false, approve: false, dataScope: 'all' };
        } else {
          cleanedPermissions[mod.id] = {
            ...cleanedPermissions[mod.id],
            dataScope: scope,
          };
        }
      });

      const payload = {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: cleanedPermissions,
      };

      if (editingRole) {
        await api.patch(`/team-members/roles/${editingRole._id}`, payload);
        toast.success('Role updated successfully');
      } else {
        await api.post('/team-members/roles', payload);
        toast.success('Role created successfully');
      }

      setIsModalOpen(false);
      fetchRoles();
    } catch (err) {
      console.error('Save role error:', err);
      toast.error(err.response?.data?.message || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystemRole) {
      toast.error('Built-in system roles cannot be deleted');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      await api.delete(`/team-members/roles/${role._id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (err) {
      console.error('Delete role error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete role');
    }
  };

  const getRoleScopeSummary = (role) => {
    const perms = role.permissions || {};
    let ownCount = 0;
    let buCount = 0;
    let clientCount = 0;
    let allCount = 0;
    visibleModules.forEach((m) => {
      const p = perms[m.id] || (perms.get ? perms.get(m.id) : null);
      if (p?.dataScope === 'own') ownCount++;
      else if (p?.dataScope === 'businessUnit') buCount++;
      else if (p?.dataScope === 'client') clientCount++;
      else allCount++;
    });

    if (ownCount === visibleModules.length) {
      return { text: '👤 Own Records Only', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    }
    if (buCount === visibleModules.length) {
      return { text: '🏢 Business Unit Scoped', color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
    }
    if (clientCount === visibleModules.length) {
      return { text: '👥 Client Scoped', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    }
    if (ownCount > 0 || buCount > 0 || clientCount > 0) {
      return { text: '🛡️ Dynamic RBAC Scope', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    }
    return { text: '🌐 All Records Scope', color: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/settings/team" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Team Members
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Access Roles & Permission Matrix
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Define role capabilities, set granular action permissions, and enforce record-level data scopes (Own Only, Business Unit, Client, or All).
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenModal(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Custom Role
          </button>
        )}
      </div>

      {/* Role Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">Loading Access Roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => {
            const scopeSummary = getRoleScopeSummary(role);
            return (
              <div key={role._id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${role.isSystemRole ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      {role.isSystemRole ? 'System Built-In' : 'Custom Role'}
                    </span>
                    {!role.isSystemRole && canDelete && (
                      <button onClick={() => handleDeleteRole(role)} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{role.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 min-h-[36px]">{role.description || 'No description provided'}</p>

                  <div className="mt-2.5">
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${scopeSummary.color}`}>
                      {scopeSummary.text}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {visibleModules.filter((m) => {
                      const p = role.permissions?.[m.id] || (role.permissions?.get ? role.permissions.get(m.id) : null);
                      return p && (p.view || p.create || p.edit || p.delete || p.approve);
                    }).length} of {visibleModules.length} modules
                  </span>
                  <button
                    onClick={() => handleOpenModal(role)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> View / Edit Matrix
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permission Matrix Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {editingRole ? `Configure Permission & Data Scope Matrix: ${editingRole.name}` : 'Create Custom Access Role'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingRole?.isSystemRole
                    ? 'Built-in system role (read-only matrix)'
                    : 'Set granular CRUD capabilities and specify record-level visibility (Own records, Business Unit, Client, or All)'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-bold cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystemRole}
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Sales Executive (Own Data Only)"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="e.g. Can only view and create their own invoices, expenses and clients"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Data Scope Explainer Card */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-indigo-950 dark:text-indigo-100">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Dynamic Record-Level RBAC & Data Scoping
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                  <div className="bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <span className="font-bold text-slate-900 dark:text-slate-100">🌐 All Records:</span> View all workspace data across all team members.
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <span className="font-bold text-slate-900 dark:text-slate-100">👤 Own Records:</span> Strictly restricted to data created by themselves.
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <span className="font-bold text-slate-900 dark:text-slate-100">🏢 Business Unit:</span> Scoped to their assigned Business Unit(s).
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <span className="font-bold text-slate-900 dark:text-slate-100">👥 Clients:</span> Scoped to their assigned Client(s).
                  </div>
                </div>
              </div>

              {/* Permission Matrix Table */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Module Permissions & Visibility Scopes
                    <span className="ml-1.5 text-xs font-normal text-slate-500 lowercase">
                      ({visibleModules.length} enabled modules)
                    </span>
                  </span>
                  {!editingRole?.isSystemRole && (
                    <div className="flex items-center flex-wrap gap-2">
                      {/* Bulk Scope Dropdown */}
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Bulk Scope:</span>
                        <select
                          disabled={editingRole?.isSystemRole}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSetGlobalDataScope(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                          className="bg-transparent font-semibold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer"
                        >
                          <option value="" disabled>Apply Scope to All Modules...</option>
                          {DATA_SCOPES.map((sc) => (
                            <option key={sc.value} value={sc.value}>{sc.icon} {sc.label}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleSelectAllModules}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Grant All Actions
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllModules}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Module</th>
                        <th className="px-3 py-3 text-center bg-slate-200/50 dark:bg-slate-700/50">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              disabled={editingRole?.isSystemRole}
                              checked={areAllCheckedAcrossAllModules}
                              ref={(el) => {
                                if (el) el.indeterminate = areSomeCheckedAcrossAllModules;
                              }}
                              onChange={handleToggleGlobalAll}
                              title="Toggle all actions across all modules"
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">All</span>
                          </div>
                        </th>
                        {ACTIONS.map((act) => (
                          <th key={act} className="px-3 py-3 text-center capitalize">{act}</th>
                        ))}
                        <th className="px-4 py-3 text-left">Data Visibility Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {visibleModules.length === 0 ? (
                        <tr>
                          <td colSpan={ACTIONS.length + 3} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-xs italic">
                            No modules are currently enabled for your organization.
                          </td>
                        </tr>
                      ) : (
                        visibleModules.map((mod) => {
                          const modPerms = permissionsMap[mod.id] || {};
                          const isRowAllChecked = ACTIONS.every((act) => Boolean(modPerms[act]));
                          const isRowSomeChecked = ACTIONS.some((act) => Boolean(modPerms[act])) && !isRowAllChecked;
                          const supportedScopes = MODULE_SCOPE_SUPPORT[mod.id] || ['all', 'own'];
                          let currentScope = modPerms.dataScope || 'all';
                          if (!supportedScopes.includes(currentScope)) {
                            currentScope = supportedScopes.includes('own') ? 'own' : 'all';
                          }

                          return (
                            <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 text-xs">{mod.label}</td>
                              <td className="px-3 py-3 text-center bg-slate-50/70 dark:bg-slate-800/50 border-r border-l border-slate-100 dark:border-slate-800">
                                <input
                                  type="checkbox"
                                  disabled={editingRole?.isSystemRole}
                                  checked={isRowAllChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isRowSomeChecked;
                                  }}
                                  onChange={() => handleToggleRowAll(mod.id)}
                                  title={`Toggle all permissions for ${mod.label}`}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              {ACTIONS.map((act) => {
                                const isApprovable = APPROVABLE_MODULES.includes(mod.id);
                                if (act === 'approve' && !isApprovable) {
                                  return (
                                    <td key={act} className="px-3 py-3 text-center">
                                      <span
                                        className="text-slate-300 dark:text-slate-600 select-none text-xs block text-center"
                                        title="Approval workflow is not applicable to this module"
                                      >
                                        —
                                      </span>
                                    </td>
                                  );
                                }
                                return (
                                  <td key={act} className="px-3 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      disabled={editingRole?.isSystemRole}
                                      checked={Boolean(modPerms[act])}
                                      onChange={() => handleTogglePermission(mod.id, act)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                  </td>
                                );
                              })}
                              <td className="px-4 py-2">
                                <select
                                  disabled={editingRole?.isSystemRole}
                                  value={currentScope}
                                  onChange={(e) => handleChangeDataScope(mod.id, e.target.value)}
                                  className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors outline-none cursor-pointer w-full max-w-[210px] ${
                                    currentScope === 'own'
                                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                      : currentScope === 'businessUnit'
                                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                      : currentScope === 'client'
                                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                  }`}
                                  title="Configure whether member sees all data, only own created data, or data of assigned BUs/Clients"
                                >
                                  {DATA_SCOPES.map((sc) => {
                                    const isSupported = supportedScopes.includes(sc.value);
                                    const reason = !isSupported ? getScopeUnsupportedReason(mod.id, sc.value) : '';
                                    return (
                                      <option
                                        key={sc.value}
                                        value={sc.value}
                                        disabled={!isSupported}
                                        title={reason || sc.desc}
                                        className={isSupported ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 italic"}
                                      >
                                        {sc.icon} {sc.label}{!isSupported ? ' (Unsupported)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors">
                  Cancel
                </button>
                {!editingRole?.isSystemRole && (
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm cursor-pointer transition-all">
                    Save Permission Matrix
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRoleManagement;
