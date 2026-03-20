import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState([]);
    const [leaveData, setLeaveData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCalendarData();
    }, [currentDate]);

    const fetchCalendarData = async () => {
        try {
            setLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            const [attendanceRes, leaveRes] = await Promise.all([
                api.get('/attendance/history'),
                api.get('/leaves/my-leaves')
            ]);

            setAttendanceData(attendanceRes.data);
            setLeaveData(leaveRes.data);
        } catch (error) {
            console.error('Fetch calendar data error:', error);
            toast.error('Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const getDataForDate = (day) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

        const attendance = attendanceData.filter(record => {
            const recordDate = new Date(record.check_in).toDateString();
            return recordDate === dateStr;
        });

        const leaves = leaveData.filter(leave => {
            if (leave.status !== 'approved') return false;
            const startDate = new Date(leave.start_date);
            const endDate = new Date(leave.end_date);
            const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            return checkDate >= startDate && checkDate <= endDate;
        });

        return { attendance, leaves };
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading calendar...</div>;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-text-white">Attendance Calendar</h2>
                    <p className="text-text-muted mt-2">View your attendance and leave records</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={previousMonth}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h3 className="text-xl font-bold text-text-white min-w-[200px] text-center">{monthName}</h3>
                    <button
                        onClick={nextMonth}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-card-bg/40 backdrop-blur-md rounded-3xl border border-white/5 p-8">
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-4">
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-text-muted py-2">
                            {day}
                        </div>
                    ))}

                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                        <div key={`empty-${index}`} className="aspect-square" />
                    ))}

                    {/* Calendar Days */}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1;
                        const { attendance, leaves } = getDataForDate(day);
                        const hasAttendance = attendance.length > 0;
                        const hasLeave = leaves.length > 0;
                        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                        return (
                            <motion.div
                                key={day}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.01 }}
                                className={`aspect-square rounded-xl border transition-all relative group cursor-pointer ${isToday ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'
                                    } ${hasAttendance ? 'hover:border-accent' : hasLeave ? 'hover:border-orange-400' : 'hover:border-white/20'}`}
                            >
                                <div className="p-2 h-full flex flex-col">
                                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-text-white'}`}>
                                        {day}
                                    </span>

                                    <div className="flex-1 flex flex-col gap-1 mt-2">
                                        {hasLeave && (
                                            <div className="text-[10px] bg-orange-400/20 text-orange-400 px-2 py-1 rounded font-semibold">
                                                Leave
                                            </div>
                                        )}
                                        {hasAttendance && attendance.map((record, idx) => (
                                            <div key={idx} className={`text-[10px] px-2 py-1 rounded font-semibold ${record.check_out ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                                                }`}>
                                                {record.check_out ? 'Present' : 'Active'}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tooltip on hover */}
                                {(hasAttendance || hasLeave) && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl border border-white/10 min-w-[200px]">
                                            {hasLeave && (
                                                <div className="mb-2">
                                                    <p className="font-semibold text-orange-400">Leave</p>
                                                    <p className="text-text-muted">{leaves[0].leave_type}</p>
                                                </div>
                                            )}
                                            {hasAttendance && attendance.map((record, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <p className="font-semibold text-accent">Attendance</p>
                                                    <p className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        In: {new Date(record.check_in).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {record.check_out && (
                                                        <p className="flex items-center gap-1">
                                                            <Clock size={10} />
                                                            Out: {new Date(record.check_out).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-accent/20 border border-accent"></div>
                        <span className="text-sm text-text-muted">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-primary/20 border border-primary"></div>
                        <span className="text-sm text-text-muted">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-400/20 border border-orange-400"></div>
                        <span className="text-sm text-text-muted">On Leave</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-primary/10 border border-primary"></div>
                        <span className="text-sm text-text-muted">Today</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
