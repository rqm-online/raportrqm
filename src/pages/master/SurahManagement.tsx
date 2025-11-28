import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { SurahMaster } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

export default function SurahManagement() {
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSurah, setEditingSurah] = useState<SurahMaster | null>(null);
    const [formData, setFormData] = useState<Partial<SurahMaster>>({});

    const { data: surahList, isLoading } = useQuery({
        queryKey: ['surah_master'],
        queryFn: async () => {
            const { data } = await supabase
                .from('surah_master')
                .select('*')
                .order('juz', { ascending: false })
                .order('urutan_dalam_juz', { ascending: true });
            return data as SurahMaster[];
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (data: Partial<SurahMaster>) => {
            if (editingSurah?.id) {
                const { error } = await supabase
                    .from('surah_master')
                    .update(data)
                    .eq('id', editingSurah.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('surah_master').insert([data]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surah_master'] });
            setIsFormOpen(false);
            setEditingSurah(null);
            setFormData({});
            alert('Surah berhasil disimpan');
        },
        onError: (err: any) => alert('Gagal menyimpan: ' + err.message)
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase
                .from('surah_master')
                .update({ is_active: !isActive })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surah_master'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('surah_master').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['surah_master'] });
            alert('Surah berhasil dihapus');
        }
    });

    const handleEdit = (surah: SurahMaster) => {
        setEditingSurah(surah);
        setFormData(surah);
        setIsFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Yakin ingin menghapus surah ini?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    // Group by Juz
    const surahByJuz = surahList?.reduce((acc, surah) => {
        if (!acc[surah.juz]) acc[surah.juz] = [];
        acc[surah.juz].push(surah);
        return acc;
    }, {} as Record<number, SurahMaster[]>) || {};

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Manajemen Surah</h1>
                <Button onClick={() => { setEditingSurah(null); setFormData({}); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Tambah Surah
                </Button>
            </div>

            {isFormOpen && (
                <Card>
                    <CardHeader>
                        <CardTitle>{editingSurah ? 'Edit Surah' : 'Tambah Surah Baru'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Juz</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={formData.juz || ''}
                                        onChange={(e) => setFormData({ ...formData, juz: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nomor Surah</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={114}
                                        value={formData.nomor_surah || ''}
                                        onChange={(e) => setFormData({ ...formData, nomor_surah: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama Surah</Label>
                                    <Input
                                        value={formData.nama_surah || ''}
                                        onChange={(e) => setFormData({ ...formData, nama_surah: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Urutan dalam Juz</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.urutan_dalam_juz || ''}
                                        onChange={(e) => setFormData({ ...formData, urutan_dalam_juz: parseInt(e.target.value) })}
                                        required
                                    />
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
                <div className="space-y-6">
                    {Object.entries(surahByJuz).sort(([a], [b]) => parseInt(b) - parseInt(a)).map(([juz, surahList]) => (
                        <Card key={juz}>
                            <CardHeader>
                                <CardTitle className="text-lg">Juz {juz}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {surahList.map((surah) => (
                                        <div key={surah.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm ${!surah.is_active ? 'text-gray-400 line-through' : ''}`}>
                                                    {surah.nama_surah} ({surah.nomor_surah})
                                                </span>
                                                {!surah.is_active && (
                                                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Nonaktif</span>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleActiveMutation.mutate({ id: surah.id, isActive: surah.is_active })}
                                                    title={surah.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {surah.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(surah)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(surah.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
