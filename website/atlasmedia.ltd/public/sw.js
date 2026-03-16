self.addEventListener("push", function(event) {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = { body: data.body||"", icon: data.icon||"/icon-192.png", badge: "/icon-72.png", image: data.image||null, tag: data.tag||"atlas-news", requireInteraction: data.breaking||false, data: { url: data.url||"/" }, actions: [{ action: "open", title: "Leer noticia" }] };
    event.waitUntil(self.registration.showNotification(data.title||"Atlas Media Network", options));
  } catch (err) { console.error("Push error:", err); }
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
    for (const client of clientList) { if (client.url === url && "focus" in client) return client.focus(); }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});

self.addEventListener("install", function(event) { self.skipWaiting(); });
self.addEventListener("activate", function(event) { event.waitUntil(clients.claim()); });
