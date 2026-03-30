import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '../features/auth/LoginScreen';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
    const theme = useTheme();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {session && session.user ? (
                    <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                ) : (
                    <Stack.Screen name="Auth" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
