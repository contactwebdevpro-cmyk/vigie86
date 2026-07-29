// VIGIE 86 — Service Worker
// Rôle unique : permettre l'affichage de notifications navigateur
// (registration.showNotification) même quand l'onglet n'est pas au premier
// plan, et rouvrir/focus l'appli quand on clique sur une notification.
// Il n'y a AUCUN push serveur ici (pas de Web Push / FCM) : les notifications
// sont déclenchées côté client, depuis l'onglet ouvert, via le listener
// temps réel Firestore (onSnapshot). C'est gratuit et illimité, mais ça ne
// fonctionne que si le navigateur tourne (onglet ouvert ou en arrière-plan) —
// pas si l'appli/le navigateur est totalement fermé. Voir README.md.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const targetId = event.notification.data && event.notification.data.id;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => 'focus' in c);
      if (existing) {
        existing.focus();
        if (targetId && 'postMessage' in existing) {
          existing.postMessage({ type: 'focus-report', id: targetId });
        }
        return null;
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
      return null;
    })
  );
});
