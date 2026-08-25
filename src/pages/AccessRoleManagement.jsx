import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Shield, Plus, Lock, Check, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

const MODULES = [
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
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

const AccessRoleManagement = () => {
  const { can, isOwner } = usePermissions();
  const canCreate = isOwner || can('teamMembers', 'create');
  const canDelete = isOwner || can('teamMembers', 'delete');

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
      setPermissionsMap(role.permissions || {});
    } else {
      setRoleName('');
      setRoleDescription('');
      // Default initial permission matrix
      const initialMap = {};
      MODULES.forEach((mod) => {
        initialMap[mod.id] = { view: false, create: false, edit: false, delete: false, approve: false };
      });
      setPermissionsMap(initialMap);
    }
    setIsModalOpen(true);
  };

  const handleTogglePermission = (modId, action) => {
    setPermissionsMap((prev) => {
      const currentMod = prev[modId] || { view: false, create: false, edit: false, delete: false, approve: false };
      return {
        ...prev,
        [modId]: {
          ...currentMod,
          [action]: !currentMod[action],
        },
      };
    });
  };

  const handleToggleRowAll = (modId) => {
    if (editingRole?.isSystemRole) return;
    setPermissionsMap((prev) => {
      const currentMod = prev[modId] || { view: false, create: false, edit: false, delete: false, approve: false };
      const isAllChecked = ACTIONS.every((act) => Boolean(currentMod[act]));
      const nextVal = !isAllChecked;
      const updatedMod = {};
      ACTIONS.forEach((act) => {
        updatedMod[act] = nextVal;
      });
      return {
        ...prev,
        [modId]: updatedMod,
      };
    });
  };

  const handleSelectAllModules = () => {
    if (editingRole?.isSystemRole) return;
    const newMap = {};
    MODULES.forEach((mod) => {
      newMap[mod.id] = { view: true, create: true, edit: true, delete: true, approve: true };
    });
    setPermissionsMap(newMap);
  };

  const handleClearAllModules = () => {
    if (editingRole?.isSystemRole) return;
    const newMap = {};
    MODULES.forEach((mod) => {
      newMap[mod.id] = { view: false, create: false, edit: false, delete: false, approve: false };
    });
    setPermissionsMap(newMap);
  };

  const areAllCheckedAcrossAllModules = MODULES.every((mod) => {
    const modPerms = permissionsMap[mod.id] || {};
    return ACTIONS.every((act) => Boolean(modPerms[act]));
  });

  const areSomeCheckedAcrossAllModules = MODULES.some((mod) => {
    const modPerms = permissionsMap[mod.id] || {};
    return ACTIONS.some((act) => Boolean(modPerms[act]));
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
      const payload = {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: permissionsMap,
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/settings/team" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Team Members
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" /> Access Roles & Permission Matrix
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Define role capabilities and configure fine-grained module access for team members.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenModal(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Custom Role
          </button>
        )}
      </div>

      {/* Role Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading Access Roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => (
            <div key={role._id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${role.isSystemRole ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'}`}>
                    {role.isSystemRole ? 'System Built-In' : 'Custom Role'}
                  </span>
                  {!role.isSystemRole && canDelete && (
                    <button onClick={() => handleDeleteRole(role)} className="text-slate-400 hover:text-rose-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{role.name}</h3>
                <p className="text-slate-500 text-xs mt-1 min-h-[36px]">{role.description || 'No description provided'}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {Object.keys(role.permissions || {}).length} modules configured
                </span>
                <button
                  onClick={() => handleOpenModal(role)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> View / Edit Matrix
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permission Matrix Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingRole ? `Configure Permission Matrix: ${editingRole.name}` : 'Create Custom Access Role'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingRole?.isSystemRole ? 'Built-in system permissions matrix (read-only name/permissions)' : 'Set granular CRUD capabilities for each module'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role Name</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystemRole}
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Senior Accountant"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Short description of responsibilities"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Permission Matrix Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Module Permissions Matrix</span>
                  {!editingRole?.isSystemRole && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllModules}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Grant All Permissions
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllModules}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Module</th>
                        <th className="px-3 py-3 text-center bg-slate-200/50">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              disabled={editingRole?.isSystemRole}
                              checked={areAllCheckedAcrossAllModules}
                              ref={(el) => {
                                if (el) el.indeterminate = areSomeCheckedAcrossAllModules;
                              }}
                              onChange={handleToggleGlobalAll}
                              title="Toggle all permissions across all modules"
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="text-[11px] font-bold text-slate-700">All</span>
                          </div>
                        </th>
                        {ACTIONS.map((act) => (
                          <th key={act} className="px-3 py-3 text-center capitalize">{act}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {MODULES.map((mod) => {
                        const modPerms = permissionsMap[mod.id] || {};
                        const isRowAllChecked = ACTIONS.every((act) => Boolean(modPerms[act]));
                        const isRowSomeChecked = ACTIONS.some((act) => Boolean(modPerms[act])) && !isRowAllChecked;

                        return (
                          <tr key={mod.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 text-xs">{mod.label}</td>
                            <td className="px-3 py-3 text-center bg-slate-50/70 border-r border-l border-slate-100">
                              <input
                                type="checkbox"
                                disabled={editingRole?.isSystemRole}
                                checked={isRowAllChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = isRowSomeChecked;
                                }}
                                onChange={() => handleToggleRowAll(mod.id)}
                                title={`Select / deselect all permissions for ${mod.label}`}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            {ACTIONS.map((act) => (
                              <td key={act} className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={editingRole?.isSystemRole}
                                  checked={Boolean(modPerms[act])}
                                  onChange={() => handleTogglePermission(mod.id, act)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>


              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                  Cancel
                </button>
                {!editingRole?.isSystemRole && (
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm">
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
