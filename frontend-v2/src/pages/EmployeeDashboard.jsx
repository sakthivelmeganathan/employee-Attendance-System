import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Timer,
    User,
    MapPin,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    History,
    CheckSquare
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabaseClient';

const EmployeeDashboard = () => {
    const [stats, setStats] = useState({
        total_hours: 0,
        punctuality: 0,
        active_streak: 0,
        status: 'offline'
    });
    const [attendance, setAttendance] = useState([]);
    const [fullHistory, setFullHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        try {
            if (isSupabaseConfigured) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No active session');

                // Fetch real history
                const { data: history, error: historyErr } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('check_in', { ascending: false });

                if (historyErr) throw historyErr;

                // Calculate stats (Local calculation for now)
                let totalSeconds = 0;
                let onTimeCount = 0;
                const recentHistory = history || [];

                recentHistory.forEach(record => {
                    if (record.check_in && record.check_out) {
                        totalSeconds += (new Date(record.check_out) - new Date(record.check_in)) / 1000;
                    }
                    if (record.check_in) {
                        const checkInTime = new Date(record.check_in);
                        if (checkInTime.getHours() < 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() <= 5)) {
                            onTimeCount++;
                        }
                    }
                });

                const active = recentHistory.find(r => !r.check_out);

                setStats({
                    total_hours: Math.round(totalSeconds / 360) / 10,
                    punctuality: recentHistory.length > 0 ? Math.round((onTimeCount / recentHistory.length) * 100) : 100,
                    active_streak: Math.min(recentHistory.length, 5),
                    status: active ? 'online' : 'offline'
                });

                setAttendance(recentHistory.slice(0, 5));
                setFullHistory(recentHistory);

                const formattedChart = recentHistory.slice(0, 7).reverse().map(record => ({
                    day: new Date(record.check_in).toLocaleDateString(undefined, { weekday: 'short' }),
                    hours: record.check_out ?
                        Math.round((new Date(record.check_out) - new Date(record.check_in)) / 360000) / 10 : 0
                }));
                setChartData(formattedChart);

            } else {
                const [statsRes, attendanceRes] = await Promise.all([
                    api.get('/users/me/stats'),
                    api.get('/attendance/my')
                ]);
                setStats(statsRes.data);
                setAttendance(attendanceRes.data.slice(0, 5));
                setFullHistory(attendanceRes.data);

                const formattedHistory = attendanceRes.data.slice(0, 7).reverse().map(record => ({
                    day: new Date(record.check_in).toLocaleDateString(undefined, { weekday: 'short' }),
                    hours: record.check_out ?
                        Math.round((new Date(record.check_out) - new Date(record.check_in)) / 360000) / 10 : 0
                }));
                setChartData(formattedHistory);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            const detail = error.response?.data?.detail;
            toast.error(Array.isArray(detail) ? detail[0].msg : (detail || 'Failed to update dashboard data.'));
        } finally {
            setLoading(false);
        }
    };

    const getLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser.'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    };

    const handleClockIn = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        let locationData = { lat: 'Unknown', lon: 'Unknown' };
        const loadingToast = toast.loading('Verifying location and clocking in...');

        try {
            try {
                const position = await getLocation();
                locationData = {
                    lat: position.coords.latitude.toString(),
                    lon: position.coords.longitude.toString()
                };
            } catch (geoErr) {
                console.warn('Geolocation failed:', geoErr);
                toast.dismiss(loadingToast);
                
                if (geoErr.code === 1) {
                    toast.error('Location Access Denied. Please enable it in your browser.');
                } else if (geoErr.code === 2) {
                    toast.error('please turn on the location in device location');
                } else if (geoErr.code === 3) {
                    toast.error('Location Request Timed Out. Please try again.');
                } else {
                    toast.error('Could not fetch location. Check-in cancelled.');
                }
                return; // CRITICAL: Stop the check-in if location fails
            }

            if (isSupabaseConfigured) {
                const { data: { user } } = await supabase.auth.getUser();

                // Get user's name for the record
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                const userName = profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];

                const { error } = await supabase.from('attendance').insert([
                    {
                        user_id: user.id,
                        check_in: new Date().toISOString(),
                        user_name: userName,
                        lat: locationData.lat,
                        lon: locationData.lon
                    }
                ]);
                if (error) throw error;
            } else {
                await api.post('/attendance/check-in', locationData);
            }
            toast.dismiss(loadingToast);
            toast.success('Successfully clocked in.');
            fetchDashboardData();
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.response?.data?.detail || error.message || 'Clock-in failed.');
        }
    };

    const handleClockOut = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: active } = await supabase
                    .from('attendance')
                    .select('id')
                    .eq('user_id', user.id)
                    .is('check_out', null)
                    .single();

                if (active) {
                    const { error } = await supabase
                        .from('attendance')
                        .update({ check_out: new Date().toISOString() })
                        .eq('id', active.id);
                    if (error) throw error;
                }
            } else {
                await api.post('/attendance/check-out');
            }
            toast.success('Successfully clocked out.');
            fetchDashboardData();
        } catch (error) {
            toast.error(error.response?.data?.detail || error.message || 'Clock-out failed.');
        }
    };

    if (loading) return <LoadingScreen message="Fetching Dashboard Data..." />;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="standard-card p-6 border-l-4 border-l-primary"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-primary">
                            <Clock size={20} />
                        </div>
                        <span className="flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">
                            Active Now
                        </span>
                    </div>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                    <h3 className="stat-value">{stats.status === 'online' ? 'Checked In' : 'Logged Out'}</h3>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="standard-card p-6"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                            <Timer size={20} />
                        </div>
                        <span className="flex items-center text-xs font-bold text-slate-400">
                            --%
                        </span>
                    </div>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Work Duration</p>
                    <h3 className="stat-value">{stats.total_hours}h</h3>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="standard-card p-6"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                            <CheckSquare size={20} />
                        </div>
                        <span className="flex items-center text-xs font-bold text-slate-400">
                            Normal
                        </span>
                    </div>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Punctuality Score</p>
                    <h3 className="stat-value">{stats.punctuality}%</h3>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="standard-card p-6"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                            <BarChart3 size={20} />
                        </div>
                    </div>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Active Streak</p>
                    <h3 className="stat-value">{stats.active_streak} Days</h3>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 space-y-8"
                >
                    <div className="standard-card overflow-hidden">
                        <div className="card-header bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="card-title">Attendance Tracking</h3>
                                <p className="text-xs text-text-muted font-medium">Manage your daily check-in and check-out</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w - 2 h - 2 rounded - full ${stats.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'} `}></span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                    Terminal {stats.status === 'online' ? 'Active' : 'Standby'}
                                </span>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-primary rounded-full text-xs font-bold uppercase tracking-widest">
                                        <Calendar size={14} />
                                        Today's Shift
                                    </div>
                                    <h4 className="text-4xl font-bold text-text-main tracking-tight">09:00 AM — 05:00 PM</h4>
                                    <p className="text-sm text-text-muted font-medium max-w-sm">
                                        Standard Day Duty. Please ensure you are within the designated office perimeter before checking in.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
                                    {stats.status !== 'online' ? (
                                        <button
                                            onClick={handleClockIn}
                                            className="btn-primary h-16 text-lg shadow-xl shadow-indigo-100/50"
                                        >
                                            <ArrowUpRight size={24} />
                                            Check In Now
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleClockOut}
                                            className="btn-primary h-16 text-lg bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-100/50"
                                        >
                                            <ArrowDownRight size={24} />
                                            Check Out Now
                                        </button>
                                    )}
                                    <p className="text-[10px] text-center text-text-muted font-bold uppercase tracking-widest">
                                        GPS Verification Active
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Insight Chart */}
                    <div className="standard-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Weekly Activity Insight</h3>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary/20"></div>
                                    <span className="text-[10px] font-bold text-text-muted uppercase">Base Line</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                                    <span className="text-[10px] font-bold text-text-muted uppercase">Actual Work</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="hours"
                                        stroke="#4f46e5"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorHours)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>

                {/* Recent History Sidebar */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <div className="standard-card">
                        <div className="card-header flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-primary" />
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Recent Logs</h3>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {attendance.length > 0 ? attendance.map((entry, idx) => (
                                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-text-main">
                                            {new Date(entry.check_in).toLocaleDateString()}
                                        </span>
                                        <div className="flex gap-1">
                                            {entry.is_out_of_range && (
                                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">
                                                    Out of Range
                                                </span>
                                            )}
                                            {entry.is_late && (
                                                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">
                                                    Late
                                                </span>
                                            )}
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                                                {entry.check_out ? 'Verified' : 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                            <span className="text-[10px] font-medium text-text-muted">
                                                {new Date(entry.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {entry.check_out && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                <span className="text-[10px] font-medium text-text-muted">
                                                    {new Date(entry.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 ml-auto">
                                            <MapPin size={10} className="text-indigo-400" />
                                            <span className="text-[9px] font-bold text-text-muted">
                                                {entry.lat && entry.lon && entry.lat !== 'Unknown' ? `${parseFloat(entry.lat).toFixed(2)}, ${parseFloat(entry.lon).toFixed(2)}` : 'Office'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center">
                                    <p className="text-xs text-text-muted font-medium italic">No recent activity found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Heatmap */}
                    <div className="standard-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 size={18} className="text-primary" />
                            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">30-Day Consistency</h3>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {[...Array(30)].map((_, i) => {
                                const hasData = fullHistory.some(a => {
                                    const date = new Date(a.check_in);
                                    const today = new Date();
                                    today.setDate(today.getDate() - (29 - i));
                                    return date.toDateString() === today.toDateString();
                                });
                                return (
                                    <div 
                                        key={i} 
                                        className={`h-4 rounded-sm ${hasData ? 'bg-primary shadow-sm shadow-indigo-100' : 'bg-slate-100'}`}
                                        title={new Date(new Date().setDate(new Date().getDate() - (29 - i))).toDateString()}
                                    />
                                );
                            })}
                        </div>
                        <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            <span>Last 30 Days</span>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-100 rounded-sm"></div> Absent</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-primary rounded-sm"></div> Present</div>
                            </div>
                        </div>
                    </div>

                    <div className="standard-card p-6 bg-indigo-600 text-white relative overflow-hidden">
                        <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-80">Quick Protocol</h4>
                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    <MapPin size={16} />
                                </div>
                                <div className="text-[10px] font-bold uppercase leading-tight">
                                    Office HQ <br />
                                    <span className="opacity-60 text-[9px]">Standard Perimeter</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    <User size={16} />
                                </div>
                                <div className="text-[10px] font-bold uppercase leading-tight">
                                    Identity Hub <br />
                                    <span className="opacity-60 text-[9px]">Verified Session</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
