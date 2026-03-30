import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONFETTI_COLORS = ['#FF453A', '#FF9F0A', '#34C789', '#0A84FF', '#BF5AF2', '#FFD60A'];

function ConfettiParticle({ color, delay }: { color: string; delay: number }) {
    const posX = useRef(new Animated.Value(Math.random() * SCREEN_WIDTH)).current;
    const posY = useRef(new Animated.Value(-20)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const anim = Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(posY, { toValue: 700, duration: 2000, useNativeDriver: true }),
                Animated.timing(rotate, { toValue: 5, duration: 2000, useNativeDriver: true }),
                Animated.sequence([
                    Animated.delay(1400),
                    Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
                ]),
            ]),
        ]);
        
        anim.start();
        
        // Cleanup to prevent memory leaks as per feedback point #10
        return () => anim.stop();
    }, []);

    const spin = rotate.interpolate({ inputRange: [0, 5], outputRange: ['0deg', '1800deg'] });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                width: 10,
                height: 10,
                borderRadius: Math.random() > 0.5 ? 5 : 2,
                backgroundColor: color,
                transform: [{ translateX: posX }, { translateY: posY }, { rotate: spin }],
                opacity,
            }}
        />
    );
}

export function ConfettiExplosion() {
    const particles = useRef(Array.from({ length: 40 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 400,
    }))).current;

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {particles.map(p => <ConfettiParticle key={p.id} color={p.color} delay={p.delay} />)}
        </View>
    );
}

export const ConfettiLayer = React.memo(ConfettiExplosion);
