import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { ReportCard, SettingsLembaga, Student, Semester, AcademicYear, TahfidzProgress, Halaqah } from '../../types';
import { formatScore, getPredikat } from '../../utils/grading';
import { PrintSettings } from '../../components/raport/PrintSettings';

export default function RaportPrint() {
    const { id } = useParams<{ id: string }>();
    const [theme, setTheme] = useState('black');
    const [size, setSize] = useState<'A4' | 'F4'>('A4');

    const { data: report, isLoading, error, refetch } = useQuery({
        queryKey: ['report_print', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('report_cards')
                .select(`
                    *,
                    tahfidz_progress(*, surah:surah_master(*)),
                    student:students(*, halaqah_data:halaqah(*, guru:users(*))),
                    semester:semesters(*, academic_year:academic_years(*))
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as ReportCard & {
                student: Student & { halaqah_data?: Halaqah },
                semester: Semester & { academic_year: AcademicYear },
                tahfidz_progress: TahfidzProgress[]
            };
        }
    });

    const { data: settings, refetch: refetchSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await supabase.from('settings_lembaga').select('*').single();
            return data as SettingsLembaga;
        }
    });

    useEffect(() => {
        if (!isLoading && report) {
            document.title = `Raport - ${report.student.nama}`;
        }
    }, [isLoading, report]);

    if (isLoading) return <div className="p-10">Loading...</div>;
    if (error) return <div className="p-10 text-red-600">Error: {(error as Error).message}</div>;
    if (!report || !settings) return <div className="p-10">Data not found</div>;

    const { student, semester, akhlak, kedisiplinan, kognitif, tahfidz_progress } = report;
    const academicYear = semester.academic_year?.tahun_ajaran;
    const guruPembimbing = student.halaqah_data?.guru;

    // Helper to render table rows
    const renderRows = (data: Record<string, number>, max = 100) => {
        return Object.entries(data).map(([key, val], idx) => (
            <tr key={key} className="border-b border-gray-300">
                <td className="p-2 border-r border-gray-300 w-10 text-center">{idx + 1}</td>
                <td className="p-2 border-r border-gray-300">{key}</td>
                <td className="p-2 text-center font-medium">{val}</td>
                <td className="p-2 text-center text-sm text-gray-600">
                    {getPredikat(val, settings.skala_penilaian)}
                </td>
            </tr>
        ));
    };

    // Dynamic styles based on theme
    const borderColor = theme;
    const headerStyle = { borderColor: theme };

    return (
        <div className={`bg-white text-black font-sans mx-auto p-8 min-h-screen print:p-0 ${size === 'A4' ? 'max-w-[210mm]' : 'max-w-[215mm]'}`}>
            <PrintSettings
                settings={settings}
                teacher={guruPembimbing}
                onSettingsChange={() => {
                    refetchSettings();
                    refetch();
                }}
                onThemeChange={setTheme}
                onSizeChange={setSize}
            />

            {/* HEADER / KOP */}
            <div className="flex items-center gap-4 border-b-4 border-double pb-4 mb-6" style={headerStyle}>
                {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
                )}
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-bold uppercase tracking-wide" style={{ color: theme !== 'black' ? theme : 'inherit' }}>{settings.nama_lembaga}</h1>
                    <p className="text-sm">{settings.alamat}</p>
                    <p className="text-sm">{settings.kota} - Telp: {settings.nomor_kontak}</p>
                </div>
            </div>

            <div className="text-center mb-6">
                <h2 className="text-xl font-bold uppercase underline" style={{ textDecorationColor: theme }}>Laporan Hasil Belajar Santri</h2>
            </div>

            {/* IDENTITAS */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
                <div className="flex">
                    <span className="w-32">Nama Santri</span>
                    <span>: {student.nama}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Tahun Ajaran</span>
                    <span>: {academicYear}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Nomor Induk</span>
                    <span>: {student.nis || '-'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Semester</span>
                    <span>: {semester.nama}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Halaqah</span>
                    <span>: {student.halaqah_data?.nama || student.halaqah || '-'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Guru Pembimbing</span>
                    <span>: {guruPembimbing?.full_name || '-'}</span>
                </div>
            </div>

            {/* CONTENT */}
            <div className="space-y-6">
                {/* AKHLAK */}
                <div>
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>A. Akhlak & Perilaku</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="p-2 border-r border-gray-300 w-10">No</th>
                                <th className="p-2 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-2 border-r border-gray-300 w-20">Nilai (10-100)</th>
                                <th className="p-2 w-40">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRows(akhlak)}
                        </tbody>
                    </table>
                </div>

                {/* KEDISIPLINAN */}
                <div>
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>B. Kedisiplinan</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="p-2 border-r border-gray-300 w-10">No</th>
                                <th className="p-2 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-2 border-r border-gray-300 w-20">Nilai (10-100)</th>
                                <th className="p-2 w-40">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderRows(kedisiplinan)}
                        </tbody>
                    </table>
                </div>

                {/* KOGNITIF */}
                <div>
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>C. Kognitif Qur'ani</h3>

                    {/* TAHFIDZ DETAIL */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-1">1. Tahfidz (Hafalan)</h4>
                        <table className="w-full border border-gray-300 text-sm">
                            <thead className="bg-gray-100 border-b border-gray-300">
                                <tr>
                                    <th className="p-2 border-r border-gray-300 w-10">No</th>
                                    <th className="p-2 border-r border-gray-300 text-left">Nama Surah</th>
                                    <th className="p-2 border-r border-gray-300 w-20 text-center">KB</th>
                                    <th className="p-2 border-r border-gray-300 w-20 text-center">KH</th>
                                    <th className="p-2 w-20 text-center">Rata-rata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tahfidz_progress && tahfidz_progress.length > 0 ? (
                                    tahfidz_progress.map((item, idx) => (
                                        <tr key={item.id} className="border-b border-gray-300">
                                            <td className="p-2 border-r border-gray-300 text-center">{idx + 1}</td>
                                            <td className="p-2 border-r border-gray-300">{item.surah?.nama_surah}</td>
                                            <td className="p-2 border-r border-gray-300 text-center">{item.kb}</td>
                                            <td className="p-2 border-r border-gray-300 text-center">{item.kh}</td>
                                            <td className="p-2 text-center font-medium">{formatScore((item.kb + item.kh) / 2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500 italic">Belum ada data hafalan</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-500 mt-1">* KB: Kemampuan Bacaan, KH: Kemampuan Hafalan</p>
                    </div>

                    {/* TAHSIN */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-1">2. Tahsin (Perbaikan Bacaan)</h4>
                        <table className="w-full border border-gray-300 text-sm">
                            <thead className="bg-gray-100 border-b border-gray-300">
                                <tr>
                                    <th className="p-2 border-r border-gray-300 w-10">No</th>
                                    <th className="p-2 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                    <th className="p-2 border-r border-gray-300 w-20">Nilai (10-100)</th>
                                    <th className="p-2 w-40">Predikat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderRows(kognitif.Tahsin || {})}
                            </tbody>
                        </table>
                    </div>

                    {/* UAS */}
                    <div>
                        <h4 className="font-semibold text-sm mb-1">3. Ujian Akhir Semester</h4>
                        <table className="w-full border border-gray-300 text-sm">
                            <thead className="bg-gray-100 border-b border-gray-300">
                                <tr>
                                    <th className="p-2 border-r border-gray-300 text-left">Materi Ujian</th>
                                    <th className="p-2 w-20 text-center">Nilai (10-100)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-300">
                                    <td className="p-2 border-r border-gray-300">Ujian Tulis</td>
                                    <td className="p-2 text-center font-bold">{report.uas_tulis}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border-r border-gray-300">Ujian Lisan</td>
                                    <td className="p-2 text-center font-bold">{report.uas_lisan}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* NILAI AKHIR */}
                <div className="mt-8 border p-4 bg-gray-50 print:bg-transparent" style={{ borderColor: theme }}>
                    <h3 className="font-bold text-center mb-4">REKAPITULASI NILAI AKHIR</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-xs uppercase">Akhlak</p>
                            <p className="font-bold text-lg">{formatScore(report.nilai_akhir_akhlak)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase">Kedisiplinan</p>
                            <p className="font-bold text-lg">{formatScore(report.nilai_akhir_kedisiplinan)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase">Kognitif</p>
                            <p className="font-bold text-lg">{formatScore(report.nilai_akhir_kognitif)}</p>
                        </div>
                        <div className="border-l pl-4" style={{ borderColor: theme }}>
                            <p className="text-xs uppercase font-bold">Total / Predikat</p>
                            <p className="font-bold text-xl">
                                {formatScore((report.nilai_akhir_akhlak * settings.bobot_akhlak + report.nilai_akhir_kedisiplinan * settings.bobot_kedisiplinan + report.nilai_akhir_kognitif * settings.bobot_kognitif) / 100)}
                                / {getPredikat((report.nilai_akhir_akhlak * settings.bobot_akhlak + report.nilai_akhir_kedisiplinan * settings.bobot_kedisiplinan + report.nilai_akhir_kognitif * settings.bobot_kognitif) / 100, settings.skala_penilaian)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* CATATAN */}
                {report.catatan && (
                    <div className="mt-4 border p-4 min-h-[100px]" style={{ borderColor: theme }}>
                        <h3 className="font-bold text-sm mb-2">Catatan:</h3>
                        <p className="text-sm whitespace-pre-wrap">{report.catatan}</p>
                    </div>
                )}

                {/* TANDA TANGAN */}
                <div className="mt-16 flex justify-between text-center text-sm break-inside-avoid">
                    <div className="w-1/3">
                        <p className="mb-16">Orang Tua / Wali</p>
                        <p className="font-bold border-t inline-block min-w-[150px] pt-1" style={{ borderColor: theme }}>
                            {student.nama_orang_tua || '...................'}
                        </p>
                    </div>
                    <div className="w-1/3">
                        <p className="mb-16">Guru Pembimbing</p>
                        {guruPembimbing?.signature_url && (
                            <img src={guruPembimbing.signature_url} alt="Signature" className="h-16 mx-auto -mt-16 mb-0 object-contain" />
                        )}
                        <p className="font-bold border-t inline-block min-w-[150px] pt-1 mt-16" style={{ borderColor: theme }}>
                            {guruPembimbing?.full_name || '...................'}
                        </p>
                    </div>
                    <div className="w-1/3">
                        <p className="mb-16">Kepala Lembaga</p>
                        {settings.signature_url && (
                            <img src={settings.signature_url} alt="Signature" className="h-16 mx-auto -mt-16 mb-0 object-contain" />
                        )}
                        <p className="font-bold underline mt-16">{settings.nama_kepala_lembaga}</p>
                        <p>NIP. {settings.nip_kepala_lembaga || '-'}</p>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-8 text-center text-xs text-gray-500 print:fixed print:bottom-4 print:left-0 print:w-full">
                {settings.footer_raport || "Dicetak melalui Sistem Informasi Raport RQM"}
            </div>
        </div>
    );
}
