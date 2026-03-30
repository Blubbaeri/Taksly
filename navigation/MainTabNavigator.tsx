import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../features/finance/DashboardScreen';
import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
    const theme = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.colors.background,
                    shadowColor: 'transparent',
                },
                headerTintColor: theme.colors.textPrimary,
                headerTitleStyle: {
                    ...theme.typography.h3,
                },
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
            }}
        >
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{ title: 'Overview' }}
            />
            <Tab.Screen
                name="Tasks"
                children={() => <PlaceholderScreen title="Tasks List" />}
            />
            <Tab.Screen
                name="Finance"
                children={() => <PlaceholderScreen title="Finance Tracker" />}
            />
            <Tab.Screen
                name="Profile"
                children={() => <PlaceholderScreen title="User Profile" />}
            />
        </Tab.Navigator>
    );
};
