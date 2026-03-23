import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, Clock, Shield, BarChart3, Users, UserCircle } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
    const [loading, setLoading] = useState(false);

    const handleForgotPassword = async () => {
        if (!formData.email) {
            toast.error('Please enter your email address first.');
            return;
        }

        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        if (!isSupabaseConfigured) {
            toast.error('Password reset is not supported in Local Mode. Please contact your administrator.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            toast.success('Password reset email sent! Please check your inbox.');
        } catch (error) {
            toast.error(error.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Check if Supabase is configured
        const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
            !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

        try {
            if (isSupabaseConfigured) {
                if (isLogin) {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: formData.email,
                        password: formData.password,
                    });
                    if (error) throw error;

                    localStorage.setItem('token', data.session.access_token);
                    toast.success('Supabase Login successful.');
                    setTimeout(() => window.location.href = '/', 1000);
                } else {
                    const { error } = await supabase.auth.signUp({
                        email: formData.email,
                        password: formData.password,
                        options: {
                            data: { full_name: formData.full_name },
                            emailRedirectTo: window.location.origin
                        }
                    });
                    if (error) throw error;
                    toast.success('Registration successful! Please check your email for verification.');
                    setIsLogin(true);
                }
            } else {
                // FALLBACK to local API
                if (isLogin) {
                    const params = new URLSearchParams();
                    params.append('username', formData.email);
                    params.append('password', formData.password);
                    const { data } = await api.post('/token', params);
                    localStorage.setItem('token', data.access_token);
                    toast.success('Login successful (Local API). Redirecting...');
                    setTimeout(() => window.location.href = '/', 1000);
                } else {
                    await api.post('/register', formData);
                    toast.success('Account created successfully (Local API). Please login.');
                    setIsLogin(true);
                }
            }
        } catch (error) {
            const detail = error.response?.data?.detail || error.message;
            const message = Array.isArray(detail) ? detail[0].msg : detail;
            toast.error(message || 'Authentication Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 md:p-8 font-inter">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-5xl bg-card-base rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-border-base"
            >
                {/* Left Side: Branding & Info */}
                <div className="md:w-5/12 bg-indigo-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    {/* Abstract background elements */}
                    <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
                                <Clock className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Tracker</h1>
                                <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">Corporate Portal</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold mb-3">Professional Attendance Management</h2>
                                <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                                    Streamline your workplace operations with our secure and intuitive attendance tracking system.
                                </p>
                            </div>

                            <div className="space-y-5">
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-all">
                                        <Shield size={20} className="text-indigo-200" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Secure & Verified</p>
                                        <p className="text-xs text-indigo-200">Location-based authentication.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-all">
                                        <BarChart3 size={20} className="text-indigo-200" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Insightful Analytics</p>
                                        <p className="text-xs text-indigo-200">Track performance trends instantly.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-all">
                                        <Users size={20} className="text-indigo-200" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Team Collaboration</p>
                                        <p className="text-xs text-indigo-200">Manage workforce efficiently.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center gap-3 text-xs opacity-60 font-medium">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        Secure Encryption Active
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="md:w-7/12 p-8 md:p-16 flex flex-col justify-center">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10">
                            <h3 className="text-3xl font-bold text-text-main mb-2">
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h3>
                            <p className="text-text-muted text-sm font-medium">
                                {isLogin ? 'Enter your credentials to access your dashboard.' : 'Fill in the details to register as a new employee.'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <AnimatePresence mode="wait">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2"
                                    >
                                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="text"
                                                placeholder="John Doe"
                                                className="form-input pl-12 h-14"
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="email"
                                        placeholder="name@company.com"
                                        className="form-input pl-12 h-14"
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="password"
                                        placeholder="••••••••••••"
                                        className="form-input pl-12 h-14"
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                                </div>
                            </div>

                            {isLogin && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs font-bold text-primary hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            <button
                                disabled={loading}
                                className="btn-primary w-full h-14 flex items-center justify-center gap-3 text-base shadow-lg shadow-indigo-100 mt-4 disabled:opacity-70"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                                        <span>{isLogin ? 'Sign In' : 'Register Now'}</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-10 pt-10 border-t border-slate-100 text-center">
                            <p className="text-sm text-text-muted font-medium">
                                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="ml-2 text-primary font-bold hover:underline"
                                >
                                    {isLogin ? 'Create one now' : 'Sign in instead'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
