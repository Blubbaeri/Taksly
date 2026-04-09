import Notifications from '../lib/safe-notifications';
import { Platform } from 'react-native';

// Configure notification behavior safely
try {
    if (Platform.OS !== 'web') {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    }
} catch (error) {
    console.warn('[FinanceService] Failed to set notification handler:', error);
}

// Bug #14 fix: removed duplicate requestNotificationPermissions.
// The canonical version (with Android channel setup) lives in lib/notification.ts.
// Re-export it here for backwards compatibility in case anything imports from this file.
export { requestNotificationPermissions } from '../lib/notification';

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
