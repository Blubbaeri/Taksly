import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../../theme/ThemeContext';
import { FinanceStoreProvider } from '../../../features/finance/useFinanceStore';

const PURPLE = '#7C6FFF';
const BG_DARK = '#08080E';
const BORDER = '#1C1C2E';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
    focused,
    color,
    iconFocused,
    iconUnfocused,
}: {
    focused: boolean;
    color: string;  
    iconFocused: IoniconsName;
    iconUnfocused: IoniconsName;
}) {
    return (
        <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
            {focused && <View style={styles.tabActiveGlow} />}
            <Ionicons
                name={focused ? iconFocused : iconUnfocused}
                size={21}
                color={color}
            />
        </View>
    );
}

export default function TabsLayout() {
    const theme = useTheme();

    return (
        <FinanceStoreProvider>
            <Tabs
            screenOptions={{
                headerShown: false,

                tabBarBackground: () => (
                    <BlurView
                        intensity={80}
                        tint="dark"
                        style={styles.tabBarBlur}
                    />
                ),

                tabBarStyle: {
                    position: 'absolute',
                    height: 70,
                    marginHorizontal: 18,
                    marginBottom: Platform.OS === 'ios' ? 20 : 14,
                    borderRadius: 26,
                    borderTopWidth: 0,
                    backgroundColor: 'transparent',
                    elevation: 0,
                    // shadow for floating effect
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.5,
                    shadowRadius: 24,
                },

                tabBarActiveTintColor: PURPLE,
                tabBarInactiveTintColor: '#3A3A5A',

                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.2,
                    marginBottom: 4,
                },

                tabBarItemStyle: {
                    borderRadius: 16,
                    marginHorizontal: 3,
                    marginVertical: 8,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Finance',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            focused={focused}
                            color={color}
                            iconFocused="wallet"
                            iconUnfocused="wallet-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="tasks"
                options={{
                    title: 'Tasks',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            focused={focused}
                            color={color}
                            iconFocused="checkmark-circle"
                            iconUnfocused="checkmark-circle-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="wishlist"
                options={{
                    title: 'Wishlist',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            focused={focused}
                            color={color}
                            iconFocused="heart"
                            iconUnfocused="heart-outline"
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon
                            focused={focused}
                            color={color}
                            iconFocused="person"
                            iconUnfocused="person-outline"
                        />
                    ),
                }}
            />
        </Tabs>
        </FinanceStoreProvider>
    );
}

const styles = StyleSheet.create({
    tabBarBlur: {
        flex: 1,
        borderRadius: 26,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: 'rgba(10, 10, 18, 0.75)',
    },

    tabIconWrap: {
        width: 42,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    tabIconWrapActive: {
        backgroundColor: PURPLE + '20',
        borderWidth: 1,
        borderColor: PURPLE + '35',
    },
    tabActiveGlow: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: PURPLE + '18',
        top: -6,
        left: -3,
    },
});