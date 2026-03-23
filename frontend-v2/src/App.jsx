import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AttendanceHistory from './pages/AttendanceHistory';
import AdminAttendanceHistory from './pages/AdminAttendanceHistory';
import Shifts from './pages/Shifts';
import Leaves from './pages/Leaves';
import AdminDashboard from './pages/AdminDashboard';
import LeaveRequests from './pages/LeaveRequests';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { Toaster } from 'sonner';
import api from './services/api';
import { ThemeProvider } from './hooks/useTheme';
import { supabase } from './lib/supabaseClient';

function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const isAuthenticated = !!localStorage.getItem('token') && localStorage.getItem('token') !== 'undefined';

  React.useEffect(() => {
    const fetchUser = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
        !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

      try {
        if (isSupabaseConfigured) {
          const { data: { user: supabaseUser }, error: authErr } = await supabase.auth.getUser();
          if (authErr) throw authErr;

          if (supabaseUser) {
            // Fetch live profile from the database to get latest is_admin status
            const { data: profile, error: profErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', supabaseUser.id)
              .single();

            console.log('[App] Supabase Auth User:', supabaseUser.email);
            console.log('[App] Profile from DB:', profile);
            console.log('[App] Profile Error:', profErr);

            if (profErr) {
              console.warn('Profile fetch failed, using metadata fallback:', profErr);
              setUser({
                ...supabaseUser,
                full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
                email: supabaseUser.email,
                is_admin: supabaseUser.user_metadata?.role === 'admin'
              });
            } else {
              console.log('[App] Setting is_admin to:', profile.is_admin === true);
              setUser({
                ...supabaseUser,
                full_name: profile.full_name || supabaseUser.email.split('@')[0],
                email: supabaseUser.email,
                is_admin: profile.is_admin === true
              });
            }
          }
        } else {
          const { data } = await api.get('/users/me');
          setUser(data);
        }
      } catch (err) {
        console.error('Session identification failed:', err);
        if (err.response?.status === 401 || err.status === 401) {
          localStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [isAuthenticated]);

  return (
    <ThemeProvider>
      {loading ? (
        <LoadingScreen message="Establishing Connection..." />
      ) : (
        <Router>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={isAuthenticated ? <Layout user={user} /> : <Navigate to="/login" />}>
              <Route path="/" element={
                user?.is_admin ? <AdminDashboard /> : <EmployeeDashboard />
              } />
              <Route path="/attendance" element={
                user?.is_admin ? <AdminAttendanceHistory /> : <AttendanceHistory />
              } />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/leaves" element={<LeaveRequests />} />
              <Route path="/shifts" element={<Shifts />} />
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      )}
    </ThemeProvider>
  );
}

export default App;
