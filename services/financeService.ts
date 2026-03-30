import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const requestNotificationPermissions = async () => {
    if (Platform.OS === 'web') return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
};

export const sendBudgetNotification = async (title: string, body: string, priority: 'default' | 'high' = 'high') => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
            priority: Platform.OS === 'android' ? priority : undefined,
        },
        trigger: null, // Send immediately
    });
};

export const checkBudgetThresholds = (
    spending: number,
    budget: number,
    categoryName: string
) => {
    if (budget <= 0) return null;
    
    const percent = spending / budget;
    
    if (percent >= 1.0) {
        return {
            title: "Budget Terlampaui! 🚨",
            body: `Pengeluaran kamu untuk ${categoryName} sudah melebihi budget (${Math.round(percent * 100)}%)`,
            type: 'danger'
        };
    } else if (percent >= 0.8) {
        return {
            title: "Waspada Budget! ⚠️",
            body: `Pengeluaran ${categoryName} kamu sudah mencapai ${Math.round(percent * 100)}% dari budget.`,
            type: 'warning'
        };
    }
    
    return null;
};
