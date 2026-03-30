import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatIDR } from '../../hooks/useWishlistUtils';

interface SummaryBannerProps {
    totalSaved: number;
    totalTarget: number;
    overallPct: number;
    accentColor: string;
}

function AnimatedProgressBar({ progress, color }: { progress: number; color: string }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: progress, useNativeDriver: false, tension: 40, friction: 8 }).start();
    }, [progress]);
    const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width, backgroundColor: color }]}>
                {progress > 0.15 && (
                    <LinearGradient
                        colors={[color + 'AA', color]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                )}
            </Animated.View>
        </View>
    );
}

export function SummaryBanner({ totalSaved, totalTarget, overallPct, accentColor }: SummaryBannerProps) {
    return (
        <LinearGradient
            colors={[accentColor + 'CC', accentColor + '88']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.summaryBanner}
        >
            <View style={styles.summaryRow}>
                <View>
                    <Text style={styles.summaryLabel}>Total Saved</Text>
                    <Text style={styles.summaryAmount}>{formatIDR(totalSaved)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View>
                    <Text style={styles.summaryLabel}>Total Target</Text>
                    <Text style={styles.summaryAmount}>{formatIDR(totalTarget)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View>
                    <Text style={styles.summaryLabel}>Remaining</Text>
                    <Text style={styles.summaryAmount}>{formatIDR(Math.max(0, totalTarget - totalSaved))}</Text>
                </View>
            </View>
            <AnimatedProgressBar progress={overallPct} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    summaryBanner: { borderRadius: 20, padding: 18, gap: 12 },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
    summaryAmount: { color: '#FFF', fontSize: 14, fontWeight: '800', textAlign: 'center', marginTop: 2 },
    summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },
    progressBarBg: { height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' },
    progressBarFill: { height: '100%', borderRadius: 99, overflow: 'hidden' },
});
