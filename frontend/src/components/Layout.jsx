import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Shield, Monitor, Server, Bug, Lock, Shuffle,
  Search, Upload, Bell, Users, FileText, Settings, LogOut, Menu, X,
  ChevronDown
} from 'lucide-react';

const navigation = [
  { name: 'Executive Summary', path: '/', icon: LayoutDashboard },
  {
    name: 'Baselines',
    icon: Shield,
    children: [
      { name: 'Cube Baseline', path: '/baseline/cube', icon: Monitor },
      { name: 'AD Baseline', path: '/baseline/ad', icon: Server },
      { name: 'DC Baseline', path: '/baseline/dc', icon: Monitor },
      { name: 'KES Baseline', path: '/baseline/kes', icon: Bug },
      { name: 'DLP Baseline', path: '/baseline/dlp', icon: Lock },
      { name: 'Dynamic Baseline', path: '/baseline/dynamic', icon: Shuffle },
    ],
  },
  { name: 'Device Inspector', path: '/devices', icon: Search },
  { name: 'Upload Manager', path: '/upload', icon: Upload },
  { name: 'Alerts', path: '/alerts', icon: Bell },
];

const adminNavigation = [
  { name: 'User Management', path: '/admin/users', icon: Users },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({ Baselines: true });
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleGroup = (name) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-dark-950">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-dark-900 border-r border-dark-700 flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary-500" />
              <span className="text-lg font-bold text-white">ComplianceHub</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navigation.map((item) =>
              item.children ? (
                <div key={item.name}>
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {sidebarOpen && <span>{item.name}</span>}
                    </div>
                    {sidebarOpen && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expandedGroups[item.name] ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>
                  {expandedGroups[item.name] && sidebarOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive(child.path)
                              ? 'bg-primary-600/20 text-primary-400 border-l-2 border-primary-500'
                              : 'text-dark-400 hover:text-white hover:bg-dark-800'
                          }`}
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-600/20 text-primary-400 border-l-2 border-primary-500'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              )
            )}
          </div>

          {/* Admin section */}
          {hasRole('super_admin', 'auditor') && sidebarOpen && (
            <div className="mt-6">
              <p className="px-3 mb-2 text-xs font-semibold text-dark-500 uppercase tracking-wider">
                Admin
              </p>
              <div className="space-y-1">
                {adminNavigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary-600/20 text-primary-400'
                        : 'text-dark-400 hover:text-white hover:bg-dark-800'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-dark-700">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-dark-400 truncate">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-red-400 transition-colors flex justify-center"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
