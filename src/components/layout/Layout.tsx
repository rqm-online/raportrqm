import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, Users, FileText, Settings, LogOut, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export default function Layout() {
    const { session, loading, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    if (!session) {
        // Redirect to login if not authenticated
        // In a real app, use a ProtectedRoute component
        navigate('/login');
        return null;
    }

    const navItems = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/students', label: 'Data Santri', icon: Users },
        { href: '/teachers', label: 'Data Guru', icon: Users },
        { href: '/halaqah', label: 'Data Halaqah', icon: Users },
        { href: '/surah', label: 'Data Surah', icon: BookOpen },
        { href: '/student-surah', label: 'Surah per Santri', icon: BookOpen },
        { href: '/academic', label: 'Tahun Ajaran', icon: BookOpen },
        { href: '/raport', label: 'Input Raport', icon: FileText },
        { href: '/leger', label: 'Leger Nilai', icon: FileText },
        { href: '/settings', label: 'Pengaturan', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r shadow-sm hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-blue-600">RQM Raport</h1>
                    <p className="text-xs text-gray-500">Rumah Qur'an Muharrik</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                            {session.user.email?.[0].toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{session.user.email}</p>
                            <p className="text-xs text-gray-500">Guru</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => signOut()}>
                        <LogOut size={16} />
                        Keluar
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
