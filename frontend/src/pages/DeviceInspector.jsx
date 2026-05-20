import { useState, useCallback } from 'react';
import { devicesApi } from '../services/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Search, Monitor, X } from 'lucide-react';

export default function DeviceInspector() {
  const [query, setQuery] = useState('');
  const [devices, setDevices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceDetail, setDeviceDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchDevices = useCallback(async (page = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await devicesApi.search({ q: query, page, limit: 25 });
      setDevices(res.data.devices);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const viewDevice = async (deviceKey) => {
    try {
      const res = await devicesApi.getDevice(deviceKey);
      setDeviceDetail(res.data);
      setSelectedDevice(deviceKey);
    } catch (err) {
      console.error('Device detail error:', err);
    }
  };

  const columns = [
    { key: 'device_key', label: 'Device Key' },
    { key: 'computer_name', label: 'Computer Name' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'os_type', label: 'OS Type' },
    { key: 'region', label: 'Region' },
    {
      key: 'tools',
      label: 'Tools',
      render: (tools) =>
        tools?.map((t) => (
          <span
            key={t}
            className="inline-block px-2 py-0.5 bg-primary-600/20 text-primary-400 text-xs rounded mr-1"
          >
            {t}
          </span>
        )) || '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />,
    },
    {
      key: 'device_key',
      label: 'Action',
      render: (val) => (
        <button
          onClick={() => viewDevice(val)}
          className="text-primary-400 hover:text-primary-300 text-sm"
        >
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Device Inspector</h1>
        <p className="text-dark-400 mt-1">Search and inspect individual device compliance</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search by device key, computer name, or serial number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchDevices()}
            className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <button
          onClick={() => searchDevices()}
          disabled={loading}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {devices.length > 0 && (
        <DataTable
          columns={columns}
          data={devices}
          pagination={pagination}
          onPageChange={searchDevices}
        />
      )}

      {/* Device Detail Panel */}
      {selectedDevice && deviceDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <Monitor className="w-6 h-6 text-primary-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {deviceDetail.device?.computer_name || selectedDevice}
                  </h2>
                  <p className="text-sm text-dark-400">{selectedDevice}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedDevice(null); setDeviceDetail(null); }}
                className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Serial Number', deviceDetail.device?.serial_number],
                  ['OS Type', deviceDetail.device?.os_type],
                  ['OS Version', deviceDetail.device?.os_version],
                  ['Region', deviceDetail.device?.region],
                  ['Department', deviceDetail.device?.department],
                  ['Last Seen', deviceDetail.device?.last_seen ? new Date(deviceDetail.device.last_seen).toLocaleDateString() : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-dark-400 uppercase">{label}</p>
                    <p className="text-sm text-white mt-1">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Tool Mappings */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Tool Coverage</h3>
                <div className="flex flex-wrap gap-2">
                  {['Cube', 'AD', 'DC', 'KES', 'DLP'].map((tool) => {
                    const found = deviceDetail.toolMappings?.some(
                      (m) => m.tool_name === tool
                    );
                    return (
                      <span
                        key={tool}
                        className={`px-3 py-1 rounded-full text-sm ${
                          found
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-dark-700 text-dark-500'
                        }`}
                      >
                        {tool}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* History */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Inventory History</h3>
                <div className="space-y-2">
                  {deviceDetail.inventories?.length > 0 ? (
                    deviceDetail.inventories.map((inv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-dark-900 rounded-lg"
                      >
                        <div>
                          <span className="text-sm text-white">{inv.tool_name}</span>
                          <span className="text-xs text-dark-400 ml-2">
                            {inv.month}/{inv.year}
                          </span>
                        </div>
                        <span className="text-xs text-dark-400">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-dark-500">No history available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
