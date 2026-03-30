import { useMemo } from 'react';
import { useFinanceStore } from '../features/finance/useFinanceStore';
import { calcReality, predictCompletion, calculateAllocations, RealityResult } from '../utils/wishlistLogic';
import { detectWaste, generateGlobalRecommendations, WasteTip } from '../utils/financeInsight';

export interface WishlistInsight {
    id: string;
    reality: RealityResult;
    prediction: Date | null;
    allocation: number;
}

export interface GlobalInsights {
    tips: WasteTip[];
    recommendations: string[];
}

export const useWishlistInsights = (wishlist: any[]) => {
    const { totalIncome, totalExpense, transactions } = useFinanceStore();

    const itemInsights = useMemo(() => {
        const income = totalIncome || 0;
        const expense = totalExpense || 0;
        const disposable = Math.max(0, income - expense);

        const allocations = calculateAllocations(
            wishlist.map(i => ({ id: i.id, priority: i.priority })),
            disposable
        );

        return wishlist.reduce((acc, item) => {
            acc[item.id] = {
                id: item.id,
                reality: calcReality(income, expense, item.targetPrice, item.currentSaved, item.targetDate),
                prediction: predictCompletion(item.currentSaved, item.createdDate || new Date().toISOString(), item.targetPrice),
                allocation: allocations[item.id] || 0,
            };
            return acc;
        }, {} as Record<string, WishlistInsight>);
    }, [wishlist, totalIncome, totalExpense]);

    const globalInsights = useMemo((): GlobalInsights => {
        return {
            tips: detectWaste(transactions),
            recommendations: generateGlobalRecommendations(wishlist),
        };
    }, [transactions, wishlist]);

    return {
        itemInsights,
        globalInsights,
    };
};
