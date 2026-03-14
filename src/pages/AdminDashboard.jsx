import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State for Plan Update
  const [planForm, setPlanForm] = useState({
    plan: 'free',
    status: 'active',
    endDate: '',
    billingCycle: 'monthly'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setPlanForm({
      plan: user.subscription?.plan || 'free',
      status: user.subscription?.status || 'active',
      endDate: user.subscription?.endDate ? format(new Date(user.subscription.endDate), "yyyy-MM-dd") : '',
      billingCycle: user.subscription?.billingCycle || 'monthly'
    });
    setIsModalOpen(true);
  };

  const handleUpdatePlan = async () => {
    try {
      setIsUpdating(true);
      // If plan is free, we don't need an end date
      const payload = { ...planForm };
      if (payload.plan === 'free') {
        payload.endDate = '';
      }
      
      await api.patch(`/admin/users/${selectedUser._id}/plan`, payload);
      toast.success('Subscription updated successfully');
      setIsModalOpen(false);
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Update failed:', err);
      const msg = err.response?.data?.message || 'Failed to update subscription';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const fmtDate = (date) => date ? format(new Date(date), 'dd MMM yyyy') : 'N/A';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Super Admin Dashboard</h1>
        <button 
          onClick={fetchUsers}
          className="bg-white border border-gray-300 px-4 py-2 rounded shadow-sm text-sm hover:bg-gray-50 transition"
        >
          Refresh List
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Username / Email</th>
                <th className="px-6 py-3 text-left">Plan / Status</th>
                <th className="px-6 py-3 text-left">Valid Until</th>
                <th className="px-6 py-3 text-left">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-600">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{u.username}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      u.subscription?.plan === 'pro' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {u.subscription?.plan || 'FREE'}
                    </span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      u.subscription?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.subscription?.status || 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {fmtDate(u.subscription?.endDate)}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEditUser(u)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Management Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Manage User: {selectedUser?.username}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-6">
              {/* Plan Forms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                  <select 
                    value={planForm.plan}
                    onChange={(e) => setPlanForm({...planForm, plan: e.target.value})}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="free">FREE</option>
                    <option value="pro">PRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                  <select 
                    value={planForm.status}
                    onChange={(e) => setPlanForm({...planForm, status: e.target.value})}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="canceled">Canceled</option>
                    <option value="past_due">Past Due</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                  <select 
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm({...planForm, billingCycle: e.target.value})}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={planForm.endDate}
                    onChange={(e) => setPlanForm({...planForm, endDate: e.target.value})}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Logs Section */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Logs</h3>
                {selectedUser?.paymentHistory && selectedUser.paymentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {selectedUser.paymentHistory.map((log, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center text-sm">
                        <div>
                          <p className="font-bold text-gray-900">₹ {log.amount} - {log.plan.toUpperCase()} ({log.billingCycle})</p>
                          <p className="text-gray-500 text-xs">ID: {log.razorpayPaymentId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-800">{fmtDate(log.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm text-center py-4">No payment logs found for this user.</p>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePlan}
                disabled={isUpdating}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
