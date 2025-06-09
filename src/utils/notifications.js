// src/utils/notifications.js
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const sendNotificationFn = httpsCallable(functions, 'sendNotification');

export async function sendNotificationToUser({
                                                 userId,
                                                 title,
                                                 body,
                                                 type,
                                             }) {
    try {
        const { data } = await sendNotificationFn({
            userId,
            title,
            message: body,
            type,
        });
        console.log('Notification result:', data);
        return data.success;
    } catch (err) {
        console.error('Error calling sendNotification:', err);
        return false;
    }
}
