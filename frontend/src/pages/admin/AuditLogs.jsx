import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import DataTable from '../../components/DataTable';
import { FileText } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      const res = await adminApi.getAuditLogs(params);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const columns = [
    {
      key: 'created_at',
      label: 'Time',
      render: (val) => new Date(val).toLocaleString(),
    },
    { key: 'user_email', label: 'User' },
    {
      key: 'action',
      label: 'Action',
      render: (val) => (
        <span className="px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded text-xs font-medium">
          {val}
        </span>
      ),
    },
    { key: 'resource_type', label: 'Resource' },
    { key: 'ip_address', label: 'IP Address' },
    {
      key: 'details',
      label: 'Details',
      render: (val) => (
        <span className="text-xs text-dark-400 max-w-xs truncate block">
          {val ? JSON.stringify(val) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-dark-400 mt-1">Complete trail of all system actions</p>
        </div>
        <div className="flex items-center gap-2 text-dark-400">
          <FileText className="w-5 h-5" />
          <span className="text-sm">{pagination?.total || 0} entries</span>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">All Actions</option>
          {['LOGIN', 'REGISTER', 'UPLOAD', 'ACKNOWLEDGE_ALERT', 'UPDATE_USER', 'DEACTIVATE_USER'].map(
            (a) => (
              <option key={a} value={a}>{a}</option>
            )
          )}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          pagination={pagination}
          onPageChange={fetchLogs}
          emptyMessage="No audit logs found"
        />
      )}
    </div>
  );
}
