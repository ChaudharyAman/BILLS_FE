import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Building2,
  Users,
  Shield,
  Activity,
  Search,
  Filter,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  CreditCard,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('companies'); // 'companies' | 'audit'

  // ── Companies State ──────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companyPage, setCompanyPage] = useState(1);
  const [companyPages, setCompanyPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // ── Company Detail / Edit Modal State ──────────────────────────────────────
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'team' | 'roles' | 'payments'
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State for User Edit
  const [planForm, setPlanForm] = useState({
    plan: 'free',
    status: 'active',
    endDate: '',
    billingCycle: 'monthly',
    isActive: true,
    role: 'user',
  });

  // Company Team & Roles Data
  const [companyTeam, setCompanyTeam] = useState([]);
  const [companyRoles, setCompanyRoles] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // ── Create User Modal State ────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    plan: 'free',
    billingCycle: 'monthly',
    endDate: '',
  });

  // ── Confirmation Modals State ──────────────────────────────────────────────
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [superadminConfirmUser, setSuperadminConfirmUser] = useState(null);

  // ── Audit Log State ────────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);
  const [totalAudit, setTotalAudit] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'companies') {
      fetchCompanies();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, companyPage, filterPlan, filterStatus, filterActive, auditPage, auditActionFilter]);

  const fetchCompanies = async (overrideSearch = searchQuery) => {
    try {
      setLoadingCompanies(true);
      const params = new URLSearchParams();
      params.append('page', companyPage);
      params.append('limit', 10);
      if (overrideSearch) params.append('q', overrideSearch);
      if (filterPlan) params.append('plan', filterPlan);
      if (filterStatus) params.append('status', filterStatus);
      if (filterActive) params.append('isActive', filterActive);

      const res = await api.get(`/admin/companies?${params.toString()}`);
      setCompanies(res.data.companies || []);
      setCompanyPages(res.data.pages || 1);
      setTotalCompanies(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch companies');
      console.error(err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchAuditLogs = async (overrideSearch = auditSearch) => {
    try {
      setLoadingAudit(true);
      const params = new URLSearchParams();
      params.append('page', auditPage);
      params.append('limit', 15);
      if (overrideSearch) params.append('q', overrideSearch);
      if (auditActionFilter) params.append('action', auditActionFilter);

      const res = await api.get(`/admin/audit-log?${params.toString()}`);
      setAuditLogs(res.data.logs || []);
      setAuditPages(res.data.pages || 1);
      setTotalAudit(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to fetch audit logs');
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCompanyPage(1);
    fetchCompanies(searchQuery);
  };

  const handleAuditSearchSubmit = (e) => {
    e.preventDefault();
    setAuditPage(1);
    fetchAuditLogs(auditSearch);
  };

  // ── Open Company Management ────────────────────────────────────────────────
  const handleOpenCompanyDetail = async (owner, initialTab = 'overview') => {
    setSelectedOwner(owner);
    setDetailTab(initialTab);
    setPlanForm({
      plan: owner.subscription?.plan || 'free',
      status: owner.subscription?.status || 'active',
      endDate: owner.subscription?.endDate ? format(new Date(owner.subscription.endDate), 'yyyy-MM-dd') : '',
      billingCycle: owner.subscription?.billingCycle || 'monthly',
      isActive: owner.isActive !== false,
      role: owner.role || 'user',
    });
    setIsDetailModalOpen(true);

    // Fetch team and custom roles
    fetchCompanyTeamAndRoles(owner._id);
  };

  const fetchCompanyTeamAndRoles = async (ownerId) => {
    try {
      setLoadingTeam(true);
      const [teamRes, rolesRes] = await Promise.all([
        api.get(`/admin/companies/${ownerId}/team`),
        api.get(`/admin/companies/${ownerId}/roles`),
      ]);
      setCompanyTeam(teamRes.data.team || []);
      setCompanyRoles(rolesRes.data || []);
    } catch (err) {
      console.error('Failed to load company team/roles:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // ── Role Selection Guard ─────────────────────────────────────────────────
  const handleRoleChangeInForm = (newRole) => {
    if (newRole === 'superadmin' && planForm.role !== 'superadmin') {
      setSuperadminConfirmUser({ owner: selectedOwner, targetRole: 'superadmin' });
    } else {
      setPlanForm({ ...planForm, role: newRole });
    }
  };

  const confirmSuperadminPromotion = () => {
    setPlanForm({ ...planForm, role: 'superadmin' });
    setSuperadminConfirmUser(null);
  };

  // ── Update Subscription / Plan ──────────────────────────────────────────
  const handleUpdatePlan = async () => {
    try {
      setIsUpdating(true);
      const payload = { ...planForm };
      if (payload.plan === 'free') {
        payload.endDate = '';
      }

      await api.patch(`/admin/users/${selectedOwner._id}/plan`, payload);
      toast.success('Company subscription and access updated successfully');
      setIsDetailModalOpen(false);
      fetchCompanies();
    } catch (err) {
      console.error('Update failed:', err);
      const msg = err.response?.data?.message || 'Failed to update subscription';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Update Team Member (Suspend / Reactivate / Change Role) ─────────────
  const handleUpdateTeamMemberStatus = async (memberId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await api.patch(`/admin/team-members/${memberId}`, { status: nextStatus });
      toast.success(`Team member ${nextStatus === 'suspended' ? 'suspended' : 'reactivated'}`);
      fetchCompanyTeamAndRoles(selectedOwner._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update team member status');
    }
  };

  const handleUpdateTeamMemberRole = async (memberId, roleId) => {
    try {
      await api.patch(`/admin/team-members/${memberId}`, { accessRole: roleId });
      toast.success('Team member access role updated');
      fetchCompanyTeamAndRoles(selectedOwner._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update team member role');
    }
  };

  // ── Delete User / Company Request ────────────────────────────────────────
  const onRequestDeleteUser = (owner) => {
    setDeleteConfirmUser(owner);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      setIsUpdating(true);
      await api.delete(`/admin/users/${deleteConfirmUser._id}?force=true`);
      toast.success('Company, team members, and associated data deleted successfully');
      setDeleteConfirmUser(null);
      setIsDetailModalOpen(false);
      fetchCompanies();
    } catch (err) {
      console.error('Delete failed:', err);
      const msg = err.response?.data?.message || 'Failed to delete user account';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Create New User ──────────────────────────────────────────────────────
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const payload = { ...createForm };
      if (payload.plan === 'free') {
        payload.endDate = '';
      }

      await api.post('/admin/users', payload);
      toast.success('New company user account created successfully');
      setIsCreateModalOpen(false);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        role: 'user',
        plan: 'free',
        billingCycle: 'monthly',
        endDate: '',
      });
      fetchCompanies();
    } catch (err) {
      console.error('Creation failed:', err);
      const msg = err.response?.data?.message || 'Failed to create user account';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const fmtDate = (date) => (date ? format(new Date(date), 'dd MMM yyyy') : 'N/A');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Super Admin Control Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage company tenants, platform subscription plans, team members, and audit system activities.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="btn-create-user"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-sm text-sm font-semibold flex items-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
          <button
            onClick={() => (activeTab === 'companies' ? fetchCompanies() : fetchAuditLogs())}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl shadow-sm text-sm font-medium flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Main Tab Navigation ──────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 space-x-8">
        <button
          onClick={() => setActiveTab('companies')}
          className={`py-3 px-1 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'companies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Companies & Tenants ({totalCompanies})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-1 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          System Audit Logs ({totalAudit})
        </button>
      </div>

      {/* ── TAB 1: COMPANIES & TENANTS VIEW ──────────────────────────────────── */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          {/* Filters & Search Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </form>

            <select
              value={filterPlan}
              onChange={(e) => { setFilterPlan(e.target.value); setCompanyPage(1); }}
              className="border rounded-lg p-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Plans</option>
              <option value="free">FREE</option>
              <option value="pro">PRO</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCompanyPage(1); }}
              className="border rounded-lg p-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="canceled">Canceled</option>
            </select>

            <select
              value={filterActive}
              onChange={(e) => { setFilterActive(e.target.value); setCompanyPage(1); }}
              className="border rounded-lg p-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Login Access</option>
              <option value="true">Enabled (Active)</option>
              <option value="false">Disabled (Deactivated)</option>
            </select>
          </div>

          {/* Companies Table */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loadingCompanies ? (
              <div className="p-12 text-center text-gray-500 font-medium">Loading companies data...</div>
            ) : companies.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium">No company accounts match the selected filters.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Company Owner</th>
                    <th className="px-6 py-3.5 text-left">Plan & Status</th>
                    <th className="px-6 py-3.5 text-left">Team Members</th>
                    <th className="px-6 py-3.5 text-left">Login Access</th>
                    <th className="px-6 py-3.5 text-left">Role</th>
                    <th className="px-6 py-3.5 text-left">Joined</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-600">
                  {companies.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition" data-testid={`company-row-${u.username}`}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{u.username}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          u.subscription?.plan === 'pro' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {u.subscription?.plan || 'FREE'}
                        </span>
                        <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          u.subscription?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {u.subscription?.status || 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenCompanyDetail(u, 'team')}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {u.teamMemberCount} Member(s)
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          u.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {u.isActive !== false ? 'Enabled' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {fmtDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenCompanyDetail(u, 'overview')}
                          data-testid={`btn-manage-${u.username}`}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination Controls */}
            {companyPages > 1 && (
              <div className="p-4 bg-gray-50 border-t flex justify-between items-center text-xs text-gray-500">
                <span>Showing Page {companyPage} of {companyPages} ({totalCompanies} total)</span>
                <div className="flex gap-2">
                  <button
                    disabled={companyPage <= 1}
                    onClick={() => setCompanyPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={companyPage >= companyPages}
                    onClick={() => setCompanyPage((p) => Math.min(companyPages, p + 1))}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SYSTEM AUDIT LOGS VIEW ────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Audit Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <form onSubmit={handleAuditSearchSubmit} className="sm:col-span-2 relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search actor email or target..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </form>

            <select
              value={auditActionFilter}
              onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
              className="border rounded-lg p-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Admin Actions</option>
              <option value="CREATE_USER">CREATE_USER</option>
              <option value="UPDATE_USER_PLAN">UPDATE_USER_PLAN</option>
              <option value="DELETE_USER">DELETE_USER</option>
              <option value="UPDATE_TEAM_MEMBER">UPDATE_TEAM_MEMBER</option>
              <option value="SUPERADMIN_PROMOTION">SUPERADMIN_PROMOTION</option>
              <option value="SUPERADMIN_DEMOTION">SUPERADMIN_DEMOTION</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            {loadingAudit ? (
              <div className="p-12 text-center text-gray-500 font-medium">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-medium">No administrative audit entries recorded yet.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Timestamp</th>
                    <th className="px-6 py-3.5 text-left">Super Admin Actor</th>
                    <th className="px-6 py-3.5 text-left">Action</th>
                    <th className="px-6 py-3.5 text-left">Target Label</th>
                    <th className="px-6 py-3.5 text-left">Details / Metadata</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-600">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {log.createdAt ? format(new Date(log.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{log.actorUsername || 'Admin'}</div>
                        <div className="text-xs text-gray-500">{log.actorEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          log.action.includes('DELETE') ? 'bg-rose-100 text-rose-800' :
                          log.action.includes('SUPERADMIN') ? 'bg-purple-100 text-purple-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {log.targetLabel || String(log.targetId)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {JSON.stringify(log.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination Controls */}
            {auditPages > 1 && (
              <div className="p-4 bg-gray-50 border-t flex justify-between items-center text-xs text-gray-500">
                <span>Showing Page {auditPage} of {auditPages} ({totalAudit} total)</span>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={auditPage >= auditPages}
                    onClick={() => setAuditPage((p) => Math.min(auditPages, p + 1))}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COMPANY MANAGEMENT MODAL / DRAWER ────────────────────────────────── */}
      {isDetailModalOpen && selectedOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Company: {selectedOwner.username}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedOwner.email} • ID: {selectedOwner._id}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b px-6 bg-white space-x-6 text-sm font-semibold">
              <button
                onClick={() => setDetailTab('overview')}
                className={`py-3 border-b-2 transition ${
                  detailTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Subscription & Access
              </button>
              <button
                onClick={() => setDetailTab('team')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                  detailTab === 'team' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4" />
                Team Members ({companyTeam.length})
              </button>
              <button
                onClick={() => setDetailTab('roles')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                  detailTab === 'roles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Lock className="w-4 h-4" />
                Access Roles ({companyRoles.length})
              </button>
              <button
                onClick={() => setDetailTab('payments')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
                  detailTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Payment History
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: OVERVIEW & SUBSCRIPTION */}
              {detailTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                      <select
                        value={planForm.plan}
                        data-testid="edit-user-plan"
                        onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="free">FREE</option>
                        <option value="pro">PRO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                      <select
                        value={planForm.status}
                        data-testid="edit-user-status"
                        onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="canceled">Canceled</option>
                        <option value="past_due">Past Due</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Login Access</label>
                      <select
                        value={planForm.isActive ? 'true' : 'false'}
                        data-testid="edit-user-active"
                        onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.value === 'true' })}
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="true">Enabled (Active)</option>
                        <option value="false">Disabled (Deactivated)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">User Platform Role</label>
                      <select
                        value={planForm.role}
                        data-testid="edit-user-role"
                        onChange={(e) => handleRoleChangeInForm(e.target.value)}
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="user">Regular User (Company Owner)</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                      <select
                        value={planForm.billingCycle}
                        data-testid="edit-user-billing"
                        onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                        className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {planForm.plan === 'pro' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PRO Subscription End Date</label>
                        <input
                          type="date"
                          data-testid="edit-user-enddate"
                          value={planForm.endDate}
                          onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                          className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TEAM MEMBERS */}
              {detailTab === 'team' && (
                <div className="space-y-4">
                  {loadingTeam ? (
                    <div className="py-8 text-center text-gray-500 font-medium">Loading team members...</div>
                  ) : companyTeam.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 italic">No invited team members found for this company owner.</div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden divide-y">
                      {companyTeam.map((m) => (
                        <div key={m._id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-gray-50">
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {m.username || m.email}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                m.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                m.status === 'suspended' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {m.status || 'active'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">{m.email}</div>
                          </div>

                          <div className="flex items-center gap-3">
                            <select
                              value={m.accessRole?._id || ''}
                              onChange={(e) => handleUpdateTeamMemberRole(m._id, e.target.value)}
                              className="border rounded-lg p-1.5 text-xs text-gray-700"
                            >
                              <option value="">Select Role...</option>
                              {companyRoles.map((r) => (
                                <option key={r._id} value={r._id}>{r.name}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleUpdateTeamMemberStatus(m._id, m.status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                m.status === 'suspended'
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              {m.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              {m.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ACCESS ROLES (READ-ONLY) */}
              {detailTab === 'roles' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 italic">
                    Below are the custom Access Roles configured for this company. These are read-only for Super Admin support.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {companyRoles.map((r) => (
                      <div key={r._id} className="p-4 border rounded-xl bg-gray-50 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-gray-900">{r.name}</h4>
                          {r.isSystemRole && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-semibold">System Role</span>}
                        </div>
                        <p className="text-xs text-gray-600">{r.description || 'No description provided.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: PAYMENT HISTORY */}
              {detailTab === 'payments' && (
                <div className="space-y-4">
                  {selectedOwner?.paymentHistory && selectedOwner.paymentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOwner.paymentHistory.map((log, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-xl flex justify-between items-center text-sm border">
                          <div>
                            <p className="font-bold text-gray-900">₹ {log.amount} - {log.plan.toUpperCase()} ({log.billingCycle})</p>
                            <p className="text-gray-500 text-xs">Payment ID: {log.razorpayPaymentId}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-800 text-xs">{fmtDate(log.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm text-center py-6">No Razorpay payment records found for this company owner.</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
              <button
                type="button"
                onClick={() => onRequestDeleteUser(selectedOwner)}
                data-testid="btn-delete-user"
                className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                disabled={isUpdating}
              >
                <Trash2 className="w-4 h-4" />
                Delete Company
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePlan}
                  disabled={isUpdating}
                  data-testid="btn-save-changes"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isUpdating ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE NEW USER MODAL ────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Create New Company Account</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  data-testid="create-user-username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. acmecorp"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  data-testid="create-user-email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. owner@acme.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  data-testid="create-user-password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter strong password"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                  <select
                    value={createForm.role}
                    data-testid="create-user-role"
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="user">Regular User</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subscription Plan</label>
                  <select
                    value={createForm.plan}
                    data-testid="create-user-plan"
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="free">FREE</option>
                    <option value="pro">PRO</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  data-testid="btn-create-submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {isUpdating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SAFETY CONFIRMATION MODAL: DELETE USER ──────────────────────────── */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Company Account?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete company owner <strong className="text-gray-900">{deleteConfirmUser.username}</strong> ({deleteConfirmUser.email})?
              <br /><br />
              <span className="text-rose-600 font-semibold">Warning:</span> This will permanently remove the company owner, all associated team members, access roles, invoices, clients, payrolls, and settings.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 py-2.5 border rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isUpdating}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {isUpdating ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SAFETY CONFIRMATION MODAL: SUPERADMIN PROMOTION ──────────────────── */}
      {superadminConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Grant Super Admin Role?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              You are about to promote <strong className="text-gray-900">{superadminConfirmUser.owner?.username}</strong> to <strong className="text-purple-700">Super Admin</strong>.
              <br /><br />
              Super Admins have unrestricted operational control across all company accounts, platform billing, and user management.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuperadminConfirmUser(null)}
                className="flex-1 py-2.5 border rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSuperadminPromotion}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Grant Super Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
