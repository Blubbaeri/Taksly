import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Vibration,
    Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomKeyboardProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '⌫'],
];

const MAX_DEFAULT = 15;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomKeyboard({
    value,
    onChange,
    maxLength = MAX_DEFAULT,
}: CustomKeyboardProps) {
    const theme = useTheme();
    const { colors, isDark } = theme;

    const C = {
        containerBorder: colors.border,
        keyBg: isDark ? '#22222E' : colors.surfaceHighlight,
        keyBorder: colors.border,
        keyText: colors.textPrimary,
        backspaceBg: isDark ? '#2C1F1F' : '#FEE2E2',
        backspaceBorder: isDark ? '#3E2C2C' : '#FCA5A5',
        backspaceText: '#EF4444',
        dotBg: isDark ? '#1E1E2A' : colors.surfaceHighlight,
    };

    const vibrate = () => {
        if (Platform.OS !== 'web') Vibration.vibrate(30);
    };

    const handlePress = (key: string) => {
        vibrate();

        if (key === '⌫') {
            onChange(value.slice(0, -1));
            return;
        }

        // Prevent multiple dots
        if (key === '.' && value.includes('.')) return;

        // Prevent leading zero except "0."
        if (key !== '.' && value === '0') {
            onChange(key);
            return;
        }

        // Limit decimal places to 2
        const dotIndex = value.indexOf('.');
        if (dotIndex !== -1 && value.length - dotIndex > 2) return;

        // Max length guard
        if (value.length >= maxLength) return;

        onChange(value + key);
    };

    return (
        <View style={[styles.container, { borderTopColor: C.containerBorder }]}>
            {KEYS.map((row, ri) => (
                <View key={ri} style={styles.row}>
                    {row.map((key) => {
                        const isBackspace = key === '⌫';
                        const isDot = key === '.';
                        return (
                            <TouchableOpacity
                                key={key}
                                onPress={() => handlePress(key)}
                                activeOpacity={0.6}
                                style={[
                                    styles.key,
                                    {
                                        backgroundColor: C.keyBg,
                                        borderColor: C.keyBorder,
                                    },
                                    isBackspace && {
                                        backgroundColor: C.backspaceBg,
                                        borderColor: C.backspaceBorder,
                                    },
                                    isDot && {
                                        backgroundColor: C.dotBg,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.keyText,
                                        { color: C.keyText },
                                        isBackspace && { color: C.backspaceText },
                                    ]}
                                >
                                    {key}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        gap: 6,
        paddingHorizontal: 16,
        paddingBottom: 6,
        paddingTop: 12,
        borderTopWidth: 1,
        marginTop: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 6,
    },
    key: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    keyText: {
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
});