import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface BillTrackerCardProps {
    amount: number;
    frequency: 'daily' | 'weekly';
    unpaidCount: number;
    totalUnpaid: number;
    onPress: () => void;
}

const formatRupiah = (amount: number): string => 
    `Rp ${Math.round(amount).toLocaleString('id-ID')}`;

export const BillTrackerCard: React.FC<BillTrackerCardProps> = ({
    amount,
    frequency,
    unpaidCount,
    totalUnpaid,
    onPress,
}) => {
    const theme = useTheme();
    const primary = theme.colors.primary;


    return (
        <TouchableOpacity 
            activeOpacity={0.9}
            onPress={onPress}
            style={[styles.container, { backgroundColor: theme.colors.card, borderColor: primary + '30' }]}
        >
            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: primary + '15' }]}>
                    <Ionicons name="calendar-outline" size={18} color={primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                        {unpaidCount > 0 
                            ? `Target Nabung ${frequency === 'daily' ? 'Hari Ini' : 'Minggu Ini'}` 
                            : 'Atur Tagihan Bulanan'}
                    </Text>
                    <Text style={[styles.sub, { color: theme.colors.textMuted }]}>
                        {unpaidCount > 0 
                            ? `${unpaidCount} tagihan menanti · Total ${formatRupiah(totalUnpaid)}` 
                            : 'Biar sisa bulan gak kemakan tagihan mendadak '}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>

            <View style={[styles.amountContainer, { backgroundColor: primary + '08' }]}>
                <Text style={[styles.amountLabel, { color: theme.colors.textSecondary }]}>
                    Sisihkan Sekecil ({frequency === 'daily' ? 'Harian' : 'Mingguan'}):
                </Text>
                <Text style={[styles.amount, { color: primary }]}>{formatRupiah(amount)}</Text>
            </View>
            
            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
                    Tabung tiap hari biar akhir bulan gak pusing 
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 14,
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    sub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 16,
    },
    amountLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    amount: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    footer: {
        marginTop: 10,
        paddingLeft: 4,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '500',
        fontStyle: 'italic',
    },
});
