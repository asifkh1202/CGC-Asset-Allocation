import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import KPICard from '../components/KPICard';
import ComplianceGauge from '../components/ComplianceGauge';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Shield, Monitor, Server, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const toolLabels = {
  Cube: 'Cube Baseline (Master Inventory)',
  AD: 'Active Directory Baseline',
  DC: 'Desktop Central Baseline',
  KES: 'Kaspersky Endpoint Security Baseline',
  DLP: 'Data Loss Prevention Baseline',
};

export default function BaselineDashboard() {
  const { tool } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const toolName = tool?.toUpperCase() === 'CUBE' ? 'Cube'
    : tool?.toUpperCase() === 'AD' ? 'AD'
    : tool?.toUpperCase() === 'DC' ? 'DC'
    : tool?.toUpperCase() === 'KES' ? 'KES'
    : tool?.toUpperCase() === 'DLP' ? 'DLP'
    : 'Cube';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = {};
        if (month) params.month = month;
        if (year) params.year = year;
        const res = await dashboardApi.getCompliance(toolName, params);
        setData(res.data);
      } catch (err) {
        console.error('Baseline data error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toolName, month, year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const complianceData = data?.complianceData || [];
  const regionBreakdown = data?.regionBreakdown || [];
  const osBreakdown = data?.osBreakdown || [];

  const avgCompliance =
    complianceData.length > 0
      ? (
          complianceData.reduce((sum, c) => sum + parseFloat(c.compliance_percentage), 0) /
          complianceData.length
        ).toFixed(1)
      : 0;

  const totalBaseline = complianceData.reduce(
    (max, c) => Math.max(max, parseInt(c.baseline_total, 10)),
    0
  );

  const totalMissing = complianceData.reduce(
    (sum, c) => sum + parseInt(c.missing_count, 10),
    0
  );

  const comparisonTools = ['Cube', 'AD', 'DC', 'KES', 'DLP'].filter((t) => t !== toolName);

  const complianceByTool = comparisonTools.map((ct) => {
    const match = complianceData.find((c) => c.comparison_tool === ct);
    return {
      tool: ct,
      compliance: match ? parseFloat(match.compliance_percentage) : 0,
      found: match ? parseInt(match.found_count, 10) : 0,
      missing: match ? parseInt(match.missing_count, 10) : 0,
    };
  });

  const columns = [
    { key: 'tool', label: 'Comparison Tool' },
    {
      key: 'compliance',
      label: 'Compliance %',
      render: (val) => (
        <span
          className={`font-semibold ${
            val >= 90 ? 'text-emerald-400' : val >= 75 ? 'text-amber-400' : 'text-red-400'
          }`}
        >
          {val.toFixed(1)}%
        </span>
      ),
    },
    { key: 'found', label: 'Found', render: (val) => val.toLocaleString() },
    { key: 'missing', label: 'Missing', render: (val) => val.toLocaleString() },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{toolLabels[toolName] || toolName}</h1>
          <p className="text-dark-400 mt-1">Compliance analysis against other tools</p>
        </div>
        <div className="flex gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
          >
            <option value="">All Years</option>
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Baseline Total"
          value={totalBaseline.toLocaleString()}
          subtitle={`${toolName} devices`}
          icon={Monitor}
          color="primary"
        />
        <KPICard
          title="Avg Compliance"
          value={`${avgCompliance}%`}
          subtitle="Across comparisons"
          icon={Shield}
          color={parseFloat(avgCompliance) >= 90 ? 'green' : 'amber'}
        />
        <KPICard
          title="Missing Devices"
          value={totalMissing.toLocaleString()}
          subtitle="Not found in other tools"
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title="Regions"
          value={regionBreakdown.length}
          subtitle="With data"
          icon={Server}
          color="blue"
        />
      </div>

      {/* Compliance Gauges */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {toolName} Compliance by Comparison Tool
        </h3>
        <div className="flex flex-wrap justify-center gap-8">
          {complianceByTool.map((ct) => (
            <ComplianceGauge key={ct.tool} value={ct.compliance} label={ct.tool} size={110} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Breakdown */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Regional Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={regionBreakdown.map((r) => ({
                  name: r.region,
                  value: parseInt(r.count, 10),
                }))}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {regionBreakdown.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* OS Breakdown */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">OS Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={osBreakdown.map((o) => ({
                name: o.os_category,
                count: parseInt(o.count, 10),
              }))}
            >
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
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compliance Table */}
      <DataTable
        columns={columns}
        data={complianceByTool}
        emptyMessage="No compliance data available for this period"
      />
    </div>
  );
}
