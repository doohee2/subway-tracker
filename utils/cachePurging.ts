/**
 * PWA 오프라인 민감 캐시 즉시 비우기 (Cache Purging) 모듈
 * 
 * 사용자가 로그아웃하거나 데이터 전체 삭제(초기화) 시,
 * Service Worker가 브라우저 Cache Storage(Cache API) 및 LocalStorage 쪽에
 * 오프라인 지원을 위해 적재해 둔 민감 캐시와 히스토리를 완벽하게 소각·클리어합니다.
 * 평상시 오프라인 백그라운드 캐싱 및 정상 가동에는 아무 영향을 미치지 않습니다.
 */
export async function purgeSensitiveOfflineCaches(): Promise<boolean> {
  let cleared = false;
  try {
    if (typeof window !== "undefined" && "caches" in window && window.caches) {
      const cacheNames = await window.caches.keys();
      const deletePromises = cacheNames.map((name) => {
        return window.caches.delete(name);
      });
      await Promise.allSettled(deletePromises);
      cleared = true;
      console.log("[PWA Security] Offline cache storage completely purged.");
    }
  } catch (error) {
    console.error("[PWA Security] Failed to purge offline cache storage:", error);
  }
  return cleared;
}

/**
 * 로그아웃 또는 전체 데이터 초기화 시 함께 호출하는 종합 소각 핸들러
 * 1) PWA 오프라인 캐시 스토리지 전수 비우기
 * 2) 로컬 스토리지 내 알람 목록 및 역 검색 기록 초기화
 */
export async function wipeAllSensitiveAppData(): Promise<void> {
  await purgeSensitiveOfflineCaches();

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem("subway_alarms");
      localStorage.removeItem("recent_stations");
      console.log("[PWA Security] Local storage sensitive data purged.");
    } catch (error) {
      console.error("[PWA Security] Failed to wipe local storage data:", error);
    }
  }
}
