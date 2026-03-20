import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Clock,
    AlertCircle,
    MapPin,
    Search,
    Trash2,
    Plus,
    Filter,
    BarChart3,
    Shield,
    UserCircle,
    History,
    ClipboardList
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabaseClient';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ total_employees: 0, active_now: 0, pending_leaves: 0 });
    const [attendance, setAttendance] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('attendance');
    const [trend, setTrend] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '' });
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const handleViewDetails = (record) => {
        setSelectedRecord(record);
        setShowDetailModal(true);
    };

    const fetchAdminData = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        try {
            if (isSupabaseConfigured) {
                // Fetch all users/profiles
                const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
                if (pErr) throw pErr;

                // Fetch all attendance
                const { data: allAttendance, error: aErr } = await supabase
                    .from('attendance')
                    .select('*')
                    .order('check_in', { ascending: false });
                if (aErr) throw aErr;

                // Fetch pending leaves
                const { data: leaves, error: lErr } = await supabase
                    .from('leaves')
                    .select('id')
                    .eq('status', 'pending');

                setUsers(profiles || []);
                setAttendance(allAttendance || []);
                setStats({
                    total_employees: (profiles || []).length,
                    active_now: (allAttendance || []).filter(a => !a.check_out).length,
                    pending_leaves: (leaves || []).length
                });

                // Generate trend from attendance (Local calculation)
                const trendData = [];
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toLocaleDateString(undefined, { weekday: 'short' });
                }).reverse();

                last7Days.forEach(day => {
                    const count = (allAttendance || []).filter(a =>
                        new Date(a.check_in).toLocaleDateString(undefined, { weekday: 'short' }) === day
                    ).length;
                    trendData.push({ day, value: count });
                });
                setTrend(trendData);

            } else {
                const [statsRes, attendanceRes, usersRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/attendance'),
                    api.get('/admin/users')
                ]);
                setStats(statsRes.data);
                setAttendance(attendanceRes.data);
                setUsers(usersRes.data);

                try {
                    const trendRes = await api.get('/admin/analytics/trend');
                    setTrend(trendRes.data);
                } catch (err) {
                    setTrend([]);
                }
            }
        } catch (error) {
            console.error('Admin fetch error:', error);
            toast.error('Failed to load administrative data.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this employee record?')) return;
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                const { error } = await supabase.from('profiles').delete().eq('id', userId);
                if (error) throw error;
            } else {
                await api.delete(`/admin/users/${userId}`);
            }
            toast.success('Employee record deleted.');
            fetchAdminData();
        } catch (error) {
            toast.error('Could not delete record.');
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                // In Supabase, we usually use Auth.signUp for new users
                const { data, error } = await supabase.auth.signUp({
                    email: newUser.email,
                    password: newUser.password,
                    options: {
                        data: { full_name: newUser.full_name }
                    }
                });
                if (error) throw error;

                // Usually an Edge Function or Trigger handles the profile creation
                // But for demo, we can manually insert if allowed
                await supabase.from('profiles').insert([
                    { id: data.user.id, full_name: newUser.full_name, email: newUser.email }
                ]);
            } else {
                await api.post('/register', newUser);
            }
            toast.success('New employee registered.');
            setShowAddModal(false);
            setNewUser({ full_name: '', email: '', password: '' });
            fetchAdminData();
        } catch (error) {
            toast.error(error.message || 'Registration failed.');
        }
    };

    const isUserCheckedIn = (user) => {
        return attendance.some(a => a.user_id === user.id && !a.check_out);
    };

    const handleMarkAttendance = async (userId, checkIn) => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                if (checkIn) {
                    const { error } = await supabase.from('attendance').insert([
                        {
                            user_id: userId,
                            check_in: new Date().toISOString(),
                            user_name: users.find(u => u.id === userId)?.full_name
                        }
                    ]);
                    if (error) throw error;
                } else {
                    const active = attendance.find(a => a.user_id === userId && !a.check_out);
                    if (active) {
                        const { error } = await supabase
                            .from('attendance')
                            .update({ check_out: new Date().toISOString() })
                            .eq('id', active.id);
                        if (error) throw error;
                    }
                }
            } else {
                await api.post('/admin/attendance/mark', {
                    user_id: userId,
                    is_checkin: checkIn
                });
            }
            toast.success(`${checkIn ? 'Check-in' : 'Check-out'} logged successfully.`);
            fetchAdminData();
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(Array.isArray(detail) ? detail[0].msg : (detail || 'Failed to update attendance.'));
        }
    };

    const handleToggleAdmin = async (userId, currentStatus) => {
        const action = currentStatus ? 'demote' : 'promote';
        if (!window.confirm(`Are you sure you want to ${action} this user to/from admin?`)) return;

        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        try {
            if (isSupabaseConfigured) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ is_admin: !currentStatus })
                    .eq('id', userId);
                if (error) throw error;
            } else {
                await api.patch(`/admin/users/${userId}/role`, null, {
                    params: { is_admin: !currentStatus }
                });
            }
            toast.success(`User ${action}d successfully.`);
            fetchAdminData();
        } catch (error) {
            const detail = error.response?.data?.detail;
            toast.error(Array.isArray(detail) ? detail[0].msg : (detail || `Failed to ${action} user.`));
        }
    };

    if (loading) return <LoadingScreen message="Loading Administrative Console..." />;

    const filteredAttendance = attendance.filter(a =>
        (a.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Admin Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="standard-card p-6 border-l-4 border-l-indigo-600"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Users size={20} />
                        </div>
                    </div>
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Total Employees</p>
                    <h3 className="stat-value">{stats.total_employees}</h3>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="standard-card p-6 border-l-4 border-l-green-500"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <Clock size={20} />
                        </div>
                        <span className="flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">
                            Active Now
                        </span>
                    </div>
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">On Duty</p>
                    <h3 className="stat-value">{stats.active_now}</h3>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="standard-card p-6 border-l-4 border-l-orange-500"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <ClipboardList size={20} />
                        </div>
                    </div>
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Pending Leaves</p>
                    <h3 className="stat-value text-orange-600">{stats.pending_leaves}</h3>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="standard-card p-6 border-l-4 border-l-indigo-600"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">System Health</p>
                    <h3 className="stat-value flex items-center gap-2">
                        100% <span className="text-[10px] text-green-500 font-bold">Active</span>
                    </h3>
                </motion.div>
            </div>

            {/* Management Tabs */}
            <div className="standard-card">
                <div className="card-header bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex p-1 bg-white border border-border-base rounded-lg h-12">
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-6 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-md' : 'text-text-muted hover:text-text-main'}`}
                        >
                            <History size={16} />
                            Attendance History
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-text-muted hover:text-text-main'}`}
                        >
                            <UserCircle size={16} />
                            Employee List
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'attendance' ? 'attendance...' : 'employees...'}`}
                                className="form-input pl-10 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {activeTab === 'users' && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary h-10 px-4 text-xs font-bold uppercase tracking-widest"
                            >
                                <Plus size={16} />
                                Add
                            </button>
                        )}
                        <button className="p-2 bg-white border border-border-base rounded-lg text-text-muted hover:text-indigo-600 hover:border-indigo-600 transition-all">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'attendance' ? (
                            <motion.table
                                key="attendance"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full text-left"
                            >
                                <thead className="bg-slate-50/50 text-text-muted text-[10px] font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Employee</th>
                                        <th className="px-8 py-5">Check In</th>
                                        <th className="px-8 py-5">Check Out</th>
                                        <th className="px-8 py-5">Location</th>
                                        <th className="px-8 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAttendance.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                                                        {row.user_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-text-main">{row.user_name}</p>
                                                        <p className="text-[10px] text-text-muted font-medium">EMP-{row.user_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-bold text-indigo-600">
                                                    {new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-[10px] text-text-muted font-medium">
                                                    {new Date(row.check_in).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                {row.check_out ? (
                                                    <>
                                                        <div className="text-sm font-bold text-orange-500">
                                                            {new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="text-[10px] text-text-muted font-medium italic">Verified Session</div>
                                                    </>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 animate-pulse">
                                                        On Duty
                                                    </span>
                                                )}
                                            </td>
                                             <td className="px-8 py-5">
                                                 <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                                                     <MapPin size={14} className="text-indigo-400" />
                                                     {row.lat && row.lon ? (
                                                         <span title={`${row.lat}, ${row.lon}`}>
                                                             {parseFloat(row.lat).toFixed(4)}, {parseFloat(row.lon).toFixed(4)}
                                                         </span>
                                                     ) : (row.location || 'Main Office HQ')}
                                                 </div>
                                             </td>
                                             <td className="px-8 py-5 text-right whitespace-nowrap">
                                                <button 
                                                    onClick={() => handleViewDetails(row)}
                                                    className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:underline"
                                                >
                                                    View Details
                                                </button>
                                             </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </motion.table>
                        ) : (
                            <motion.table
                                key="users"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full text-left"
                            >
                                <thead className="bg-slate-50/50 text-text-muted text-[10px] font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Name & Email</th>
                                        <th className="px-8 py-5">ID Reference</th>
                                        <th className="px-8 py-5">Access Group</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                                        {user.full_name?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-text-main">{user.full_name}</p>
                                                        <p className="text-xs text-text-muted font-medium">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-mono text-text-muted">USR-00{user.id}</td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${user.is_admin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {user.is_admin ? 'Management' : 'Standard Staff'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                    <span className="text-xs font-bold text-text-main">Active</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                                                        className={`p-2 rounded-lg transition-colors ${user.is_admin ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
                                                        title={user.is_admin ? 'Demote from Admin' : 'Promote to Admin'}
                                                    >
                                                        <Shield size={16} fill={user.is_admin ? "currentColor" : "none"} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkAttendance(user.id, !isUserCheckedIn(user))}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                        title={isUserCheckedIn(user) ? 'Check Out' : 'Check In'}
                                                    >
                                                        <Clock size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Delete Employee"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </motion.table>
                        )}
                    </AnimatePresence>
                    {((activeTab === 'attendance' && filteredAttendance.length === 0) ||
                        (activeTab === 'users' && filteredUsers.length === 0)) && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                    <Search size={32} />
                                </div>
                                <h4 className="text-sm font-bold text-text-main uppercase tracking-widest">No Records Found</h4>
                                <p className="text-xs text-text-muted font-medium mt-1">Adjust your filters or refined your search term.</p>
                            </div>
                        )}
                </div>
            </div>

            {/* Add Employee Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-lg bg-card-base rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="card-header bg-slate-50 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">Create Employee Record</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-red-500 transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleAddUser} className="p-8 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter legal name"
                                        value={newUser.full_name}
                                        onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Email Identity</label>
                                    <input
                                        required
                                        type="email"
                                        className="form-input"
                                        placeholder="corporate@email.com"
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Initial Access Key</label>
                                    <input
                                        required
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="btn-primary w-full h-12 shadow-lg shadow-indigo-100">
                                    <Shield size={18} />
                                    Finalize Record
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Attendance Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedRecord && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDetailModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl uppercase">
                                            {selectedRecord.user_name?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900">{selectedRecord.user_name}</h3>
                                            <p className="text-sm text-slate-500 font-medium">Employee ID: EMP-{selectedRecord.user_id}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <Trash2 size={24} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 rounded-2xl space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check In</p>
                                        <div className="flex items-center gap-3">
                                            <Clock size={20} className="text-indigo-600" />
                                            <div>
                                                <p className="text-xl font-bold text-slate-900">
                                                    {new Date(selectedRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">{new Date(selectedRecord.check_in).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-2xl space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check Out</p>
                                        <div className="flex items-center gap-3">
                                            <Clock size={20} className="text-orange-500" />
                                            <div>
                                                <p className="text-xl font-bold text-slate-900">
                                                    {selectedRecord.check_out ? 
                                                        new Date(selectedRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 
                                                        'Active Now'
                                                    }
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    {selectedRecord.check_out ? new Date(selectedRecord.check_out).toLocaleDateString() : 'Session in progress'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location Data</p>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 border border-slate-100 shadow-sm">
                                            <MapPin size={20} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-bold text-slate-900">{selectedRecord.location || 'Main Office HQ (Default)'}</p>
                                            <div className="flex gap-4">
                                                <p className="text-xs text-slate-500 font-medium">Lat: <span className="text-slate-700">{selectedRecord.lat || 'N/A'}</span></p>
                                                <p className="text-xs text-slate-500 font-medium">Lon: <span className="text-slate-700">{selectedRecord.lon || 'N/A'}</span></p>
                                            </div>
                                        </div>
                                        <a 
                                            href={`https://www.google.com/maps?q=${selectedRecord.lat},${selectedRecord.lon}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors"
                                        >
                                            Open Map
                                        </a>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button 
                                        onClick={() => setShowDetailModal(false)}
                                        className="btn-primary px-8 h-12 text-sm font-bold uppercase tracking-widest"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
