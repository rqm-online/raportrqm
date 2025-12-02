import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { SettingsLembaga } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function Settings() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<SettingsLembaga>>({});

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('settings_lembaga').select('*').single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
            return data as SettingsLembaga | null;
        },
    });

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const mutation = useMutation({
        mutationFn: async (newData: Partial<SettingsLembaga>) => {
            if (settings?.id) {
                const { error } = await supabase
                    .from('settings_lembaga')
                    .update(newData)
                    .eq('id', settings.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('settings_lembaga')
                    .insert([newData]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            alert('Pengaturan berhasil disimpan');
        },
        onError: (error) => {
            alert('Gagal menyimpan: ' + error.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Pengaturan Lembaga</h1>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identitas Lembaga</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nama Lembaga</Label>
                                <Input
                                    value={formData.nama_lembaga || ''}
                                    onChange={e => setFormData({ ...formData, nama_lembaga: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Alamat</Label>
                                <Input
                                    value={formData.alamat || ''}
                                    onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Kota</Label>
                                <Input
                                    value={formData.kota || ''}
                                    onChange={e => setFormData({ ...formData, kota: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Kontak</Label>
                                <Input
                                    value={formData.nomor_kontak || ''}
                                    onChange={e => setFormData({ ...formData, nomor_kontak: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Kepala Lembaga</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nama Kepala</Label>
                                <Input
                                    value={formData.nama_kepala_lembaga || ''}
                                    onChange={e => setFormData({ ...formData, nama_kepala_lembaga: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>NIP / NIY</Label>
                                <Input
                                    value={formData.nip_kepala_lembaga || ''}
                                    onChange={e => setFormData({ ...formData, nip_kepala_lembaga: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Logo URL</Label>
                                <Input
                                    value={formData.logo_url || ''}
                                    onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tempat & Tanggal Raport (Default)</Label>
                                <Input
                                    value={formData.tempat_tanggal_raport || ''}
                                    onChange={e => setFormData({ ...formData, tempat_tanggal_raport: e.target.value })}
                                    placeholder="Contoh: Bandung, 20 Desember 2024"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Bobot Penilaian (%)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Akhlak</Label>
                                    <Input
                                        type="number"
                                        value={formData.bobot_akhlak || 0}
                                        onChange={e => setFormData({ ...formData, bobot_akhlak: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kedisiplinan</Label>
                                    <Input
                                        type="number"
                                        value={formData.bobot_kedisiplinan || 0}
                                        onChange={e => setFormData({ ...formData, bobot_kedisiplinan: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kognitif</Label>
                                    <Input
                                        type="number"
                                        value={formData.bobot_kognitif || 0}
                                        onChange={e => setFormData({ ...formData, bobot_kognitif: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">Total harus 100%</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
