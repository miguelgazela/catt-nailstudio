// Service worker só para notificações do painel. Não guarda páginas em cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let d = {};
  try {
    d = evento.data ? evento.data.json() : {};
  } catch {}
  evento.waitUntil(
    self.registration.showNotification(
      d.titulo || "Catarina Neves Nails Studio",
      {
        body: d.corpo || "",
        icon: "/logo-cn-384.png",
        badge: "/logo-cn-384.png",
        data: {
          url:
            typeof d.url === "string" && d.url.startsWith("/")
              ? d.url
              : "/admin",
        },
      },
    ),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url =
    (evento.notification.data && evento.notification.data.url) || "/admin";
  evento.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((lista) => {
        for (const c of lista) {
          if (c.url.startsWith(self.location.origin) && "focus" in c) {
            c.navigate(url);
            return c.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
