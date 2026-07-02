import { useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';

// ─────────────── Constants ───────────────
export const ONE_DAY_MS = 86_400_000;

export type Priority = 'Low' | 'Medium' | 'High';
export type SortKey = 'progress' | 'priority' | 'date';

export interface WishlistItem {
    id: string;
    name: string;
    targetPrice: number;
    currentSaved: number;
    targetDate: string;
    category: string;
    priority: Priority;
    reasoning: string;
    emoji: string;
    status?: 'Active' | 'Paused';
}

export const PRIORITY_CONFIG: Record<Priority, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    Low: { color: '#34C789', icon: 'leaf-outline', label: 'Low' },
    Medium: { color: '#FF9F0A', icon: 'flame-outline', label: 'Medium' },
    High: { color: '#FF453A', icon: 'rocket-outline', label: 'High' },
};

export const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    Tech: 'laptop-outline', 
    Work: 'briefcase-outline', 
    Fashion: 'shirt-outline', 
    Travel: 'airplane-outline',
    Health: 'fitness-outline', 
    Home: 'home-outline', 
    Food: 'fast-food-outline', 
    Personal: 'person-outline', 
    Other: 'cube-outline',
};

export const QUICK_AMOUNTS = [
    { label: '+10rb', value: 10_000 },
    { label: '+20rb', value: 20_000 },
    { label: '+50rb', value: 50_000 },
    { label: '+100rb', value: 100_000 },
];

export const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

// ─────────────── Utils ───────────────
export const formatIDR = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export const calcSavings = (target: number, saved: number, dateStr: string) => {
    const remaining = Math.max(0, target - saved);
    if (remaining <= 0) return { daily: 0, weekly: 0, monthly: 0, remaining: 0, diffDays: 0 };
    
    const targetDate = new Date(dateStr).getTime();
    if (isNaN(targetDate)) return { daily: 0, weekly: 0, monthly: 0, remaining: 0, diffDays: 0 };

    const diffDays = Math.max(1, Math.ceil((targetDate - Date.now()) / ONE_DAY_MS));
    
    return {
        daily: Math.ceil(remaining / diffDays),
        weekly: Math.ceil(remaining / Math.max(1, Math.ceil(diffDays / 7))),
        monthly: Math.ceil(remaining / Math.max(1, Math.ceil(diffDays / 30))),
        remaining,
        diffDays,
    };
};

export const getAIInsight = (target: number, saved: number, dateStr: string, monthlyIncome: number, monthlyExpenses: number) => {
    const { daily, remaining, diffDays } = calcSavings(target, saved, dateStr);
    if (remaining <= 0) return { status: 'COMPLETE', message: 'Goal tercapai! Kamu hebat!', color: '#34C789' };

    const disposableMonthly = Math.max(0, monthlyIncome - monthlyExpenses);
    const disposableDaily = disposableMonthly / 30;

    // Logic: How much of disposable income is needed?
    const ratio = daily / (disposableDaily || 1);

    if (ratio <= 0.2) {
        return {
            status: 'EASY',
            message: 'Sangat realistis! Cuma butuh seirit jajan harian kamu.',
            color: '#34C789',
        };
    } else if (ratio <= 0.5) {
        return {
            status: 'MODERATE',
            message: 'Bisa banget, tapi harus agak disiplin nabungnya ya!',
            color: '#FF9F0A',
        };
    } else if (ratio <= 1.0) {
        return {
            status: 'TOUGH',
            message: 'Agak berat nih, mungkin perlu tambah side hustle atau mundurin deadline?',
            color: '#BF5AF2',
        };
    } else {
        return {
            status: 'UNREALISTIC',
            message: `Waduh, butuh ${formatIDR(daily)}/hari. Melebihi budget harian kamu!`,
            color: '#FF453A',
        };
    }
};

export const daysLeft = (dateStr: string) => {
    const targetDate = new Date(dateStr).getTime();
    if (isNaN(targetDate)) return 'Invalid date';
    
    const d = Math.ceil((targetDate - Date.now()) / ONE_DAY_MS);
    return d < 0 ? 'Overdue' : d === 0 ? 'Today!' : `${d}d left`;
};

// ─────────────── Hooks ───────────────
export function useWishlistUtils() {
    // Simple debounce implementation
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const debounce = useCallback((callback: (...args: any[]) => void, delay: number) => {
        return (...args: any[]) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        };
    }, []);

    return {
        formatIDR,
        calcSavings,
        daysLeft,
        debounce,
    };
}
