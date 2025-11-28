# Aplikasi Raport Santri Rumah Qur'an Muharrik

Aplikasi web untuk pengelolaan nilai raport santri berbasis React + Supabase.

## Fitur Utama
- **Manajemen Santri**: CRUD data santri.
- **Tahun Ajaran**: Pengaturan tahun ajaran dan semester aktif.
- **Input Raport**: Form input nilai Akhlak, Kedisiplinan, dan Kognitif (Tahfidz/Tahsin).
- **Perhitungan Otomatis**: Nilai akhir dan predikat dihitung otomatis di frontend.
- **Cetak Raport**: Layout A4 siap cetak untuk laporan hasil belajar.
- **Pengaturan Lembaga**: Konfigurasi nama lembaga, bobot nilai, dan kepala lembaga.

## Teknologi
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS.
- **Backend**: Supabase (PostgreSQL, Auth, RLS).
- **State Management**: TanStack Query (React Query).

## Struktur Folder
- `/src/components`: Komponen UI reusable.
- `/src/pages`: Halaman aplikasi (Dashboard, Master, Raport, Settings).
- `/src/lib`: Konfigurasi Supabase dan utility.
- `/src/types`: Definisi tipe TypeScript.
- `/supabase_schema`: Script SQL untuk setup database.

## Cara Menjalankan Project

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Supabase**
   - Buat project baru di Supabase.
   - Jalankan script SQL yang ada di folder `supabase_schema` di SQL Editor Supabase secara berurutan:
     1. `001_create_tables.sql`
     2. `002_policies.sql`
     3. `003_triggers.sql`
   - Salin URL dan Anon Key dari Supabase Settings > API.

3. **Konfigurasi Environment**
   - Buat file `.env` di root project.
   - Isi dengan:
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Jalankan Development Server**
   ```bash
   npm run dev
   ```

5. **Login**
   - Gunakan fitur Authentication Supabase untuk membuat user (Sign Up) atau matikan sementara policy jika ingin testing tanpa login (tidak disarankan).
   - Default role user baru adalah `viewer`. Ubah manual di tabel `public.users` menjadi `admin` atau `guru` untuk akses penuh.

## Catatan
- Pastikan RLS Policies sudah diaplikasikan agar data aman.
- Untuk print raport, gunakan browser Print (Ctrl+P) dan pastikan opsi "Background graphics" dicentang.
"# raport-rqm" 
