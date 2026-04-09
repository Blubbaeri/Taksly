import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useLoading } from '../context/LoadingContext';

export default function IndexDispatcher() {
    const router = useRouter();
    const { setGlobalLoading } = useLoading();

    useEffect(() => {
        // Start the global loader immediately for the startup sequence
        setGlobalLoading(true);

        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                // Keep the loader active while transitioning
                if (session) {
                    router.replace('/(tabs)');
                } else {
                    // If login, we might want to hide the loader
                    setGlobalLoading(false);
                    router.replace('/(auth)/login');
                }
            } catch (error) {
                setGlobalLoading(false);
                router.replace('/(auth)/login');
            }
        };

        // We wait 3.5s to complete the startup animation, 
        // then redirect. The tabs will call setGlobalLoading(false) when data is ready.
        const timer = setTimeout(() => {
            checkAuth();
            // Note: we DON'T setGlobalLoading(false) here if authenticated,
            // because the tabs will take over the loading state (reference counting).
        }, 3500);

        return () => {
            clearTimeout(timer);
            setGlobalLoading(false);
        };
    }, [router, setGlobalLoading]);

    // Return empty view as the global overlay handles the visual loading screen
    return <View style={styles.container} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d0d14',
    },
});
