import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { Transaction } from '../../features/finance/useFinanceStore';

interface TransactionItemProps {
    transaction: Transaction;
    categoryIcon: React.ComponentProps<typeof Ionicons>['name'];
    categoryLabel: string;
    categoryColor: string;
    onDelete: () => void;
}

const formatRupiah = (amount: number): string => {
    if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
};

const TransactionItem = ({
    transaction, categoryIcon, categoryLabel, categoryColor, onDelete,
}: TransactionItemProps) => {
    const theme = useTheme();
    const isIncome = transaction.type === 'income';
    const statusColor = isIncome ? theme.colors.success : theme.colors.danger;

    return (
        <View style={[styles.txItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.txStrip, { backgroundColor: statusColor }]} />

            <View style={[styles.txIconWrap, { backgroundColor: categoryColor + '18' }]}>
                <Ionicons
                    name={categoryIcon}
                    size={22}
                    color={categoryColor}
                />
            </View>

            <View style={styles.txContent}>
                <Text style={[styles.txCategory, { color: theme.colors.textPrimary }]}>{categoryLabel}</Text>
                {transaction.note ? (
                    <Text style={[styles.txNote, { color: theme.colors.textSecondary }]} numberOfLines={1}>{transaction.note}</Text>
                ) : null}
                <Text style={[styles.txDate, { color: theme.colors.textMuted }]}>{formatDate(transaction.createdAt)}</Text>
            </View>

            <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: statusColor }]}>
                    {isIncome ? '+' : '−'}{formatRupiah(transaction.amount)}
                </Text>
                <View style={[styles.txBadge, { backgroundColor: statusColor + '14', borderColor: statusColor + '30' }]}>
                    <Text style={[styles.txBadgeText, { color: statusColor }]}>
                        {isIncome ? 'MASUK' : 'KELUAR'}
                    </Text>
                </View>
            </View>

            <TouchableOpacity 
                style={styles.txDeleteBtn} 
                onPress={onDelete}
                activeOpacity={0.7}
            >
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111118',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1C1C2E',
        paddingRight: 14,
        paddingVertical: 13,
    },
    txStrip: { width: 3, alignSelf: 'stretch', marginRight: 12, borderRadius: 2 },
    txIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    txContent: { flex: 1, gap: 3 },
    txCategory: { fontSize: 14, fontWeight: '700', color: '#EEEEF5', letterSpacing: -0.1 },
    txNote: { fontSize: 12, color: '#5A5A78' },
    txDate: { fontSize: 11, color: '#2E2E4E', fontWeight: '500' },
    txRight: { alignItems: 'flex-end', gap: 5 },
    txAmount: { fontSize: 15, fontWeight: '800', letterSpacing: -0.4 },
    txBadge: {
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    txBadgeText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    txDeleteBtn: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginLeft: 4,
    },
});

export default React.memo(TransactionItem);
