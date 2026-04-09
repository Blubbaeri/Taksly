import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Wrap Circle in Animated for rotation support
const AnimatedG = Animated.createAnimatedComponent(G);

const RING_SIZE = 160;
const RING_RADIUS = 68;
const RING_CENTER = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function TakslyLoadingScreen({ isOverlay = false }: { isOverlay?: boolean }) {
  // Animations
  const ringRotate = useRef(new Animated.Value(0)).current;
  const orb1Rotate = useRef(new Animated.Value(0)).current;
  const orb2Rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ring outer rotate — slow, elegant
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Orb 1 (purple dot) — counter-clockwise
    Animated.loop(
      Animated.timing(orb1Rotate, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Orb 2 (teal dot) — clockwise
    Animated.loop(
      Animated.timing(orb2Rotate, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const ringRotateStyle = {
    transform: [
      {
        rotate: ringRotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  const orb1RotateStyle = {
    transform: [
      {
        rotate: orb1Rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  const orb2RotateStyle = {
    transform: [
      {
        rotate: orb2Rotate.interpolate({
          inputRange: [-1, 0],
          outputRange: ['-360deg', '0deg'],
        }),
      },
    ],
  };

  return (
    <View style={[styles.container, isOverlay && styles.overlay]}>
      {/* Circle Loader Area */}
      <View style={styles.logoWrapper}>
        <View style={styles.svgWrapper}>
          {/* Only the Ring SVG rotates */}
          <Animated.View style={ringRotateStyle}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Defs>
                <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#534AB7" stopOpacity="1" />
                  <Stop offset="50%" stopColor="#1D9E75" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#534AB7" stopOpacity="0.3" />
                </LinearGradient>
              </Defs>

              <Circle
                  cx={RING_CENTER}
                  cy={RING_CENTER}
                  r={RING_RADIUS}
                  stroke="rgba(83,74,183,0.1)"
                  strokeWidth={1.5}
                  fill="none"
                />

              <Circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_RADIUS}
                stroke="url(#ringGrad)"
                strokeWidth={2.5}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE * 0.72} ${CIRCUMFERENCE * 0.28}`}
                strokeLinecap="round"
                rotation={-110}
                origin={`${RING_CENTER}, ${RING_CENTER}`}
              />
            </Svg>
          </Animated.View>

          {/* Orbiting dot 1 */}
          <Animated.View style={[styles.orbitContainer, orb1RotateStyle]}>
            <View style={styles.orbitDotPurple} />
          </Animated.View>

          {/* Orbiting dot 2 */}
          <Animated.View style={[styles.orbitContainer, orb2RotateStyle]}>
            <View style={styles.orbitDotTeal} />
          </Animated.View>

          {/* Center icon (STATIC - No rotation) */}
          <View style={styles.centerIcon}>
            {/* Checkmark */}
            <View style={styles.checkmark}>
              <View style={styles.checkShort} />
              <View style={styles.checkLong} />
            </View>
            {/* Dollar badge */}
            <View style={styles.dollarBadge}>
              <Text style={styles.dollarText}>$</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14', // Solid for standalone startup
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 20, 0.86)', // Override with semi-transparency
    zIndex: 9999,
  },

  // Logo area
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Orbiting dots
  orbitContainer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-start', // dot at top of orbit
  },
  orbitDotPurple: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7F77DD',
    marginTop: RING_CENTER - RING_RADIUS - 4,
    shadowColor: '#534AB7',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  orbitDotTeal: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#1D9E75',
    marginTop: RING_CENTER - RING_RADIUS - 3.5,
    shadowColor: '#1D9E75',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  // Center icon
  centerIcon: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    width: 22,
    height: 16,
    position: 'relative',
  },
  checkShort: {
    position: 'absolute',
    width: 7,
    height: 2.5,
    backgroundColor: '#7F77DD',
    borderRadius: 2,
    bottom: 0,
    left: 0,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    position: 'absolute',
    width: 14,
    height: 2.5,
    backgroundColor: '#7F77DD',
    borderRadius: 2,
    bottom: 4,
    right: 0,
    transform: [{ rotate: '-45deg' }],
  },
  dollarBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dollarText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
});
