import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    TextInputProps,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

export const Input = ({
    label,
    error,
    containerStyle,
    style,
    onFocus,
    onBlur,
    ...props
}: InputProps) => {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text
                    style={[
                        styles.label,
                        { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
                    ]}
                >
                    {label}
                </Text>
            )}
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.textPrimary,
                        borderColor: error
                            ? theme.colors.danger
                            : isFocused
                                ? theme.colors.primary
                                : theme.colors.border,
                        borderRadius: theme.borderRadius.sm,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.md,
                    },
                    style,
                ]}
                placeholderTextColor={theme.colors.textMuted}
                onFocus={(e) => {
                    setIsFocused(true);
                    onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    onBlur?.(e);
                }}
                {...props}
            />
            {error && (
                <Text
                    style={[
                        styles.error,
                        { color: theme.colors.danger, marginTop: theme.spacing.xs },
                    ]}
                >
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        fontSize: 16,
    },
    error: {
        fontSize: 12,
    },
});
