import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../theme/ThemeContext';
import { useFinanceStore } from '../../../features/finance/useFinanceStore';
import { scheduleWishlistReminder } from '../../../lib/notification';

// Components
import { SummaryBanner } from '../../../components/wishlist/SummaryBanner';
import { SortControls } from '../../../components/wishlist/SortControls';
import WishlistItemCard from '../../../components/wishlist/WishlistItemCard';
import { AddWishlistModal } from '../../../components/wishlist/AddWishlistModal';
import { ConfettiLayer } from '../../../components/wishlist/Confetti';
import { WishlistInsightCard } from '../../../components/wishlist/WishlistInsightCard';
import { useWishlistInsights } from '../../../hooks/useWishlistInsights';

// Hooks & Utils
import { 
    useWishlistUtils, 
    WishlistItem, 
    Priority, 
    SortKey, 
    PRIORITY_ORDER 
} from '../../../hooks/useWishlistUtils';

export default function Wishlist() {
    const theme = useTheme();
    const { addTransaction, totalIncome, totalExpense } = useFinanceStore();
    const { formatIDR } = useWishlistUtils();

    // ── State ──
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('priority');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [customFundId, setCustomFundId] = useState<string | null>(null);
    const [confettiFor, setConfettiFor] = useState<string | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [history, setHistory] = useState<Record<string, any[]>>({});
    const [lastAction, setLastAction] = useState<{ id: string; amount: number; historyId: string } | null>(null);

    const { itemInsights, globalInsights } = useWishlistInsights(wishlist);

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('ts_wishlist')
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_date', null)
                .order('created_date', { ascending: false });

            if (error) throw error;
            
            const mapped: WishlistItem[] = (data || []).map(item => ({
                id: item.id,
                name: item.name,
                targetPrice: item.target_price,
                currentSaved: item.current_saved,
                targetDate: item.target_date,
                category: item.category,
                priority: item.priority as Priority,
                reasoning: item.reasoning,
                emoji: item.emoji,
            }));
            
            setWishlist(mapped);
            await fetchHistory();
        } catch (error: any) {
            console.error('Fetch wishlist error:', error.message);
            Alert.alert('Error', 'Failed to fetch wishlist');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('ts_wishlist_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const historyMap: Record<string, any[]> = {};
            (data || []).forEach(h => {
                if (!historyMap[h.wishlist_id]) historyMap[h.wishlist_id] = [];
                historyMap[h.wishlist_id].push(h);
            });
            setHistory(historyMap);
        } catch (err) {
            console.error('Fetch history error:', err);
        }
    };

    const { totalTarget, totalSaved, overallPct } = useMemo(() => {
        const target = wishlist.reduce((s, i) => s + i.targetPrice, 0);
        const saved = wishlist.reduce((s, i) => s + i.currentSaved, 0);
        return {
            totalTarget: target,
            totalSaved: saved,
            overallPct: target > 0 ? Math.min(1, saved / target) : 0,
        };
    }, [wishlist]);

    const sortedWishlist = useMemo(() => {
        if (sortKey === 'priority') {
             return [...wishlist].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        }
        if (sortKey === 'progress') {
             return [...wishlist].sort((a, b) => (b.currentSaved / b.targetPrice) - (a.currentSaved / a.targetPrice));
        }
        if (sortKey === 'date') {
             return [...wishlist].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
        }
        return wishlist;
    }, [wishlist, sortKey]);

    const handleAddFunds = useCallback(async (id: string, amount: number) => {
        const item = wishlist.find(i => i.id === id);
        if (!item) return;

        const nextSaved = Math.min(item.targetPrice, item.currentSaved + amount);
        const originalWishlist = [...wishlist];

        setWishlist(prev => prev.map(i => {
            if (i.id !== id) return i;
            if (nextSaved >= i.targetPrice && i.currentSaved < i.targetPrice) {
                setConfettiFor(id);
                setTimeout(() => setConfettiFor(null), 3000);
            }
            return { ...i, currentSaved: nextSaved };
        }));

        setLoadingId(id);
        try {
            const { error } = await supabase
                .from('ts_wishlist')
                .update({ 
                    current_saved: nextSaved,
                    modif_date: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Audit history
            const { data: hData, error: hError } = await supabase
                .from('ts_wishlist_history')
                .insert([{
                    wishlist_id: id,
                    amount,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }])
                .select();
            
            if (!hError && hData) {
                setHistory(prev => ({
                    ...prev,
                    [id]: [hData[0], ...(prev[id] || [])]
                }));
                // Set for Undo (5 second window)
                setLastAction({ id, amount, historyId: hData[0].id });
                setTimeout(() => setLastAction(null), 8000);
            }

            await addTransaction('expense', 'wishlist', amount, `Nabung buat ${item.name} ${item.emoji}`);
        } catch (err: any) {
            setWishlist(originalWishlist);
            Alert.alert('Failed to save', err.message);
        } finally {
            setLoadingId(null);
        }
    }, [wishlist, addTransaction, history]);

    const handleDeleteItem = useCallback(async (id: string) => {
        Alert.alert('Delete Goal', 'Are you sure you want to delete this wishlist item?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    const original = [...wishlist];
                    setWishlist(prev => prev.filter(i => i.id !== id));
                    try {
                        const { error } = await supabase
                            .from('ts_wishlist')
                            .update({ 
                                deleted_date: new Date().toISOString(),
                                status: 'Inactive'
                            })
                            .eq('id', id);
                        if (error) throw error;
                    } catch (err: any) {
                        setWishlist(original);
                        Alert.alert('Failed to delete', err.message);
                    }
                }
            }
        ]);
    }, [wishlist]);

    const handleAddItem = async (payload: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Please try logging in again');

            const { data, error } = await supabase
                .from('ts_wishlist')
                .insert([{
                    ...payload,
                    user_id: user.id,
                    current_saved: 0,
                    created_by: user.email,
                    order_index: wishlist.length,
                }])
                .select();

            if (error) throw error;

            if (data) {
                const newItem: WishlistItem = {
                    id: data[0].id,
                    name: data[0].name,
                    targetPrice: data[0].target_price,
                    currentSaved: data[0].current_saved,
                    targetDate: data[0].target_date,
                    category: data[0].category,
                    priority: data[0].priority as Priority,
                    reasoning: data[0].reasoning,
                    emoji: data[0].emoji,
                };
                setWishlist(prev => [newItem, ...prev]);
                await scheduleWishlistReminder(newItem.id, newItem.name, newItem.targetDate, newItem.emoji);
            }
        } catch (err: any) {
            Alert.alert('Failed to add', err.message);
        }
    };

    const handleUndo = async () => {
        if (!lastAction) return;
        const { id, amount, historyId } = lastAction;
        
        try {
            setLoadingId(id);
            // 1. Revert wishlist total
            const item = wishlist.find(i => i.id === id);
            if (item) {
                const revertedSaved = Math.max(0, item.currentSaved - amount);
                await supabase
                    .from('ts_wishlist')
                    .update({ current_saved: revertedSaved })
                    .eq('id', id);
                
                setWishlist(prev => prev.map(i => i.id === id ? { ...i, currentSaved: revertedSaved } : i));
            }

            // 2. Delete history entry
            await supabase.from('ts_wishlist_history').delete().eq('id', historyId);
            setHistory(prev => ({
                ...prev,
                [id]: (prev[id] || []).filter(h => h.id !== historyId)
            }));

            setLastAction(null);
        } catch (err) {
            console.error('Undo failed:', err);
        } finally {
            setLoadingId(null);
        }
    };

    const accentColor = theme.colors.primary ?? '#0A84FF';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient
                colors={[accentColor + '1A', theme.colors.background, theme.colors.background]}
                style={styles.bgGlow}
            />

            {confettiFor && <ConfettiLayer />}

            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.headerLeft}>
                    <LinearGradient colors={['#FF6B6B', '#FF453A']} style={styles.headerIconBg}>
                        <Ionicons name="heart" size={20} color="#FFF" />
                    </LinearGradient>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>My Wishlist</Text>
                        <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
                            {wishlist.length} goals · {Math.round(overallPct * 100)}% funded
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            {loading && wishlist.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchWishlist();
                            }}
                            tintColor={accentColor}
                        />
                    }
                >
                    <SummaryBanner 
                        totalSaved={totalSaved} 
                        totalTarget={totalTarget} 
                        overallPct={overallPct} 
                        accentColor={accentColor} 
                    />
                    <SortControls 
                        sortKey={sortKey} 
                        setSortKey={setSortKey} 
                        accentColor={accentColor} 
                        theme={theme} 
                    />

                    <WishlistInsightCard insights={globalInsights} theme={theme} />

                    {lastAction && (
                        <View style={[styles.undoSnackbar, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}>
                            <Text style={[styles.undoText, { color: theme.colors.textPrimary }]}>
                                Added {formatIDR(lastAction.amount)}
                            </Text>
                            <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
                                <Text style={[styles.undoBtnText, { color: theme.colors.primary }]}>UNDO</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {sortedWishlist.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="gift-outline" size={72} color={theme.colors.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Start Dreaming!</Text>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                                Add your first dream item and start tracking your savings.
                            </Text>
                            <TouchableOpacity
                                style={[styles.emptyBtn, { borderColor: accentColor }]}
                                onPress={() => setShowAddModal(true)}
                            >
                                <Ionicons name="add-circle-outline" size={18} color={accentColor} />
                                <Text style={[styles.emptyBtnText, { color: accentColor }]}>Add First Item</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        sortedWishlist.map(item => (
                            <WishlistItemCard
                                key={item.id}
                                item={item}
                                accentColor={accentColor}
                                theme={theme}
                                isExpanded={expandedId === item.id}
                                onToggleExpand={id => setExpandedId(expandedId === id ? null : id)}
                                onAddFunds={handleAddFunds}
                                onDelete={handleDeleteItem}
                                isCustomFunding={customFundId === item.id}
                                onToggleCustomFund={id => setCustomFundId(customFundId === id ? null : id)}
                                loadingId={loadingId}
                                monthlyIncome={totalIncome}
                                monthlyExpenses={totalExpense}
                                insight={itemInsights[item.id]}
                                history={history[item.id] || []}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            <AddWishlistModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddItem}
                accentColor={accentColor}
                theme={theme}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    bgGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    headerSub: { fontSize: 12 },
    addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', elevation: 6 },
    scrollView: { flex: 1 },
    listContent: { padding: 16, gap: 14, paddingBottom: 100 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
    emptyTitle: { fontSize: 22, fontWeight: '800' },
    emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
    emptyBtnText: { fontWeight: '700', fontSize: 15 },
    undoSnackbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    undoText: { fontSize: 13, fontWeight: '600' },
    undoBtn: { paddingHorizontal: 12, paddingVertical: 4 },
    undoBtnText: { fontSize: 13, fontWeight: '800' },
});