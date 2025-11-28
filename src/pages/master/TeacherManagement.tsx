import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../components/ui/dialog';
import { Pencil, Plus, Loader2 } from 'lucide-react';
import type { User } from '../../types';

// Create a temporary Supabase client for user creation (to avoid logging out current admin)
const tempSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

export default function TeacherManagement() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        full_name: '',
        signature_url: ''
    });

    // Add User Form State
    const [addFormData, setAddFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'guru' as 'guru' | 'admin'
    });
    const [isAdding, setIsAdding] = useState(false);

    // Fetch Teachers
    const { data: teachers, isLoading } = useQuery({
        queryKey: ['teachers_list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .in('role', ['guru', 'admin'])
                .order('email');
            if (error) throw error;
            return data as User[];
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (!editingUser) return;
            const { error } = await supabase
                .from('users')
                .update(data)
                .eq('id', editingUser.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teachers_list'] });
            setIsOpen(false);
            setEditingUser(null);
            alert('Data guru berhasil diupdate');
        },
        onError: (error: any) => {
            alert('Error: ' + error.message);
        }
    });

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            full_name: user.full_name || '',
            signature_url: user.signature_url || ''
        });
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    // Handle Add User
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);

        try {
            // Sign up the new user using the module-level tempSupabase client
            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email: addFormData.email,
                password: addFormData.password,
            });

            if (authError) {
                console.error("Signup Error:", authError);
                if (authError.status === 422 || authError.message.includes('already registered')) {
                    throw new Error('Email sudah terdaftar. Silakan gunakan email lain.');
                }
                throw authError;
            }

            if (!authData.user) throw new Error('Gagal membuat user (No data returned)');

            // 3. Update the user details in public.users (created by trigger)
            // Retry loop to ensure trigger has finished creating the row
            let userCreated = false;
            for (let i = 0; i < 5; i++) {
                // Wait 1s
                await new Promise(r => setTimeout(r, 1000));

                // Try to update
                const { data, error: updateError } = await supabase
                    .from('users')
                    .update({
                        full_name: addFormData.full_name,
                        role: addFormData.role
                    })
                    .eq('id', authData.user.id)
                    .select(); // Select to check if row was returned

                if (updateError) {
                    console.error("Update Error (Attempt " + (i + 1) + "):", updateError);
                    // If error is about missing column, we should warn user
                    if (updateError.message.includes('column "full_name" does not exist')) {
                        throw new Error('Database schema belum update. Mohon jalankan migration 007.');
                    }
                }

                if (!updateError && data && data.length > 0) {
                    userCreated = true;
                    break;
                }
            }

            if (!userCreated) {
                throw new Error('Timeout: Gagal mengupdate data profil guru. Pastikan trigger database berjalan dan schema sudah update.');
            }

            alert('Guru berhasil ditambahkan!');
            setAddFormData({ email: '', password: '', full_name: '', role: 'guru' });
            setIsAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ['teachers_list'] });

        } catch (error: any) {
            console.error("Full Error:", error);
            alert('Gagal menambah guru: ' + error.message);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Data Guru & Admin</h1>
                    <p className="text-gray-500">Kelola profil dan tanda tangan guru</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" /> Tambah Guru
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tambah Guru Baru</DialogTitle>
                            <DialogDescription>
                                Masukkan email dan password untuk membuat akun login guru baru.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    required
                                    value={addFormData.email}
                                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                    placeholder="email@guru.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={addFormData.password}
                                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nama Lengkap</Label>
                                <Input
                                    required
                                    value={addFormData.full_name}
                                    onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                                    placeholder="Nama lengkap dengan gelar"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={addFormData.role}
                                    onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value as 'guru' | 'admin' })}
                                >
                                    <option value="guru">Guru</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={isAdding}>
                                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Nama Lengkap</TableHead>
                                <TableHead>Tanda Tangan</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : teachers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">Belum ada data guru</TableCell>
                                </TableRow>
                            ) : (
                                teachers?.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {t.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>{t.full_name || '-'}</TableCell>
                                        <TableCell>
                                            {t.signature_url ? (
                                                <img src={t.signature_url} alt="Sig" className="h-8 object-contain" />
                                            ) : (
                                                <span className="text-gray-400 text-xs">Belum ada</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog open={isOpen && editingUser?.id === t.id} onOpenChange={(open) => {
                                                if (open) handleEdit(t);
                                                else setIsOpen(false);
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <Pencil className="h-4 w-4 mr-2" /> Edit Profil
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Profil Guru</DialogTitle>
                                                        <DialogDescription>
                                                            Ubah nama lengkap dan URL tanda tangan guru.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <form onSubmit={handleSubmit} className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label>Email</Label>
                                                            <Input value={editingUser?.email || ''} disabled className="bg-gray-100" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Nama Lengkap (untuk Raport)</Label>
                                                            <Input
                                                                value={formData.full_name}
                                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                                placeholder="Contoh: Ahmad, S.Pd.I"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>URL Tanda Tangan</Label>
                                                            <Input
                                                                value={formData.signature_url}
                                                                onChange={(e) => setFormData({ ...formData, signature_url: e.target.value })}
                                                                placeholder="https://..."
                                                            />
                                                            <p className="text-xs text-gray-500">
                                                                Upload gambar tanda tangan ke storage (misal: ImgBB atau Supabase Storage) dan paste linknya di sini.
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                                                            <Button type="submit" disabled={updateMutation.isPending}>Simpan</Button>
                                                        </div>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
