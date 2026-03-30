import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Vibration,
    Platform,
} from 'react-native';

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
        <View style={styles.container}>
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
                                    isBackspace && styles.keyBackspace,
                                    isDot && styles.keyDot,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.keyText,
                                        isBackspace && styles.keyTextBackspace,
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
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2C2C3E',
        marginTop: 10,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    key: {
        flex: 1,
        height: 54,
        borderRadius: 14,
        backgroundColor: '#22222E',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2C2C3E',
    },
    keyBackspace: {
        backgroundColor: '#2C1F1F',
        borderColor: '#3E2C2C',
    },
    keyDot: {
        backgroundColor: '#1E1E2A',
    },
    keyText: {
        fontSize: 22,
        fontWeight: '500',
        color: '#F1F1F5',
        letterSpacing: 0.5,
    },
    keyTextBackspace: {
        fontSize: 20,
        color: '#F87171',
    },
});