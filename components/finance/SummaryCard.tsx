import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface SummaryCardProps {
    label: string;
    amount: number;
    iconName: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    bgColor: string;
}

const formatRupiah = (amount: number): string => {
    if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

const SummaryCard = ({
    label, amount, iconName, color, bgColor,
}: SummaryCardProps) => {
    const theme = useTheme();
    return (
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.summaryAccentLine, { backgroundColor: color + 'AA' }]} />
            <View style={[styles.summaryIconWrap, { backgroundColor: bgColor }]}>
                <Ionicons name={iconName} size={20} color={color} />
            </View>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>{label}</Text>
            <Text style={[styles.summaryAmount, { color }]}>{formatRupiah(amount)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryCard: {
        flex: 1,
        backgroundColor: '#111118',
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        gap: 3,
    },
    summaryAccentLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    summaryIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#3E3E5E',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    summaryAmount: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.4,
        marginTop: 2,
    },
});

export default React.memo(SummaryCard);
