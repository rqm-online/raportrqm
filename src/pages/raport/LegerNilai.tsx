import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Download, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Halaqah, Semester, TeacherAssignment } from '../../types';
import { formatScore, getPredikat } from '../../utils/grading';
import { useToast } from '../../components/ui/use-toast';

interface LegerRow {
    student_id: string;
    student_name: string;
    nis: string;
    halaqah_name: string;
    nilai_akhir_akhlak: number;
    nilai_akhir_kedisiplinan: number;
    nilai_akhir_kognitif: number;
    nilai_akhir_total: number;
}

type SortConfig = {
    key: keyof LegerRow;
    direction: 'asc' | 'desc';
} | null;

export default function LegerNilai() {
    const { toast } = useToast();
    const { session } = useAuth();
    const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Fetch teacher assignments (for guru role)
    const { data: teacherAssignments } = useQuery({
        queryKey: ['teacher_assignments', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('teacher_assignments')
                .select('*')
                .eq('teacher_id', session!.user!.id)
                .eq('is_active', true);
            if (error) throw error;
            return data as TeacherAssignment[];
        }
    });

    // Get assigned halaqah IDs for filtering
    const assignedHalaqahIds = teacherAssignments?.map(a => a.halaqah_id) || [];

    // Fetch Active Semester
    const { data: semesterData } = useQuery({
        queryKey: ['active_semester'],
        queryFn: async () => {
            const { data } = await supabase.from('semesters').select('*, academic_year:academic_years(*)').eq('is_active', true).single();
            return data as Semester & { academic_year: any };
        }
    });

    // Fetch Halaqah List (filtered by assignments for guru)
    const { data: halaqahList } = useQuery({
        queryKey: ['halaqah', assignedHalaqahIds],
        queryFn: async () => {
            let query = supabase
                .from('halaqah')
                .select('*')
                .eq('is_active', true);

            // Filter by assigned halaqahs if user is guru
            if (teacherAssignments && teacherAssignments.length > 0 && assignedHalaqahIds.length > 0) {
                query = query.in('id', assignedHalaqahIds);
            }

            const { data } = await query.order('nama');
            return data as Halaqah[];
        }
    });

    // Auto-select first halaqah for teachers
    useEffect(() => {
        if (!isInitialized && halaqahList && teacherAssignments && teacherAssignments.length > 0) {
            // If teacher has assignments and no halaqah is selected, auto-select the first one
            if (!selectedHalaqahId && halaqahList.length > 0) {
                setSelectedHalaqahId(halaqahList[0].id);
            }
            setIsInitialized(true);
        }
    }, [halaqahList, teacherAssignments, selectedHalaqahId, isInitialized]);

    // Fetch Settings for Predikat
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await supabase.from('settings_lembaga').select('*').single();
            return data;
        }
    });

    // Fetch Leger Data
    const { data: legerData, isLoading } = useQuery({
        queryKey: ['leger', selectedHalaqahId, semesterData?.id, assignedHalaqahIds],
        enabled: !!semesterData?.id,
        queryFn: async () => {
            let query = supabase
                .from('view_leger_nilai')
                .select('*')
                .eq('semester_id', semesterData!.id);

            if (selectedHalaqahId) {
                // Filter by specific halaqah
                query = query.eq('halaqah_id', selectedHalaqahId);
            } else if (teacherAssignments && teacherAssignments.length > 0 && assignedHalaqahIds.length > 0) {
                // For teachers without specific halaqah selected, filter by ALL assigned halaqahs
                query = query.in('halaqah_id', assignedHalaqahIds);
            }
            // For admin (no teacher assignments), show all students (no additional filter)

            const { data, error } = await query;
            if (error) throw error;
            return data as LegerRow[];
        }
    });

    // Sorting Logic
    const sortedData = useMemo(() => {
        if (!legerData) return [];
        if (!sortConfig) return legerData;

        return [...legerData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [legerData, sortConfig]);

    const handleSort = (key: keyof LegerRow) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                if (current.direction === 'asc') {
                    return { key, direction: 'desc' };
                }
                return null; // Reset sort
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (key: keyof LegerRow) => {
        if (sortConfig?.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
        }
        return sortConfig.direction === 'asc' ?
            <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> :
            <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />;
    };

    const handleExport = () => {
        if (!sortedData || sortedData.length === 0) {
            toast({
                title: "Data Kosong",
                description: "Tidak ada data untuk diexport",
                variant: "destructive"
            });
            return;
        }

        // Define headers
        const headers = [
            "No",
            "Nama Santri",
            "NIS",
            "Halaqah",
            "Nilai Akhlak",
            "Nilai Kedisiplinan",
            "Nilai Kognitif",
            "Nilai Akhir",
            "Predikat"
        ];

        // Map data to rows
        const rows = sortedData.map((row, index) => [
            index + 1,
            `"${row.student_name}"`, // Quote to handle commas in names
            `"${row.nis}"`,
            `"${row.halaqah_name || '-'}"`,
            formatScore(row.nilai_akhir_akhlak),
            formatScore(row.nilai_akhir_kedisiplinan),
            formatScore(row.nilai_akhir_kognitif),
            formatScore(row.nilai_akhir_total),
            settings ? getPredikat(row.nilai_akhir_total, settings.skala_penilaian) : '-'
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Leger_Nilai_${semesterData?.academic_year?.tahun_ajaran}_${semesterData?.nama}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!semesterData) return <div>Loading Semester...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Leger Nilai</h1>
                    <p className="text-gray-500">
                        {semesterData.academic_year?.tahun_ajaran} - Semester {semesterData.nama}
                    </p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-end gap-4">
                        <div className="space-y-2 flex-1 max-w-xs">
                            <Label>Filter Halaqah</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={selectedHalaqahId}
                                onChange={(e) => setSelectedHalaqahId(e.target.value)}
                            >
                                <option value="">-- Semua Halaqah --</option>
                                {halaqahList?.map(h => (
                                    <option key={h.id} value={h.id}>{h.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium w-16">No</th>
                                <th
                                    className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('student_name')}
                                >
                                    <div className="flex items-center">
                                        Nama Santri
                                        {getSortIcon('student_name')}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('halaqah_name')}
                                >
                                    <div className="flex items-center">
                                        Halaqah
                                        {getSortIcon('halaqah_name')}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('nilai_akhir_akhlak')}
                                >
                                    <div className="flex items-center justify-center">
                                        Akhlak
                                        {getSortIcon('nilai_akhir_akhlak')}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('nilai_akhir_kedisiplinan')}
                                >
                                    <div className="flex items-center justify-center">
                                        Kedisiplinan
                                        {getSortIcon('nilai_akhir_kedisiplinan')}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('nilai_akhir_kognitif')}
                                >
                                    <div className="flex items-center justify-center">
                                        Kognitif
                                        {getSortIcon('nilai_akhir_kognitif')}
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 font-medium text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('nilai_akhir_total')}
                                >
                                    <div className="flex items-center justify-center">
                                        Nilai Akhir
                                        {getSortIcon('nilai_akhir_total')}
                                    </div>
                                </th>
                                <th className="px-4 py-3 font-medium text-center">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="text-center py-8">Loading data...</td></tr>
                            ) : sortedData.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Belum ada data nilai</td></tr>
                            ) : (
                                sortedData.map((row, index) => (
                                    <tr key={row.student_id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            {session?.user?.id && (
                                                <Link
                                                    to={teacherAssignments && teacherAssignments.length > 0
                                                        ? `/guru/input?student=${row.student_id}`
                                                        : `/raport/input?student=${row.student_id}`
                                                    }
                                                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-fit"
                                                    title="Buka Input Raport untuk santri ini"
                                                >
                                                    {row.student_name}
                                                    <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{row.halaqah_name || '-'}</td>
                                        <td className="px-4 py-3 text-center">{formatScore(row.nilai_akhir_akhlak)}</td>
                                        <td className="px-4 py-3 text-center">{formatScore(row.nilai_akhir_kedisiplinan)}</td>
                                        <td className="px-4 py-3 text-center">{formatScore(row.nilai_akhir_kognitif)}</td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-600">{formatScore(row.nilai_akhir_total)}</td>
                                        <td className="px-4 py-3 text-center font-bold">
                                            {settings ? getPredikat(row.nilai_akhir_total, settings.skala_penilaian) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
