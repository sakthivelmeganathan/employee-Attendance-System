import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle, XCircle, Clock, FileText, User, Calendar, BarChart3, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const LeaveRequests = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            setLoading(true);
            if (isSupabaseConfigured) {
                // Fetch all leaves for admin
                const { data, error } = await supabase
                    .from('leaves')
                    .select('*, profiles(full_name)')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Flatten user data
                const formatted = (data || []).map(l => ({
                    ...l,
                    user_name: l.profiles?.full_name || 'Unknown User'
                }));
                setLeaves(formatted);
            } else {
                const { data } = await api.get('/admin/leaves');
                setLeaves(data);
            }
        } catch (error) {
            console.error('Fetch leaves error:', error);
            toast.error('Failed to access leave requests queue.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLeaveStatus = async (leaveId, status) => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                const { error } = await supabase
                    .from('leaves')
                    .update({ status })
                    .eq('id', leaveId);
                if (error) throw error;
            } else {
                await api.post(`/admin/leaves/${leaveId}/status`, { status });
            }
            toast.success(`Leave request ${status} successfully.`);
            fetchLeaves();
        } catch (error) {
            toast.error(error.message || 'Failed to update leave status.');
        }
    };

    const filteredLeaves = leaves.filter(leave =>
        (leave.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leave.leave_type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = leaves.filter(leave => leave.status === 'pending').length;
    const approvedCount = leaves.filter(leave => leave.status === 'approved').length;
    const rejectedCount = leaves.filter(leave => leave.status === 'rejected').length;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Loading Requests...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-text-main tracking-tight">Leave Approvals</h2>
                <p className="text-sm text-text-muted font-medium">Review and manage employee leave applications.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="standard-card p-6 border-orange-100 bg-orange-50/10">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={16} className="text-orange-500" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pending Review</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value text-orange-600">{pendingCount}</span>
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-tighter">Action Required</span>
                    </div>
                </div>

                <div className="standard-card p-6 border-green-100 bg-green-50/10">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle size={16} className="text-green-500" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Approved Requests</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value text-green-600">{approvedCount}</span>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-tighter">Verified</span>
                    </div>
                </div>

                <div className="standard-card p-6 border-red-100 bg-red-50/10">
                    <div className="flex items-center gap-2 mb-4">
                        <XCircle size={16} className="text-red-500" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rejected Requests</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value text-red-600">{rejectedCount}</span>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-tighter">Archived</span>
                    </div>
                </div>
            </div>

            {/* Requests Table */}
            <div className="standard-card">
                <div className="card-header border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg text-indigo-600"><FileText size={18} /></div>
                        <h3 className="card-title">Leave Ledger</h3>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search by employee or type..."
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
                                <th className="px-8 py-4">Employee</th>
                                <th className="px-8 py-4">Type</th>
                                <th className="px-8 py-4">Schedule</th>
                                <th className="px-8 py-4">Reason</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filteredLeaves.map((leave, i) => (
                                    <motion.tr
                                        key={leave.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                                    {(leave.user_name || 'U').split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <p className="text-sm font-bold text-text-main">{leave.user_name || 'Unknown Personnel'}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 uppercase">
                                                {leave.leave_type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-text-main">
                                                    {new Date(leave.start_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                </span>
                                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">to</span>
                                                <span className="text-xs font-bold text-orange-500">
                                                    {new Date(leave.end_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs text-black dark:text-white max-w-xs line-clamp-2" title={leave.reason}>
                                                {leave.reason || <span className="text-text-muted italic">No reason provided</span>}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight items-center gap-1.5 shadow-sm border ${leave.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                                leave.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                {leave.status === 'approved' && <CheckCircle size={10} />}
                                                {leave.status === 'rejected' && <XCircle size={10} />}
                                                {leave.status === 'pending' && <Clock size={10} />}
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {leave.status === 'pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdateLeaveStatus(leave.id, 'approved')}
                                                        className="h-8 px-3 rounded-lg bg-green-600 text-white text-[10px] font-bold uppercase hover:bg-green-700 transition-all active:scale-95"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected')}
                                                        className="h-8 px-3 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase hover:bg-red-700 transition-all active:scale-95"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-text-muted uppercase">Processed</span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                    {filteredLeaves.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">No matching requests found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeaveRequests;
