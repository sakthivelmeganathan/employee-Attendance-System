import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Bell, Save, UserCircle, Mail, Key, BarChart3, BadgeCheck, Lock, Eye, EyeOff, Smartphone, BellRing, BellOff, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Settings = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        is_admin: false
    });

    // Security state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Notification preferences
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        attendanceReminders: true,
        leaveUpdates: true,
        shiftChanges: false,
        securityAlerts: true,
        weeklyReport: false
    });

    React.useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                const { data: { user: supabaseUser } } = await supabase.auth.getUser();
                if (!supabaseUser) return;

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', supabaseUser.id)
                    .single();

                if (error) throw error;
                setUser(profile);
                setFormData({
                    full_name: profile.full_name || '',
                    email: profile.email || '',
                    is_admin: profile.is_admin === true
                });
            } else {
                const { data } = await api.get('/users/me');
                setUser(data);
                setFormData({
                    full_name: data.full_name,
                    email: data.email,
                    is_admin: data.is_admin === true
                });
            }
        } catch (error) {
            console.error('Fetch profile error:', error);
            toast.error('Failed to load profile.');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
        try {
            if (isSupabaseConfigured) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.full_name,
                        is_admin: formData.is_admin
                    })
                    .eq('id', authUser.id);

                if (error) throw error;

                await supabase.auth.updateUser({
                    data: {
                        full_name: formData.full_name,
                        role: formData.is_admin ? 'admin' : 'staff'
                    }
                });
            } else {
                await api.put('/users/me', formData);
            }
            toast.success('Profile updated successfully.');
            fetchProfile();
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            toast.error(error.message || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match.');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters.');
            return;
        }

        setPasswordLoading(true);
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        try {
            if (isSupabaseConfigured) {
                const { error } = await supabase.auth.updateUser({
                    password: passwordData.newPassword
                });
                if (error) throw error;
                toast.success('Password updated successfully!');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                toast.error('Password change is not supported in Local Mode.');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to change password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleNotificationToggle = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
        toast.success('Notification preference updated.');
    };

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: <UserCircle size={18} /> },
        { id: 'security', label: 'Security & Privacy', icon: <Shield size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-text-main tracking-tight">Account Settings</h2>
                <p className="text-sm text-text-muted font-medium">Manage your profile and account preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation / Cards */}
                <div className="space-y-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 p-4 rounded-xl border font-bold transition-all text-sm ${activeTab === tab.id
                                    ? 'bg-card-base border-primary/30 text-primary shadow-sm'
                                    : 'bg-card-base/50 border-border-base text-text-muted hover:bg-card-base hover:border-primary/20'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}

                    <div className="standard-card mt-8 p-6 bg-primary/5 border-primary/10">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="text-primary" size={16} />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Status</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-card-base rounded-full flex items-center justify-center text-primary shadow-sm border border-primary/10">
                                <BadgeCheck size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-text-main">Verified User</p>
                                <p className="text-[10px] text-text-muted">
                                    {formData.is_admin ? 'Administrator' : 'Standard Employee'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Settings Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <div className="standard-card">
                                <div className="card-header border-b border-border-base flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><User size={18} /></div>
                                    <h3 className="card-title">Profile Information</h3>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                                <input
                                                    type="text"
                                                    value={formData.full_name}
                                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                    className="form-input pl-12"
                                                    placeholder="Enter your name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="form-input pl-12"
                                                    placeholder="your@email.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 opacity-50">
                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Role Type</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                                <input
                                                    type="text"
                                                    disabled
                                                    value={formData.is_admin ? 'Administrator' : 'Standard Employee'}
                                                    className="form-input pl-12 bg-slate-50/50 cursor-not-allowed"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted opacity-50">
                                                    <Shield size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="btn-primary w-full sm:w-auto px-8 flex items-center justify-center gap-2 h-12"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <Save size={18} />
                                                    <span>Save Changes</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}

                    {/* Security & Privacy Tab */}
                    {activeTab === 'security' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                            {/* Change Password */}
                            <div className="standard-card">
                                <div className="card-header border-b border-border-base flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><Lock size={18} /></div>
                                    <h3 className="card-title">Change Password</h3>
                                </div>

                                <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Current Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                className="form-input pl-12 pr-12"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                                            >
                                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">New Password</label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                className="form-input pl-12 pr-12"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                                            >
                                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Confirm New Password</label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                            <input
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                className="form-input pl-12"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={passwordLoading}
                                            className="btn-primary w-full sm:w-auto px-8 flex items-center justify-center gap-2 h-12"
                                        >
                                            {passwordLoading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <Shield size={18} />
                                                    <span>Update Password</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Privacy Info */}
                            <div className="standard-card p-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/10">
                                        <Smartphone className="text-primary" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-text-main uppercase tracking-tight">Active Sessions</h4>
                                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                            You are currently signed in on this device. For security, sign out from devices you don't recognize.
                                        </p>
                                        <div className="mt-4 p-3 bg-bg-base rounded-xl border border-border-base flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-xs font-bold text-text-main">Current Browser</span>
                                            </div>
                                            <span className="text-[10px] text-text-muted font-bold uppercase">Active Now</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Security Notice */}
                            <div className="standard-card p-6 border-border-base bg-card-base">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/10">
                                        <Shield className="text-primary" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-text-main uppercase tracking-tight">Security Notice</h4>
                                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                            Account changes are monitored for security purposes.
                                            If you notice any unauthorized activity, please contact your administrator immediately.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                            <div className="standard-card">
                                <div className="card-header border-b border-border-base flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><BellRing size={18} /></div>
                                    <h3 className="card-title">Notification Preferences</h3>
                                </div>

                                <div className="p-6 space-y-1">
                                    {[
                                        { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive important updates via email', icon: <Mail size={18} /> },
                                        { key: 'attendanceReminders', label: 'Attendance Reminders', desc: 'Get reminded to check in and out', icon: <Bell size={18} /> },
                                        { key: 'leaveUpdates', label: 'Leave Status Updates', desc: 'Notifications when leave requests are approved or rejected', icon: <CheckCircle size={18} /> },
                                        { key: 'shiftChanges', label: 'Shift Change Alerts', desc: 'Get notified when your shift schedule changes', icon: <BellRing size={18} /> },
                                        { key: 'securityAlerts', label: 'Security Alerts', desc: 'Alerts for login attempts and account changes', icon: <Shield size={18} /> },
                                        { key: 'weeklyReport', label: 'Weekly Summary Report', desc: 'Receive a weekly attendance summary email', icon: <BarChart3 size={18} /> },
                                    ].map(item => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between p-4 rounded-xl hover:bg-bg-base transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
                                                    {item.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-main">{item.label}</p>
                                                    <p className="text-[11px] text-text-muted">{item.desc}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleNotificationToggle(item.key)}
                                                className={`relative w-12 h-7 rounded-full transition-all duration-300 ${notifications[item.key]
                                                        ? 'bg-primary'
                                                        : 'bg-border-base'
                                                    }`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${notifications[item.key] ? 'left-6' : 'left-1'
                                                    }`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="standard-card p-6 border-border-base bg-card-base">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/10">
                                        <BellOff className="text-amber-500" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-text-main uppercase tracking-tight">Notification Delivery</h4>
                                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                            Notifications are delivered based on your preferences. Email notifications require a verified email address.
                                            Some critical security alerts cannot be disabled.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
