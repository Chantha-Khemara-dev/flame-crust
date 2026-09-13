// frontend/src/lib/push-notifications.js
import { getApiUrl } from './api';

export const DEFAULT_VAPID_PUBLIC_KEY = 'BL14cYA9vTebqA9HDHOl4o78Bzv7A7DIQfxDqYgPHZSpp8WloY2V8V2qe6Ri4bKsl_KSXr-iJuOzv_AsB_Rl0Qw';

export function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Invalid VAPID public key');
  }
  // Strip any accidental quotes or whitespace
  const cleanKey = base64String.trim().replace(/^["']|["']$/g, '');
  const padding = '='.repeat((4 - (cleanKey.length % 4)) % 4);
  const base64 = (cleanKey + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted', 'denied', 'default'
}

export async function getExistingPushSubscription() {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.error('Failed to get existing push subscription:', err);
    return null;
  }
}

export async function subscribeToPushNotifications({ userType = 'CUSTOMER', userId = null } = {}) {
  if (!isPushNotificationSupported()) {
    throw new Error('Browser របស់អ្នកមិនទាន់គាំទ្រ Web Push Notification នៅឡើយទេ។');
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'ការអនុញ្ញាត Notification ត្រូវបានបដិសេធ (Denied)។ សូមបើក Allow នៅក្នុង Site Settings នៃ Browser។'
        : 'មិនបានអនុញ្ញាត Notification'
    );
  }

  // Fetch VAPID public key from backend or fallback to default
  let vapidPublicKey = DEFAULT_VAPID_PUBLIC_KEY;
  try {
    const apiUrl = getApiUrl();
    const keyResponse = await fetch(`${apiUrl}/notifications/vapid-public-key`);
    if (keyResponse.ok) {
      const data = await keyResponse.json();
      if (data && (data.public_key || data.publicKey)) {
        vapidPublicKey = data.public_key || data.publicKey;
      }
    }
  } catch (err) {
    console.warn('Using default VAPID public key due to fetch error:', err);
  }

  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  // Wait for service worker ready
  const registration = await navigator.serviceWorker.ready;

  // Subscribe with PushManager
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
  }

  const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
  const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

  const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : null;
  const auth = rawAuth ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth))) : null;

  // Send subscription to backend
  const payload = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh,
      auth
    },
    user_type: userType,
    user_id: userId,
    user_agent: navigator.userAgent
  };

  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Backend subscription save warning:', errData.error);
    }
  } catch (err) {
    console.warn('Could not save push subscription to backend:', err);
  }

  return subscription;
}

export async function unsubscribeFromPushNotifications() {
  if (!isPushNotificationSupported()) return;

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 1000))
    ]).catch(() => null);

    if (!registration || !registration.pushManager) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/notifications/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      } catch (e) {}

      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Error unsubscribing from push notifications:', err);
  }
}

export async function sendTestPushNotification({ title, body, url, userId, userType } = {}) {
  const existingSub = await getExistingPushSubscription();
  const endpoint = existingSub ? existingSub.endpoint : null;

  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/notifications/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title || '🔥 Flame & Crust',
      body: body || 'សួស្តី! ការជូនដំណឹង (Push Notification) ដំណើរការបានជោគជ័យហើយ 🎉',
      url: url || '/',
      endpoint,
      user_id: userId,
      user_type: userType
    })
  });

  if (!res.ok) {
    throw new Error('Failed to send test push notification');
  }

  return await res.json();
}

