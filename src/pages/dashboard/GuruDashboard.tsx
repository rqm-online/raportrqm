import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { BookOpen, FileText, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react';

export default function GuruDashboard() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Selamat Datang, Ustadz/Ustadzah!</h1>
                <p className="text-gray-600 mt-2">Panduan lengkap untuk mengelola nilai santri Anda</p>
            </div>

            {/* Step-by-Step Guide */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                        <CheckCircle2 className="h-6 w-6 text-blue-600" />
                        Panduan Input Nilai Santri
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1 */}
                    <div className="flex gap-4 group hover:bg-blue-50 p-4 rounded-lg transition-colors">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                                1
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-2">Kelola Surah per Santri</h3>
                            <p className="text-gray-600 mb-3">
                                Aktifkan surah yang akan dipelajari santri. Anda bisa mengatur per santri atau per halaqah sekaligus.
                            </p>
                            <Link to="/student-surah">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Buka Surah per Santri
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-blue-200"></div>

                    {/* Step 2 */}
                    <div className="flex gap-4 group hover:bg-green-50 p-4 rounded-lg transition-colors">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">
                                2
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-2">Input Nilai Santri</h3>
                            <p className="text-gray-600 mb-3">
                                Masukkan nilai Tahfidz atau Tahsin sesuai materi yang Anda ampu. Pilih halaqah, materi, lalu santri.
                            </p>
                            <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                                <p className="text-sm text-green-800 font-medium mb-2">💡 Tips Input Nilai:</p>
                                <ul className="text-sm text-green-700 space-y-1 ml-4 list-disc">
                                    <li><strong>Tahfidz:</strong> Input progress hafalan per surah (KB & KH)</li>
                                    <li><strong>Tahsin:</strong> Input nilai tahsin + UAS Tulis & Lisan</li>
                                </ul>
                            </div>
                            <Link to="/guru/input">
                                <Button className="bg-green-600 hover:bg-green-700">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Mulai Input Nilai
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-blue-200"></div>

                    {/* Step 3 */}
                    <div className="flex gap-4 group hover:bg-purple-50 p-4 rounded-lg transition-colors">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                                3
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-2">Cek Leger Nilai</h3>
                            <p className="text-gray-600 mb-3">
                                Lihat rekapitulasi nilai seluruh santri di halaqah Anda. Pastikan semua nilai sudah lengkap.
                            </p>
                            <Link to="/raport/leger">
                                <Button className="bg-purple-600 hover:bg-purple-700">
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Lihat Leger Nilai
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Menu Utama</p>
                                <p className="text-2xl font-bold text-gray-900">3 Halaman</p>
                            </div>
                            <BookOpen className="h-10 w-10 text-blue-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Akses Cepat</p>
                                <p className="text-2xl font-bold text-gray-900">Filter Otomatis</p>
                            </div>
                            <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Data Santri</p>
                                <p className="text-2xl font-bold text-gray-900">Halaqah Anda</p>
                            </div>
                            <BarChart3 className="h-10 w-10 text-purple-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Important Notes */}
            <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                    <CardTitle className="text-amber-900 flex items-center gap-2">
                        <span className="text-2xl">📌</span>
                        Catatan Penting
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-amber-900">
                            <strong>Filter Otomatis:</strong> Sistem hanya menampilkan halaqah dan santri yang ditugaskan kepada Anda
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-amber-900">
                            <strong>Input Sesuai Materi:</strong> Guru Tahfidz input progress hafalan, Guru Tahsin input nilai tahsin + UAS
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-amber-900">
                            <strong>Data Aman:</strong> Nilai yang sudah diinput otomatis tersimpan dan bisa diedit kapan saja
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
