import type { SettingsLembaga } from '../types';

export const calculateAverage = (scores: Record<string, number>): number => {
    const values = Object.values(scores);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
};

export const calculateFinalScore = (
    akhlakAvg: number, // 10-100
    kedisiplinanAvg: number, // 10-100
    kognitifAvg: number, // 10-100
    settings: SettingsLembaga
): number => {
    const total =
        (akhlakAvg * settings.bobot_akhlak) +
        (kedisiplinanAvg * settings.bobot_kedisiplinan) +
        (kognitifAvg * settings.bobot_kognitif);

    return total / 100;
};

export const getPredikat = (score: number, skala: Record<string, number>): string => {
    // Skala contoh: { "A": 85, "B": 70, "C": 60 }
    // Urutkan dari terbesar
    const sortedGrades = Object.entries(skala).sort(([, a], [, b]) => b - a);

    for (const [grade, minScore] of sortedGrades) {
        if (score >= minScore) return grade;
    }
    return 'D'; // Default
};

export const formatScore = (num: number) => num.toFixed(2);
