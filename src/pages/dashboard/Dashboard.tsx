import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, FileText, BookOpen } from 'lucide-react';

export default function Dashboard() {
    const { data: stats } = useQuery({
        queryKey: ['dashboard_stats'],
        queryFn: async () => {
            const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
            const { count: reportCount } = await supabase.from('report_cards').select('*', { count: 'exact', head: true });
            const { data: activeYear } = await supabase.from('academic_years').select('tahun_ajaran').eq('is_active', true).single();

            return {
                students: studentCount || 0,
                reports: reportCount || 0,
                activeYear: activeYear?.tahun_ajaran || '-'
            };
        }
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Santri</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.students}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Raport</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.reports}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tahun Ajaran Aktif</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.activeYear}</div>
                    </CardContent>
                </Card>
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
