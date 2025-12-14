import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { Semester, Halaqah, TeacherAssignment } from '../../types';

interface RankingStudent {
    student_id: string;
    student_name: string;
    nis: string;
    halaqah_name: string;
    tahfidz_score: number;
    tahsin_score: number;
}

export default function Peringkat() {
    const { session } = useAuth();
    const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
    const [activeCategory, setActiveCategory] = useState<'tahfidz' | 'tahsin'>('tahfidz');

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
            const { data } = await supabase
                .from('semesters')
                .select('*, academic_year:academic_years(*)')
                .eq('is_active', true)
                .single();
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

    // Fetch Rankings
    const { data: rankingData, isLoading } = useQuery({
        queryKey: ['rankings', selectedHalaqahId, semesterData?.id, assignedHalaqahIds],
        enabled: !!semesterData?.id,
        queryFn: async () => {
            let query = supabase
                .from('report_cards')
                .select(`
                    student_id,
                    students!inner(nama, nis, halaqah_id, halaqah:halaqah(nama)),
                    kognitif
                `)
                .eq('semester_id', semesterData!.id);

            if (selectedHalaqahId) {
                // Filter by specific halaqah if selected
                query = query.eq('students.halaqah_id', selectedHalaqahId);
            } else if (teacherAssignments && teacherAssignments.length > 0 && assignedHalaqahIds.length > 0) {
                // For guru role: filter by assigned halaqahs when "Semua Halaqah" is selected
                query = query.in('students.halaqah_id', assignedHalaqahIds);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Process and calculate scores
            const processed = data?.map((item: any) => {
                const kognitif = item.kognitif || {};

                // Calculate Tahfidz score (average of all Tahfidz values)
                const tahfidzValues = kognitif.Tahfidz ? Object.values(kognitif.Tahfidz) as any[] : [];
                const tahfidzScore = tahfidzValues.length > 0
                    ? tahfidzValues.reduce((a: any, b: any) => a + b, 0) / tahfidzValues.length
                    : 0;

                // Calculate Tahsin score (average of all Tahsin values)
                const tahsinValues = kognitif.Tahsin ? Object.values(kognitif.Tahsin) as any[] : [];
                const tahsinScore = tahsinValues.length > 0
                    ? tahsinValues.reduce((a: any, b: any) => a + b, 0) / tahsinValues.length
                    : 0;

                return {
                    student_id: item.student_id,
                    student_name: item.students.nama,
                    nis: item.students.nis,
                    halaqah_name: item.students.halaqah?.nama || '-',
                    tahfidz_score: tahfidzScore,
                    tahsin_score: tahsinScore
                };
            }) || [];

            return processed as RankingStudent[];
        }
    });

    // Sort rankings based on active category
    const sortedRankings = rankingData
        ?.filter(student => {
            const score = activeCategory === 'tahfidz' ? student.tahfidz_score : student.tahsin_score;
            return score > 0; // Only show students with scores
        })
        .sort((a, b) => {
            const scoreA = activeCategory === 'tahfidz' ? a.tahfidz_score : a.tahsin_score;
            const scoreB = activeCategory === 'tahfidz' ? b.tahfidz_score : b.tahsin_score;
            return scoreB - scoreA; // Descending order
        }) || [];

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className="h-8 w-8 text-yellow-500" />;
            case 2:
                return <Medal className="h-7 w-7 text-gray-400" />;
            case 3:
                return <Award className="h-6 w-6 text-amber-600" />;
            default:
                return <Trophy className="h-5 w-5 text-gray-400" />;
        }
    };

    const getRankBadgeColor = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg';
            case 2:
                return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-md';
            case 3:
                return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-md';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    if (!semesterData) {
        return <div>Belum ada tahun ajaran aktif.</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Peringkat Santri</h1>
                <p className="text-gray-600 mt-2">
                    {semesterData.academic_year?.tahun_ajaran} - Semester {semesterData.nama}
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Filter Halaqah</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={selectedHalaqahId}
                                onChange={(e) => setSelectedHalaqahId(e.target.value)}
                            >
                                <option value="">-- Semua Halaqah --</option>
                                {halaqahList?.map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.nama}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Kategori</Label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveCategory('tahfidz')}
                                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${activeCategory === 'tahfidz'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Tahfidz
                                </button>
                                <button
                                    onClick={() => setActiveCategory('tahsin')}
                                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${activeCategory === 'tahsin'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Tahsin
                                </button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rankings Display */}
            {isLoading ? (
                <div className="text-center py-12">Loading...</div>
            ) : sortedRankings.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        Belum ada data peringkat untuk kategori ini
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Group by Halaqah */}
                    {(() => {
                        // Group rankings by halaqah
                        const groupedByHalaqah = sortedRankings.reduce((acc, student) => {
                            if (!acc[student.halaqah_name]) {
                                acc[student.halaqah_name] = [];
                            }
                            acc[student.halaqah_name].push(student);
                            return acc;
                        }, {} as Record<string, RankingStudent[]>);

                        // If a specific halaqah is selected, show flat list
                        if (selectedHalaqahId) {
                            return (
                                <div className="space-y-3">
                                    {sortedRankings.map((student, index) => {
                                        const rank = index + 1;
                                        const score = activeCategory === 'tahfidz' ? student.tahfidz_score : student.tahsin_score;
                                        const isTopThree = rank <= 3;

                                        return (
                                            <Card
                                                key={student.student_id}
                                                className={`transition-all hover:shadow-lg ${isTopThree ? 'border-2' : ''
                                                    } ${rank === 1 ? 'border-yellow-400 bg-yellow-50' :
                                                        rank === 2 ? 'border-gray-400 bg-gray-50' :
                                                            rank === 3 ? 'border-amber-500 bg-amber-50' : ''
                                                    }`}
                                            >
                                                <CardContent className="py-4">
                                                    <div className="flex items-center gap-4">
                                                        {/* Rank Badge */}
                                                        <div className="flex-shrink-0">
                                                            <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center ${getRankBadgeColor(rank)}`}>
                                                                {getRankIcon(rank)}
                                                                <span className="text-xs font-bold mt-1">#{rank}</span>
                                                            </div>
                                                        </div>

                                                        {/* Student Info */}
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-bold text-gray-900">
                                                                {student.student_name}
                                                            </h3>
                                                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                                                <span>NIS: {student.nis}</span>
                                                                <span>•</span>
                                                                <span>{student.halaqah_name}</span>
                                                            </div>
                                                        </div>

                                                        {/* Score */}
                                                        <div className="flex-shrink-0 text-right">
                                                            <div className={`text-3xl font-bold ${rank === 1 ? 'text-yellow-600' :
                                                                rank === 2 ? 'text-gray-600' :
                                                                    rank === 3 ? 'text-amber-600' :
                                                                        'text-gray-700'
                                                                }`}>
                                                                {score.toFixed(1)}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {activeCategory === 'tahfidz' ? 'Nilai Tahfidz' : 'Nilai Tahsin'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            );
                        }

                        // Show grouped by halaqah
                        return Object.entries(groupedByHalaqah).map(([halaqahName, students]) => (
                            <div key={halaqahName} className="space-y-3">
                                {/* Halaqah Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg shadow-md">
                                    <h2 className="text-xl font-bold">{halaqahName}</h2>
                                    <p className="text-sm text-blue-100 mt-1">
                                        {students.length} santri • {activeCategory === 'tahfidz' ? 'Tahfidz' : 'Tahsin'}
                                    </p>
                                </div>

                                {/* Students in this Halaqah */}
                                {students.map((student, index) => {
                                    const rank = index + 1;
                                    const score = activeCategory === 'tahfidz' ? student.tahfidz_score : student.tahsin_score;
                                    const isTopThree = rank <= 3;

                                    return (
                                        <Card
                                            key={student.student_id}
                                            className={`transition-all hover:shadow-lg ${isTopThree ? 'border-2' : ''
                                                } ${rank === 1 ? 'border-yellow-400 bg-yellow-50' :
                                                    rank === 2 ? 'border-gray-400 bg-gray-50' :
                                                        rank === 3 ? 'border-amber-500 bg-amber-50' : ''
                                                }`}
                                        >
                                            <CardContent className="py-4">
                                                <div className="flex items-center gap-4">
                                                    {/* Rank Badge */}
                                                    <div className="flex-shrink-0">
                                                        <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center ${getRankBadgeColor(rank)}`}>
                                                            {getRankIcon(rank)}
                                                            <span className="text-xs font-bold mt-1">#{rank}</span>
                                                        </div>
                                                    </div>

                                                    {/* Student Info */}
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-gray-900">
                                                            {student.student_name}
                                                        </h3>
                                                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                                            <span>NIS: {student.nis}</span>
                                                        </div>
                                                    </div>

                                                    {/* Score */}
                                                    <div className="flex-shrink-0 text-right">
                                                        <div className={`text-3xl font-bold ${rank === 1 ? 'text-yellow-600' :
                                                            rank === 2 ? 'text-gray-600' :
                                                                rank === 3 ? 'text-amber-600' :
                                                                    'text-gray-700'
                                                            }`}>
                                                            {score.toFixed(1)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {activeCategory === 'tahfidz' ? 'Nilai Tahfidz' : 'Nilai Tahsin'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        ));
                    })()}
                </div>
            )}

            {/* Summary Stats */}
            {sortedRankings.length > 0 && (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-blue-900">Statistik</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Total Santri</p>
                                <p className="text-2xl font-bold text-gray-900">{sortedRankings.length}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Nilai Tertinggi</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {sortedRankings[0] ? (
                                        activeCategory === 'tahfidz'
                                            ? sortedRankings[0].tahfidz_score.toFixed(1)
                                            : sortedRankings[0].tahsin_score.toFixed(1)
                                    ) : '-'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Rata-rata</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {(sortedRankings.reduce((sum, s) =>
                                        sum + (activeCategory === 'tahfidz' ? s.tahfidz_score : s.tahsin_score), 0
                                    ) / sortedRankings.length).toFixed(1)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
