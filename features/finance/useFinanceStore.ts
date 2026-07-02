import { useState, useCallback, useEffect, useMemo, createContext, useContext, createElement, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { checkBudgetThresholds, sendBudgetNotification } from '../../services/financeService';
import { getFinancialInsights, Insight } from '../../services/aiService';
import { useLoading } from '../../src/context/LoadingContext';
import TakslyLoadingScreen from '../../components/common/TakslyLoadingScreen';

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
    accountId?: string;
}

export interface Account {
    id: string;
    name: string;
    emoji: string;
    balance: number;
}

export interface Budget {
    id: string;
    categoryId: string;
    amount: number;
    month: number;
    year: number;
}

export interface Subscription {
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    categoryId?: string;
    emoji: string;
    lastPaidDate?: Date | null;
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
    { id: 'income_other', label: 'Lainnya', icon: 'cash-outline', color: '#6B7280' },
];

// ─── Store ────────────────────────────────────────────────────────────────────

function useFinanceStoreInternal() {
    const { setGlobalLoading } = useLoading();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [savingsFrequency, setSavingsFrequency] = useState<'daily' | 'weekly'>('daily');

    const getActiveUserId = useCallback(async (): Promise<string | null> => {
        if (userId) return userId;
        const { data } = await supabase.auth.getSession();
        const activeId = data?.session?.user?.id || null;
        if (activeId) {
            setUserId(activeId);
        }
        return activeId;
    }, [userId]);

    // Fetch transactions
    const fetchTransactions = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('ts_finance')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_date', null)
            .order('finance_date', { ascending: false });

        if (error) {
            console.error("[useFinanceStore] fetchTransactions error:", error);
        } else if (data) {
            const mapped = data.map(row => ({
                id: row.id,
                type: row.type,
                categoryId: row.category,
                amount: Number(row.amount),
                note: row.note || '',
                createdAt: new Date(row.created_date),
                accountId: row.account_id,
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

    const fetchSubscriptions = useCallback(async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('ts_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'Active');

        if (error) {
            console.error("Error fetching subscriptions:", error);
        } else if (data) {
            setSubscriptions(data.map(row => ({
                id: row.id,
                name: row.name,
                amount: Number(row.amount),
                dueDay: row.due_day,
                categoryId: row.category_id,
                emoji: row.emoji,
                lastPaidDate: row.last_paid_date ? new Date(row.last_paid_date) : null,
            })));
        }
    }, [userId]);

    const fetchAccounts = useCallback(async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('ts_accounts')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_date', null);

        if (error) {
            console.error("Error fetching accounts:", error);
        } else if (data) {
            setAccounts(data.map(row => ({
                id: row.id,
                name: row.name,
                emoji: row.emoji,
                balance: Number(row.balance),
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
            // Auto Seed if empty
            if (data.length === 0) {
                const seedData = [
                    ...EXPENSE_CATEGORIES.map(c => ({ user_id: userId, type: 'expense', label: c.label, icon: c.icon, color: c.color })),
                    ...INCOME_CATEGORIES.map(c => ({ user_id: userId, type: 'income', label: c.label, icon: c.icon, color: c.color }))
                ];
                
                const { error: seedError } = await supabase.from('ts_categories').insert(seedData);
                if (seedError) {
                    console.error("Error seeding categories:", seedError);
                } else {
                    return fetchCustomCategories();
                }
            }

            const val = await AsyncStorage.getItem(`deleted_cats_${userId}`);
            const deletedIds = val ? JSON.parse(val) : [];

            const expense = data.filter(c => c.type === 'expense' && !deletedIds.includes(c.id)).map(c => ({
                id: c.id,
                label: c.label,
                icon: c.icon,
                color: c.color
            }));
            const income = data.filter(c => c.type === 'income' && !deletedIds.includes(c.id)).map(c => ({
                id: c.id,
                label: c.label,
                icon: c.icon,
                color: c.color
            }));

            setExpenseCategories(expense);
            setIncomeCategories(income);
        }
    }, [userId]);

    // Initial load userId and listen to auth changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                setUserId(null);
                setIsLoading(false);
            }
        });

        const loadUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUserId(session.user.id);
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("[useFinanceStore] loadUser error:", error);
                setIsLoading(false);
            }
        };
        loadUser();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Initial fetch on userId change
    useEffect(() => {
        if (userId) {
            const initialFetch = async () => {
                setGlobalLoading(true);
                await Promise.all([
                    fetchTransactions(),
                    fetchBudgets(),
                    fetchSubscriptions(),
                    fetchCustomCategories(),
                    AsyncStorage.getItem(`savings_freq_${userId}`).then(val => {
                        if (val === 'daily' || val === 'weekly') setSavingsFrequency(val);
                    }),
                    fetchAccounts()
                ]);
                setGlobalLoading(false);
            };
            initialFetch();
        }
    }, [userId, fetchTransactions, fetchBudgets, fetchSubscriptions, fetchCustomCategories, fetchAccounts, setGlobalLoading]);

    // Handle frequency change persistence
    const updateSavingsFrequency = useCallback((freq: 'daily' | 'weekly') => {
        setSavingsFrequency(freq);
        if (userId) {
            AsyncStorage.setItem(`savings_freq_${userId}`, freq);
        }
    }, [userId]);

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

        const subChannel = supabase
            .channel('subscriptions-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ts_subscriptions',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    fetchSubscriptions();
                }
            )
            .subscribe();

        const accountChannel = supabase
            .channel('accounts-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ts_accounts',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    fetchAccounts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(catChannel);
            supabase.removeChannel(subChannel);
            supabase.removeChannel(accountChannel);
        };
    }, [userId, fetchBudgets, fetchCustomCategories, fetchSubscriptions, fetchAccounts]);

    const getCategoryById = useCallback((categoryId: string): Category | undefined => {
        if (categoryId === 'transfer') {
            return { id: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline', color: '#3B82F6' };
        }
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
        accountId?: string,
    ) => {
        const uid = await getActiveUserId();
        if (!uid) {
            alert("Sesi login kamu tidak terdeteksi. Silakan logout & login kembali di Profile.");
            return undefined;
        }
        setGlobalLoading(true);
        try {
            const { data, error } = await supabase
                .from('ts_finance')
                .insert([{
                    user_id: uid,
                    type: type,
                    category: categoryId,
                    amount: amount,
                    note: note,
                    finance_date: new Date().toISOString().split('T')[0],
                    account_id: accountId,
                }])
                .select()
                .single();

            if (data) {
                const tx: Transaction = {
                    id: data.id,
                    type: data.type,
                    categoryId: data.category,
                    amount: Number(data.amount),
                    note: data.note || '',
                    createdAt: new Date(data.created_date),
                    accountId: data.account_id,
                };
                setTransactions(prev => [tx, ...prev]);

                // Deduct or add balance to account
                if (accountId) {
                    const acc = accounts.find(a => a.id === accountId);
                    if (acc) {
                        const newBalance = type === 'income' ? acc.balance + amount : acc.balance - amount;
                        await supabase.from('ts_accounts').update({ balance: newBalance }).eq('id', accountId);
                        fetchAccounts(); // Refresh locally
                    }
                }

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
                return tx.id;
            }
        } catch (error) {
            console.error("Error inserting transaction:", error);
            alert("Gagal menyimpan transaksi");
        } finally {
            setGlobalLoading(false);
        }
    }, [userId, getCategoryById, budgets, transactions, accounts, setGlobalLoading]);

    const addTransfer = useCallback(async (
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        note: string
    ) => {
        if (!userId) return;
        setGlobalLoading(true);
        try {
            const fromAcc = accounts.find(a => a.id === fromAccountId);
            const toAcc = accounts.find(a => a.id === toAccountId);
            const fromName = fromAcc?.name || 'Kantong Asal';
            const toName = toAcc?.name || 'Kantong Tujuan';

            let transferCat = expenseCategories.find(c => c.label === 'Transfer') || incomeCategories.find(c => c.label === 'Transfer');
            
            if (!transferCat) {
                const { data: newCat, error: catError } = await supabase
                    .from('ts_categories')
                    .insert([{
                        user_id: userId,
                        type: 'expense',
                        label: 'Transfer',
                        icon: 'swap-horizontal-outline',
                        color: '#3B82F6'
                    }])
                    .select()
                    .single();
                    
                if (catError) throw catError;
                transferCat = newCat;
                fetchCustomCategories(); 
            }
            
            const transferCatId = transferCat?.id;
            if (!transferCatId) return;

            // 1. Expense transaction from source account
            const { data: expData, error: expError } = await supabase
                .from('ts_finance')
                .insert([{
                    user_id: userId,
                    type: 'expense',
                    category: transferCatId,
                    amount: amount,
                    note: note || `Transfer ke ${toName}`,
                    finance_date: new Date().toISOString().split('T')[0],
                    account_id: fromAccountId,
                }])
                .select()
                .single();

            if (expError) throw expError;

            // 2. Income transaction to destination account
            const { data: incData, error: incError } = await supabase
                .from('ts_finance')
                .insert([{
                    user_id: userId,
                    type: 'income',
                    category: transferCatId,
                    amount: amount,
                    note: note || `Transfer dari ${fromName}`,
                    finance_date: new Date().toISOString().split('T')[0],
                    account_id: toAccountId,
                }])
                .select()
                .single();

            if (incError) throw incError;

            // 3. Update source pocket balance
            if (fromAcc) {
                await supabase
                    .from('ts_accounts')
                    .update({ balance: fromAcc.balance - amount })
                    .eq('id', fromAccountId);
            }

            // 4. Update destination pocket balance
            if (toAcc) {
                await supabase
                    .from('ts_accounts')
                    .update({ balance: toAcc.balance + amount })
                    .eq('id', toAccountId);
            }

            // Refresh transactions & accounts locally
            await Promise.all([fetchTransactions(), fetchAccounts()]);
        } catch (error) {
            console.error("Error inserting transfer:", error);
            alert("Gagal melakukan transfer");
        } finally {
            setGlobalLoading(false);
        }
    }, [userId, accounts, fetchTransactions, fetchAccounts, setGlobalLoading]);

    const deleteTransaction = useCallback(async (id: string) => {
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_finance')
                .update({ 
                    deleted_date: new Date().toISOString(),
                    status: 'Inactive'
                })
                .eq('id', id);

            if (error) throw error;
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error("Error soft-deleting transaction:", error);
            alert("Gagal menghapus transaksi");
        } finally {
            setGlobalLoading(false);
        }
    }, [setGlobalLoading]);

    const addCategory = useCallback(async (type: TransactionType, category: Omit<Category, 'id'>): Promise<boolean> => {
        const uid = await getActiveUserId();
        if (!uid) {
            alert("Sesi login kamu tidak terdeteksi. Silakan logout & login kembali di Profile.");
            return false;
        }
        setGlobalLoading(true);
        try {
            const { data, error } = await supabase
                .from('ts_categories')
                .insert([{
                    user_id: uid,
                    type: type,
                    label: category.label,
                    icon: category.icon,
                    color: category.color
                }])
                .select()
                .single();

            if (error) throw error;
            fetchCustomCategories();
            return true;
        } catch (error) {
            console.error("Error adding category:", error);
            alert("Gagal menyimpan kategori");
            return false;
        } finally {
            setGlobalLoading(false);
        }
    }, [getActiveUserId, fetchCustomCategories, setGlobalLoading]);

    const deleteCategory = useCallback(async (id: string, type: TransactionType) => {
        if (!userId) return;
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_categories')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;
            if (type === 'expense') {
                setExpenseCategories(prev => prev.filter(c => c.id !== id));
            } else {
                setIncomeCategories(prev => prev.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error("Error deleting category:", error);
            alert("Gagal menghapus kategori");
        } finally {
            setGlobalLoading(false);
        }
    }, [userId, setGlobalLoading]);

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
        setGlobalLoading(true);
        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            const { data: existing } = await supabase
                .from('ts_budget')
                .select('id')
                .eq('user_id', userId)
                .eq('category_id', categoryId)
                .eq('month', month)
                .eq('year', year)
                .maybeSingle();

            if (existing) {
                await supabase.from('ts_budget').update({ amount }).eq('id', existing.id);
            } else {
                await supabase.from('ts_budget').insert([{
                    user_id: userId,
                    category_id: categoryId,
                    amount, month, year
                }]);
            }
            fetchBudgets();
        } catch (error) {
            console.error("Error setting budget:", error);
            alert("Gagal menyimpan budget");
        } finally {
            setGlobalLoading(false);
        }
    }, [userId, fetchBudgets, setGlobalLoading]);

    const getBudgetForCategory = useCallback((categoryId: string) => {
        return budgets.find(b => b.categoryId === categoryId);
    }, [budgets]);

    const addSubscription = useCallback(async (sub: Omit<Subscription, 'id'>) => {
        if (!userId) return;
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_subscriptions')
                .insert([{
                    user_id: userId,
                    name: sub.name,
                    amount: sub.amount,
                    due_day: sub.dueDay,
                    category_id: sub.categoryId,
                    emoji: sub.emoji,
                }]);
            if (error) throw error;
            fetchSubscriptions();
        } catch (error) {
            console.error("Error adding subscription:", error);
            alert("Gagal menambah tagihan");
        } finally {
            setGlobalLoading(false);
        }
    }, [userId, fetchSubscriptions, setGlobalLoading]);

    const deleteSubscription = useCallback(async (id: string) => {
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_subscriptions')
                .update({ status: 'Inactive' })
                .eq('id', id);
            if (error) throw error;
            setSubscriptions(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error("Error deleting subscription:", error);
            alert("Gagal menghapus tagihan");
        } finally {
            setGlobalLoading(false);
        }
    }, [setGlobalLoading]);

    const markSubAsPaid = useCallback(async (id: string) => {
        const sub = subscriptions.find(s => s.id === id);
        if (!sub || !userId) return;
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_subscriptions')
                .update({ last_paid_date: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            await addTransaction('expense', sub.categoryId || 'tagihan', sub.amount, `Bayar Tagihan: ${sub.name}`);
            fetchSubscriptions();
        } catch (error) {
            console.error("Error marking sub as paid:", error);
            alert("Gagal update status bayar");
        } finally {
            setGlobalLoading(false);
        }
    }, [subscriptions, userId, addTransaction, fetchSubscriptions, setGlobalLoading]);

    const addAccount = useCallback(async (name: string, emoji: string, initialBalance: number): Promise<boolean> => {
        const uid = await getActiveUserId();
        if (!uid) {
            alert("Sesi login kamu tidak terdeteksi. Silakan logout & login kembali di Profile.");
            return false;
        }
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_accounts')
                .insert([{
                    user_id: uid,
                    name,
                    emoji,
                    balance: initialBalance
                }]);
            if (error) throw error;
            fetchAccounts();
            return true;
        } catch (error) {
            console.error("Error adding account:", error);
            alert("Gagal menyimpan dompet/akun");
            return false;
        } finally {
            setGlobalLoading(false);
        }
    }, [getActiveUserId, fetchAccounts, setGlobalLoading]);

    const deleteAccount = useCallback(async (id: string) => {
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_accounts')
                .update({ deleted_date: new Date().toISOString(), status: 'Inactive' })
                .eq('id', id);
            if (error) throw error;
            setAccounts(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error deleting account:", error);
            alert("Gagal menghapus dompet/akun");
        } finally {
            setGlobalLoading(false);
        }
    }, [setGlobalLoading]);

    const updateAccount = useCallback(async (id: string, name: string, emoji: string) => {
        if (!userId) return;
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_accounts')
                .update({ name, emoji, modif_date: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', userId);
            if (error) throw error;
            fetchAccounts();
        } catch (error) {
            console.error("Error updating account:", error);
            alert("Gagal memperbarui dompet/akun");
        } finally {
            setGlobalLoading(false);
        }
    }, [userId, fetchAccounts, setGlobalLoading]);

    // Derived stats
    const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income' && getCategoryById(t.categoryId)?.label !== 'Transfer').reduce((sum, t) => sum + t.amount, 0), [transactions, getCategoryById]);
    const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense' && getCategoryById(t.categoryId)?.label !== 'Transfer').reduce((sum, t) => sum + t.amount, 0), [transactions, getCategoryById]);
    
    // Total Balance = Sum of all active account balances
    const balance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

    const savingsTarget = useMemo(() => {
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const today = now.getDate();
            const remainingDays = Math.max(1, daysInMonth - today + 1);

            const unpaidSubs = subscriptions.filter(s => {
                if (!s.lastPaidDate) return true;
                const lp = new Date(s.lastPaidDate);
                return lp.getMonth() !== currentMonth || lp.getFullYear() !== currentYear;
            });

            const totalUnpaid = unpaidSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const weeksRemaining = Math.max(1, Math.ceil(remainingDays / 7));
            const calculatedTarget = savingsFrequency === 'daily' ? totalUnpaid / remainingDays : totalUnpaid / weeksRemaining;

            return {
                totalUnpaid,
                amount: calculatedTarget,
                frequency: savingsFrequency,
                unpaidCount: unpaidSubs.length,
                unpaidList: unpaidSubs,
            };
        } catch (error) {
            return { totalUnpaid: 0, amount: 0, frequency: savingsFrequency, unpaidCount: 0, unpaidList: [] };
        }
    }, [subscriptions, savingsFrequency]);

    const refreshAll = useCallback(async () => {
        setGlobalLoading(true);
        await Promise.all([
            fetchTransactions(),
            fetchBudgets(),
            fetchSubscriptions(),
            fetchCustomCategories(),
            fetchAccounts()
        ]);
        setGlobalLoading(false);
    }, [fetchTransactions, fetchBudgets, fetchSubscriptions, fetchCustomCategories, fetchAccounts, setGlobalLoading]);

    return {
        transactions, budgets, insights, expenseCategories, incomeCategories, accounts, totalIncome, totalExpense, balance, isLoading, subscriptions, savingsTarget,
        addTransaction, addTransfer, deleteTransaction, addCategory, deleteCategory, getCategoryById,
        refreshTransactions: fetchTransactions, fetchBudgets, setBudget, getBudgetForCategory,
        addSubscription, deleteSubscription, markSubAsPaid, savingsFrequency, updateSavingsFrequency,
        addAccount, deleteAccount, fetchAccounts, updateAccount, refreshAll
    };
}

// ─── Shared Context ───────────────────────────────────────────────────────────

type FinanceStoreValue = ReturnType<typeof useFinanceStoreInternal>;

const FinanceStoreContext = createContext<FinanceStoreValue | null>(null);

export function FinanceStoreProvider({ children }: { children: ReactNode }) {
    const store = useFinanceStoreInternal();
    return createElement(FinanceStoreContext.Provider, { value: store }, children);
}

export function useFinanceStore(): FinanceStoreValue {
    const ctx = useContext(FinanceStoreContext);
    if (!ctx) throw new Error('[Taksly] useFinanceStore must be used inside <FinanceStoreProvider>');
    return ctx;
}
