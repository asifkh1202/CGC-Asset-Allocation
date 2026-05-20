import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import ExecutiveSummary from './pages/ExecutiveSummary';
import BaselineDashboard from './pages/BaselineDashboard';
import DynamicBaseline from './pages/DynamicBaseline';
import DeviceInspector from './pages/DeviceInspector';
import UploadManager from './pages/UploadManager';
import AlertsManager from './pages/AlertsManager';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import SettingsPage from './pages/admin/SettingsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Dashboard Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ExecutiveSummary />
          </ProtectedRoute>
        }
      />

      {/* Baseline Routes */}
      <Route
        path="/baseline/:tool"
        element={
          <ProtectedRoute>
            <BaselineDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/baseline/dynamic"
        element={
          <ProtectedRoute>
            <DynamicBaseline />
          </ProtectedRoute>
        }
      />

      {/* Device Inspector */}
      <Route
        path="/devices"
        element={
          <ProtectedRoute>
            <DeviceInspector />
          </ProtectedRoute>
        }
      />

      {/* Upload Manager */}
      <Route
        path="/upload"
        element={
          <ProtectedRoute roles={['super_admin', 'national_lead', 'regional_manager']}>
            <UploadManager />
          </ProtectedRoute>
        }
      />

      {/* Alerts */}
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <AlertsManager />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute roles={['super_admin', 'auditor']}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
