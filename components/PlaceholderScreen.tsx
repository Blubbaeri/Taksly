import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export const PlaceholderScreen = ({ title }: { title: string }) => {
    const theme = useTheme();
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary }}>{title}</Text>
        </View>
    );
};
