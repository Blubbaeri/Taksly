import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

interface DayPickerProps {
    value: number | null;
    onChange: (day: number) => void;
}

const QUICK_PICKS = [1, 5, 10, 15, 20, 25];
const WEEK_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const DayPicker: React.FC<DayPickerProps> = ({ value, onChange }) => {
    const theme = useTheme();
    const primary = theme.colors.primary;
    const today = new Date().getDate();
    const now = new Date();

    // Calendar grid: get offset for first day of current month
    const { firstDayOffset, daysInMonth } = useMemo(() => {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return { firstDayOffset: firstDay, daysInMonth: totalDays };
    }, []);

    const daysLeft = value ? value - today : null;

    const getDayStatus = (day: number) => {
        if (day === value) return 'selected';
        if (day === today) return 'today';
        return 'default';
    };

    return (
        <View style={styles.container}>
            {/* Section label */}
            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
                TANGGAL JATUH TEMPO
            </Text>

            {/* Quick picks */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRow}
            >
                {QUICK_PICKS.map(d => {
                    const active = value === d;
                    return (
                        <TouchableOpacity
                            key={d}
                            onPress={() => onChange(d)}
                            style={[
                                styles.quickChip,
                                {
                                    backgroundColor: active ? primary : theme.colors.card,
                                    borderColor: active ? primary : theme.colors.border,
                                },
                            ]}
                            activeOpacity={0.75}
                        >
                            <Text style={[
                                styles.quickChipText,
                                { color: active ? '#fff' : theme.colors.textMuted },
                            ]}>
                                Tgl {d}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Calendar grid */}
            <View style={[styles.calCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {/* Week header */}
                <View style={styles.weekHeader}>
                    {WEEK_LABELS.map(lbl => (
                        <Text key={lbl} style={[styles.weekLabel, { color: theme.colors.textMuted }]}>
                            {lbl}
                        </Text>
                    ))}
                </View>

                {/* Day grid */}
                <View style={styles.grid}>
                    {/* Empty offset cells */}
                    {Array.from({ length: firstDayOffset }).map((_, i) => (
                        <View key={`empty-${i}`} style={styles.emptyCell} />
                    ))}

                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const status = getDayStatus(day);
                        const isSelected = status === 'selected';
                        const isToday = status === 'today';

                        return (
                            <TouchableOpacity
                                key={day}
                                onPress={() => onChange(day)}
                                activeOpacity={0.7}
                                style={[
                                    styles.dayCell,
                                    isSelected && { backgroundColor: primary, borderColor: primary },
                                    isToday && !isSelected && { borderColor: theme.colors.success || '#1D9E75' },
                                    !isSelected && !isToday && { borderColor: 'transparent', backgroundColor: theme.colors.background },
                                ]}
                            >
                                <Text style={[
                                    styles.dayText,
                                    { color: isSelected ? '#fff' : isToday ? (theme.colors.success || '#1D9E75') : theme.colors.textSecondary },
                                ]}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Info pill */}
            {value && (
                <View style={[styles.infoPill, { backgroundColor: primary + '12', borderColor: primary + '30' }]}>
                    <View style={[styles.pillDot, { backgroundColor: primary }]} />
                    <Text style={[styles.pillText, { color: theme.colors.textSecondary }]}>
                        Jatuh tempo tiap{' '}
                        <Text style={[styles.pillBold, { color: primary }]}>tanggal {value}</Text>
                        {' '}setiap bulan
                        {daysLeft !== null && daysLeft > 0 && (
                            <Text style={{ color: theme.colors.textMuted }}> · {daysLeft} hari lagi</Text>
                        )}
                        {daysLeft === 0 && (
                            <Text style={{ color: theme.colors.danger || '#E24B4A' }}> · Hari ini!</Text>
                        )}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginLeft: 2,
    },

    // Quick picks
    quickRow: {
        flexDirection: 'row',
        gap: 8,
        paddingRight: 4,
    },
    quickChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
        borderWidth: 1,
    },
    quickChipText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Calendar card
    calCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    emptyCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: 1,
        marginVertical: 2,
    },
    dayText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Info pill
    infoPill: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    pillDot: {
        width: 7,
        height: 7,
        borderRadius: 99,
        marginTop: 4,
        flexShrink: 0,
    },
    pillText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
    },
    pillBold: {
        fontWeight: '800',
    },
});

export default DayPicker;
