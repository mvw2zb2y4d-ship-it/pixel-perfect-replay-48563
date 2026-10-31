self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// Ready for future server push
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : { title: "Мой день", body: "" };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon-192.png" }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow("/habits"));
});
