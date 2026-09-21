// sw-push.js - Flame & Crust Web Push Notification Service Worker Handler

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Flame & Crust',
        body: event.data.text()
      };
    }
  }

  const resolveUrl = (url) => {
    if (!url) return undefined;
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return new URL(url, self.location.origin).href;
    } catch (e) {
      return url;
    }
  };

  const defaultIcon = resolveUrl('/logo-192-v2.png') || resolveUrl('/logo-192.png');
  const title = data.title || 'Flame & Crust';
  const options = {
    body: data.body || 'អ្នកមានការជូនដំណឹងថ្មីពី Flame & Crust',
    icon: resolveUrl(data.icon) || defaultIcon,
    badge: resolveUrl(data.badge) || resolveUrl(data.icon) || defaultIcon,
    image: resolveUrl(data.image) || undefined,
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || (data.data?.orderId ? ('order-' + data.data.orderId) : ('fc-push-' + Date.now())),
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'បើកមើល (Open)' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const rawUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
  let targetUrl = '/';
  try {
    targetUrl = new URL(rawUrl, self.location.origin).href;
  } catch (e) {
    targetUrl = self.location.origin + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async function(clientList) {
      // If an existing window/PWA tab is found under the same origin
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && client.url.includes(self.location.origin)) {
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch (err) {
              console.warn('[SW] client.navigate failed, continuing to focus', err);
            }
          }
          if ('focus' in client) {
            return client.focus();
          }
        }
      }
      // If no tab is open or available, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
