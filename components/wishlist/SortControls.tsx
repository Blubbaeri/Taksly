import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SortKey } from '../../hooks/useWishlistUtils';

interface SortControlsProps {
    sortKey: SortKey;
    setSortKey: (k: SortKey) => void;
    accentColor: string;
    theme: any;
}

export function SortControls({ sortKey, setSortKey, accentColor, theme }: SortControlsProps) {
    const SORT_OPTIONS: { key: SortKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: 'priority', label: 'Priority', icon: 'flame-outline' },
        { key: 'progress', label: 'Progress', icon: 'stats-chart-outline' },
        { key: 'date', label: 'Date', icon: 'calendar-outline' },
    ];

    return (
        <View style={styles.sortRow}>
            <Text style={[styles.sortLabel, { color: theme.colors.textSecondary }]}>Sort:</Text>
            {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                    key={opt.key}
                    onPress={() => setSortKey(opt.key)}
                    style={[
                        styles.sortChip,
                        {
                            backgroundColor: sortKey === opt.key ? accentColor : theme.colors.card ?? '#1E1E1E',
                            borderColor: sortKey === opt.key ? accentColor : theme.colors.border,
                        },
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons 
                            name={opt.icon} 
                            size={14} 
                            color={sortKey === opt.key ? '#FFF' : theme.colors.textSecondary} 
                        />
                        <Text style={[styles.sortChipText, { color: sortKey === opt.key ? '#FFF' : theme.colors.textSecondary }]}>
                            {opt.label}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sortLabel: { fontSize: 12, fontWeight: '600' },
    sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    sortChipText: { fontSize: 12, fontWeight: '600' },
});
