import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
    FlatList,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import TransactionSheet from '../../../features/finance/TransactionSheet';
import { useFinanceStore } from '../../../features/finance/useFinanceStore';
import type { Transaction } from '../../../features/finance/useFinanceStore';
import { useTheme } from '../../../theme/ThemeContext';
import { scanReceiptFromCamera, type ScanResult } from '../../../features/finance/scanReceipt';

// Components
import SummaryCard from '../../../components/finance/SummaryCard';
import TransactionItem from '../../../components/finance/TransactionItem';
import { FinanceCharts } from '../../../components/finance/FinanceCharts';
import { BudgetCard } from '../../../components/finance/BudgetCard';
import { BillTrackerCard } from '../../../components/finance/BillTrackerCard';
import { AccountsList } from '../../../components/finance/AccountsList';
import BillManagerModal from '../../../components/finance/BillManagerModal';
import { generateFinancePDF } from '../../../features/finance/FinanceExport';
import { Modal, TextInput } from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRupiahFull = (amount: number): string =>
    `Rp ${amount.toLocaleString('id-ID')}`;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FinanceScreen() {
    const theme = useTheme();
    const router = useRouter();
    const FINANCE_PRIMARY = theme.colors.primary;
    const { 
        transactions, 
        budgets,
        expenseCategories, 
        incomeCategories,
        accounts,
        totalIncome, 
        totalExpense, 
        balance, 
        insights,
        deleteTransaction, 
        getCategoryById, 
        isLoading, 
        addTransaction, 
        addTransfer,
        addCategory,
        setBudget,
        getBudgetForCategory,
        savingsTarget,
    } = useFinanceStore();

    const [sheetVisible, setSheetVisible] = useState(false);
    const [budgetModalVisible, setBudgetModalVisible] = useState(false);
    const [billModalVisible, setBillModalVisible] = useState(false);
    const [selectedCatForBudget, setSelectedCatForBudget] = useState<string | null>(null);
    const [budgetInput, setBudgetInput] = useState('');
    const [ocrResult, setOcrResult] = useState<ScanResult | null>(null);
    const [budgetExpanded, setBudgetExpanded] = useState(false);

    // Bug #11 fix: enable LayoutAnimation once on mount, not on every render
    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    // ─── Optimized Derived State ───
    const { total, incomeRatio } = useMemo(() => {
        const t = totalIncome + totalExpense;
        return {
            total: t,
            incomeRatio: t > 0 ? totalIncome / t : 0,
        };
    }, [totalIncome, totalExpense]);

    const categoryMap = useMemo(() => {
        const map = new Map();
        [...expenseCategories, ...incomeCategories].forEach(c => {
            map.set(c.id, c);
        });
        map.set('transfer', { id: 'transfer', label: 'Transfer', icon: 'swap-horizontal-outline', color: '#3B82F6' });
        return map;
    }, [expenseCategories, incomeCategories]);

    // ─── Handlers ─────────────────
    const handleAddTransaction = useCallback(async (type: any, catId: string, amount: number, note: string, accountId?: string, toAccountId?: string) => {
        if (type === 'transfer') {
            if (accountId && toAccountId) {
                await addTransfer(accountId, toAccountId, amount, note);
            }
        } else {
            await addTransaction(type, catId, amount, note, accountId);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setOcrResult(null); // Clear OCR result after submit
    }, [addTransaction, addTransfer]);

    const handleScanOCR = async () => {
        setOcrResult(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const result = await scanReceiptFromCamera();
        if (result) {
            setOcrResult(result);
            setSheetVisible(true);
        }
    };

    const handleDelete = useCallback((id: string) => {
        Alert.alert(
            'Delete Transaction',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTransaction(id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                }
            ]
        );
    }, [deleteTransaction]);

    // ─── Render Parts ──────────────
    
    const renderHeader = () => (
        <>
            {/* ── Balance Card ── */}
            <View style={[styles.balanceCard, { backgroundColor: FINANCE_PRIMARY }]}>
                <View style={styles.orb1} />
                <View style={styles.orb2} />
                <View style={styles.orb3} />

                <View style={styles.balancePill}>
                    <View style={styles.balancePillDot} />
                    <Text style={styles.balancePillText}>TOTAL BALANCE</Text>
                </View>

                <Text
                    style={[styles.balanceAmount, balance < 0 && { color: '#FCA5A5' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    {formatRupiahFull(balance)}
                </Text>
                <Text style={styles.balanceSub}>
                    {transactions.length === 0 ? 'No transactions yet' : `${transactions.length} transactions recorded`}
                </Text>

                {total > 0 && (
                    <View style={styles.ratioSection}>
                        <View style={styles.ratioBar}>
                            <View style={[styles.ratioIncome, { flex: incomeRatio, backgroundColor: theme.colors.success }]} />
                            <View style={[styles.ratioExpense, { flex: 1 - incomeRatio, backgroundColor: theme.colors.danger }]} />
                        </View>
                        <View style={styles.ratioLabels}>
                            <View style={styles.ratioLabelItem}>
                                <View style={[styles.ratioLabelDot, { backgroundColor: theme.colors.success }]} />
                                <Text style={[styles.ratioLabelText, { color: theme.colors.success }]}>
                                    {Math.round(incomeRatio * 100)}% Income
                                </Text>
                            </View>
                            <View style={styles.ratioLabelItem}>
                                <View style={[styles.ratioLabelDot, { backgroundColor: theme.colors.danger }]} />
                                <Text style={[styles.ratioLabelText, { color: theme.colors.danger }]}>
                                    {Math.round((1 - incomeRatio) * 100)}% Expense
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* ── Accounts / Wallets Section ── */}
            <AccountsList />

            {/* ── Bill Tracker Section ── */}
            <BillTrackerCard 
                amount={savingsTarget.amount}
                frequency={savingsTarget.frequency}
                unpaidCount={savingsTarget.unpaidCount}
                totalUnpaid={savingsTarget.totalUnpaid}
                onPress={() => setBillModalVisible(true)}
            />

            {/* ── AI Advisor Section ── */}
            {insights && insights.length > 0 && (
                <View style={[styles.aiCard, { backgroundColor: theme.colors.card, borderColor: FINANCE_PRIMARY + '30', borderLeftColor: FINANCE_PRIMARY }]}>
                    <View style={styles.aiHeader}>
                        <View style={[styles.aiIconBox, { backgroundColor: FINANCE_PRIMARY + '20' }]}>
                            <Ionicons name="sparkles" size={16} color={FINANCE_PRIMARY} />
                        </View>
                        <Text style={[styles.aiTitle, { color: theme.colors.textPrimary }]}>AI Financial Advisor</Text>
                    </View>
                    <View style={styles.aiContent}>
                        <Text style={[styles.aiMessage, { color: theme.colors.textSecondary }]}>
                            {insights[0].message}
                        </Text>
                    </View>
                </View>
            )}

            {/* ── Summary Cards ── */}
            <View style={styles.summaryRow}>
                <SummaryCard 
                    label="Income" 
                    amount={totalIncome} 
                    iconName="trending-up" 
                    color={theme.colors.success} 
                    bgColor={theme.colors.success + '18'} 
                />
                <SummaryCard 
                    label="Expense" 
                    amount={totalExpense} 
                    iconName="trending-down" 
                    color={theme.colors.danger} 
                    bgColor={theme.colors.danger + '18'} 
                />
            </View>

            {/* ── Finance Charts ── */}
            {transactions.length > 0 && (
                <FinanceCharts 
                    transactions={transactions}
                    expenseCategories={expenseCategories}
                    income={totalIncome}
                    expense={totalExpense}
                />
            )}

            {/* ── Budgeting Section ── */}
            {(() => {
                const activeBudgets = budgets.length;
                const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
                const totalSpent = expenseCategories.reduce((s, cat) => {
                    return s + transactions
                        .filter(t => t.type === 'expense' && t.categoryId === cat.id)
                        .reduce((sum, t) => sum + t.amount, 0);
                }, 0);
                const overallPercent = totalBudgeted > 0 ? Math.min(totalSpent / totalBudgeted, 1) : 0;
                let barColor = theme.colors.success;
                if (overallPercent >= 1) barColor = theme.colors.danger;
                else if (overallPercent >= 0.8) barColor = '#F59E0B';

                return (
                    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                        {/* ── Budget Toggle Button ── */}
                        <TouchableOpacity
                            activeOpacity={0.82}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setBudgetExpanded(p => !p);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={[
                                styles.budgetToggleCard,
                                { backgroundColor: theme.colors.card, borderColor: budgetExpanded ? FINANCE_PRIMARY + '50' : theme.colors.border }
                            ]}
                        >
                            {/* Left: icon + label */}
                            <View style={styles.budgetToggleLeft}>
                                <View style={[styles.budgetToggleIcon, { backgroundColor: FINANCE_PRIMARY + '18' }]}>
                                    <Ionicons name="wallet-outline" size={16} color={FINANCE_PRIMARY} />
                                </View>
                                <View>
                                    <Text style={[styles.budgetToggleLabel, { color: theme.colors.textPrimary }]}>
                                        Budgeting
                                    </Text>
                                    <Text style={[styles.budgetToggleSub, { color: theme.colors.textMuted }]}>
                                        {activeBudgets > 0
                                            ? `${activeBudgets} budget aktif · ${Math.round(overallPercent * 100)}% terpakai`
                                            : 'Belum ada budget diatur'}
                                    </Text>
                                </View>
                            </View>

                            {/* Right: mini progress + chevron */}
                            <View style={styles.budgetToggleRight}>
                                {totalBudgeted > 0 && (
                                    <View style={[styles.budgetMiniBar, { backgroundColor: theme.colors.background }]}>
                                        <View style={[
                                            styles.budgetMiniBarFill,
                                            { width: `${overallPercent * 100}%`, backgroundColor: barColor }
                                        ]} />
                                    </View>
                                )}
                                <Ionicons
                                    name={budgetExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={theme.colors.textMuted}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* ── Expanded Budget Cards ── */}
                        {budgetExpanded && (
                            <View style={{ marginTop: 10 }}>
                                {expenseCategories.map(cat => {
                                    const budget = getBudgetForCategory(cat.id);
                                    const spending = transactions
                                        .filter(t => t.type === 'expense' && t.categoryId === cat.id)
                                        .reduce((sum, t) => sum + t.amount, 0);
                                    return (
                                        <BudgetCard
                                            key={cat.id}
                                            categoryLabel={cat.label}
                                            categoryIcon={cat.icon}
                                            categoryColor={cat.color}
                                            spending={spending}
                                            budgetAmount={budget?.amount || 0}
                                            onSetBudget={() => {
                                                setSelectedCatForBudget(cat.id);
                                                setBudgetInput(budget?.amount?.toString() || '');
                                                setBudgetModalVisible(true);
                                            }}
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </View>
                );
            })()}

            {/* ── Section Header ── */}
            <View style={styles.sectionRow}>
                <View style={styles.sectionLeft}>
                    <View style={[styles.sectionDot, { backgroundColor: FINANCE_PRIMARY }]} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Transaction History</Text>
                </View>
            </View>
        </>
    );

    const renderEmpty = () => (
        <View style={styles.empty}>
            <View style={[styles.emptyBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Ionicons name="card-outline" size={34} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>No transactions yet</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
                Start recording your income and expenses to track your finances!
            </Text>
            <TouchableOpacity 
                style={[styles.emptyAddBtn, { backgroundColor: FINANCE_PRIMARY, borderColor: FINANCE_PRIMARY }]} 
                onPress={() => setSheetVisible(true)}
            >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={[styles.emptyAddText, { color: '#FFF' }]}>Manual Record</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.emptyAddBtn, { backgroundColor: 'transparent', borderColor: FINANCE_PRIMARY }]} 
                onPress={handleScanOCR}
            >
                <Ionicons name="camera-outline" size={18} color={FINANCE_PRIMARY} />
                <Text style={[styles.emptyAddText, { color: FINANCE_PRIMARY }]}>Scan Receipt</Text>
            </TouchableOpacity>
        </View>
    );

    const renderItem = ({ item: tx }: { item: Transaction }) => {
        const cat = categoryMap.get(tx.categoryId);
        return (
            <TransactionItem
                transaction={tx}
                categoryIcon={cat?.icon ?? 'help-outline'}
                categoryLabel={cat?.label ?? 'Others'}
                categoryColor={cat?.color ?? theme.colors.textMuted}
                onDelete={() => handleDelete(tx.id)}
            />
        );
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.headerLeft}>
                    <View style={[styles.headerBadge, { backgroundColor: FINANCE_PRIMARY + '1A', borderColor: FINANCE_PRIMARY + '35' }]}>
                        <Ionicons name="wallet" size={20} color={FINANCE_PRIMARY} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Finance</Text>
                        <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>Monitor your finances</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity 
                        style={[styles.headerExportBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} 
                        onPress={() => router.push('/finance-history')}
                    >
                        <Ionicons name="time-outline" size={18} color={FINANCE_PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.headerExportBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} 
                        onPress={handleScanOCR}
                    >
                        <Ionicons name="camera-outline" size={18} color={FINANCE_PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.headerExportBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} 
                        onPress={() => generateFinancePDF(transactions, categoryMap, { income: totalIncome, expense: totalExpense, balance })}
                    >
                        <Ionicons name="document-text-outline" size={18} color={FINANCE_PRIMARY} />
                    </TouchableOpacity>
                    <View style={[styles.headerCountBadge, { backgroundColor: FINANCE_PRIMARY + '25', borderColor: FINANCE_PRIMARY + '40' }]}>
                        <Text style={[styles.headerCountText, { color: FINANCE_PRIMARY }]}>{transactions.length}</Text>
                    </View>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={FINANCE_PRIMARY} />
                    <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                        Loading financial data...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={<View style={{ height: 120 }} />}
                />
            )}

            {/* ── FAB ── */}
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: FINANCE_PRIMARY, shadowColor: FINANCE_PRIMARY }]} 
                onPress={() => setSheetVisible(true)} 
                activeOpacity={0.85}
            >
                <View style={styles.fabGlow} />
                <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>

            <TransactionSheet
                visible={sheetVisible}
                onClose={() => {
                    setSheetVisible(false);
                    setOcrResult(null);
                }}
                onSubmit={handleAddTransaction}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                accounts={accounts}
                onAddCategory={addCategory}
                initialOCRResult={ocrResult}
            />

            <BillManagerModal 
                visible={billModalVisible}
                onClose={() => setBillModalVisible(false)}
            />

            {/* ── Budget Modal ── */}
            <Modal
                visible={budgetModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setBudgetModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                            Set Budget for {expenseCategories.find(c => c.id === selectedCatForBudget)?.label}
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                            placeholder="Enter budget amount..."
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="numeric"
                            value={budgetInput}
                            onChangeText={setBudgetInput}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: theme.colors.background }]} 
                                onPress={() => setBudgetModalVisible(false)}
                            >
                                <Text style={{ color: theme.colors.textMuted }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: FINANCE_PRIMARY }]} 
                                onPress={async () => {
                                    if (selectedCatForBudget && budgetInput) {
                                        await setBudget(selectedCatForBudget, Number(budgetInput));
                                        setBudgetModalVisible(false);
                                    }
                                }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 13 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 54 : 42,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerBadge: {
        width: 42,
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
    headerSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
    headerCountBadge: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
    },
    headerCountText: { fontSize: 12, fontWeight: '700' },

    listContent: { padding: 16, paddingTop: 20, gap: 7 },

    // Balance Card
    balanceCard: {
        borderRadius: 28,
        padding: 22,
        marginBottom: 14,
        overflow: 'hidden',
        position: 'relative',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.4,
        shadowRadius: 28,
        elevation: 14,
    },
    orb1: {
        position: 'absolute', width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(255,255,255,0.08)', top: -100, right: -70,
    },
    orb2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(0,0,0,0.12)', bottom: -30, left: 30,
    },
    orb3: {
        position: 'absolute', width: 70, height: 70, borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.06)', top: 20, right: 100,
    },
    balancePill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 30, paddingHorizontal: 10, paddingVertical: 5,
        marginBottom: 16,
    },
    balancePillDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
    balancePillText: {
        fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.92)',
        letterSpacing: 1.2, textTransform: 'uppercase',
    },
    balanceAmount: {
        fontSize: 40, fontWeight: '900', color: '#FFFFFF',
        letterSpacing: -1.8, marginBottom: 6,
    },
    balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.48)', fontWeight: '500' },
    ratioSection: {
        marginTop: 18, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)',
    },
    ratioBar: {
        flexDirection: 'row', height: 6, borderRadius: 6,
        overflow: 'hidden', gap: 3, marginBottom: 10,
    },
    ratioIncome: { borderRadius: 6 },
    ratioExpense: { borderRadius: 6 },
    ratioLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    ratioLabelItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    ratioLabelDot: { width: 5, height: 5, borderRadius: 3 },
    ratioLabelText: { fontSize: 11, fontWeight: '700' },

    summaryRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 26 },

    // Section
    sectionRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
    },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

    // Empty
    empty: { alignItems: 'center', paddingVertical: 56, gap: 10 },
    emptyBox: {
        width: 76, height: 76, borderRadius: 22,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700' },
    emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 230 },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
    },
    emptyAddText: { fontSize: 14, fontWeight: '700' },

    // FAB
    fab: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 108 : 96,
        right: 22,
        width: 60, height: 60,
        borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        overflow: 'hidden',
    },
    fabGlow: {
        position: 'absolute', width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.08)', top: -10, left: -10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerExportBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiCard: {
        marginHorizontal: 16,
        marginTop: 10,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderLeftWidth: 4,
        marginBottom: 10,
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    aiIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiTitle: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    aiContent: {
        paddingLeft: 2,
    },
    aiMessage: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        gap: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalInput: {
        height: 52,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Budget Toggle
    budgetToggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    budgetToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    budgetToggleIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    budgetToggleLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    budgetToggleSub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    budgetToggleRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    budgetMiniBar: {
        width: 60,
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
    },
    budgetMiniBarFill: {
        height: '100%',
        borderRadius: 3,
    },
});
