import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Trash2, Calendar, Users, BarChart3, Layers, X, Save } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabaseClient';

const isSupabaseConfigured = () =>
    import.meta.env.VITE_SUPABASE_URL &&
    !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

const Shifts = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', start_time: '', end_time: '' });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            if (isSupabaseConfigured()) {
                const { data, error } = await supabase
                    .from('shifts')
                    .select('*')
                    .order('name');
                if (error) throw error;
                setShifts(data || []);
            } else {
                const { data } = await api.get('/shifts');
                setShifts(data);
            }
        } catch (error) {
            toast.error('Failed to load shift schedules.');
        } finally {
            setLoading(false);
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Shift name is required.';
        if (!form.start_time) errs.start_time = 'Start time is required.';
        if (!form.end_time) errs.end_time = 'End time is required.';
        if (form.start_time && form.end_time && form.start_time >= form.end_time) {
            errs.end_time = 'End time must be after start time.';
        }
        return errs;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        setSubmitting(true);
        try {
            if (isSupabaseConfigured()) {
                const { data, error } = await supabase
                    .from('shifts')
                    .insert([{ name: form.name.trim(), start_time: form.start_time, end_time: form.end_time }])
                    .select()
                    .single();
                if (error) throw error;
                setShifts(prev => [...prev, data]);
            } else {
                const { data } = await api.post('/shifts', {
                    name: form.name.trim(),
                    start_time: form.start_time,
                    end_time: form.end_time,
                });
                setShifts(prev => [...prev, data]);
            }
            toast.success(`Shift "${form.name.trim()}" created successfully!`);
            setShowModal(false);
            setForm({ name: '', start_time: '', end_time: '' });
        } catch (err) {
            console.error('Shift create error:', err);
            toast.error(err?.message || err?.response?.data?.detail || 'Failed to create shift. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (shift) => {
        if (!window.confirm(`Delete shift "${shift.name}"?`)) return;
        try {
            if (isSupabaseConfigured()) {
                const { error } = await supabase.from('shifts').delete().eq('id', shift.id);
                if (error) throw error;
            } else {
                await api.delete(`/shifts/${shift.id}`);
            }
            setShifts(prev => prev.filter(s => s.id !== shift.id));
            toast.success(`Shift "${shift.name}" deleted.`);
        } catch (err) {
            toast.error('Failed to delete shift.');
        }
    };

    const handleOpenModal = () => {
        setForm({ name: '', start_time: '', end_time: '' });
        setErrors({});
        setShowModal(true);
    };

    if (loading) return <LoadingScreen message="Syncing Shift Schedules..." />;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Page Title & Add New */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-main tracking-tight">Shift Schedules</h2>
                    <p className="text-sm text-text-muted font-medium">Manage employee rotations and operational coverage.</p>
                </div>
                <button onClick={handleOpenModal} className="btn-primary h-11 px-6 flex items-center gap-2 group">
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span>Create New Shift</span>
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="standard-card p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-4">
                        <Layers size={16} className="text-indigo-600" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Active Rotations</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value">{shifts.length}</span>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-tighter">Verified</span>
                    </div>
                </div>

                <div className="standard-card p-6 flex flex-col justify-between border-indigo-100 bg-indigo-50/20">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={16} className="text-indigo-600" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Allocated Staff</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value text-indigo-600">—</span>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">Total Onsite</span>
                    </div>
                </div>

                <div className="standard-card p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={16} className="text-indigo-600" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Coverage Status</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="stat-value">{shifts.length > 0 ? 'Optimal' : '—'}</span>
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-tighter">System Idle</span>
                    </div>
                </div>
            </div>

            {/* Shifts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {shifts.length > 0 ? (
                        shifts.map((shift, idx) => (
                            <motion.div
                                key={shift.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.06 }}
                                className="standard-card group overflow-hidden"
                            >
                                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                    <div className="p-3 bg-slate-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                        <Clock size={20} />
                                    </div>
                                    <button
                                        onClick={() => handleDelete(shift)}
                                        className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete shift"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="p-6 pt-5">
                                    <div className="mb-4">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2 bg-indigo-50 text-indigo-600">
                                            Active Shift
                                        </span>
                                        <h3 className="text-lg font-bold text-text-main mb-0.5">{shift.name}</h3>
                                        <p className="text-xs text-text-muted font-bold flex items-center gap-1.5 uppercase tracking-tighter">
                                            <Calendar size={12} className="text-indigo-400" />
                                            {shift.start_time} – {shift.end_time}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center standard-card border-dashed">
                            <Clock className="w-12 h-12 text-slate-200 mb-4" />
                            <h3 className="text-lg font-bold text-text-main">No Shift Rotations</h3>
                            <p className="text-sm text-text-muted max-w-sm mb-6">
                                The database is currently empty. Please create a new shift schedule to start tracking employee coverage.
                            </p>
                            <button onClick={handleOpenModal} className="btn-primary h-10 px-5 flex items-center gap-2">
                                <Plus size={16} />
                                <span>Create First Shift</span>
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create Shift Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
                    >
                        <motion.div
                            className="bg-card-base rounded-2xl shadow-2xl w-full max-w-md border border-border-base overflow-hidden"
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 20 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-border-base">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-xl">
                                        <Clock size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-text-main">Create New Shift</h3>
                                        <p className="text-[11px] text-text-muted">Define a new shift rotation schedule</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-base transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                {/* Shift Name */}
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                                        Shift Name <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        className={`w-full px-4 py-2.5 rounded-xl border bg-bg-base/50 text-sm text-text-main outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer ${errors.name ? 'border-red-400' : 'border-border-base'}`}
                                    >
                                        <option value="" disabled>Select a shift name...</option>
                                        <option value="Morning">Morning</option>
                                        <option value="Afternoon">Afternoon</option>
                                        <option value="Evening">Evening</option>
                                        <option value="Night">Night</option>
                                        <option value="Weekend">Weekend</option>
                                        <option value="Rotational">Rotational</option>
                                        <option value="General">General</option>
                                    </select>
                                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                                </div>

                                {/* Time Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                                            Start Time <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="time"
                                            value={form.start_time}
                                            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                                            className={`w-full px-4 py-2.5 rounded-xl border bg-bg-base/50 text-sm text-text-main outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all ${errors.start_time ? 'border-red-400' : 'border-border-base'}`}
                                        />
                                        {errors.start_time && <p className="text-xs text-red-500 mt-1">{errors.start_time}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
                                            End Time <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="time"
                                            value={form.end_time}
                                            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                                            className={`w-full px-4 py-2.5 rounded-xl border bg-bg-base/50 text-sm text-text-main outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all ${errors.end_time ? 'border-red-400' : 'border-border-base'}`}
                                        />
                                        {errors.end_time && <p className="text-xs text-red-500 mt-1">{errors.end_time}</p>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 h-11 rounded-xl border border-border-base text-text-muted font-bold text-sm hover:bg-bg-base hover:text-text-main transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-11 btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? (
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                <span>Create Shift</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Shifts;
