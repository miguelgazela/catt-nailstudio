// Service worker: notificações do painel e página offline. Só guarda em cache a página
// offline (nunca páginas da app nem dados), para não mostrar agendas ou horários antigos.
const CACHE = "cn-offline-v1";
const OFFLINE = [ "/offline.html", "/icons/icon-192.png" ];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE)));
  self.skipWaiting();
});

// Só navegações: se a rede falhar, mostra a página offline. O resto passa direto à rede.
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match("/offline.html").then((r) => r || Response.error()),
    ),
  );
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

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
