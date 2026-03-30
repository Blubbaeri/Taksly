import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { checkBudgetThresholds, sendBudgetNotification } from '../../services/financeService';
import { getFinancialInsights, Insight } from '../../services/aiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export interface Category {
    id: string;
    label: string;
    icon: string;
    color: string;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    categoryId: string;
    amount: number;
    note: string;
    createdAt: Date;
}

export interface Budget {
    id: string;
    categoryId: string;
    amount: number;
    month: number;
    year: number;
}

// ─── Default Categories ───────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES: Category[] = [
    { id: 'food', label: 'Makan', icon: 'fast-food-outline', color: '#F97316' },
    { id: 'transport', label: 'Transport', icon: 'car-outline', color: '#3B82F6' },
    { id: 'belanja', label: 'Belanja', icon: 'bag-handle-outline', color: '#EC4899' },
    { id: 'hiburan', label: 'Hiburan', icon: 'game-controller-outline', color: '#8B5CF6' },
    { id: 'kesehatan', label: 'Kesehatan', icon: 'medkit-outline', color: '#10B981' },
    { id: 'tagihan', label: 'Tagihan', icon: 'receipt-outline', color: '#EF4444' },
    { id: 'pendidikan', label: 'Pendidikan', icon: 'book-outline', color: '#F59E0B' },
    { id: 'wishlist', label: 'Wishlist', icon: 'heart-outline', color: '#FF708D' },
    { id: 'lainnya', label: 'Lainnya', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export const INCOME_CATEGORIES: Category[] = [
    { id: 'gaji', label: 'Gaji', icon: 'briefcase-outline', color: '#4ADE80' },
    { id: 'freelance', label: 'Freelance', icon: 'laptop-outline', color: '#34D399' },
    { id: 'bisnis', label: 'Bisnis', icon: 'storefront-outline', color: '#6EE7B7' },
    { id: 'investasi', label: 'Investasi', icon: 'trending-up-outline', color: '#A7F3D0' },
    { id: 'hadiah', label: 'Hadiah', icon: 'gift-outline', color: '#FCD34D' },
    { id: 'lainnya', label: 'Lainnya', icon: 'cash-outline', color: '#6B7280' },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export function useFinanceStore() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>(EXPENSE_CATEGORIES);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>(INCOME_CATEGORIES);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch transactions
    const fetchTransactions = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('ts_finance')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_date', null)
            .order('finance_date', { ascending: false });

        if (error) {
            console.error("Error fetching transactions:", error);
        } else if (data) {
            const mapped = data.map(row => ({
                id: row.id,
                type: row.type,
                categoryId: row.category,
                amount: Number(row.amount),
                note: row.note || '',
                createdAt: new Date(row.created_date),
            }));
            setTransactions(mapped);
        }
        setIsLoading(false);
    }, [userId]);

    const fetchBudgets = useCallback(async () => {
        if (!userId) return;
        const now = new Date();
        const { data, error } = await supabase
            .from('ts_budget')
            .select('*')
            .eq('user_id', userId)
            .eq('month', now.getMonth() + 1)
            .eq('year', now.getFullYear());

        if (error) {
            console.error("Error fetching budgets:", error);
        } else if (data) {
            setBudgets(data.map(row => ({
                id: row.id,
                categoryId: row.category_id,
                amount: Number(row.amount),
                month: row.month,
                year: row.year,
            })));
        }
    }, [userId]);

    const fetchCustomCategories = useCallback(async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('ts_categories')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error("Error fetching custom categories:", error);
        } else if (data) {
            const expense = data.filter(c => c.type === 'expense').map(c => ({
                id: c.id,
                label: c.label,
                icon: c.icon,
                color: c.color
            }));
            const income = data.filter(c => c.type === 'income').map(c => ({
                id: c.id,
                label: c.label,
                icon: c.icon,
                color: c.color
            }));
            setExpenseCategories([...EXPENSE_CATEGORIES, ...expense]);
            setIncomeCategories([...INCOME_CATEGORIES, ...income]);
        }
    }, [userId]);

    // Initial load userId
    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUserId(session.user.id);
                }
            } catch (error) {
                console.error("Error loading user from Supabase Auth:", error);
            }
        };
        loadUser();
    }, []);

    // Initial fetch on userId change
    useEffect(() => {
        if (userId) {
            fetchTransactions();
            fetchBudgets();
            fetchCustomCategories();
        }
    }, [userId, fetchTransactions, fetchBudgets, fetchCustomCategories]);

    // Realtime subscription for transactions
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('finance-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ts_finance',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newRow = payload.new;
                        const tx: Transaction = {
                            id: newRow.id,
                            type: newRow.type as TransactionType,
                            categoryId: newRow.category,
                            amount: Number(newRow.amount),
                            note: newRow.note || '',
                            createdAt: new Date(newRow.created_date),
                        };
                        setTransactions(prev => {
                            if (prev.find(t => t.id === tx.id)) return prev;
                            return [tx, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const row = payload.new;
                        if (row.status === 'Inactive' || row.deleted_date) {
                            setTransactions(prev => prev.filter(t => t.id !== row.id));
                        } else {
                            fetchTransactions();
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, fetchTransactions]);

    // Budget realtime subscription
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('budget-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ts_budget',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    fetchBudgets();
                }
            )
            .subscribe();

        const catChannel = supabase
            .channel('categories-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ts_categories',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    fetchCustomCategories();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(catChannel);
        };
    }, [userId, fetchBudgets, fetchCustomCategories]);

    const getCategoryById = useCallback((categoryId: string): Category | undefined => {
        return (
            expenseCategories.find(c => c.id === categoryId) ||
            incomeCategories.find(c => c.id === categoryId)
        );
    }, [expenseCategories, incomeCategories]);

    // Transaction actions
    const addTransaction = useCallback(async (
        type: TransactionType,
        categoryId: string,
        amount: number,
        note: string,
    ) => {
        if (!userId) return;

        const { data, error } = await supabase
            .from('ts_finance')
            .insert([{
                user_id: userId,
                type: type,
                category: categoryId,
                amount: amount,
                note: note,
                finance_date: new Date().toISOString().split('T')[0],
            }])
            .select()
            .single();

        if (error) {
            console.error("Error inserting transaction:", error);
            alert("Gagal menyimpan transaksi");
            return;
        }

        if (data) {
            const tx: Transaction = {
                id: data.id,
                type: data.type,
                categoryId: data.category,
                amount: Number(data.amount),
                note: data.note || '',
                createdAt: new Date(data.created_date),
            };
            setTransactions(prev => [tx, ...prev]);

            // Check Budget Notifications
            const cat = getCategoryById(tx.categoryId);
            const budget = budgets.find(b => b.categoryId === tx.categoryId);
            if (tx.type === 'expense' && budget && cat) {
                const spending = transactions
                    .filter(t => t.type === 'expense' && t.categoryId === tx.categoryId)
                    .reduce((sum, t) => sum + t.amount, 0) + tx.amount;
                
                const notif = checkBudgetThresholds(spending, budget.amount, cat.label);
                if (notif) {
                    await sendBudgetNotification(notif.title, notif.body);
                }
            }
        }
    }, [userId, getCategoryById, budgets, transactions]);

    const deleteTransaction = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('ts_finance')
            .update({ 
                deleted_date: new Date().toISOString(),
                status: 'Inactive'
            })
            .eq('id', id);

        if (error) {
            console.error("Error soft-deleting transaction:", error);
            alert("Gagal menghapus transaksi");
            return;
        }

        setTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    const addCategory = useCallback(async (type: TransactionType, category: Omit<Category, 'id'>) => {
        if (!userId) return;
        
        const { data, error } = await supabase
            .from('ts_categories')
            .insert([{
                user_id: userId,
                type: type,
                label: category.label,
                icon: category.icon,
                color: category.color
            }])
            .select()
            .single();

        if (error) {
            console.error("Error adding category:", error);
            alert("Gagal menyimpan kategori");
        } else if (data) {
            fetchCustomCategories();
        }
    }, [userId, fetchCustomCategories]);

    // AI Insights update
    useEffect(() => {
        if (transactions.length > 0) {
            const allCats = [...expenseCategories, ...incomeCategories];
            const newInsights = getFinancialInsights(transactions, budgets, allCats);
            setInsights(newInsights);
        }
    }, [transactions, budgets, expenseCategories, incomeCategories]);

    // Budget actions
    const setBudget = useCallback(async (categoryId: string, amount: number) => {
        if (!userId) return;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Check if exists
        const { data: existing } = await supabase
            .from('ts_budget')
            .select('id')
            .eq('user_id', userId)
            .eq('category_id', categoryId)
            .eq('month', month)
            .eq('year', year)
            .maybeSingle();

        let error;
        if (existing) {
            const { error: err } = await supabase
                .from('ts_budget')
                .update({ amount })
                .eq('id', existing.id);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('ts_budget')
                .insert([{
                    user_id: userId,
                    category_id: categoryId,
                    amount,
                    month,
                    year
                }]);
            error = err;
        }

        if (error) {
            console.error("Error setting budget:", error);
            alert("Gagal menyimpan budget");
        } else {
            fetchBudgets();
        }
    }, [userId, fetchBudgets]);

    const getBudgetForCategory = useCallback((categoryId: string) => {
        return budgets.find(b => b.categoryId === categoryId);
    }, [budgets]);

    // Derived stats
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    return {
        transactions,
        budgets,
        insights,
        expenseCategories,
        incomeCategories,
        totalIncome,
        totalExpense,
        balance,
        isLoading,
        addTransaction,
        deleteTransaction,
        addCategory,
        getCategoryById,
        refreshTransactions: fetchTransactions,
        fetchBudgets,
        setBudget,
        getBudgetForCategory,
    };
}
