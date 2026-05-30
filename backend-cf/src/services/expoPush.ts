// Expo Push Notification Service
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: 'default' | null;
    badge?: number;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
}

export async function sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<void> {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

    try {
        await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                to: pushToken,
                title,
                body,
                data: data || {},
                sound: 'default',
                priority: 'high',
                channelId: 'default',
                badge: 1,
            } as PushMessage),
        });
    } catch (e) {
        console.error('Push notification failed:', e);
    }
}

// Send to multiple tokens in one batch (Expo allows up to 100 per request)
export async function sendBatchPushNotifications(messages: PushMessage[]): Promise<void> {
    if (messages.length === 0) return;

    const BATCH_SIZE = 100;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        try {
            await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(batch),
            });
        } catch (e) {
            console.error('Batch push failed:', e);
        }
    }
}
