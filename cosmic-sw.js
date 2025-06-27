// Place ce fichier à la racine du site (là où se trouve index.html)
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => self.clients.claim());

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      for (let client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data && event.notification.data.url ? event.notification.data.url : '/');
      }
    })
  );
});