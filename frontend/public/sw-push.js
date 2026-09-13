// sw-push.js - Flame & Crust Web Push Notification Service Worker Handler

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
        title: '🔥 Flame & Crust',
        body: event.data.text()
      };
    }
  }

  const title = data.title || '🔥 Flame & Crust';
  const options = {
    body: data.body || 'អ្នកមានការជូនដំណឹងថ្មីពី Flame & Crust',
    icon: data.icon || '/logo-192.png',
    badge: data.badge || '/logo-192.png',
    image: data.image || undefined,
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

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a tab is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (client.url && client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
