/* 연구자 마을 서비스 워커: 푸시 알림만 맡는다. 화면·데이터는 캐시하지 않는다(항상 최신). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* 본문이 없어도 기본 문구로 */ }
  const scope = self.registration.scope;
  event.waitUntil((async () => {
    // 앱이 화면에 떠 있으면 마을 안의 알림이 대신하므로 폰 알림은 건너뛴다
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === "visible")) return;
    await self.registration.showNotification(data.title || "연구자 마을", {
      body: data.body || "새 소식이 있어요",
      icon: scope + "icons/icon-192.png",
      badge: scope + "icons/icon-192.png",
      tag: data.tag || "village",
      data: { url: scope },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) { if ("focus" in w) return w.focus(); }
    return self.clients.openWindow(url);
  })());
});
