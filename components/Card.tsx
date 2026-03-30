import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, style }: CardProps) => {
    const theme = useTheme();

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.md,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
});
