import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Search, MapPin, History, Clock, BarChart3, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabaseClient';

const AttendanceHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        try {
            if (isSupabaseConfigured) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No active session');

                const { data, error } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('check_in', { ascending: false });

                if (error) throw error;
                setHistory(data || []);
            } else {
                const { data } = await api.get('/attendance/my');
                setHistory(data);
            }
        } catch (error) {
            console.error('Fetch history error:', error);
            toast.error('Failed to retrieve attendance logs.');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Check In', 'Check Out', 'Location'];
        const rows = history.map(row => [
            new Date(row.check_in).toLocaleDateString(),
            new Date(row.check_in).toLocaleTimeString(),
            row.check_out ? new Date(row.check_out).toLocaleTimeString() : '--:--',
            row.location || 'N/A'
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "attendance_logs.csv");
        document.body.appendChild(link);
        link.click();
        toast.success('Attendance data exported successfully.');
    };

    const calculateDuration = (checkIn, checkOut) => {
        if (!checkOut) return 'Active';
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffMs = end - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const calculateTotalMs = () => {
        let totalMs = 0;
        history.forEach(row => {
            if (row.check_out) {
                const start = new Date(row.check_in);
                const end = new Date(row.check_out);
                totalMs += (end - start);
            }
        });
        return totalMs;
    };

    const formatMs = (totalMs) => {
        const hours = Math.floor(totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const completedSessions = history.filter(row => row.check_out);
    const totalMs = calculateTotalMs();
    const averageMs = completedSessions.length ? Math.floor(totalMs / completedSessions.length) : 0;

    const filteredHistory = history.filter(row =>
        new Date(row.check_in).toLocaleDateString().includes(searchTerm) ||
        (row.check_out && new Date(row.check_out).toLocaleDateString().includes(searchTerm))
    );

    if (loading) return <LoadingScreen message="Retrieving Logs..." />;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Page Title & Export */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-main tracking-tight">Attendance Records</h2>
                    <p className="text-sm text-text-muted font-medium">View and managed your historical check-in data.</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="btn-secondary h-11 px-6 flex items-center gap-2 group text-slate-900"
                >
                    <FileSpreadsheet size={18} className="text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-slate-900 font-bold">Export to CSV</span>
                </button>
            </div>

            {/* Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="standard-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600"><History size={20} /></div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Days</h4>
                    </div>
                    <p className="stat-value">{history.length}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="standard-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-green-50 rounded-lg text-green-600"><Clock size={20} /></div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Hours</h4>
                    </div>
                    <p className="stat-value">{formatMs(totalMs)}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="standard-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600"><BarChart3 size={20} /></div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Avg Daily</h4>
                    </div>
                    <p className="stat-value">{completedSessions.length ? formatMs(averageMs) : '0h 0m'}</p>
                </motion.div>
            </div>

            {/* Detailed Table */}
            <div className="standard-card">
                <div className="card-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg text-indigo-600"><Calendar size={18} /></div>
                        <h3 className="card-title">Daily Logs</h3>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Filter by date..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input pl-10 h-10"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-text-muted text-[10px] font-bold uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Date</th>
                                <th className="px-8 py-4">Check In</th>
                                <th className="px-8 py-4">Check Out</th>
                                <th className="px-8 py-4">Duration</th>
                                <th className="px-8 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.map((row, i) => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-8 py-5">
                                        <div className="text-sm font-bold text-text-main">
                                            {new Date(row.check_in).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-indigo-600">
                                            {new Date(row.check_in).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {row.check_out ? (
                                            <span className="text-sm font-bold text-orange-500">
                                                {new Date(row.check_out).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-text-muted font-bold italic flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span> Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-text-main">
                                            {calculateDuration(row.check_in, row.check_out)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${row.is_out_of_range ? 'bg-red-100 text-red-600' : (row.is_late ? 'bg-orange-100 text-orange-600' : (row.check_out ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'))}`}>
                                            {row.is_out_of_range ? 'Out of Range' : (row.is_late ? 'Late' : (row.check_out ? 'Completed' : 'Logged In'))}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceHistory;
