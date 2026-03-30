/**
 * Logic for calculating wishlist feasibility and predictions.
 */

export interface RealityResult {
    neededDaily: number;
    maxDaily: number;
    isRealistic: boolean;
    suggestion?: string;
}

export const calcReality = (
    income: number,
    expense: number,
    target: number,
    saved: number,
    targetDate: string
): RealityResult => {
    const remaining = Math.max(0, target - saved);
    const deadline = new Date(targetDate).getTime();
    const now = Date.now();
    
    // Days left until deadline (minimum 1 day to avoid division by zero)
    const daysLeft = Math.max(1, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));

    // Monthly disposable income
    const monthlyDisposable = Math.max(0, income - expense);
    const dailyDisposable = monthlyDisposable / 30;

    // How much user actually needs to save per day to hit deadline
    const neededDaily = remaining / daysLeft;

    const isRealistic = neededDaily <= dailyDisposable;

    let suggestion;
    if (!isRealistic && remaining > 0) {
        // Calculate new suggested deadline based on what they CAN afford
        const daysNeeded = Math.ceil(remaining / Math.max(1, dailyDisposable));
        const suggestedDate = new Date(now + daysNeeded * (1000 * 60 * 60 * 24));
        suggestion = `Try extending your deadline to ${suggestedDate.toLocaleDateString()} to make it realistic.`;
    }

    return {
        neededDaily,
        maxDaily: dailyDisposable,
        isRealistic,
        suggestion,
    };
};

export const predictCompletion = (
    saved: number,
    createdDate: string,
    target: number
): Date | null => {
    const start = new Date(createdDate).getTime();
    const now = Date.now();
    const daysElapsed = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    
    // Average savings per day so far
    const avgDaily = saved / daysElapsed;

    if (avgDaily <= 0) return null;

    const remaining = target - saved;
    if (remaining <= 0) return new Date();

    const daysNeeded = remaining / avgDaily;
    return new Date(now + daysNeeded * (1000 * 60 * 60 * 24));
};

export const weightMap: Record<string, number> = {
    High: 3,
    Medium: 2,
    Low: 1,
};

export const calculateAllocations = (
    wishlist: { id: string; priority: string }[],
    monthlyBudget: number
) => {
    const totalWeight = wishlist.reduce((sum, item) => sum + (weightMap[item.priority] || 1), 0);
    
    if (totalWeight === 0) return {};

    const allocations: Record<string, number> = {};
    wishlist.forEach(item => {
        const weight = weightMap[item.priority] || 1;
        allocations[item.id] = (weight / totalWeight) * monthlyBudget;
    });

    return allocations;
};
