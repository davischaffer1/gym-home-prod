// Service Worker responsável por notificações ricas
// Colocado em /public para ser servido como arquivo estático

self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  // Quando o usuário toca em uma ação da notificação
  self.addEventListener('notificationclick', (event) => {
    const action = event.action;
    event.notification.close();
  
    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
  
        const client = allClients[0];
  
        if (client) {
          client.focus();
          client.postMessage({
            type: 'notification-action',
            action: action || 'default',
            tag: event.notification.tag,
            data: event.notification.data || {},
          });
        } else {
          const newClient = await clients.openWindow('/');
          if (newClient) {
            setTimeout(() => {
              newClient.postMessage({
                type: 'notification-action',
                action: action || 'default',
                tag: event.notification.tag,
                data: event.notification.data || {},
              });
            }, 1000);
          }
        }
      })()
    );
  });
  
  // Permite que a página peça para mostrar uma notificação via SW
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'show-notification') {
      self.registration.showNotification(event.data.title, event.data.options);
    }
  });