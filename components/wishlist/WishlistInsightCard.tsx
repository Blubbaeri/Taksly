import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../theme/ThemeContext';
import { GlobalInsights } from '../../hooks/useWishlistInsights';

interface Props {
    insights: GlobalInsights;
    theme: Theme;
}

export const WishlistInsightCard: React.FC<Props> = ({ insights, theme }) => {
    const { tips, recommendations } = insights;
    
    if (tips.length === 0 && recommendations.length === 0) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.header}>
                <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                    style={styles.headerIcon}
                >
                    <Ionicons name="bulb" size={16} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Smart Insights</Text>
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {recommendations.map((rec, i) => (
                    <View key={`rec-${i}`} style={[styles.insightItem, { borderColor: theme.colors.primary + '40', backgroundColor: theme.colors.primary + '10' }]}>
                        <Text style={[styles.insightText, { color: theme.colors.textPrimary }]}>{rec}</Text>
                    </View>
                ))}

                {tips.map((tip, i) => (
                    <View key={`tip-${i}`} style={[styles.insightItem, { borderColor: theme.colors.success + '40', backgroundColor: theme.colors.success + '10' }]}>
                        <Text style={styles.tipIcon}>{tip.icon}</Text>
                        <Text style={[styles.insightText, { color: theme.colors.textPrimary }]}>{tip.message}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    headerIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 10,
    },
    insightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        maxWidth: 280,
        gap: 8,
    },
    insightText: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        flexShrink: 1,
    },
    tipIcon: {
        fontSize: 18,
    },
});
