import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Halaqah, Semester } from '../../types';
import { formatScore, getPredikat } from '../../utils/grading';

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
    const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    // Fetch Active Semester
    const { data: semesterData } = useQuery({
        queryKey: ['active_semester'],
        queryFn: async () => {
            const { data } = await supabase.from('semesters').select('*, academic_year:academic_years(*)').eq('is_active', true).single();
            return data as Semester & { academic_year: any };
        }
    });

    // Fetch Halaqah List
    const { data: halaqahList } = useQuery({
        queryKey: ['halaqah'],
        queryFn: async () => {
            const { data } = await supabase.from('halaqah').select('*').eq('is_active', true).order('nama');
            return data as Halaqah[];
        }
    });

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
        queryKey: ['leger', selectedHalaqahId, semesterData?.id],
        enabled: !!semesterData?.id,
        queryFn: async () => {
            let query = supabase
                .from('view_leger_nilai')
                .select('*')
                .eq('semester_id', semesterData!.id);

            if (selectedHalaqahId) {
                query = query.eq('halaqah_id', selectedHalaqahId);
            }

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
        alert("Fitur export Excel akan segera hadir!");
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
                                        <td className="px-4 py-3 font-medium">{row.student_name}</td>
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
