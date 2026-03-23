import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Supabase sends the reset token in the URL fragment. 
        // We need to check if there's an error in the hash.
        const hash = window.location.hash;
        if (hash.includes('error=')) {
            const params = new URLSearchParams(hash.replace('#', ''));
            const errorDescription = params.get('error_description');
            setError(errorDescription || 'The password reset link is invalid or has expired.');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            toast.success('Password updated successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            toast.error(err.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 md:p-8 font-inter">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-card-base rounded-3xl shadow-xl p-8 border border-border-base text-center"
                >
                    <div className="mb-6 flex justify-center">
                        <div className="bg-red-100 p-4 rounded-full text-red-600">
                            <AlertCircle size={48} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-text-main mb-4">Reset Link Invalid</h2>
                    <p className="text-text-muted mb-8 leading-relaxed">
                        {error}
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-primary w-full h-12 flex items-center justify-center gap-2"
                    >
                        Return to Login
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 md:p-8 font-inter">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-card-base rounded-3xl shadow-xl p-8 border border-border-base"
            >
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4 text-primary">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h3 className="text-3xl font-bold text-text-main mb-2">Set New Password</h3>
                    <p className="text-text-muted text-sm font-medium">
                        Enter your new secure password below to regain access to your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative">
                            <input
                                required
                                type="password"
                                placeholder="••••••••••••"
                                className="form-input pl-12 h-14"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest ml-1">Confirm New Password</label>
                        <div className="relative">
                            <input
                                required
                                type="password"
                                placeholder="••••••••••••"
                                className="form-input pl-12 h-14"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="btn-primary w-full h-14 flex items-center justify-center gap-3 text-base shadow-lg shadow-indigo-100 mt-4 disabled:opacity-70"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Lock size={20} />
                                <span>Update Password</span>
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
