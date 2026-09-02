import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

const emptyForm = { name: '', code: '', client: '', startDate: '', endDate: '', budget: 0, status: 'active', team: [] };
const fmtMoney = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const ProjectManager = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [projectRes, clientRes, employeeRes] = await Promise.all([
      api.get('/projects?limit=100'),
      api.get('/clients?limit=1000'),
      api.get('/employees/active'),
    ]);
    setProjects(projectRes.data.data || []);
    setClients(clientRes.data.data || []);
    setEmployees(employeeRes.data || []);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setFormData({
      name: project.name || '',
      code: project.code || '',
      client: project.client?._id || project.client || '',
      startDate: project.startDate?.substring(0, 10) || '',
      endDate: project.endDate?.substring(0, 10) || '',
      budget: project.budget || 0,
      status: project.status || 'active',
      team: (project.team || []).map(member => member._id || member),
    });
    setShowForm(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = { ...formData, client: formData.client || null, budget: Number(formData.budget) || 0 };
    if (editing) await api.put(`/projects/${editing._id}`, payload);
    else await api.post('/projects', payload);
    setShowForm(false);
    fetchAll();
  };

  const remove = async (project) => {
    if (!window.confirm(`Delete project ${project.name}?`)) return;
    await api.delete(`/projects/${project._id}`);
    fetchAll();
  };

  const inputCls = 'w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600';
  const labelCls = 'text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5 inline-block';

  return (
    <div className="container mx-auto p-6 font-sans text-gray-900 dark:text-slate-100 transition-colors">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Projects</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Track project budgets, clients, and teams</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm transition-all cursor-pointer">
          <FaPlus /> Add Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 transition-colors">
          <div>
            <label className={labelCls}>Name</label>
            <input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Code</label>
            <input required value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Client</label>
            <select value={formData.client} onChange={e => setFormData(p => ({ ...p, client: e.target.value }))} className={inputCls}>
              <option value="">None</option>
              {clients.map(client => <option key={client._id} value={client._id}>{client.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Budget</label>
            <input type="number" min="0" value={formData.budget} onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className={inputCls}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Team</label>
            <select multiple value={formData.team} onChange={e => setFormData(p => ({ ...p, team: Array.from(e.target.selectedOptions).map(option => option.value) }))} className={`${inputCls} h-28`}>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </div>
          <div className="md:col-span-3 flex gap-3">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {projects.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">No projects found.</td></tr>
            ) : projects.map(project => (
              <tr key={project._id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-semibold text-gray-900 dark:text-slate-100">{project.name}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-sm">{project.code}</td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{project.client?.name || '-'}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-slate-100 font-mono">{fmtMoney(project.budget)}</td>
                <td className="px-6 py-4 capitalize">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${project.status === 'active' ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => openEdit(project)} className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer" title="Edit"><FaEdit /></button>
                    <button onClick={() => remove(project)} className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer" title="Delete"><FaTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectManager;
