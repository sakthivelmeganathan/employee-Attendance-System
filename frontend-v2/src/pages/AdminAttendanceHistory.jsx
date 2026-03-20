import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Search, MapPin, Download, User, Clock, FileSpreadsheet, Activity } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const AdminAttendanceHistory = () => {
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
            setLoading(true);
            if (isSupabaseConfigured) {
                const { data, error } = await supabase
                    .from('attendance')
                    .select('*')
                    .order('check_in', { ascending: false });

                if (error) throw error;
                setHistory(data || []);
            } else {
                const { data } = await api.get('/admin/attendance');
                setHistory(data);
            }
        } catch (error) {
            console.error('Fetch history error:', error);
            toast.error('Access Denied: Unable to fetch attendance logs.');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Location'];
        const rows = history.map(row => [
            row.user_name || 'Unknown',
            new Date(row.check_in).toLocaleDateString(),
            new Date(row.check_in).toLocaleTimeString(),
            row.check_out ? new Date(row.check_out).toLocaleTimeString() : '--:--',
            row.lat && row.lon ? `${row.lat}, ${row.lon}` : 'N/A'
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "attendance_audit_logs.csv");
        document.body.appendChild(link);
        link.click();
        toast.success('Attendance audit data exported.');
    };

    const calculateDuration = (checkIn, checkOut) => {
        if (!checkOut) return 'In Progress';
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffMs = end - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const calculateTotalHours = () => {
        let totalMs = 0;
        history.forEach(row => {
            if (row.check_out) {
                const start = new Date(row.check_in);
                const end = new Date(row.check_out);
                totalMs += (end - start);
            }
        });
        const hours = Math.floor(totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const getEmployeeStats = () => {
        const employeeMap = {};
        history.forEach(row => {
            const name = row.user_name || 'Unknown';
            if (!employeeMap[name]) {
                employeeMap[name] = { totalMs: 0, records: 0 };
            }
            if (row.check_out) {
                const start = new Date(row.check_in);
                const end = new Date(row.check_out);
                employeeMap[name].totalMs += (end - start);
                employeeMap[name].records += 1;
            }
        });

        return Object.entries(employeeMap).map(([name, data]) => ({
            name,
            hours: Math.floor(data.totalMs / (1000 * 60 * 60)),
            minutes: Math.floor((data.totalMs % (1000 * 60 * 60)) / (1000 * 60)),
            records: data.records
        })).sort((a, b) => (b.hours * 60 + b.minutes) - (a.hours * 60 + a.minutes));
    };

    const filteredHistory = history.filter(row =>
        (row.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(row.check_in).toLocaleDateString().includes(searchTerm)
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Compiling Institutional Data...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Page Title & Export */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                        <h2 className="text-3xl font-bold text-text-main font-outfit tracking-tight">Institutional Logs</h2>
                    </div>
                    <p className="text-sm text-text-muted font-medium">Complete administrative audit of all personnel admissions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Global Duty Time</span>
                        <span className="text-sm font-bold text-primary">{calculateTotalHours()}</span>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="secondary-button h-11 px-6 flex items-center gap-2 group text-slate-900"
                    >
                        <FileSpreadsheet size={18} className="text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-slate-900 font-bold">Full Audit Export</span>
                    </button>
                </div>
            </div>

            {/* Employee Statistics Summary */}
            {history.length > 0 && (
                <div className="medical-card p-1">
                    <div className="p-6 border-b border-slate-50">
                        <h3 className="text-lg font-bold text-text-main font-outfit flex items-center gap-2">
                            <Activity className="text-primary" size={18} />
                            Personnel Engagement Mean
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {getEmployeeStats().map((emp, idx) => (
                                <motion.div
                                    key={emp.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <User size={14} />
                                        </div>
                                        <span className="text-xs font-bold text-text-main truncate uppercase tracking-tighter">{emp.name}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-text-muted uppercase">Total Duty</span>
                                            <span className="text-sm font-bold text-primary">{emp.hours}h {emp.minutes}m</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-text-muted uppercase">Cycles</span>
                                            <span className="text-sm font-bold text-text-main">{emp.records}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Record Table */}
            <div className="medical-card">
                <div className="medical-header border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg"><Clock className="text-primary" size={18} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-text-main font-outfit">Admissions Ledger</h3>
                            <p className="text-xs text-text-muted font-medium">Verified cross-institutional activity</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search by personnel or date..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="medical-input pl-10 h-10 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-text-muted text-[10px] font-extrabold uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Personnel</th>
                                <th className="px-8 py-4">Filing Date</th>
                                <th className="px-8 py-4 text-center">Admission</th>
                                <th className="px-8 py-4 text-center">Release</th>
                                <th className="px-8 py-4 text-center">Total Time</th>
                                <th className="px-8 py-4 text-center">Terminal</th>
                                <th className="px-8 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.map((row, i) => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="hover:bg-blue-50/20 transition-colors"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-primary font-bold text-[10px]">
                                                {(row.user_name || 'U').split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <span className="text-sm font-bold text-text-main">
                                                {row.user_name || 'Unknown Personnel'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-text-muted">
                                            {new Date(row.check_in).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-sm font-bold text-blue-600">
                                            {new Date(row.check_in).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        {row.check_out ? (
                                            <span className="text-sm font-bold text-orange-500">
                                                {new Date(row.check_out).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-text-muted font-bold italic">Active</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-sm font-bold text-primary">
                                            {calculateDuration(row.check_in, row.check_out)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        {row.lat && row.lon ? (
                                            <a
                                                href={`https://www.google.com/maps?q=${row.lat},${row.lon}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/10 transition-all uppercase"
                                            >
                                                <MapPin size={12} /> Map View
                                            </a>
                                        ) : (
                                            <span className="text-xs text-text-muted font-bold uppercase">Institutional</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-tight ${row.check_out ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {row.check_out ? 'Verified' : 'In Service'}
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

export default AdminAttendanceHistory;
