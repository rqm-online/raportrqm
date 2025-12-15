import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { ReportCard, SettingsLembaga, Student, Semester, AcademicYear, TahfidzProgress, Halaqah, TahsinMaster } from '../../types';
import { formatScore, getPredikat, getMotivationalMessage, getCategoryNote } from '../../utils/grading';
import { Button } from '../../components/ui/button';
import { Printer } from 'lucide-react';

export default function RaportPrintBulk() {
    const [searchParams] = useSearchParams();
    const studentIds = searchParams.get('students')?.split(',') || [];
    const semesterId = searchParams.get('semester');

    const { data: reports, isLoading, error } = useQuery({
        queryKey: ['bulk_reports', studentIds, semesterId],
        queryFn: async () => {
            if (!semesterId || studentIds.length === 0) return [];

            const { data, error } = await supabase
                .from('report_cards')
                .select(`
                    *,
                    tahfidz_progress(*, surah:surah_master(*)),
                    student:students(*, halaqah_data:halaqah(*, guru:users(*))),
                    semester:semesters(*, academic_year:academic_years(*))
                `)
                .in('student_id', studentIds)
                .eq('semester_id', semesterId);

            if (error) throw error;
            return data as (ReportCard & {
                student: Student & { halaqah_data?: Halaqah },
                semester: Semester & { academic_year: AcademicYear },
                tahfidz_progress: TahfidzProgress[]
            })[];
        }
    });

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await supabase.from('settings_lembaga').select('*').single();
            return data as SettingsLembaga;
        }
    });

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

    useEffect(() => {
        if (!isLoading && reports && reports.length > 0) {
            document.title = `Raport Massal - ${reports.length} Santri`;
        }
    }, [isLoading, reports]);

    if (isLoading) return <div className="p-10">Loading...</div>;
    if (error) return <div className="p-10 text-red-600">Error: {(error as Error).message}</div>;
    if (!reports || reports.length === 0 || !settings) return <div className="p-10">Data not found</div>;

    const renderTahsinRows = (kognitif: any, halaqahItems?: string[]) => {
        const scores = kognitif.Tahsin || {};
        let itemsToRender: string[] = [];

        if (halaqahItems && halaqahItems.length > 0) {
            if (tahsinMasterItems) {
                itemsToRender = tahsinMasterItems
                    .filter(m => halaqahItems.includes(m.nama_item))
                    .map(m => m.nama_item);
                const masterNames = tahsinMasterItems.map(m => m.nama_item);
                const extraItems = halaqahItems.filter(i => !masterNames.includes(i));
                itemsToRender = [...itemsToRender, ...extraItems];
            } else {
                itemsToRender = halaqahItems;
            }
        } else {
            itemsToRender = tahsinMasterItems?.map(m => m.nama_item) || [];
        }

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

        return Object.entries(scores).map(([key, val], idx) => (
            <tr key={key} className="border-b border-gray-300">
                <td className="p-1 border-r border-gray-300 text-center">{idx + 1}</td>
                <td className="p-1 border-r border-gray-300">{key}</td>
                <td className="p-1 text-center font-medium border-r border-gray-300">{val as number}</td>
                <td className="p-1 text-center text-xs">
                    {getPredikat(val as number)}
                </td>
            </tr>
        ));
    };

    return (
        <div className="bg-white">
            {/* Print Button - Hidden when printing */}
            <div className="fixed top-4 right-4 z-50 print:hidden">
                <Button onClick={() => window.print()} size="lg" className="shadow-lg">
                    <Printer className="mr-2 h-5 w-5" />
                    Cetak Semua ({reports.length} Raport)
                </Button>
            </div>

            {/* Render each report */}
            {reports.map((report, reportIndex) => {
                const { student, semester, akhlak, kedisiplinan, kognitif, tahfidz_progress, sakit, izin, alpa } = report;
                const academicYear = semester.academic_year?.tahun_ajaran;
                const guruPembimbing = student.halaqah_data?.guru;

                return (
                    <div
                        key={report.id}
                        className={`max-w-[210mm] mx-auto p-8 print:p-0 ${reportIndex > 0 ? 'print:break-before-page' : ''}`}
                    >
                        {/* HEADER / KOP */}
                        <div className="flex items-center gap-4 border-b-4 border-double pb-4 mb-6 border-black">
                            {settings.logo_url && (
                                <img src={settings.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
                            )}
                            <div className="flex-1 text-center">
                                <h1 className="text-2xl font-bold uppercase tracking-wide">{settings.nama_lembaga}</h1>
                                <p className="text-sm">{settings.alamat}</p>
                                <p className="text-sm">{settings.kota} - Telp: {settings.nomor_kontak}</p>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold uppercase underline">Laporan Hasil Belajar Santri</h2>
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
                                <h3 className="font-bold mb-2 border-b inline-block border-black">A. Akhlak & Perilaku</h3>
                                <table className="w-full border border-gray-300 text-sm">
                                    <thead className="border-b border-gray-300 bg-gray-100">
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
                                                <td className="p-1.5 text-center font-medium border-r border-gray-300">{val as number}</td>
                                                <td className="p-1.5 text-center text-xs">
                                                    {getPredikat(val as number)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                            <div>
                                <h3 className="font-bold mb-2 border-b inline-block border-black">B. Kedisiplinan</h3>
                                <table className="w-full border border-gray-300 text-sm">
                                    <thead className="border-b border-gray-300 bg-gray-100">
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
                                                <td className="p-1.5 text-center font-medium border-r border-gray-300">{val as number}</td>
                                                <td className="p-1.5 text-center text-xs">
                                                    {getPredikat(val as number)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                            <div>
                                <h3 className="font-bold mb-1.5 border-b inline-block border-black">C. Kognitif Qur'ani</h3>

                                {/* TAHFIDZ DETAIL */}
                                <div className="mb-2">
                                    <h4 className="font-semibold text-xs mb-0.5">1. Tahfidz (Hafalan)</h4>
                                    <table className="w-full border border-gray-300 text-xs">
                                        <thead className="border-b border-gray-300 bg-gray-100">
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
                                <div className="mb-2">
                                    <h4 className="font-semibold text-xs mb-0.5">2. Tahsin (Perbaikan Bacaan)</h4>
                                    <table className="w-full border border-gray-300 text-xs">
                                        <thead className="border-b border-gray-300 bg-gray-100">
                                            <tr>
                                                <th className="p-1 border-r border-gray-300 w-8">No</th>
                                                <th className="p-1 border-r border-gray-300 text-left">Aspek Penilaian</th>
                                                <th className="p-1 border-r border-gray-300 w-14">Nilai</th>
                                                <th className="p-1 w-20">Predikat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {renderTahsinRows(kognitif, student.halaqah_data?.tahsin_items)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* UAS */}
                            <div>
                                <h4 className="font-semibold text-xs mb-0.5">3. Ujian Akhir Semester</h4>
                                <table className="w-full border border-gray-300 text-xs">
                                    <thead className="border-b border-gray-300 bg-gray-100">
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

                            {/* NILAI AKHIR */}
                            <div className="mt-8 border p-4 bg-gray-50 print:bg-transparent border-black">
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
                                    <div className="border-l pl-4 border-black">
                                        <p className="text-xs uppercase font-bold">Total / Predikat</p>
                                        <p className="font-bold text-xl">
                                            {formatScore((report.nilai_akhir_akhlak * settings.bobot_akhlak + report.nilai_akhir_kedisiplinan * settings.bobot_kedisiplinan + report.nilai_akhir_kognitif * settings.bobot_kognitif) / 100)}
                                            / {getPredikat((report.nilai_akhir_akhlak * settings.bobot_akhlak + report.nilai_akhir_kedisiplinan * settings.bobot_kedisiplinan + report.nilai_akhir_kognitif * settings.bobot_kognitif) / 100)}
                                        </p>
                                    </div>
                                </div>

                                {/* MOTIVATIONAL MESSAGE */}
                                <div className="mt-4 pt-4 border-t border-black">
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
                                    <thead className="border-b border-gray-300 bg-gray-100">
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
                            <div className="mt-4 border p-4 min-h-[100px] border-black">
                                <h3 className="font-bold text-sm mb-2">Catatan:</h3>
                                <p className="text-sm whitespace-pre-wrap">{report.catatan}</p>
                            </div>
                        )}

                        {/* TANDA TANGAN */}
                        <div className="mt-16 flex justify-between text-center text-sm break-inside-avoid">
                            <div className="w-1/3">
                                <p className="mb-2">Orang Tua / Wali</p>
                                <div className="h-20 flex items-end justify-center"></div>
                                <p className="font-bold border-t inline-block min-w-[150px] pt-1 border-black">
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
                                <p className="font-bold border-t inline-block min-w-[150px] pt-1 border-black">
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
            })}
        </div>
    );
}
