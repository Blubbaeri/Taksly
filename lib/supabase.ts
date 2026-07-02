import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ajgiotqbihibjsfytkls.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZ2lvdHFiaWhpYmpzZnl0a2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDMxMTAsImV4cCI6MjA4NzMxOTExMH0.ZOwaCkCehON_Z8HtwNgj7uxCdjowlNqqOlvBJ79GMtE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
