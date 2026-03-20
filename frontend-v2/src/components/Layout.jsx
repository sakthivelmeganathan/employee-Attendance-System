import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Settings,
    LogOut,
    CheckSquare,
    Clock,
    ClipboardList,
    Bell,
    Search,
    UserCircle,
    CalendarCheck,
    Sun,
    Moon
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme';

const Layout = ({ user }) => {
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length > 1) return parts[0][0] + parts[parts.length - 1][0];
        return parts[0][0];
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const navItems = [
        {
            icon: <LayoutDashboard size={20} />,
            label: user?.is_admin ? 'Admin Dashboard' : 'My Dashboard',
            path: '/'
        },
        {
            icon: <Clock size={20} />,
            label: user?.is_admin ? 'Attendance Logs' : 'My Attendance',
            path: '/attendance'
        },
        ...(user?.is_admin ? [
            { icon: <Users size={20} />, label: 'Staff Directory', path: '/admin' },
            { icon: <ClipboardList size={20} />, label: 'Approval Queue', path: '/admin/leaves' }
        ] : []),
        { icon: <CalendarCheck size={20} />, label: 'Shift Schedule', path: '/shifts' },
        ...(!user?.is_admin ? [
            { icon: <Calendar size={20} />, label: 'Leave Manager', path: '/leaves' }
        ] : []),
        { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
    ];

    const getPageTitle = (path) => {
        const map = {
            '/': user?.is_admin ? 'Management Overview' : 'Employee Dashboard',
            '/attendance': 'Attendance History',
            '/admin': 'Staff Management',
            '/admin/leaves': 'Leave Approvals',
            '/shifts': 'Organization Shifts',
            '/leaves': 'Apply for Leave',
            '/settings': 'Account Settings'
        };
        return map[path] || 'Attendance Tracker';
    };

    const todayLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="flex h-screen bg-bg-base overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-card-base border-r border-border-base flex flex-col z-50 transition-colors duration-300">
                <div className="p-8 flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                        <CalendarCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-main tracking-tight leading-tight">Tracker</h2>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest whitespace-nowrap">Attendance System</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive
                                    ? 'bg-primary/10 text-primary font-bold'
                                    : 'text-text-muted hover:text-text-main hover:bg-bg-base'
                                }`
                            }
                        >
                            <span className="transition-transform group-hover:translate-x-1">{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-border-base space-y-3">
                    <div className="bg-bg-base/50 border border-border-base p-4 rounded-2xl flex items-center gap-3 group hover:bg-card-base hover:shadow-sm transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm transition-transform group-hover:scale-105">
                            {user ? getInitials(user.full_name) : '...'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-text-main truncate leading-tight">
                                {user?.full_name || (
                                    <div className="h-3 w-20 bg-text-muted/20 rounded animate-pulse"></div>
                                )}
                            </p>
                            <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider mt-0.5">
                                {user ? (user.is_admin ? 'Administrator' : 'Staff Member') : 'Connecting...'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={toggleTheme}
                            className="flex items-center gap-3 flex-1 px-4 py-3 text-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all text-sm font-bold"
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                            <span>{isDark ? 'Light' : 'Dark'}</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 flex-1 px-4 py-3 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-sm font-bold"
                        >
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 glass-effect flex items-center justify-between px-8 sticky top-0 z-40 mx-4 mt-4 rounded-2xl border-white/40">
                    <div>
                        <h1 className="text-xl font-bold text-text-main tracking-tight leading-none mb-1">{getPageTitle(location.pathname)}</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">{todayLabel}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative hidden lg:block group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-primary" />
                            <input
                                type="text"
                                placeholder="Search dashboards..."
                                className="pl-11 pr-4 py-2.5 bg-bg-base/50 border border-border-base rounded-xl text-sm w-72 focus:bg-card-base focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-text-muted/50"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2.5 bg-white border border-border-base rounded-xl text-text-muted hover:text-primary hover:border-primary transition-all relative group active:scale-95">
                                <Bell size={20} />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-500/20 group-hover:animate-bounce"></span>
                            </button>
                            <div className="w-px h-8 bg-border-base mx-2 opacity-50"></div>
                            <div className="group relative cursor-pointer active:scale-95 transition-transform">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 border border-primary/20 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 overflow-hidden">
                                    {user ? getInitials(user.full_name) : <UserCircle size={24} />}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
