import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = {};

if (Platform.OS === 'web' || isExpoGo) {
    // Mock for Expo Go / Web to bypass SDK 53+ Push Notification removal crash
    console.log('[SafeNotifications] Running in Expo Go or Web - Notifications are mocked.');
    
    Notifications = {
        setNotificationHandler: () => {},
        scheduleNotificationAsync: async () => 'mock-notification-id',
        cancelScheduledNotificationAsync: async () => {},
        getPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true, granted: true, expires: 'never' }),
        requestPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true, granted: true, expires: 'never' }),
        setNotificationChannelAsync: async () => {},
        dismissNotificationAsync: async () => {},
        dismissAllNotificationsAsync: async () => {},
        getAllScheduledNotificationsAsync: async () => [],
        
        // Mocks for commonly used Enums/Constants
        AndroidImportance: {
            UNSPECIFIED: 0,
            NONE: 1,
            MIN: 2,
            LOW: 3,
            DEFAULT: 4,
            HIGH: 5,
            MAX: 6,
        },
        AndroidNotificationPriority: {
            MIN: -2,
            LOW: -1,
            DEFAULT: 0,
            HIGH: 1,
            MAX: 2,
        },
        SchedulableTriggerInputTypes: {
            TIME_INTERVAL: 'timeInterval',
            DAILY: 'daily',
            WEEKLY: 'weekly',
            MONTHLY: 'monthly',
            DATE: 'date',
            CALENDAR: 'calendar',
        }
    };
} else {
    // Attempt real import for Standalone/Dev Builds
    try {
        Notifications = require('expo-notifications');
    } catch (e) {
        console.error('[SafeNotifications] Failed to require expo-notifications. Mocking as fallback.', e);
        Notifications = {
            setNotificationHandler: () => {},
            scheduleNotificationAsync: async () => 'fallback-id',
            // ... same mock as above if needed, but error likely fatal if require fails on native
        };
    }
}

export default Notifications;
