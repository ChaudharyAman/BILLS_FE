import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Users, UserPlus, Shield, Mail, CheckCircle2, AlertCircle, Trash2, Edit3, Copy, ExternalLink, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeamSettings = () => {
  const [data, setData] = useState({ owner: null, teamMembers: [] });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  useEffect(() => {
    fetchTeamData();
    fetchRoles();
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
      setRoles(res.data || []);
      if (res.data && res.data.length > 0) {
        const viewerRole = res.data.find((r) => r.name === 'Viewer') || res.data[0];
        setSelectedRoleId(viewerRole._id);
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
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

  const handleRoleChange = async (memberId, newRoleId) => {
    try {
      await api.patch(`/team-members/${memberId}`, { accessRoleId: newRoleId });
      toast.success('Role updated successfully');
      fetchTeamData();
    } catch (err) {
      console.error('Role update error:', err);
      toast.error('Failed to update role');
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Team & Permission Settings
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Invite team members, assign access roles, and manage company permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/settings/roles"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Shield className="w-4 h-4 text-indigo-600" /> Access Roles Matrix
          </Link>
          <button
            onClick={() => {
              setGeneratedInviteLink('');
              setInviteEmail('');
              setInviteUsername('');
              setIsInviteModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" /> Invite Team Member
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Company Members & Account Owner</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
            {1 + data.teamMembers.length} Total Users
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading team members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {/* Company Owner Row */}
                {data.owner && (
                  <tr className="bg-indigo-50/30 font-medium">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                          {data.owner.username?.charAt(0).toUpperCase() || 'O'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {data.owner.username}
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                              Owner
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">{data.owner.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                        <Shield className="w-3 h-3" /> Full Owner Access
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-400 italic">Owner Account</td>
                  </tr>
                )}

                {/* Team Members Rows */}
                {data.teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 text-sm">
                      No team members invited yet. Click "Invite Team Member" to add colleagues.
                    </td>
                  </tr>
                ) : (
                  data.teamMembers.map((member) => (
                    <tr key={member._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                            {member.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{member.username}</div>
                            <div className="text-xs text-slate-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={member.accessRole?._id || ''}
                          onChange={(e) => handleRoleChange(member._id, e.target.value)}
                          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                        >
                          {roles.map((r) => (
                            <option key={r._id} value={r._id}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${member.status === 'active' ? 'bg-emerald-100 text-emerald-800' : member.status === 'invited' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                          {member.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStatusChange(member._id, member.status)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors ${member.status === 'suspended' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                          >
                            {member.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" /> Invite Team Member
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            {generatedInviteLink ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="font-bold text-emerald-900 text-sm">Invitation Created!</h4>
                  <p className="text-xs text-emerald-700 mt-1">Share the link below with your team member to activate their account:</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Invitation Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteLink}
                      className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedInviteLink)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username (Optional)</label>
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="e.g. john_doe"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Access Role</label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>{r.name} — {r.description}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm"
                  >
                    {inviting ? 'Creating Invite...' : 'Generate Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSettings;
