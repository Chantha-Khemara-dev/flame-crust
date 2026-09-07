// frontend/src/lib/push-notifications.js

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
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
    throw new Error('Push notifications are not supported on this browser or device.');
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notification permission was denied. Please allow notifications in your browser site settings.'
        : 'Notification permission was dismissed.'
    );
  }

  // Fetch VAPID public key from backend
  const keyResponse = await fetch('/api/notifications/vapid-public-key');
  if (!keyResponse.ok) {
    throw new Error('Failed to retrieve VAPID key from server.');
  }
  const { public_key: vapidPublicKey } = await keyResponse.json();
  if (!vapidPublicKey) {
    throw new Error('Server returned an empty VAPID public key.');
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

  const res = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to save subscription to server.');
  }

  return subscription;
}

export async function unsubscribeFromPushNotifications() {
  if (!isPushNotificationSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      }).catch(() => {});

      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Error unsubscribing from push notifications:', err);
  }
}

export async function sendTestPushNotification({ title, body, url, userId, userType } = {}) {
  const existingSub = await getExistingPushSubscription();
  const endpoint = existingSub ? existingSub.endpoint : null;

  const res = await fetch('/api/notifications/test', {
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
