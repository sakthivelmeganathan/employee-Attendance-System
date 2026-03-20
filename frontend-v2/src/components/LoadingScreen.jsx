import React from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';

const LoadingScreen = ({ message = "Synchronizing Data..." }) => {
    return (
        <div className="fixed inset-0 z-[999] bg-bg-base flex flex-col items-center justify-center overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-slow-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-3xl animate-slow-pulse" style={{ animationDelay: '1.5s' }}></div>

            <div className="relative flex flex-col items-center">
                {/* Branded Logo Animation */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                        duration: 0.8,
                        ease: "easeOut"
                    }}
                    className="relative mb-8"
                >
                    <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30 relative z-10">
                        <CalendarCheck className="w-12 h-12 text-white" />
                    </div>

                    {/* Ring animations */}
                    <div className="absolute inset-[-10px] border-2 border-primary/20 rounded-[2.5rem] animate-ping opacity-20"></div>
                    <div className="absolute inset-[-20px] border-2 border-primary/10 rounded-[3rem] animate-pulse opacity-10" style={{ animationDuration: '3s' }}></div>
                </motion.div>

                {/* Loading Text */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                >
                    <h2 className="text-xl font-bold text-text-main tracking-tight mb-2">Attendance Tracker</h2>
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.3, 1, 0.3]
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 1,
                                        delay: i * 0.2
                                    }}
                                    className="w-1.5 h-1.5 bg-primary rounded-full"
                                />
                            ))}
                        </div>
                        <span className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] ml-2">
                            {message}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Progress Bar Indicator (Decorative) */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut"
                    }}
                    className="w-1/2 h-full bg-primary rounded-full"
                />
            </div>
        </div>
    );
};

export default LoadingScreen;
