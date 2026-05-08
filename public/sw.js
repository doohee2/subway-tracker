self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (error) {
    payload = { title: "지하철 알림", body: "도착 알림이 도착했습니다." };
  }

  const title = payload.title || "지하철 알림";
  const options = {
    body: payload.body || "곧 도착 예정입니다.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/alarms"));
});
