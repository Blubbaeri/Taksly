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
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../theme/ThemeContext';
import { useFinanceStore } from '../../../features/finance/useFinanceStore';
import { scheduleWishlistReminder } from '../../../lib/notification';
import { useLoading } from '../../context/LoadingContext';

// Components
import { SummaryBanner } from '../../../components/wishlist/SummaryBanner';
import { SortControls } from '../../../components/wishlist/SortControls';
import WishlistItemCard from '../../../components/wishlist/WishlistItemCard';
import { AddWishlistModal } from '../../../components/wishlist/AddWishlistModal';
import { EditWishlistModal } from '../../../components/wishlist/EditWishlistModal';
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
    const { setGlobalLoading } = useLoading();
    const { addTransaction, deleteTransaction, totalIncome, totalExpense, accounts } = useFinanceStore();
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
    const [lastAction, setLastAction] = useState<{ id: string; amount: number; historyId: string; transactionId?: string } | null>(null);
    
    // Pocket selection
    const [pendingFund, setPendingFund] = useState<{ itemId: string; amount: number } | null>(null);
    const [showPocketModal, setShowPocketModal] = useState(false);
    const [customFundAmount, setCustomFundAmount] = useState('');
    const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const { itemInsights, globalInsights } = useWishlistInsights(wishlist);

    useEffect(() => {
        fetchWishlist(true);
    }, []);

    const fetchWishlist = async (withGlobal = false) => {
        try {
            if (withGlobal) setGlobalLoading(true);
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
                status: item.status || 'Active',
            }));
            
            setWishlist(mapped);
            await fetchHistory();
        } catch (error: any) {
            console.error('Fetch wishlist error:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
            if (withGlobal) setGlobalLoading(false);
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

    const handleAddFunds = useCallback(async (id: string, amount: number, accountId?: string) => {
        const item = wishlist.find(i => i.id === id);
        if (!item) return;

        setGlobalLoading(true);
        const nextSaved = Math.min(item.targetPrice, item.currentSaved + amount);
        const originalWishlist = [...wishlist];
        const willComplete = nextSaved >= item.targetPrice && item.currentSaved < item.targetPrice;

        setWishlist(prev => prev.map(i => i.id !== id ? i : { ...i, currentSaved: nextSaved }));

        if (willComplete) {
            setConfettiFor(id);
            setTimeout(() => setConfettiFor(null), 3000);
        }

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

            const transactionId = await addTransaction('expense', 'wishlist', amount, `Nabung buat ${item.name} ${item.emoji}`, accountId);

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
                setLastAction({ id, amount, historyId: hData[0].id, transactionId });
                setTimeout(() => setLastAction(null), 8000);
            }
        } catch (err: any) {
            setWishlist(originalWishlist);
            Alert.alert('Failed to save', err.message);
        } finally {
            setLoadingId(null);
            setGlobalLoading(false);
        }
    }, [wishlist, addTransaction, history, setGlobalLoading]);

    const handleDeleteItem = useCallback(async (id: string) => {
        Alert.alert('Delete Goal', 'Are you sure you want to delete this wishlist item?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    setGlobalLoading(true);
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
                    } finally {
                        setGlobalLoading(false);
                    }
                }
            }
        ]);
    }, [wishlist, setGlobalLoading]);

    const handleToggleStatus = useCallback(async (id: string, currentStatus?: 'Active' | 'Paused') => {
        const nextStatus = currentStatus === 'Paused' ? 'Active' : 'Paused';
        setGlobalLoading(true);
        const original = [...wishlist];
        setWishlist(prev => prev.map(i => i.id === id ? { ...i, status: nextStatus } : i));
        try {
            const { error } = await supabase
                .from('ts_wishlist')
                .update({ 
                    status: nextStatus,
                    modif_date: new Date().toISOString()
                })
                .eq('id', id);
            if (error) throw error;
        } catch (err: any) {
            setWishlist(original);
            Alert.alert('Failed to update status', err.message);
        } finally {
            setGlobalLoading(false);
        }
    }, [wishlist, setGlobalLoading]);

    const handleAddItem = async (payload: any) => {
        setGlobalLoading(true);
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
        } finally {
            setGlobalLoading(false);
        }
    };
    const handleEditItem = async (id: string, payload: any, diffAmount: number, splits?: { accountId: string; amount: number }[]) => {
        setGlobalLoading(true);
        try {
            const { error } = await supabase
                .from('ts_wishlist')
                .update({
                    name: payload.name,
                    target_price: payload.target_price,
                    target_date: payload.target_date,
                    category: payload.category,
                    priority: payload.priority,
                    reasoning: payload.reasoning,
                    emoji: payload.emoji,
                    current_saved: payload.current_saved,
                    modif_date: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            if (diffAmount !== 0 && splits && splits.length > 0) {
                const txType = diffAmount > 0 ? 'expense' : 'income';
                
                for (const split of splits) {
                    if (split.amount <= 0) continue;
                    const note = diffAmount > 0 
                        ? `Tambahan tabungan buat ${payload.name} ${payload.emoji}` 
                        : `Kembalian tabungan buat ${payload.name} ${payload.emoji}`;
                    
                    await addTransaction(txType, 'wishlist', split.amount, note, split.accountId);
                }

                // Add to history
                await supabase
                    .from('ts_wishlist_history')
                    .insert([{
                        wishlist_id: id,
                        amount: diffAmount,
                        user_id: (await supabase.auth.getUser()).data.user?.id
                    }]);
            }

            // Reload wishlist and history to ensure everything is perfectly synced
            await fetchWishlist();
        } catch (err: any) {
            Alert.alert('Failed to update', err.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleUndo = async () => {
        if (!lastAction) return;
        const { id, amount, historyId, transactionId } = lastAction;
        
        setGlobalLoading(true);
        try {
            setLoadingId(id);
            const item = wishlist.find(i => i.id === id);
            if (item) {
                const revertedSaved = Math.max(0, item.currentSaved - amount);
                await supabase
                    .from('ts_wishlist')
                    .update({ current_saved: revertedSaved })
                    .eq('id', id);
                
                setWishlist(prev => prev.map(i => i.id === id ? { ...i, currentSaved: revertedSaved } : i));
            }

            await supabase.from('ts_wishlist_history').delete().eq('id', historyId);
            setHistory(prev => ({
                ...prev,
                [id]: (prev[id] || []).filter(h => h.id !== historyId)
            }));

            if (transactionId) {
                await deleteTransaction(transactionId);
            }

            setLastAction(null);
        } catch (err) {
            console.error('Undo failed:', err);
        } finally {
            setLoadingId(null);
            setGlobalLoading(false);
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
                                onAddFunds={async (id, amount) => {
                                    if (accounts && accounts.length > 0) {
                                        setPendingFund({ itemId: id, amount });
                                        setShowPocketModal(true);
                                    } else {
                                        await handleAddFunds(id, amount);
                                    }
                                }}
                                onDelete={handleDeleteItem}
                                isCustomFunding={customFundId === item.id}
                                onToggleCustomFund={id => setCustomFundId(customFundId === id ? null : id)}
                                loadingId={loadingId}
                                monthlyIncome={totalIncome}
                                monthlyExpenses={totalExpense}
                                insight={itemInsights[item.id]}
                                history={history[item.id] || []}
                                onToggleStatus={handleToggleStatus}
                                onEditPress={(itemToEdit) => {
                                    setEditingItem(itemToEdit);
                                    setShowEditModal(true);
                                }}
                            />
                        ))
                    )}
                </ScrollView>
            )}

            {/* Modal Pilih Kantong */}
            <Modal
                visible={showPocketModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    setShowPocketModal(false);
                    setPendingFund(null);
                    setCustomFundAmount('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalDismiss} 
                        activeOpacity={1} 
                        onPress={() => {
                            setShowPocketModal(false);
                            setPendingFund(null);
                            setCustomFundAmount('');
                        }} 
                    />
                    <View style={[styles.pocketModalContent, { backgroundColor: theme.colors.card }]}>
                        <View style={styles.pocketHeaderRow}>
                            <Text style={[styles.pocketTitle, { color: theme.colors.textPrimary }]}>
                                Pilih Sumber Dana
                            </Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setShowPocketModal(false);
                                    setPendingFund(null);
                                    setCustomFundAmount('');
                                }} 
                                style={styles.closeModalBtn}
                            >
                                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        {pendingFund?.amount === -1 && (
                            <TextInput
                                style={[styles.customInputModal, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                                placeholder="Masukkan nominal custom (Rp)"
                                placeholderTextColor={theme.colors.textSecondary}
                                keyboardType="numeric"
                                autoFocus={true}
                                value={customFundAmount}
                                onChangeText={(val) => {
                                    const clean = val.replace(/\D/g, '');
                                    setCustomFundAmount(clean ? new Intl.NumberFormat('id-ID').format(parseInt(clean)) : '');
                                }}
                            />
                        )}

                        <Text style={[styles.pocketSubtitle, { color: theme.colors.textSecondary, marginTop: pendingFund?.amount === -1 ? 10 : 0 }]}>
                            {pendingFund?.amount === -1 
                                ? "Tentukan nominal dan pilih kantong sumber dana:" 
                                : `Tentukan kantong yang akan dikurangi saldonya sebesar ${pendingFund ? formatIDR(pendingFund.amount) : ''}:`}
                        </Text>

                        <ScrollView style={styles.pocketList} showsVerticalScrollIndicator={false}>
                            {accounts.map(acc => {
                                const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(acc.emoji);
                                const effectiveAmount = pendingFund?.amount === -1 
                                    ? (parseInt(customFundAmount.replace(/\D/g, '')) || 0) 
                                    : (pendingFund?.amount || 0);
                                const isInsufficient = acc.balance < effectiveAmount || effectiveAmount <= 0;

                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        style={[
                                            styles.pocketItem, 
                                            { borderColor: theme.colors.border },
                                            isInsufficient && { opacity: 0.4 }
                                        ]}
                                        disabled={isInsufficient}
                                        onPress={async () => {
                                            if (pendingFund) {
                                                setShowPocketModal(false);
                                                const { itemId } = pendingFund;
                                                setPendingFund(null);
                                                setCustomFundAmount('');
                                                await handleAddFunds(itemId, effectiveAmount, acc.id);
                                            }
                                        }}
                                    >
                                        <View style={[styles.pocketIconBg, { backgroundColor: theme.colors.primary + '15' }]}>
                                            {isEmoji ? (
                                                <Text style={{ fontSize: 18 }}>{acc.emoji || '💰'}</Text>
                                            ) : (
                                                <Ionicons name={(acc.emoji || 'wallet-outline') as any} size={20} color={theme.colors.primary} />
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.pocketName, { color: theme.colors.textPrimary }]}>
                                                {acc.name}
                                            </Text>
                                            <Text style={[styles.pocketBalance, { color: theme.colors.textSecondary }]}>
                                                Saldo: {formatIDR(acc.balance)}
                                            </Text>
                                        </View>
                                        {isInsufficient && effectiveAmount > 0 ? (
                                            <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>
                                                Saldo Kurang
                                            </Text>
                                        ) : (
                                            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <AddWishlistModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddItem}
                accentColor={accentColor}
                theme={theme}
            />

            <EditWishlistModal
                visible={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                }}
                item={editingItem}
                onEdit={handleEditItem}
                accentColor={accentColor}
                theme={theme}
                accounts={accounts}
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalDismiss: {
        flex: 1,
    },
    pocketModalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '70%',
    },
    pocketHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    pocketTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    closeModalBtn: {
        padding: 4,
    },
    pocketSubtitle: {
        fontSize: 13,
        marginBottom: 20,
        lineHeight: 18,
    },
    pocketList: {
        maxHeight: 350,
    },
    pocketItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        gap: 12,
    },
    pocketIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pocketName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    pocketBalance: {
        fontSize: 12,
    },
    customInputModal: {
        height: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
});