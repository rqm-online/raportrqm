import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Dashboard() {
    const { session } = useAuth();
    const user = session?.user;

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard_stats', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Base stats for Admin
            const studentsCount = await supabase.from('students').select('*', { count: 'exact', head: true });
            const reportsCount = await supabase.from('report_cards').select('*', { count: 'exact', head: true });

            // Teacher specific stats
            let teacherHalaqah = null;
            let teacherStudentsCount = 0;

            if (user.role === 'guru') {
                const { data: halaqah } = await supabase
                    .from('halaqah')
                    .select('*')
                    .eq('guru_id', user.id)
                    .single();

                if (halaqah) {
                    teacherHalaqah = halaqah;
                    const { count } = await supabase
                        .from('students')
                        .select('*', { count: 'exact', head: true })
                        .eq('halaqah_id', halaqah.id)
                        .eq('is_active', true);
                    teacherStudentsCount = count || 0;
                }
            }

            return {
                totalStudents: studentsCount.count || 0,
                totalReports: reportsCount.count || 0,
                teacherHalaqah,
                teacherStudentsCount
            };
        }
    });

    if (isLoading) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Selamat datang kembali, {(user as any)?.full_name || user?.email}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* ADMIN STATS */}
                {user?.role === 'admin' && (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Santri</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.totalStudents}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.totalReports}</div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* TEACHER STATS */}
                {user?.role === 'guru' && (
                    <>
                        <Card className="bg-blue-50 border-blue-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-blue-900">Halaqah Saya</CardTitle>
                                <Users className="h-4 w-4 text-blue-700" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-900">
                                    {stats?.teacherHalaqah?.nama || 'Belum ditentukan'}
                                </div>
                                <p className="text-xs text-blue-700 mt-1">
                                    {stats?.teacherStudentsCount} Santri Aktif
                                </p>
                            </CardContent>
                        </Card>

                        {/* Quick Action for Teacher */}
                        <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => window.location.href = '/raport/input'}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Input Nilai</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    Klik untuk mulai input nilai santri
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Selamat Datang di Sistem Informasi Raport RQM</h2>
                <p className="text-gray-600">
                    Silakan gunakan menu di samping untuk mengelola data santri, tahun ajaran, dan input nilai raport.
                </p>
            </div>
        </div>
    );
}
