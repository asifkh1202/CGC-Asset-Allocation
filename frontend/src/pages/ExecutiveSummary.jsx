import { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import KPICard from '../components/KPICard';
import ComplianceGauge from '../components/ComplianceGauge';
import StatusBadge from '../components/StatusBadge';
import { Monitor, Shield, Bell, Upload, Server, Bug } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ExecutiveSummary() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, trendsRes, matrixRes] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getTrends({}),
          dashboardApi.getMatrix({}),
        ]);
        setSummary(summaryRes.data);
        setTrends(trendsRes.data);
        setMatrix(matrixRes.data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const tools = ['Cube', 'AD', 'DC', 'KES', 'DLP'];
  const toolCounts = summary?.toolCounts || [];
  const alertCounts = summary?.activeAlerts || [];

  const totalAlerts = alertCounts.reduce((sum, a) => sum + parseInt(a.count, 10), 0);
  const criticalAlerts = alertCounts.find((a) => a.severity === 'critical')?.count || 0;

  const toolChartData = toolCounts.map((t) => ({
    name: t.tool_name,
    devices: parseInt(t.count, 10),
  }));

  const complianceData = summary?.latestCompliance || [];
  const avgCompliance =
    complianceData.length > 0
      ? (
          complianceData.reduce((sum, c) => sum + parseFloat(c.compliance_percentage), 0) /
          complianceData.length
        ).toFixed(1)
      : 0;

  // Build matrix data
  const matrixData = {};
  matrix.forEach((m) => {
    if (!matrixData[m.baseline_tool]) matrixData[m.baseline_tool] = {};
    matrixData[m.baseline_tool][m.comparison_tool] = parseFloat(m.compliance_percentage);
  });

  const getStatusColor = (val) => {
    if (val >= 90) return 'green';
    if (val >= 75) return 'amber';
    if (val >= 60) return 'orange';
    return 'red';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Executive Summary</h1>
        <p className="text-dark-400 mt-1">Overview of security compliance across the enterprise</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Devices"
          value={summary?.totalDevices?.toLocaleString() || '0'}
          subtitle="Across all tools"
          icon={Monitor}
          color="primary"
        />
        <KPICard
          title="Avg Compliance"
          value={`${avgCompliance}%`}
          subtitle="All baselines"
          icon={Shield}
          color={parseFloat(avgCompliance) >= 90 ? 'green' : parseFloat(avgCompliance) >= 75 ? 'amber' : 'red'}
        />
        <KPICard
          title="Active Alerts"
          value={totalAlerts}
          subtitle={`${criticalAlerts} critical`}
          icon={Bell}
          color={parseInt(criticalAlerts, 10) > 0 ? 'red' : 'green'}
        />
        <KPICard
          title="Tools Active"
          value={toolCounts.length}
          subtitle="Data sources"
          icon={Server}
          color="blue"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Distribution */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Devices by Tool</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={toolChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                }}
              />
              <Bar dataKey="devices" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance Gauges */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Compliance Overview</h3>
          <div className="flex flex-wrap justify-center gap-6">
            {tools.map((tool) => {
              const toolCompliance = complianceData.filter(
                (c) => c.baseline_tool === tool
              );
              const avg =
                toolCompliance.length > 0
                  ? toolCompliance.reduce(
                      (sum, c) => sum + parseFloat(c.compliance_percentage),
                      0
                    ) / toolCompliance.length
                  : 0;
              return <ComplianceGauge key={tool} value={avg} label={tool} size={100} />;
            })}
          </div>
        </div>
      </div>

      {/* Compliance Matrix */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Compliance Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">
                  Baseline \ Comparison
                </th>
                {tools.map((tool) => (
                  <th
                    key={tool}
                    className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase"
                  >
                    {tool}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {tools.map((baseline) => (
                <tr key={baseline} className="hover:bg-dark-700/30">
                  <td className="px-4 py-3 text-sm font-medium text-white">{baseline}</td>
                  {tools.map((comparison) => (
                    <td key={comparison} className="px-4 py-3 text-center">
                      {baseline === comparison ? (
                        <span className="text-dark-600">—</span>
                      ) : (
                        <StatusBadge
                          status={getStatusColor(
                            matrixData[baseline]?.[comparison] || 0
                          )}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Uploads</h3>
        <div className="space-y-3">
          {summary?.recentUploads?.length > 0 ? (
            summary.recentUploads.map((upload, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-dark-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-4 h-4 text-primary-400" />
                  <div>
                    <span className="text-sm text-white">
                      {upload.tool_name} - {upload.month}/{upload.year}
                    </span>
                    <p className="text-xs text-dark-400">{upload.row_count} devices</p>
                  </div>
                </div>
                <StatusBadge status={upload.status} />
              </div>
            ))
          ) : (
            <p className="text-dark-500 text-sm">No recent uploads</p>
          )}
        </div>
      </div>
    </div>
  );
}
