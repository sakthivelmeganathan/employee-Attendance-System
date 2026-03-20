import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Clock, CheckCircle, XCircle, FileText, BarChart3, AlertCircle, X } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabaseClient';

const Leaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        leave_type: 'Sick Leave',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            setLoading(true);
            if (isSupabaseConfigured) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No active session');

                const { data, error } = await supabase
                    .from('leaves')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setLeaves(data || []);
            } else {
                const { data } = await api.get('/leaves/history');
                setLeaves(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to sync leave records.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                const { data: { user } } = await supabase.auth.getUser();

                // Get user's name for the record
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                const userName = profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];

                const { error } = await supabase.from('leaves').insert([
                    {
                        user_id: user.id,
                        user_name: userName,
                        ...formData,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }
                ]);
                if (error) throw error;
            } else {
                await api.post('/leaves/request', formData);
            }
            toast.success('Leave request submitted successfully.');
            setIsModalOpen(false);
            fetchLeaves();
        } catch (error) {
            toast.error(error.message || 'Failed to submit leave request.');
        }
    };

    const totalLeaves = leaves.length;
    const approvedLeaves = leaves.filter(leave => leave.status === 'approved').length;
    const pendingLeaves = leaves.filter(leave => leave.status === 'pending').length;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-main tracking-tight">Leave Management</h2>
                    <p className="text-sm text-text-muted font-medium">Request and track your leave applications.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary h-11 px-6 flex items-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span>Request Leave</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="standard-card p-6 border-indigo-100 bg-indigo-50/20">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText size={16} className="text-indigo-600" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Requests</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value text-indigo-600">{totalLeaves}</span>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">Applied</span>
                    </div>
                </div>

                <div className="standard-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle size={16} className="text-green-500" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Approved</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value">{approvedLeaves}</span>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-tighter">Verified</span>
                    </div>
                </div>

                <div className="standard-card p-6 border-orange-100/50 bg-orange-50/10">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={16} className="text-orange-500" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pending</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value text-orange-600">{pendingLeaves}</span>
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-tighter">In Review</span>
                    </div>
                </div>
            </div>

            {/* Leaves List */}
            <div className="standard-card">
                <div className="card-header border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-indigo-600"><BarChart3 size={18} /></div>
                    <h3 className="card-title">Leave History</h3>
                </div>

                <div className="p-6 space-y-4">
                    <AnimatePresence>
                        {leaves.length > 0 ? (
                            leaves.map((leave, i) => (
                                <motion.div
                                    key={leave.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-200 transition-all group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-main uppercase tracking-tight">{leave.leave_type}</h3>
                                            <p className="text-xs font-bold text-text-muted flex items-center gap-1.5 mt-0.5">
                                                <span className="text-indigo-600">{new Date(leave.start_date).toLocaleDateString()}</span>
                                                <span className="opacity-30">—</span>
                                                <span className="text-orange-500">{new Date(leave.end_date).toLocaleDateString()}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        {leave.reason && (
                                            <div className="hidden lg:block max-w-xs">
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Reason</p>
                                                <p className="text-xs text-black dark:text-white line-clamp-1 italic">"{leave.reason}"</p>
                                            </div>
                                        )}
                                        <div className="min-w-[120px] text-right">
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Status</p>
                                            <div className={`inline-flex px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight items-center gap-1.5 border shadow-sm ${leave.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                                leave.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                {leave.status === 'approved' && <CheckCircle size={12} />}
                                                {leave.status === 'rejected' && <XCircle size={12} />}
                                                {leave.status === 'pending' && <Clock size={12} />}
                                                {leave.status}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-3">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                                    <FileText className="text-slate-300" size={32} />
                                </div>
                                <p className="text-sm font-bold text-text-muted uppercase tracking-widest">No Leave Records Found</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Request Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-indigo-100"
                        >
                            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                                        <Calendar size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold text-text-main tracking-tight">Request Leave</h2>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-white rounded-lg text-text-muted hover:text-red-500 transition-colors border border-transparent hover:border-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Leave Type</label>
                                        <select
                                            className="form-input h-12"
                                            value={formData.leave_type}
                                            onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                        >
                                            <option>Sick Leave</option>
                                            <option>Casual Leave</option>
                                            <option>Paternity Leave</option>
                                            <option>Maternity Leave</option>
                                            <option>Vacation</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Start Date</label>
                                        <input
                                            type="date"
                                            className="form-input h-12"
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">End Date</label>
                                        <input
                                            type="date"
                                            className="form-input h-12"
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Reason</label>
                                        <textarea
                                            className="form-input !p-4 min-h-[100px] resize-none"
                                            placeholder="Provide a brief reason for your leave..."
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-50">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="btn-secondary flex-1 h-12 font-bold text-xs uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary flex-1 h-12 font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100"
                                    >
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Leaves;
