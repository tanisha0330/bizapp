import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Register for push notifications and get the token
export async function registerForPushNotifications(): Promise<string | null> {
    console.log("Push notifications temporarily disabled for recording");
return null;}
    
    /*if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Biz499 Notifications',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6C5CE7',
            sound: 'default',
        });
    }

    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
            console.log('No Expo project ID found — skipping push registration');
            return null;
        }
        const token = (await Notifications.getExpoPushTokenAsync({
            projectId,
        })).data;
        console.log('Push token:', token);

        // Save token to backend
        try {
            await api.updateProfile({ pushToken: token } as any);
        } catch {}

        return token;
    } catch (e) {
        console.error('Failed to get push token:', e);
        return null;
    }
}*/

// Schedule a local notification (for immediate feedback)
export async function sendLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data || {},
            sound: 'default',
        },
        trigger: null, // immediate
    });
}

// Pre-built notification types
export const NotifyEvents = {
    leadReceived: (leadName: string) =>
        sendLocalNotification('New Lead!', `${leadName} just submitted an enquiry. Tap to view.`, { type: 'lead' }),

    adPublished: (campaignName: string) =>
        sendLocalNotification('Ad Published!', `Your campaign "${campaignName}" is now live on Facebook.`, { type: 'ad' }),

    adDraftSaved: (name: string) =>
        sendLocalNotification('Draft Saved', `Your ad "${name}" has been saved as a draft.`, { type: 'ad_draft' }),

    posterCreated: () =>
        sendLocalNotification('Poster Ready!', 'Your AI poster has been generated. Save or share it now.', { type: 'poster' }),

    websiteSubmitted: () =>
        sendLocalNotification('Website Request Sent!', 'Our team will contact you within 24 hours.', { type: 'website' }),

    printOrderPlaced: () =>
        sendLocalNotification('Print Order Placed!', 'Your business card print order has been sent. Our team will confirm shortly.', { type: 'print' }),

    facebookConnected: () =>
        sendLocalNotification('Facebook Connected!', 'Your Facebook pages and ad accounts are now linked.', { type: 'facebook' }),

    enquiryReceived: (businessName: string, visitorName: string) =>
        sendLocalNotification(`New Enquiry - ${businessName}`, `${visitorName} filled your website contact form.`, { type: 'enquiry' }),
};
