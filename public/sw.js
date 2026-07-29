importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

if (typeof workbox !== "undefined" && workbox) {
  const { registerRoute } = workbox.routing;
  const { StaleWhileRevalidate, CacheFirst } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;

  // 1. 외부(Cross-Origin) 도메인 이미지 전용 런타임 캐시 규칙 (우선순위 상단 배치)
  // 구글 OAuth 아바타(*.googleusercontent.com, *.githubusercontent.com) 및 외부 CDN 등
  // 당사 호스트(self.location.origin)가 아닌 외부 도메인에서 호출하는 이미지
  registerRoute(
    ({ request, url }) =>
      request.destination === "image" && url.origin !== self.location.origin,
    new StaleWhileRevalidate({
      cacheName: "external-cross-origin-images",
      plugins: [
        // 외부 리소스의 Opaque(상태 코드 0) 응답 충돌 방지를 위해 0, 200 허용
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 최대 30일 유효기한(TTL) 제한
        }),
      ],
    })
  );

  // 2. 내부(Self Origin) 불변 고정 자산 전용 CacheFirst 규칙 (하단 유지)
  // Next.js 빌드 자산(/_next/static/**), 내부 CSS/Script/Font, 앱 내부 로컬 정적 이미지
  registerRoute(
    ({ request, url }) => {
      if (url.origin !== self.location.origin) return false;
      return (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/_next/image") ||
        ["style", "script", "font", "image", "manifest"].includes(request.destination)
      );
    },
    new CacheFirst({
      cacheName: "internal-static-immutable-assets",
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1년짜리 극강의 오프라인 즉각 로딩
        }),
      ],
    })
  );
}

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
