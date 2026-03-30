import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    TouchableOpacityProps,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
    disabled?: boolean;
}

export const Button = ({
    title,
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    style,
    ...props
}: ButtonProps) => {
    const theme = useTheme();

    const getContainerStyle = (): ViewStyle => {
        switch (variant) {
            case 'primary':
                return {
                    backgroundColor: theme.colors.primary,
                };
            case 'secondary':
                return {
                    backgroundColor: theme.colors.surfaceHighlight,
                };
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                };
        }
    };

    const getTextStyle = (): TextStyle => {
        switch (variant) {
            case 'primary':
                return { color: theme.colors.background, fontWeight: '600' };
            case 'secondary':
                return { color: theme.colors.textPrimary, fontWeight: '600' };
            case 'outline':
            case 'ghost':
                return { color: theme.colors.primary, fontWeight: '600' };
        }
    };

    const getSizeStyle = (): ViewStyle => {
        switch (size) {
            case 'small':
                return { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md };
            case 'medium':
                return { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg };
            case 'large':
                return { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xl };
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            disabled={disabled || loading}
            style={[
                styles.base,
                getContainerStyle(),
                getSizeStyle(),
                { borderRadius: theme.borderRadius.md },
                disabled && styles.disabled,
                style,
            ]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? theme.colors.background : theme.colors.primary}
                />
            ) : (
                <Text style={[getTextStyle(), { fontSize: theme.typography.body1.fontSize }]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
});
