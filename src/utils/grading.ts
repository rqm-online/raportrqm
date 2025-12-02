import type { SettingsLembaga } from '../types';

export const calculateAverage = (scores: Record<string, number>): number => {
    const values = Object.values(scores);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
};

export const calculateFinalScore = (
    akhlakAvg: number,
    kedisiplinanAvg: number,
    kognitifAvg: number,
    settings: SettingsLembaga
): number => {
    const total =
        (akhlakAvg * settings.bobot_akhlak) +
        (kedisiplinanAvg * settings.bobot_kedisiplinan) +
        (kognitifAvg * settings.bobot_kognitif);

    return total / 100;
};

// New grading scale
export const getPredikat = (score: number, scale?: Record<string, number>): string => {
    if (scale) {
        // Sort scale by value descending
        const sortedScale = Object.entries(scale).sort(([, a], [, b]) => b - a);
        for (const [grade, minScore] of sortedScale) {
            if (score >= minScore) return grade;
        }
        return 'E'; // Default fallback
    }

    // Default hardcoded scale
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D';
    return 'E';
};

// Generate motivational message based on grade
export const getMotivationalMessage = (studentName: string, grade: string, finalScore: number): string => {
    const boldItalicName = `<strong><em>${studentName}</em></strong>`;

    const messages = {
        'A': [
            `"Maa syaa Allah, Ananda ${boldItalicName} telah menunjukkan prestasi yang sangat luar biasa! Pertahankan semangat belajar dan terus tingkatkan kualitas hafalan serta pemahaman Al-Qur'an."`,
            `"Alhamdulillah, Ananda ${boldItalicName} telah mencapai prestasi yang membanggakan. Semoga Allah senantiasa memberikan keberkahan ilmu dan menjadikan Al-Qur'an sebagai cahaya dalam hidupnya."`,
            `"Subhanallah, pencapaian Ananda ${boldItalicName} sangat membanggakan! Teruslah istiqomah dalam menghafal dan memahami Al-Qur'an, semoga menjadi generasi Qur'ani yang terbaik."`
        ],
        'B': [
            `"Alhamdulillah, Ananda ${boldItalicName} telah menunjukkan prestasi yang baik. Tingkatkan lagi semangat dan konsistensi dalam belajar agar mencapai hasil yang lebih optimal."`,
            `"Maa syaa Allah, Ananda ${boldItalicName} sudah menunjukkan kemajuan yang baik. Terus tingkatkan kualitas bacaan dan hafalan agar semakin sempurna."`,
            `"Barakallahu fiik, prestasi Ananda ${boldItalicName} sudah baik. Dengan sedikit peningkatan fokus dan latihan, insya Allah akan mencapai hasil yang lebih gemilang."`
        ],
        'C': [
            `"Ananda ${boldItalicName} sudah menunjukkan usaha yang cukup baik. Tingkatkan lagi kedisiplinan dan fokus dalam belajar agar prestasi semakin meningkat."`,
            `"Semangat Ananda ${boldItalicName}! Terus berusaha dan jangan menyerah. Dengan latihan yang lebih konsisten, insya Allah prestasi akan semakin membaik."`,
            `"Ananda ${boldItalicName} perlu meningkatkan usaha dan konsistensi belajar. Jangan ragu untuk bertanya kepada ustadz/ustadzah jika ada kesulitan."`
        ],
        'D': [
            `"Ananda ${boldItalicName} perlu meningkatkan usaha dan kedisiplinan dalam belajar. Konsultasikan dengan ustadz/ustadzah untuk mendapatkan bimbingan yang lebih intensif."`,
            `"Semangat Ananda ${boldItalicName}! Masih banyak kesempatan untuk memperbaiki prestasi. Tingkatkan kedisiplinan, fokus, dan jangan ragu meminta bantuan."`,
            `"Ananda ${boldItalicName} memerlukan perhatian dan bimbingan lebih. Mari bersama-sama berusaha lebih keras agar prestasi semakin meningkat."`
        ],
        'E': [
            `"Ananda ${boldItalicName} memerlukan perhatian khusus dan bimbingan intensif. Mari kita bersama-sama berusaha lebih keras dan konsisten dalam belajar."`,
            `"Ananda ${boldItalicName} perlu meningkatkan usaha secara signifikan. Orang tua dan ustadz/ustadzah akan memberikan pendampingan lebih intensif agar prestasi dapat meningkat."`,
            `"Semangat Ananda ${boldItalicName}! Jangan berkecil hati. Dengan bimbingan yang tepat dan usaha yang sungguh-sungguh, insya Allah prestasi akan membaik."`
        ]
    };

    const gradeMessages = messages[grade as keyof typeof messages] || messages['E'];
    const index = Math.floor(finalScore) % gradeMessages.length;
    return gradeMessages[index];
};

// Generate summary note for a category
export const getCategoryNote = (studentName: string, scores: Record<string, number>, category: 'akhlak' | 'kedisiplinan'): string => {
    const boldItalicName = `<strong><em>${studentName}</em></strong>`;
    const average = calculateAverage(scores);
    const values = Object.values(scores);
    const lowest = Math.min(...values);
    const lowestItems = Object.entries(scores).filter(([, v]) => v === lowest).map(([k]) => k);

    if (average >= 85) {
        return category === 'akhlak'
            ? `Ananda ${boldItalicName} menunjukkan akhlak yang sangat baik secara keseluruhan. Alhamdulillah, terus pertahankan dan jadilah teladan bagi teman-teman.`
            : `Ananda ${boldItalicName} menunjukkan kedisiplinan yang sangat baik. Maa syaa Allah, konsistensi ini patut dipertahankan dan ditingkatkan.`;
    } else if (average >= 75) {
        return category === 'akhlak'
            ? `Ananda ${boldItalicName} sudah menunjukkan akhlak yang baik. Tingkatkan lagi terutama dalam aspek ${lowestItems[0].toLowerCase()} agar lebih sempurna.`
            : `Ananda ${boldItalicName} sudah cukup disiplin. Perlu peningkatan terutama dalam ${lowestItems[0].toLowerCase()} agar lebih konsisten.`;
    } else if (average >= 65) {
        return category === 'akhlak'
            ? `Ananda ${boldItalicName} perlu meningkatkan akhlak, terutama dalam ${lowestItems.slice(0, 2).map(i => i.toLowerCase()).join(' dan ')}. Mari kita perbaiki bersama dengan bimbingan ustadz/ustadzah.`
            : `Ananda ${boldItalicName} perlu meningkatkan kedisiplinan, khususnya ${lowestItems.slice(0, 2).map(i => i.toLowerCase()).join(' dan ')}. Buat jadwal yang lebih teratur dan konsisten.`;
    } else {
        return category === 'akhlak'
            ? `Ananda ${boldItalicName} memerlukan bimbingan intensif dalam pembinaan akhlak. Orang tua dan ustadz/ustadzah akan bekerja sama memberikan pendampingan khusus.`
            : `Ananda ${boldItalicName} memerlukan perhatian serius dalam kedisiplinan. Diperlukan kerjasama orang tua dan lembaga untuk perbaikan yang signifikan.`;
    }
};

export const formatScore = (num: number) => num.toFixed(2);
