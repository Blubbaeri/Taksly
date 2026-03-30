import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SortKey } from '../../hooks/useWishlistUtils';

interface SortControlsProps {
    sortKey: SortKey;
    setSortKey: (k: SortKey) => void;
    accentColor: string;
    theme: any;
}

export function SortControls({ sortKey, setSortKey, accentColor, theme }: SortControlsProps) {
    const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
        { key: 'priority', label: 'Priority', icon: '🔥' },
        { key: 'progress', label: 'Progress', icon: '📊' },
        { key: 'date', label: 'Date', icon: '📅' },
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
                    <Text style={[styles.sortChipText, { color: sortKey === opt.key ? '#FFF' : theme.colors.textSecondary }]}>
                        {opt.icon} {opt.label}
                    </Text>
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
