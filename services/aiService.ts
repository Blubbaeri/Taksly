export async function breakdownTaskAI(title: string) {
    try {
        const apiKey = process.env.EXPO_PUBLIC_VISION_API_KEY;
        if (!apiKey) throw new Error('AI API Key not found');

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Break this task into max 5 short actionable subtasks (no numbering, no bullet points, just one per line):
Task: ${title}`,
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
        console.error('Gemini error:', err);
        throw err;
    }
}

export function parseSubtasks(text: string): string[] {
    return text
        .split('\n')
        .map(t => t.replace(/^\d+\.?\s*|- /, '').trim())
        .filter(t => t.length > 0);
}

// --- Finance AI Insights ---

export interface Insight {
    id: string;
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    icon: string;
}

/**
 * Rule-based financial insights. 
 * Note: These currently don't use LLM to save tokens/latency, 
 * but are placed here as they represent the "AI Advisor" feature.
 */
export function getFinancialInsights(
    transactions: any[],
    budgets: any[],
    categories: any[]
): Insight[] {
    const insights: Insight[] = [];

    // 1. Total Spending Check
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    if (totalExpense > totalIncome && totalIncome > 0) {
        insights.push({
            id: 'over_income',
            type: 'warning',
            title: 'Sinyal Bahaya! 🎒',
            message: 'Pengeluaran lo udah lebih gede dari pemasukan bulan ini.',
            icon: 'alert-circle'
        });
    } else if (totalIncome > 0 && totalExpense < totalIncome * 0.5) {
        insights.push({
            id: 'good_saving',
            type: 'success',
            title: 'Mantap Jiiwa! 💰',
            message: 'Lo hemat banget bulan ini! Uangnya bisa masuk tabungan nih.',
            icon: 'checkmark-circle'
        });
    }

    // 2. Category-specific Budget Check
    for (const budget of budgets) {
        const cat = categories.find(c => c.id === budget.categoryId);
        const spending = transactions
            .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId)
            .reduce((sum, t) => sum + t.amount, 0);

        const percent = spending / budget.amount;

        if (percent >= 1.0) {
            insights.push({
                id: `over_budget_${budget.categoryId}`,
                type: 'warning',
                title: `Budget ${cat?.label} Jebol 🚨`,
                message: `Lo udah belanja kelewat batas di kategori ${cat?.label}. Tahan dulu ya!`,
                icon: 'warning'
            });
        }
    }

    // 3. Fun Fact / Pattern Check
    const foodSpending = transactions
        .filter(t => t.categoryId === 'food' || t.categoryId === 'makan')
        .reduce((sum, t) => sum + t.amount, 0);

    if (foodSpending > 1000000) {
        insights.push({
            id: 'high_food',
            type: 'info',
            title: 'Foodies Sejati? 🍔',
            message: 'Liat deh, pengeluaran makan lo udah tembus sejuta. Masak sendiri yuk?',
            icon: 'restaurant'
        });
    }

    // 4. Default Insight
    if (insights.length === 0) {
        insights.push({
            id: 'all_good',
            type: 'info',
            title: 'Keuangan Aman! 👍',
            message: 'Belum ada anomali keuangan yang terdeteksi. Lanjuuut!',
            icon: 'happy'
        });
    }

    return insights;
}
