import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Settings, Shield, Upload, Users, Database } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, statsRes] = await Promise.all([
          adminApi.getSettings(),
          adminApi.getStats(),
        ]);
        setSettings(settingsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Settings error:', err);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-dark-400 mt-1">Platform configuration and system overview</p>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Users',
              value: `${stats.users?.active || 0} / ${stats.users?.total || 0}`,
              sub: 'Active / Total',
              icon: Users,
            },
            {
              label: 'Devices',
              value: stats.devices?.total || 0,
              sub: 'Active devices',
              icon: Database,
            },
            {
              label: 'Uploads',
              value: stats.uploads?.total || 0,
              sub: 'Completed',
              icon: Upload,
            },
            {
              label: 'Alerts',
              value: stats.alerts?.total || 0,
              sub: 'Unacknowledged',
              icon: Shield,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-dark-800 rounded-xl border border-dark-700 p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className="w-5 h-5 text-primary-400" />
                <span className="text-sm text-dark-400">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-dark-500 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Compliance Thresholds */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Compliance Thresholds</h3>
            <div className="space-y-3">
              {Object.entries(settings.complianceThresholds).map(([key, value]) => {
                const colors = {
                  green: 'bg-emerald-500',
                  amber: 'bg-amber-500',
                  orange: 'bg-orange-500',
                  red: 'bg-red-500',
                };
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[key]}`} />
                      <span className="text-sm text-dark-200 capitalize">{key}</span>
                    </div>
                    <span className="text-sm text-white font-medium">
                      {key === 'red' ? `< 60%` : `>= ${value}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Available Tools */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Available Tools</h3>
            <div className="flex flex-wrap gap-2">
              {settings.tools.map((tool) => (
                <span
                  key={tool}
                  className="px-4 py-2 bg-primary-600/20 text-primary-400 rounded-lg text-sm font-medium"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Regions */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Configured Regions</h3>
            <div className="flex flex-wrap gap-2">
              {settings.regions.map((region) => (
                <span
                  key={region}
                  className="px-4 py-2 bg-dark-700 text-dark-200 rounded-lg text-sm"
                >
                  {region}
                </span>
              ))}
            </div>
          </div>

          {/* File Upload Config */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">File Upload Settings</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-dark-400">Max File Size</span>
                <span className="text-sm text-white">
                  {(settings.fileUpload.maxSize / 1024 / 1024).toFixed(0)} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dark-400">Allowed Types</span>
                <span className="text-sm text-white">
                  {settings.fileUpload.allowedTypes.join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
