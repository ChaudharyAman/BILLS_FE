import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Users, UserPlus, Shield, Mail, CheckCircle2, AlertCircle, Trash2, Edit3, Copy, ExternalLink, ArrowRight, Building, Check, X, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';

const TeamSettings = () => {
  const { can, isOwner } = usePermissions();
  const canCreate = isOwner || can('teamMembers', 'create');
  const canEdit = isOwner || can('teamMembers', 'edit');
  const canDelete = isOwner || can('teamMembers', 'delete');

  const [data, setData] = useState({ owner: null, teamMembers: [] });
  const [roles, setRoles] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [inviteProfileAccess, setInviteProfileAccess] = useState([]);
  const [inviteBusinessUnits, setInviteBusinessUnits] = useState([]);
  const [inviteClients, setInviteClients] = useState([]);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  // Edit modal state
  const [editingMember, setEditingMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editProfileAccess, setEditProfileAccess] = useState([]);
  const [editBusinessUnits, setEditBusinessUnits] = useState([]);
  const [editClients, setEditClients] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchTeamData();
    fetchRoles();
    fetchProfiles();
    fetchBusinessUnits();
    fetchClients();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/team-members');
      setData(res.data || { owner: null, teamMembers: [] });
    } catch (err) {
      console.error('Fetch team error:', err);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/team-members/roles');
      const list = res.data || [];
      setRoles(list);
      if (list.length > 0 && !selectedRoleId) {
        const viewerRole = list.find((r) => r.name === 'Viewer') || list[0];
        setSelectedRoleId(viewerRole._id);
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
    }
  };

  const fetchBusinessUnits = async () => {
    try {
      const res = await api.get('/business-units');
      setBusinessUnits(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Fetch business units error:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients?limit=100');
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setClients(list);
    } catch (err) {
      console.error('Fetch clients error:', err);
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await api.get('/profiles/mine');
      const list = res.data?.profiles || (Array.isArray(res.data) ? res.data : []);
      setProfiles(list);
    } catch (err) {
      console.error('Fetch profiles error:', err);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      setInviting(true);
      const res = await api.post('/team-members/invite', {
        email: inviteEmail.trim(),
        username: inviteUsername.trim() || undefined,
        accessRoleId: selectedRoleId,
        assignedBusinessUnits: inviteBusinessUnits,
        assignedClients: inviteClients,
        profileAccess: inviteProfileAccess.length > 0 ? inviteProfileAccess : undefined,
      });

      toast.success('Team member invited successfully!');
      setGeneratedInviteLink(res.data.inviteLink);
      fetchTeamData();
    } catch (err) {
      console.error('Invite error:', err);
      toast.error(err.response?.data?.message || 'Failed to invite team member');
    } finally {
      setInviting(false);
    }
  };

  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setEditRoleId(member.accessRole?._id || '');
    setEditStatus(member.status || 'active');
    setEditBusinessUnits(
      Array.isArray(member.assignedBusinessUnits)
        ? member.assignedBusinessUnits.map((b) => (typeof b === 'object' ? b._id : b))
        : []
    );
    setEditClients(
      Array.isArray(member.assignedClients)
        ? member.assignedClients.map((c) => (typeof c === 'object' ? c._id : c))
        : []
    );
    const pa = Array.isArray(member.profileAccess)
      ? member.profileAccess.map((entry) => ({
          profile: typeof entry.profile === 'object' ? entry.profile._id : entry.profile,
          accessRole: typeof entry.accessRole === 'object' ? entry.accessRole._id : entry.accessRole,
        }))
      : [];
    setEditProfileAccess(pa);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setSavingEdit(true);
      await api.patch(`/team-members/${editingMember._id}`, {
        accessRoleId: editRoleId,
        status: editStatus,
        assignedBusinessUnits: editBusinessUnits,
        assignedClients: editClients,
        profileAccess: editProfileAccess,
      });
      toast.success('Team member updated successfully');
      setIsEditModalOpen(false);
      fetchTeamData();
    } catch (err) {
      console.error('Update member error:', err);
      toast.error(err.response?.data?.message || 'Failed to update team member');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (memberId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await api.patch(`/team-members/${memberId}`, { status: nextStatus });
      toast.success(`Team member ${nextStatus === 'suspended' ? 'suspended' : 'reactivated'}`);
      fetchTeamData();
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove team member ${member.email}?`)) return;

    try {
      await api.delete(`/team-members/${member._id}`);
      toast.success('Team member removed');
      fetchTeamData();
    } catch (err) {
      console.error('Delete member error:', err);
      toast.error(err.response?.data?.message || 'Failed to remove team member');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Invite link copied to clipboard!');
  };

  const toggleInviteBU = (buId) => {
    setInviteBusinessUnits((prev) =>
      prev.includes(buId) ? prev.filter((id) => id !== buId) : [...prev, buId]
    );
  };

  const toggleInviteClient = (clientId) => {
    setInviteClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const toggleEditBU = (buId) => {
    setEditBusinessUnits((prev) =>
      prev.includes(buId) ? prev.filter((id) => id !== buId) : [...prev, buId]
    );
  };

  const toggleEditClient = (clientId) => {
    setEditClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  // Helper to detect role scope description
  const getRoleScopeTag = (role) => {
    if (!role || !role.permissions) return null;
    const perms = role.permissions;
    const entries = Object.values(perms.toJSON ? perms.toJSON() : perms);
    const scopes = entries.map((e) => e.dataScope || 'all');
    if (scopes.every((s) => s === 'own')) return { label: '👤 Own Records Only', color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700' };
    if (scopes.some((s) => s === 'businessUnit')) return { label: '🏢 BU Scoped', color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700' };
    if (scopes.some((s) => s === 'client')) return { label: '👥 Client Scoped', color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700' };
    return { label: '🌐 All Records', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Team & Permission Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Invite team members, assign access roles, and link Business Units and Clients for dynamic record-level RBAC.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/settings/roles"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Access Roles Matrix
          </Link>
          {canCreate && (
            <button
              onClick={() => {
                setGeneratedInviteLink('');
                setInviteEmail('');
                setInviteUsername('');
                setInviteBusinessUnits([]);
                setInviteClients([]);
                setInviteProfileAccess([]);
                setIsInviteModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Invite Team Member
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Company Members & Account Owner</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            {1 + data.teamMembers.length} Total Users
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">Loading team members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Member</th>
                  <th className="px-4 py-3">Role & Access Scope</th>
                  <th className="px-4 py-3">Assigned Units & Clients</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {/* Company Owner Row */}
                {data.owner && (
                  <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 font-medium">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                          {data.owner.username?.charAt(0).toUpperCase() || 'O'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {data.owner.username}
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                              Owner
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{data.owner.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                        <Shield className="w-3 h-3" /> Full Owner Access (All Scopes)
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400 italic">
                      Global (All Business Units & Clients)
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-400 dark:text-slate-500 italic">Owner Account</td>
                  </tr>
                )}

                {/* Team Members Rows */}
                {data.teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                      No team members invited yet. Click "Invite Team Member" to add colleagues.
                    </td>
                  </tr>
                ) : (
                  data.teamMembers.map((member) => {
                    const scopeTag = getRoleScopeTag(member.accessRole);
                    const assignedBUs = member.assignedBusinessUnits || [];
                    const assignedCls = member.assignedClients || [];

                    return (
                      <tr key={member._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm">
                              {member.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{member.username}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="font-medium text-xs text-slate-800 dark:text-slate-200">
                              {member.accessRole?.name || 'No Role Assigned'}
                            </div>
                            {scopeTag && (
                              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${scopeTag.color}`}>
                                {scopeTag.label}
                              </span>
                            )}
                            {Array.isArray(member.profileAccess) && member.profileAccess.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {member.profileAccess.map((pa, idx) => {
                                  const pName = pa.profile?.name || pa.profile?.companyName || 'Profile';
                                  const rName = pa.accessRole?.name || 'Role';
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                      title={`Profile: ${pName} | Role: ${rName}`}
                                    >
                                      <Globe className="w-2.5 h-2.5 text-indigo-500" />
                                      {pName}: <span className="font-semibold">{rName}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                                Inherits Default Profile
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {assignedBUs.length === 0 && assignedCls.length === 0 ? (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">None assigned</span>
                            ) : (
                              <>
                                {assignedBUs.map((bu) => (
                                  <span
                                    key={typeof bu === 'object' ? bu._id : bu}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                  >
                                    <Building className="w-2.5 h-2.5" />
                                    {typeof bu === 'object' ? bu.name : 'Business Unit'}
                                  </span>
                                ))}
                                {assignedCls.map((cl) => (
                                  <span
                                    key={typeof cl === 'object' ? cl._id : cl}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  >
                                    <Users className="w-2.5 h-2.5" />
                                    {typeof cl === 'object' ? cl.name : 'Client'}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${member.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' : member.status === 'invited' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'}`}>
                            {member.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEdit(member)}
                                className="text-xs px-2.5 py-1 rounded-lg font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Edit
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleStatusChange(member._id, member.status)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors cursor-pointer ${member.status === 'suspended' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'}`}
                              >
                                {member.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteMember(member)}
                                className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 transition-colors max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Invite Team Member
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-bold cursor-pointer">×</button>
            </div>

            {generatedInviteLink ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">Invitation Created!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Share the link below with your team member to activate their account:</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Invitation Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteLink}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedInviteLink)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Username (Optional)</label>
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="e.g. john_doe"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Access Role</label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>{r.name} {r.description ? `— ${r.description}` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Business Units Multi-Select */}
                {businessUnits.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Assigned Business Units
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      Used when role is scoped to "Assigned Business Units"
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      {businessUnits.map((bu) => {
                        const isSelected = inviteBusinessUnits.includes(bu._id);
                        return (
                          <button
                            type="button"
                            key={bu._id}
                            onClick={() => toggleInviteBU(bu._id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {bu.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Clients Multi-Select */}
                {clients.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Assigned Clients
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      Used when role is scoped to "Assigned Clients"
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      {clients.map((cl) => {
                        const isSelected = inviteClients.includes(cl._id);
                        return (
                          <button
                            type="button"
                            key={cl._id}
                            onClick={() => toggleInviteClient(cl._id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {cl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Profile Access Multi-Select */}
                {profiles.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Workspace / Profile Access
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                      Assign access to specific profiles with a per-profile role. Leave unchecked to inherit the default profile.
                    </p>
                    <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      {profiles.map((p) => {
                        const pId = p._id || p.profileId;
                        const currentEntry = inviteProfileAccess.find((entry) => entry.profile === pId);
                        const isAssigned = !!currentEntry;
                        return (
                          <div key={pId} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setInviteProfileAccess((prev) => [
                                      ...prev,
                                      { profile: pId, accessRole: selectedRoleId || roles[0]?._id },
                                    ]);
                                  } else {
                                    setInviteProfileAccess((prev) => prev.filter((entry) => entry.profile !== pId));
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                {p.name || p.companyName || 'Profile'} {p.isDefault ? '(Default)' : ''}
                              </span>
                            </label>
                            {isAssigned && (
                              <select
                                value={currentEntry.accessRole}
                                onChange={(e) => {
                                  const newRole = e.target.value;
                                  setInviteProfileAccess((prev) =>
                                    prev.map((entry) => (entry.profile === pId ? { ...entry, accessRole: newRole } : entry))
                                  );
                                }}
                                className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              >
                                {roles.map((r) => (
                                  <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm cursor-pointer"
                  >
                    {inviting ? 'Creating Invite...' : 'Generate Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 transition-colors max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Edit Member: {editingMember.username}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{editingMember.email}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-bold cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Access Role</label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>{r.name} {r.description ? `— ${r.description}` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="active">Active (Access Allowed)</option>
                  <option value="suspended">Suspended (Access Revoked)</option>
                </select>
              </div>

              {/* Business Units Multi-Select */}
              {businessUnits.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Assigned Business Units
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Team member will only see records tagged with selected units if role has BU scope.
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    {businessUnits.map((bu) => {
                      const isSelected = editBusinessUnits.includes(bu._id);
                      return (
                        <button
                          type="button"
                          key={bu._id}
                          onClick={() => toggleEditBU(bu._id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {bu.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clients Multi-Select */}
              {clients.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Assigned Clients
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Team member will only see records related to selected clients if role has Client scope.
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    {clients.map((cl) => {
                      const isSelected = editClients.includes(cl._id);
                      return (
                        <button
                          type="button"
                          key={cl._id}
                          onClick={() => toggleEditClient(cl._id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {cl.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Profile Access Multi-Select */}
              {profiles.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Workspace / Profile Access
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Assign access to specific profiles with a per-profile role. Leave empty to inherit the default profile.
                  </p>
                  <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    {profiles.map((p) => {
                      const pId = p._id || p.profileId;
                      const currentEntry = editProfileAccess.find((entry) => entry.profile === pId);
                      const isAssigned = !!currentEntry;
                      return (
                        <div key={pId} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditProfileAccess((prev) => [
                                    ...prev,
                                    { profile: pId, accessRole: editRoleId || roles[0]?._id },
                                  ]);
                                } else {
                                  setEditProfileAccess((prev) => prev.filter((entry) => entry.profile !== pId));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {p.name || p.companyName || 'Profile'} {p.isDefault ? '(Default)' : ''}
                            </span>
                          </label>
                          {isAssigned && (
                            <select
                              value={currentEntry.accessRole}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                setEditProfileAccess((prev) =>
                                  prev.map((entry) => (entry.profile === pId ? { ...entry, accessRole: newRole } : entry))
                                );
                              }}
                              className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            >
                              {roles.map((r) => (
                                <option key={r._id} value={r._id}>{r.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm cursor-pointer"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Member Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSettings;
