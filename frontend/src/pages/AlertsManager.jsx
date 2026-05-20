import { useState, useEffect } from 'react';
import { alertsApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { Bell, Check, Filter } from 'lucide-react';

export default function AlertsManager() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filter, setFilter] = useState({ severity: '', acknowledged: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [filter]);

  const fetchAlerts = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 25, ...filter };
      Object.keys(params).forEach((k) => {
        if (params[k] === '') delete params[k];
      });
      const res = await alertsApi.getAlerts(params);
      setAlerts(res.data.alerts);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Alerts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await alertsApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Alert stats error:', err);
    }
  };

  const acknowledgeAlert = async (id) => {
    try {
      await alertsApi.acknowledge(id);
      fetchAlerts();
      fetchStats();
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts Manager</h1>
        <p className="text-dark-400 mt-1">Monitor and manage compliance alerts</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Unacknowledged', value: stats.unacknowledged, color: 'text-amber-400' },
            { label: 'Critical', value: stats.critical, color: 'text-red-400' },
            { label: 'Warning', value: stats.warning, color: 'text-amber-400' },
            { label: 'Info', value: stats.info, color: 'text-blue-400' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-dark-800 rounded-xl border border-dark-700 p-4 text-center"
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-dark-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filter.severity}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          value={filter.acknowledged}
          onChange={(e) => setFilter({ ...filter, acknowledged: e.target.value })}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">All Status</option>
          <option value="false">Unacknowledged</option>
          <option value="true">Acknowledged</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-dark-800 rounded-xl border p-4 transition-colors ${
                alert.is_acknowledged ? 'border-dark-700 opacity-60' : 'border-dark-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Bell
                    className={`w-5 h-5 mt-0.5 ${
                      alert.severity === 'critical'
                        ? 'text-red-400'
                        : alert.severity === 'warning'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white">{alert.title}</h3>
                      <StatusBadge status={alert.severity} />
                    </div>
                    <p className="text-sm text-dark-400 mt-1">{alert.message}</p>
                    <p className="text-xs text-dark-500 mt-2">
                      {new Date(alert.created_at).toLocaleString()}
                      {alert.region && ` | Region: ${alert.region}`}
                    </p>
                  </div>
                </div>
                {!alert.is_acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-dark-500">No alerts found</div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => fetchAlerts(i + 1)}
              className={`px-3 py-1 rounded-lg text-sm ${
                pagination.page === i + 1
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
