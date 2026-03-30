import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ActivityIndicator, View, Alert, AppState, AppStateStatus } from 'react-native';
import { useTheme, ThemeProvider } from '../../theme/ThemeContext';
import { SESSION_TIMEOUT } from '../../lib/auth';

export default function RootLayout() {
    const theme = useTheme();
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const lastActivityRef = useRef<number>(Date.now());
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    // Reset timer on any touch interaction
    const handleResetInactivity = () => {
        lastActivityRef.current = Date.now();
    };

    const performAutoLogout = async (reason: 'inactivity' | 'timeout') => {
        await supabase.auth.signOut();
        const message = reason === 'inactivity' 
            ? "Your session has expired due to inactivity for 1 hour." 
            : "Your login session has expired for security reasons.";
        
        Alert.alert(
            "Session Expired",
            message,
            [{ text: "Login Again", onPress: () => router.replace('/(auth)/login') }]
        );
        router.replace('/(auth)/login');
    };

    const checkInactivity = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; // Not logged in, skip

        const now = Date.now();
        const inactiveTime = now - lastActivityRef.current;

        if (inactiveTime >= SESSION_TIMEOUT) {
            console.log(`[AutoLogout] Inactive for ${inactiveTime}ms. Logging out...`);
            await performAutoLogout('inactivity');
        }
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                lastActivityRef.current = Date.now(); // Reset on sign in
                router.replace('/(tabs)');
            } else if (event === 'SIGNED_OUT') {
                router.replace('/(auth)/login');
            }
        });

        // Background / Foreground check
        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                // If returning to foreground, check if it was long enough to timeout
                checkInactivity();
            }
            appStateRef.current = nextAppState;
        });

        // Periodic check every 30 seconds while app is active
        const inactivityInterval = setInterval(() => {
            if (appStateRef.current === 'active') {
                checkInactivity();
            }
        }, 30000); // 30 seconds

        setIsCheckingSession(false);

        return () => {
            subscription.unsubscribe();
            appStateSubscription.remove();
            clearInterval(inactivityInterval);
        };
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ThemeProvider>
                    <View 
                        style={{ flex: 1 }} 
                        onStartShouldSetResponderCapture={() => {
                            handleResetInactivity();
                            return false; // Don't block interaction
                        }}
                    >
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
                        </Stack>
                        <StatusBar style="light" />
                    </View>
                </ThemeProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
