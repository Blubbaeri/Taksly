import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { useFinanceStore } from '../../features/finance/useFinanceStore';
import { FinanceCharts } from '../../components/finance/FinanceCharts';
import TransactionItem from '../../components/finance/TransactionItem';

export default function FinanceHistoryScreen() {
    const theme = useTheme();
    const router = useRouter();
    const FINANCE_PRIMARY = theme.colors.primary;
    const { 
        transactions, 
        expenseCategories, 
        incomeCategories,
        totalIncome, 
        totalExpense, 
        insights,
        deleteTransaction
    } = useFinanceStore();

    const categoryMap = useMemo(() => {
        const map = new Map();
        [...expenseCategories, ...incomeCategories].forEach(c => {
            map.set(c.id, c);
        });
        return map;
    }, [expenseCategories, incomeCategories]);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Riwayat & Analitik</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* AI Insights */}
                {insights && insights.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>AI Summary</Text>
                        {insights.map((insight, idx) => (
                            <View key={idx} style={[styles.aiCard, { backgroundColor: theme.colors.card, borderColor: FINANCE_PRIMARY + '30', borderLeftColor: insight.type === 'warning' ? '#EF4444' : (insight.type === 'success' ? '#10B981' : FINANCE_PRIMARY) }]}>
                                <View style={styles.aiHeader}>
                                    <View style={[styles.aiIconBox, { backgroundColor: insight.type === 'warning' ? '#EF444420' : (insight.type === 'success' ? '#10B98120' : FINANCE_PRIMARY + '20') }]}>
                                        <Ionicons name={insight.icon as any} size={16} color={insight.type === 'warning' ? '#EF4444' : (insight.type === 'success' ? '#10B981' : FINANCE_PRIMARY)} />
                                    </View>
                                    <Text style={[styles.aiTitle, { color: theme.colors.textPrimary }]}>{insight.title || 'Insight'}</Text>
                                </View>
                                <Text style={[styles.aiMessage, { color: theme.colors.textSecondary }]}>
                                    {insight.message}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Charts */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Grafik Keuangan</Text>
                    {transactions.length > 0 ? (
                        <FinanceCharts 
                            transactions={transactions}
                            expenseCategories={expenseCategories}
                            income={totalIncome}
                            expense={totalExpense}
                        />
                    ) : (
                        <Text style={{ color: theme.colors.textMuted }}>Belum ada data untuk grafik.</Text>
                    )}
                </View>

                {/* Transaction List */}
                <View style={[styles.section, { paddingBottom: 40 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Semua Transaksi</Text>
                    {transactions.length > 0 ? (
                        transactions.map(tx => {
                            const cat = categoryMap.get(tx.categoryId);
                            return (
                                <TransactionItem
                                    key={tx.id}
                                    transaction={tx}
                                    categoryIcon={cat?.icon ?? 'help-outline'}
                                    categoryLabel={cat?.label ?? 'Others'}
                                    categoryColor={cat?.color ?? theme.colors.textMuted}
                                    onDelete={() => deleteTransaction(tx.id)}
                                />
                            );
                        })
                    ) : (
                        <Text style={{ color: theme.colors.textMuted }}>Belum ada transaksi.</Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: -0.3,
    },
    aiCard: {
        padding: 16,
        borderRadius: 16,
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
    aiMessage: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
});
