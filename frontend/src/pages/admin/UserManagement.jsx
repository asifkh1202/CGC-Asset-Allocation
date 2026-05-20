import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Users, Edit2, Trash2, Save, X } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id, data) => {
    try {
      await adminApi.updateUser(id, data);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const deactivateUser = async (id) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await adminApi.deleteUser(id);
      fetchUsers();
    } catch (err) {
      console.error('Deactivate error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-dark-400 mt-1">Manage user roles and access</p>
        </div>
        <div className="flex items-center gap-2 text-dark-400">
          <Users className="w-5 h-5" />
          <span className="text-sm">{users.length} users</span>
        </div>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                {['Name', 'Email', 'Role', 'Region', 'Status', 'Last Login', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-dark-700/30">
                  <td className="px-4 py-3 text-sm text-white">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-300">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    {editingUser === user.id ? (
                      <select
                        defaultValue={user.role}
                        id={`role-${user.id}`}
                        className="px-2 py-1 bg-dark-900 border border-dark-600 rounded text-dark-200 text-xs"
                      >
                        {['super_admin', 'national_lead', 'regional_manager', 'viewer', 'auditor'].map(
                          (r) => (
                            <option key={r} value={r}>
                              {r.replace('_', ' ')}
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded-full text-xs">
                        {user.role?.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-300">{user.region || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-400">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {editingUser === user.id ? (
                        <>
                          <button
                            onClick={() => {
                              const roleEl = document.getElementById(`role-${user.id}`);
                              updateUser(user.id, { role: roleEl?.value });
                            }}
                            className="p-1 text-emerald-400 hover:bg-dark-700 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1 text-dark-400 hover:bg-dark-700 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="p-1 text-primary-400 hover:bg-dark-700 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deactivateUser(user.id)}
                            className="p-1 text-red-400 hover:bg-dark-700 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
