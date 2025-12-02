import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import type { Student, SurahMaster } from '../../types';

interface StudentSurahAssignment {
    student_id: string;
    surah_id: string;
    is_active: boolean;
}

export default function StudentSurahManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [selectedStudent, setSelectedStudent] = useState<string>('');

    // Confirmation Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmDesc, setConfirmDesc] = useState('');

    // Fetch all students
    const { data: students } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('is_active', true)
                .order('nama');
            if (error) throw error;
            return data as Student[];
        }
    });

    // Fetch all surah
    const { data: allSurah } = useQuery({
        queryKey: ['surah_master'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('surah_master')
                .select('*')
                .eq('is_active', true)
                .order('juz, urutan_dalam_juz');
            if (error) throw error;
            return data as SurahMaster[];
        }
    });

    // Fetch student's assigned surah
    const { data: assignedSurah, isLoading: loadingAssignments } = useQuery({
        queryKey: ['student_surah_assignment', selectedStudent],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const { data, error } = await supabase
                .from('student_surah_assignment')
                .select('*')
                .eq('student_id', selectedStudent);
            if (error) throw error;
            return data as StudentSurahAssignment[];
        },
        enabled: !!selectedStudent
    });

    // Toggle individual surah
    const toggleSurahMutation = useMutation({
        mutationFn: async ({ surahId, isActive }: { surahId: string; isActive: boolean }) => {
            if (!selectedStudent) return;

            if (isActive) {
                // Activate surah
                const { error } = await supabase
                    .from('student_surah_assignment')
                    .upsert({
                        student_id: selectedStudent,
                        surah_id: surahId,
                        is_active: true
                    }, { onConflict: 'student_id, surah_id' });

                if (error) throw error;
            } else {
                // Deactivate surah
                const { error } = await supabase
                    .from('student_surah_assignment')
                    .update({ is_active: false })
                    .eq('student_id', selectedStudent)
                    .eq('surah_id', surahId);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student_surah_assignment', selectedStudent] });
            // Optional: Show toast only for errors or bulk actions to avoid spamming
        },
        onError: (error) => {
            console.error('Toggle mutation error:', error);
            toast({
                variant: "destructive",
                title: "Gagal mengubah status surah",
                description: (error as Error).message
            });
        }
    });

    // Bulk assign/unassign Juz
    const bulkJuzMutation = useMutation({
        mutationFn: async ({ juz, assign }: { juz: number; assign: boolean }) => {
            if (!selectedStudent) return;

            const { error } = await supabase.rpc(
                assign ? 'assign_juz_to_student' : 'unassign_juz_from_student',
                {
                    p_student_id: selectedStudent,
                    p_juz: juz
                }
            );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student_surah_assignment', selectedStudent] });
            toast({
                variant: "success",
                title: "Berhasil",
                description: "Juz berhasil diupdate."
            });
        },
        onError: (error) => {
            console.error('Bulk Juz mutation error:', error);
            toast({
                variant: "destructive",
                title: "Gagal mengubah status Juz",
                description: (error as Error).message
            });
        }
    });

    const handleBulkAction = (juz: number, assign: boolean) => {
        if (assign) {
            // No confirmation needed for activating
            bulkJuzMutation.mutate({ juz, assign: true });
        } else {
            // Confirm before deactivating all
            setConfirmTitle("Konfirmasi Nonaktifkan");
            setConfirmDesc(`Apakah Anda yakin ingin menonaktifkan semua surah di Juz ${juz} untuk santri ini?`);
            setConfirmAction(() => () => bulkJuzMutation.mutate({ juz, assign: false }));
            setConfirmOpen(true);
        }
    };

    const isSurahActive = (surahId: string) => {
        return assignedSurah?.some(a => a.surah_id === surahId && a.is_active) || false;
    };

    const isJuzFullyAssigned = (juz: number) => {
        const juzSurah = allSurah?.filter(s => s.juz === juz) || [];
        return juzSurah.every(s => isSurahActive(s.id));
    };

    const groupedByJuz = allSurah?.reduce((acc, surah) => {
        if (!acc[surah.juz]) acc[surah.juz] = [];
        acc[surah.juz].push(surah);
        return acc;
    }, {} as Record<number, SurahMaster[]>);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Pengaturan Surah Tahfidz per Santri</h1>
                <p className="text-gray-500">Aktifkan surah yang akan dicatat untuk setiap santri</p>
            </div>

            {/* Student Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Pilih Santri
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                    >
                        <option value="">-- Pilih Santri --</option>
                        {students?.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.nama} ({s.nis})
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {/* Surah Assignment */}
            {selectedStudent && (
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Surah</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingAssignments ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {[27, 28, 29, 30].map((juz) => (
                                    <div key={juz} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-lg">Juz {juz}</h3>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={isJuzFullyAssigned(juz) ? "default" : "outline"}
                                                    onClick={() => handleBulkAction(juz, true)}
                                                    disabled={bulkJuzMutation.isPending}
                                                >
                                                    Aktifkan Semua
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleBulkAction(juz, false)}
                                                    disabled={bulkJuzMutation.isPending}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    Nonaktifkan Semua
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {groupedByJuz?.[juz]?.map((surah) => (
                                                <div key={surah.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        id={surah.id}
                                                        checked={isSurahActive(surah.id)}
                                                        onChange={(e) => {
                                                            toggleSurahMutation.mutate({
                                                                surahId: surah.id,
                                                                isActive: e.target.checked
                                                            });
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <label
                                                        htmlFor={surah.id}
                                                        className="text-sm cursor-pointer flex-1"
                                                    >
                                                        {surah.nomor_surah}. {surah.nama_surah}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={confirmTitle}
                description={confirmDesc}
                onConfirm={confirmAction}
                variant="destructive"
            />
        </div>
    );
}
