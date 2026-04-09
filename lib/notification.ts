import Notifications from './safe-notifications';
import { Platform } from 'react-native';

/**
 * Request notification permissions from the user.
 */
export const requestNotificationPermissions = async () => {
    if (Platform.OS === 'web') return false;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
};

/**
 * Schedule a reminder for a wishlist goal deadline.
 * Defaults to 1 day before the target date.
 */
export const scheduleWishlistReminder = async (
    itemId: string,
    itemName: string,
    targetDate: string,
    emoji: string = '🎯'
) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // Calculate notification time (e.g., 1 day before target date, at 9:00 AM)
    const deadline = new Date(targetDate);
    const reminderDate = new Date(deadline);
    reminderDate.setDate(deadline.getDate() - 1);
    reminderDate.setHours(9, 0, 0, 0);

    // If reminder date is in the past, don't schedule
    if (reminderDate.getTime() < Date.now()) {
        return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
        content: {
            title: `Deadline Wishlist Besok! ${emoji}`,
            body: `Besok adalah target deadline buat dapetin "${itemName}". Sudah siap belinya?`,
            data: { itemId, type: 'wishlist_deadline' },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            android: {
                channelId: 'default',
            },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.floor((reminderDate.getTime() - Date.now()) / 1000)),
            repeats: false,
        } as any,
    });

    return identifier;
};

/**
 * Cancel a scheduled notification.
 */
export const cancelNotification = async (identifier: string) => {
    await Notifications.cancelScheduledNotificationAsync(identifier);
};

/**
 * Schedule a local notification for a task deadline.
 */
export const scheduleTaskReminder = async (taskTitle: string, deadline: string | Date) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const trigger = new Date(deadline);
    if (trigger.getTime() <= Date.now()) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
        content: {
            title: "Task Reminder ⏳",
            body: `Don't forget: ${taskTitle}`,
            data: { taskTitle, type: 'task_reminder' },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            android: {
                channelId: 'default',
            },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.floor((trigger.getTime() - Date.now()) / 1000)),
            repeats: false,
        } as any,
    });

    return identifier;
};
