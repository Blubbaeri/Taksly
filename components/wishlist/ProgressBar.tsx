import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
    progress: number;
    color: string;
    height?: number;
}

export function ProgressBar({ progress, color, height = 8 }: ProgressBarProps) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        anim.setValue(0);
        Animated.spring(anim, {
            toValue: Math.min(1, Math.max(0, progress)),
            useNativeDriver: false,
            tension: 40,
            friction: 8,
        }).start();
    }, []);

    useEffect(() => {
        Animated.spring(anim, {
            toValue: Math.min(1, Math.max(0, progress)),
            useNativeDriver: false,
            tension: 40,
            friction: 8,
        }).start();
    }, [progress]);

    const width = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[styles.progressBarBg, { height }]}>
            <Animated.View style={[styles.progressBarFill, { width, backgroundColor: color }]}>
                {progress > 0.15 && (
                    <LinearGradient
                        colors={[color + 'AA', color]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    progressBarBg: {
        borderRadius: 99,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 99,
        overflow: 'hidden',
    },
});
