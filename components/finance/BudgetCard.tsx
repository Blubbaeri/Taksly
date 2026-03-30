import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface BudgetCardProps {
    categoryLabel: string;
    categoryIcon: string;
    categoryColor: string;
    spending: number;
    budgetAmount: number;
    onSetBudget: () => void;
}

const formatRupiah = (amount: number): string => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

export function BudgetCard({
    categoryLabel,
    categoryIcon,
    categoryColor,
    spending,
    budgetAmount,
    onSetBudget,
}: BudgetCardProps) {
    const theme = useTheme();
    const percent = budgetAmount > 0 ? spending / budgetAmount : 0;
    
    // Color logic
    let barColor = theme.colors.success;
    if (percent >= 1) barColor = theme.colors.danger;
    else if (percent >= 0.8) barColor = '#F59E0B'; // Amber

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: categoryColor + '15' }]}>
                    <Ionicons name={categoryIcon as any} size={18} color={categoryColor} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{categoryLabel}</Text>
                    <Text style={[styles.stats, { color: theme.colors.textMuted }]}>
                        {formatRupiah(spending)} / {budgetAmount > 0 ? formatRupiah(budgetAmount) : 'Belum diatur'}
                    </Text>
                </View>
                <TouchableOpacity onPress={onSetBudget} style={styles.editBtn}>
                    <Ionicons name="pencil" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
            </View>

            {budgetAmount > 0 && (
                <View style={styles.progressSection}>
                    <View style={[styles.progressBg, { backgroundColor: theme.colors.background }]}>
                        <View 
                            style={[
                                styles.progressFill, 
                                { 
                                    width: `${Math.min(percent * 100, 100)}%`, 
                                    backgroundColor: barColor,
                                    shadowColor: barColor,
                                }
                            ]} 
                        />
                    </View>
                    <View style={styles.footer}>
                        <Text style={[styles.percentText, { color: barColor }]}>
                            {Math.round(percent * 100)}% terpakai
                        </Text>
                        {percent >= 1 && (
                            <Text style={styles.overText}>Over Budget! 🚨</Text>
                        )}
                    </View>
                </View>
            )}

            {budgetAmount === 0 && (
                <TouchableOpacity style={styles.placeholder} onPress={onSetBudget}>
                    <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
                        Klik untuk atur budget
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        gap: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
    },
    stats: {
        fontSize: 11,
    },
    editBtn: {
        padding: 4,
    },
    progressSection: {
        marginTop: 14,
        gap: 8,
    },
    progressBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    percentText: {
        fontSize: 11,
        fontWeight: '600',
    },
    overText: {
        fontSize: 11,
        color: '#F87171',
        fontWeight: '700',
    },
    placeholder: {
        marginTop: 12,
        padding: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#3F3F5E',
        borderRadius: 12,
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 11,
    },
});
