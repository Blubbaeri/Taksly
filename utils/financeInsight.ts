/**
 * Logic for analyzing finance data to suggest wishlist savings.
 */

export interface WasteTip {
    message: string;
    amount: number;
    icon: string;
}

export const detectWaste = (transactions: any[]): WasteTip[] => {
    const tips: WasteTip[] = [];

    // Rule 1: High food/entertainment spending
    const foodExpenses = transactions.filter(t => 
        t.type === 'expense' && 
        (t.categoryId?.toLowerCase().includes('food') || t.note?.toLowerCase().includes('food')) &&
        t.amount > 100000
    );

    foodExpenses.slice(0, 3).forEach(t => {
        tips.push({
            message: `You spent Rp ${t.amount.toLocaleString()} on food/treats. Savings could go here!`,
            amount: t.amount,
            icon: '🍔',
        });
    });

    // Rule 2: Uncategorized or large 'Other' expenses
    const otherExpenses = transactions.filter(t => 
        t.type === 'expense' && 
        (t.categoryId === 'others' || t.categoryId === 'other') && 
        t.amount > 500000
    );

    if (otherExpenses.length > 0) {
        tips.push({
            message: `Found large miscellaneous expenses. Tracking them better could save more.`,
            amount: otherExpenses.reduce((sum, t) => sum + t.amount, 0),
            icon: '💸',
        });
    }

    return tips;
};

export const generateGlobalRecommendations = (wishlist: any[]): string[] => {
    const recs: string[] = [];

    const highPriority = wishlist.filter(i => i.priority === 'High');
    if (highPriority.length > 3) {
        recs.push('🔥 You have too many high-priority goals. Focus on 1-2 to finish faster!');
    }

    const overdue = wishlist.filter(i => {
        const deadline = new Date(i.targetDate).getTime();
        return deadline < Date.now() && i.currentSaved < i.targetPrice;
    });

    if (overdue.length > 0) {
        recs.push(`⏰ ${overdue.length} goal(s) have passed their deadline. Try adjusting them!`);
    }

    const unstarted = wishlist.filter(i => i.currentSaved === 0);
    if (unstarted.length > 2) {
        recs.push(`🌱 You have several goals with 0% progress. Maybe delete the ones you don't really want?`);
    }

    return recs;
};
