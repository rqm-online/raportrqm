import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Student, Halaqah } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function Students() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState<Student | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Student>>({});

    const { data: students, isLoading } = useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('*, halaqah_data:halaqah(id, nama)')
                .order('nama', { ascending: true });
            if (error) throw error;
            return data as Student[];
        },
    });

    const { data: halaqahList } = useQuery({
        queryKey: ['halaqah'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('halaqah')
                .select('*')
                .eq('is_active', true)
                .order('nama');
            if (error) throw error;
            return data as Halaqah[];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<Student>) => {
            // Ensure halaqah_id is set correctly (or null if empty)
            const payload = {
                ...data,
                halaqah_id: data.halaqah_id || null,
                // Clear legacy field if using new system, or keep it synced if needed. 
                // For now we just update halaqah_id.
            };

            if (isEditing?.id) {
                const { error } = await supabase
                    .from('students')
                    .update(payload)
                    .eq('id', isEditing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('students').insert([payload]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setIsFormOpen(false);
            setIsEditing(null);
            setFormData({});
        },
    });

    const handleEdit = (student: Student) => {
        setIsEditing(student);
        setFormData({
            ...student,
            halaqah_id: student.halaqah_id || '' // Ensure controlled input
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Yakin ingin menghapus santri ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate({ ...formData, is_active: true });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Data Santri</h1>
                <Button onClick={() => { setIsEditing(null); setFormData({}); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Tambah Santri
                </Button>
            </div>

            {isFormOpen && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Edit Santri' : 'Tambah Santri Baru'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nama Lengkap</Label>
                                    <Input
                                        value={formData.nama || ''}
                                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>NIS</Label>
                                    <Input
                                        value={formData.nis || ''}
                                        onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Halaqah</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.halaqah_id || ''}
                                        onChange={(e) => setFormData({ ...formData, halaqah_id: e.target.value })}
                                    >
                                        <option value="">-- Pilih Halaqah --</option>
                                        {halaqahList?.map((h) => (
                                            <option key={h.id} value={h.id}>{h.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama Orang Tua</Label>
                                    <Input
                                        value={formData.nama_orang_tua || ''}
                                        onChange={(e) => setFormData({ ...formData, nama_orang_tua: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Shift</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.shift || 'Sore'}
                                        onChange={(e) => setFormData({ ...formData, shift: e.target.value as 'Siang' | 'Sore' })}
                                    >
                                        <option value="Siang">Siang</option>
                                        <option value="Sore">Sore</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={saveMutation.isPending}>Simpan</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded-md border">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium">Nama</th>
                                <th className="px-4 py-3 font-medium">NIS</th>
                                <th className="px-4 py-3 font-medium">Halaqah</th>
                                <th className="px-4 py-3 font-medium">Shift</th>
                                <th className="px-4 py-3 font-medium text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students?.map((student) => (
                                <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="px-4 py-3">{student.nama}</td>
                                    <td className="px-4 py-3">{student.nis || '-'}</td>
                                    <td className="px-4 py-3">
                                        {student.halaqah_data?.nama || student.halaqah || <span className="text-gray-400 italic">Belum ditentukan</span>}
                                    </td>
                                    <td className="px-4 py-3">{student.shift || 'Sore'}</td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(student)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(student.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {students?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Belum ada data santri</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
