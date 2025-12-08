import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { ReportCard, SettingsLembaga, Student, Semester, AcademicYear, TahfidzProgress, Halaqah, TahsinMaster } from '../../types';
import { formatScore, getPredikat, getMotivationalMessage, getCategoryNote } from '../../utils/grading';
import { PrintSettings } from '../../components/raport/PrintSettings';



export default function RaportPrint() {
    const { id } = useParams<{ id: string }>();
    const [theme, setTheme] = useState('black');
    const [size, setSize] = useState<'A4' | 'F4'>('A4');
    const [breakBeforeKognitif, setBreakBeforeKognitif] = useState(false);
    const [breakBeforeTahsin, setBreakBeforeTahsin] = useState(false);
    const [breakBeforeUAS, setBreakBeforeUAS] = useState(false);

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

    // Fetch active Tahsin items from database
    const { data: tahsinMasterItems } = useQuery({
        queryKey: ['tahsin_master_active'],
        queryFn: async () => {
            const { data } = await supabase
                .from('tahsin_master')
                .select('*')
                .eq('is_active', true)
                .order('urutan');
            return data as TahsinMaster[];
        }
    });

    // Fetch specific Pembimbing Assignment
    const { data: pembimbingAssignment } = useQuery({
        queryKey: ['pembimbing_assignment', report?.student?.halaqah_id],
        enabled: !!report?.student?.halaqah_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('teacher_assignments')
                .select('*, teacher:users(*)')
                .eq('halaqah_id', report!.student.halaqah_id)
                .eq('role', 'pembimbing')
                .eq('is_active', true)
                .maybeSingle(); // Use maybeSingle to avoid 406 error if not found
            return data;
        }
    });

    useEffect(() => {
        if (!isLoading && report) {
            // Set document title for PDF filename
            document.title = `Raport - ${report.student.nama}`;
        }
    }, [isLoading, report]);

    if (isLoading) return <div className="p-10">Loading...</div>;
    if (error) return <div className="p-10 text-red-600">Error: {(error as Error).message}</div>;
    if (!report || !settings) return <div className="p-10">Data not found</div>;

    const { student, semester, akhlak, kedisiplinan, kognitif, tahfidz_progress, sakit, izin, alpa } = report;
    const academicYear = semester.academic_year?.tahun_ajaran;
    // Prioritize assigned Pembimbing, fallback to Halaqah's default Guru
    const guruPembimbing = pembimbingAssignment?.teacher || student.halaqah_data?.guru;

    // Helper to render Tahsin rows based on configuration
    const renderTahsinRows = () => {
        const scores = kognitif.Tahsin || {};

        // Determine active items
        // Priority: Halaqah Config -> Global Active Items (Fallback)
        const halaqahItems = student.halaqah_data?.tahsin_items;

        let itemsToRender: string[] = [];

        if (halaqahItems && halaqahItems.length > 0) {
            // If Halaqah has config, use it.
            // Sort them based on tahsinMasterItems order if available
            if (tahsinMasterItems) {
                itemsToRender = tahsinMasterItems
                    .filter(m => halaqahItems.includes(m.nama_item))
                    .map(m => m.nama_item);

                // Add any items that are in halaqahItems but not in master (legacy/custom?)
                const masterNames = tahsinMasterItems.map(m => m.nama_item);
                const extraItems = halaqahItems.filter(i => !masterNames.includes(i));
                itemsToRender = [...itemsToRender, ...extraItems];
            } else {
                itemsToRender = halaqahItems;
            }
        } else {
            // Fallback to all active master items
            itemsToRender = tahsinMasterItems?.map(m => m.nama_item) || [];
        }

        // If still empty (e.g. master not loaded), try to show keys from scores
        if (itemsToRender.length === 0) {
            itemsToRender = Object.keys(scores);
        }

        if (itemsToRender.length > 0) {
            return itemsToRender.map((item, idx) => (
                <tr key={item} className="border-b border-gray-300">
                    <td className="p-1 border-r border-gray-300 text-center">{idx + 1}</td>
                    <td className="p-1 border-r border-gray-300">{item}</td>
                    <td className="p-1 text-center font-medium border-r border-gray-300">{scores[item] ?? '-'}</td>
                    <td className="p-1 text-center text-xs">
                        {scores[item] ? getPredikat(scores[item]) : '-'}
                    </td>
                </tr>
            ));
        }

        // Fallback if no valid items found (e.g. legacy data structure)
        return Object.entries(scores).map(([key, val], idx) => (
            <tr key={key} className="border-b border-gray-300">
                <td className="p-1 border-r border-gray-300 text-center">{idx + 1}</td>
                <td className="p-1 border-r border-gray-300">{key}</td>
                <td className="p-1 text-center font-medium border-r border-gray-300">{val}</td>
                <td className="p-1 text-center text-xs">
                    {getPredikat(val)}
                </td>
            </tr>
        ));
    };

    // Dynamic styles based on theme
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
                breakBeforeKognitif={breakBeforeKognitif}
                setBreakBeforeKognitif={setBreakBeforeKognitif}
                breakBeforeTahsin={breakBeforeTahsin}
                setBreakBeforeTahsin={setBreakBeforeTahsin}
                breakBeforeUAS={breakBeforeUAS}
                setBreakBeforeUAS={setBreakBeforeUAS}
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
            <div className="space-y-6 relative">
                {/* Watermark Logo - Centered on every page */}
                {settings.logo_url && (
                    <>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                @media print {
                                    .watermark-logo {
                                        position: fixed;
                                        top: 50%;
                                        left: 50%;
                                        transform: translate(-50%, -50%);
                                        width: 400px;
                                        height: 400px;
                                        opacity: 0.05;
                                        z-index: 0;
                                        pointer-events: none;
                                    }
                                }
                            `
                        }} />
                        <div className="watermark-logo hidden print:block">
                            <img
                                src={settings.logo_url}
                                alt="Watermark"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </>
                )}

                {/* AKHLAK */}
                <div className="relative z-10">
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>A. Akhlak & Perilaku</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                            <tr>
                                <th className="p-1.5 border-r border-gray-300 w-8">No</th>
                                <th className="p-1.5 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-1.5 border-r border-gray-300 w-16">Nilai</th>
                                <th className="p-1.5 w-24">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(akhlak).map(([key, val], idx) => (
                                <tr key={key} className="border-b border-gray-300">
                                    <td className="p-1.5 border-r border-gray-300 text-center">{idx + 1}</td>
                                    <td className="p-1.5 border-r border-gray-300">{key}</td>
                                    <td className="p-1.5 text-center font-medium border-r border-gray-300">{val}</td>
                                    <td className="p-1.5 text-center text-xs">
                                        {getPredikat(val)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Category Note Box */}
                    <div className="mt-2 border border-gray-300 p-2 bg-gray-50 print:bg-white">
                        <p
                            className="text-xs italic text-left"
                            dangerouslySetInnerHTML={{
                                __html: getCategoryNote(student.nama, akhlak, 'akhlak')
                            }}
                        />
                    </div>
                </div>

                {/* KEDISIPLINAN */}
                <div className="relative z-10">
                    <h3 className="font-bold mb-2 border-b inline-block" style={headerStyle}>B. Kedisiplinan</h3>
                    <table className="w-full border border-gray-300 text-sm">
                        <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                            <tr>
                                <th className="p-1.5 border-r border-gray-300 w-8">No</th>
                                <th className="p-1.5 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                <th className="p-1.5 border-r border-gray-300 w-16">Nilai</th>
                                <th className="p-1.5 w-24">Predikat</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(kedisiplinan).map(([key, val], idx) => (
                                <tr key={key} className="border-b border-gray-300">
                                    <td className="p-1.5 border-r border-gray-300 text-center">{idx + 1}</td>
                                    <td className="p-1.5 border-r border-gray-300">{key}</td>
                                    <td className="p-1.5 text-center font-medium border-r border-gray-300">{val}</td>
                                    <td className="p-1.5 text-center text-xs">
                                        {getPredikat(val)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Category Note Box */}
                    <div className="mt-2 border border-gray-300 p-2 bg-gray-50 print:bg-white">
                        <p
                            className="text-xs italic text-left"
                            dangerouslySetInnerHTML={{
                                __html: getCategoryNote(student.nama, kedisiplinan, 'kedisiplinan')
                            }}
                        />
                    </div>
                </div>

                {/* KOGNITIF */}
                <div className={`relative z-10 ${breakBeforeKognitif ? 'print:break-before-page' : ''}`}>
                    <h3 className="font-bold mb-1.5 border-b inline-block" style={headerStyle}>C. Kognitif Qur'ani</h3>

                    {/* TAHFIDZ DETAIL */}
                    <div className="mb-2">
                        <h4 className="font-semibold text-xs mb-0.5">1. Tahfidz (Hafalan)</h4>
                        <table className="w-full border border-gray-300 text-xs">
                            <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                                <tr>
                                    <th className="p-1 border-r border-gray-300 w-8">No</th>
                                    <th className="p-1 border-r border-gray-300 text-left">Nama Surah</th>
                                    <th className="p-1 border-r border-gray-300 w-14 text-center">KB</th>
                                    <th className="p-1 border-r border-gray-300 w-14 text-center">KH</th>
                                    <th className="p-1 w-16 text-center">Rata-rata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tahfidz_progress && tahfidz_progress.length > 0 ? (
                                    tahfidz_progress.map((item, idx) => (
                                        <tr key={item.id} className="border-b border-gray-300">
                                            <td className="p-1 border-r border-gray-300 text-center">{idx + 1}</td>
                                            <td className="p-1 border-r border-gray-300">{item.surah?.nama_surah}</td>
                                            <td className="p-1 border-r border-gray-300 text-center">{item.kb}</td>
                                            <td className="p-1 border-r border-gray-300 text-center">{item.kh}</td>
                                            <td className="p-1 text-center font-medium">{formatScore((item.kb + item.kh) / 2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-2 text-center text-gray-500 italic text-xs">Belum ada data hafalan</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <p className="text-[10px] text-gray-500 mt-0.5">* KB: Kemampuan Bacaan, KH: Kemampuan Hafalan</p>
                    </div>

                    {/* TAHSIN */}
                    <div className={`mb-2 ${breakBeforeTahsin ? 'print:break-before-page' : ''}`}>
                        <h4 className="font-semibold text-xs mb-0.5">2. Tahsin (Perbaikan Bacaan)</h4>
                        <table className="w-full border border-gray-300 text-xs">
                            <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                                <tr>
                                    <th className="p-1 border-r border-gray-300 w-8">No</th>
                                    <th className="p-1 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                    <th className="p-1 border-r border-gray-300 w-14">Nilai</th>
                                    <th className="p-1 w-20">Predikat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderTahsinRows()}
                            </tbody>
                        </table>
                    </div>

                </div>


                {/* UAS & ATTENDANCE */}
                <div className={`relative z-10 ${breakBeforeUAS ? 'print:break-before-page' : ''}`}>
                    {/* UAS */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-xs mb-0.5">3. Ujian Akhir Semester</h4>
                        <table className="w-full border border-gray-300 text-xs">
                            <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                                <tr>
                                    <th className="p-1 border-r border-gray-300 text-left">Materi Ujian</th>
                                    <th className="p-1 w-16 text-center">Nilai</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-300">
                                    <td className="p-1 border-r border-gray-300">Ujian Akhir Semester (UAS) Tulis</td>
                                    <td className="p-1 text-center font-bold">{report.uas_tulis}</td>
                                </tr>
                                {settings.show_uas_lisan !== false && (
                                    <tr>
                                        <td className="p-1 border-r border-gray-300">Ujian Akhir Semester (UAS) Lisan</td>
                                        <td className="p-1 text-center font-bold">{report.uas_lisan}</td>
                                    </tr>
                                )}
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
                                / {getPredikat((report.nilai_akhir_akhlak * settings.bobot_akhlak + report.nilai_akhir_kedisiplinan * settings.bobot_kedisiplinan + report.nilai_akhir_kognitif * settings.bobot_kognitif) / 100)}
                            </p>
                        </div>
                    </div>

                    {/* MOTIVATIONAL MESSAGE */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: theme }}>
                        <p
                            className="text-sm italic text-center text-gray-700"
                            dangerouslySetInnerHTML={{
                                __html: (() => {
                                    const finalScore = (report.nilai_akhir_akhlak * settings.bobot_akhlak + report.nilai_akhir_kedisiplinan * settings.bobot_kedisiplinan + report.nilai_akhir_kognitif * settings.bobot_kognitif) / 100;
                                    const grade = getPredikat(finalScore);
                                    return getMotivationalMessage(student.nama, grade, finalScore);
                                })()
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ATTENDANCE & DATE */}
            <div className="mt-8 flex justify-between items-start">
                <div className="w-1/2">
                    <table className="w-full border border-gray-300 text-xs">
                        <thead className="border-b border-gray-300" style={{ backgroundColor: theme !== 'black' ? theme : '#f3f4f6', color: theme !== 'black' ? 'white' : 'black' }}>
                            <tr>
                                <th colSpan={2} className="p-1.5 text-center font-bold">Ketidakhadiran</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="p-1.5 border-r border-gray-300">Sakit</td>
                                <td className="p-1.5 text-center font-bold w-20">{sakit || 0} hari</td>
                            </tr>
                            <tr className="border-b border-gray-300">
                                <td className="p-1.5 border-r border-gray-300">Izin</td>
                                <td className="p-1.5 text-center font-bold">{izin || 0} hari</td>
                            </tr>
                            <tr>
                                <td className="p-1.5 border-r border-gray-300">Tanpa Keterangan</td>
                                <td className="p-1.5 text-center font-bold">{alpa || 0} hari</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="w-1/2 flex justify-end items-center h-full pt-8">
                    <p className="font-bold text-sm pr-8">
                        {settings.tempat_tanggal_raport || '................., ....................'}
                    </p>
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
                    <p className="mb-2">Orang Tua / Wali</p>
                    <div className="h-20 flex items-end justify-center">
                        {/* Space for manual signature */}
                    </div>
                    <p className="font-bold border-t inline-block min-w-[150px] pt-1" style={{ borderColor: theme }}>
                        {student.nama_orang_tua || '...................'}
                    </p>
                </div>
                <div className="w-1/3">
                    <p className="mb-2">Guru Pembimbing</p>
                    <div className="h-20 flex items-end justify-center">
                        {guruPembimbing?.signature_url && (
                            <img src={guruPembimbing.signature_url} alt="Signature" className="max-h-20 max-w-[150px] object-contain" />
                        )}
                    </div>
                    <p className="font-bold border-t inline-block min-w-[150px] pt-1" style={{ borderColor: theme }}>
                        {guruPembimbing?.full_name || '...................'}
                    </p>
                </div>
                <div className="w-1/3">
                    <p className="mb-2">Kepala Lembaga</p>
                    <div className="h-20 flex items-end justify-center">
                        {settings.signature_url && (
                            <img src={settings.signature_url} alt="Signature" className="max-h-20 max-w-[150px] object-contain" />
                        )}
                    </div>
                    <p className="font-bold underline inline-block min-w-[150px]">{settings.nama_kepala_lembaga}</p>
                    <p className="text-xs">NIP. {settings.nip_kepala_lembaga || '-'}</p>
                </div>
            </div>

            {/* FOOTER */}
            {settings.footer_raport && (
                <div className="mt-8 text-center text-xs text-gray-500 print:fixed print:bottom-4 print:left-0 print:w-full">
                    {settings.footer_raport}
                </div>
            )}
        </div>
    );
}
