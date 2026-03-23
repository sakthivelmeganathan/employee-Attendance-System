import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle, AlertCircle, TrendingUp, MapPin } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const data = [];

const Dashboard = () => {
    const [history, setHistory] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, checked-in
    const [activeSession, setActiveSession] = useState(null);
    const [statsData, setStatsData] = useState({ punctuality_score: 100, total_days: 0, trend: '+0%' });

    useEffect(() => {
        fetchHistory();
        fetchStats();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data } = await api.get('/attendance/history');
            setHistory(data);
            const active = data.find(e => !e.check_out);
            if (active) {
                setStatus('checked-in');
                setActiveSession(active);
            } else {
                setStatus('idle');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/analytics/stats');
            setStatsData(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCheckAction = async () => {
        try {
            if (status === 'idle') {
                const getPosition = (options) => new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, options);
                });

                let pos;
                const loadingToast = toast.loading('Getting precise location...');
                try {
                    pos = await getPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
                    toast.dismiss(loadingToast);
                } catch (gpsError) {
                    toast.dismiss(loadingToast);
                    // Do not failover to Unknown. Stop here.
                    throw gpsError; 
                }

                if (!pos || !pos.coords || !pos.coords.latitude) {
                   throw new Error("Could not obtain valid coordinates. Please try again.");
                }

                await api.post('/attendance/check-in', {
                    lat: pos.coords.latitude.toString(),
                    lon: pos.coords.longitude.toString()
                });
                toast.success('Successfully checked in!');
            } else {
                await api.post(`/attendance/checkout/${activeSession.id}`);
                toast.success('Successfully checked out!');
            }
            fetchHistory();
        } catch (error) {
            console.error('Check-in error detail:', error);
            if (error.code) { // GeolocationPositionError
                if (error.code === 1) {
                    toast.error('Location Access Denied. Please click the lock icon in the address bar and Allow Location.');
                } else if (error.code === 2) {
                    toast.error('please turn on the location in device location');
                } else if (error.code === 3) {
                    toast.error('GPS Signal Timeout. Try moving closer to a window.');
                }
            } else if (error.response) { // Backend API error
                const detail = error.response.data?.detail;
                toast.error(Array.isArray(detail) ? detail[0].msg : (detail || 'Server error during check-in'));
            } else {
                toast.error(error.message || 'Network or browser error');
            }
        }
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Check In', 'Check Out', 'Punctuality'];
        const rows = history.map(row => [
            new Date(row.check_in).toLocaleDateString(),
            new Date(row.check_in).toLocaleTimeString(),
            row.check_out ? new Date(row.check_out).toLocaleTimeString() : '--:--',
            row.punctuality || 'N/A'
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "attendance_report.csv");
        document.body.appendChild(link);
        link.click();
    };

    const stats = [
        { label: 'Total Days', value: statsData.total_days, icon: <Clock className="text-primary" />, trend: statsData.trend },
        { label: 'Punctuality', value: `${statsData.punctuality_score}%`, icon: <CheckCircle className="text-accent" />, trend: '0%' }, // Trend cleared
        { label: 'Leaves', value: '0 Days', icon: <AlertCircle className="text-orange-400" />, trend: '0%' },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-card-bg/40 backdrop-blur-md p-6 rounded-3xl border border-white/5"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl">{stat.icon}</div>
                            <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-lg">
                                <TrendingUp size={12} className="inline mr-1" /> {stat.trend}
                            </span>
                        </div>
                        <h3 className="text-text-muted text-sm font-medium">{stat.label}</h3>
                        <p className="text-3xl font-bold mt-1 text-text-white">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Card */}
                <div className="lg:col-span-2 bg-card-bg/40 backdrop-blur-md p-8 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold">Activity Overview</h3>
                        <select className="bg-white/5 border border-white/10 rounded-lg text-sm px-3 py-1 outline-none">
                            <option>Last 7 Days</option>
                            <option>Last Month</option>
                        </select>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Action Card */}
                <div className="bg-card-bg/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
                        <div className={`absolute inset-0 rounded-full border-4 border-primary/20 ${status === 'checked-in' ? 'animate-ping' : ''}`}></div>
                        <MapPin size={40} className="text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                        {status === 'idle' ? 'Ready to work?' : 'Keep up the good work!'}
                    </h3>
                    <p className="text-text-muted mb-8 text-sm">
                        {status === 'idle' ? 'Start your attendance record' : `Recording active session...`}
                    </p>
                    <button
                        onClick={handleCheckAction}
                        className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all transform active:scale-95 ${status === 'idle' ? 'bg-primary hover:bg-primary-hover shadow-primary/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                            }`}
                    >
                        {status === 'idle' ? 'Check In Now' : 'Check Out'}
                    </button>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-card-bg/40 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Recent History</h3>
                    <button
                        onClick={exportToCSV}
                        className="text-xs font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-all border border-white/5 text-slate-900"
                    >
                        Export CSV
                    </button>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-text-muted text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-8 py-4 px-8 py-4 font-semibold">Date</th>
                            <th className="px-8 py-4 px-8 py-4 font-semibold">Check In</th>
                            <th className="px-8 py-4 px-8 py-4 font-semibold">Check Out</th>
                            <th className="px-8 py-4 px-8 py-4 font-semibold">Duration</th>
                            <th className="px-8 py-4 px-8 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {history.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-4 text-sm">{new Date(row.check_in).toLocaleDateString()}</td>
                                <td className="px-8 py-4 text-sm text-accent">{new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-8 py-4 text-sm text-orange-400">{row.check_out ? new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                                <td className="px-8 py-4 text-sm text-text-muted">{row.duration || '--'}</td>
                                <td className="px-8 py-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${row.is_out_of_range ? 'bg-red-100 text-red-600' : (row.is_late ? 'bg-orange-100 text-orange-600' : (row.check_out ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'))}`}>
                                        {row.is_out_of_range ? 'Out of Range' : (row.is_late ? 'Late' : (row.check_out ? 'Completed' : 'Active'))}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;
