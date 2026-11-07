export interface StationRecord {
  name: string;
  timestamp: number;
}

const RECENT_LIMIT = 5;

function parseStationRecords(raw: unknown): StationRecord[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return (raw as string[]).map((name) => ({ name, timestamp: 0 }));
  }
  return raw as StationRecord[];
}

export function loadPinnedStations(): StationRecord[] {
  try {
    const saved = localStorage.getItem("pinnedStations");
    if (!saved) return [];
    return parseStationRecords(JSON.parse(saved));
  } catch {
    return [];
  }
}

export function loadRecentStations(): StationRecord[] {
  try {
    const saved = localStorage.getItem("recentStations");
    if (!saved) return [];
    return parseStationRecords(JSON.parse(saved));
  } catch {
    return [];
  }
}

export function savePinnedStations(records: StationRecord[]) {
  localStorage.setItem("pinnedStations", JSON.stringify(records));
}

export function saveRecentStations(records: StationRecord[]) {
  localStorage.setItem("recentStations", JSON.stringify(records));
}

/** 기존 merged recentStations 데이터와 pinnedStations를 정규화한다. */
export function normalizeStationStorage(
  recent: StationRecord[],
  pinned: StationRecord[]
): { recent: StationRecord[]; pinned: StationRecord[] } {
  const pinnedMap = new Map(pinned.map((p) => [p.name, p]));

  for (const entry of recent) {
    const existing = pinnedMap.get(entry.name);
    if (existing && entry.timestamp > existing.timestamp) {
      pinnedMap.set(entry.name, { ...existing, timestamp: entry.timestamp });
    }
  }

  const normalizedPinned = Array.from(pinnedMap.values());
  const pinnedNames = new Set(normalizedPinned.map((p) => p.name));
  const normalizedRecent = recent
    .filter((r) => !pinnedNames.has(r.name))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_LIMIT);

  return { recent: normalizedRecent, pinned: normalizedPinned };
}

export function getMostRecentStation(
  recent: StationRecord[],
  pinned: StationRecord[]
): StationRecord | null {
  const pinnedNames = new Set(pinned.map((p) => p.name));
  const combined = [
    ...pinned,
    ...recent.filter((r) => !pinnedNames.has(r.name)),
  ];
  if (combined.length === 0) return null;
  return combined.reduce((prev, curr) =>
    curr.timestamp > prev.timestamp ? curr : prev
  );
}

/** 즐겨찾기(사용자 지정 순서 유지) + 일반 최근 검색(최근 검색 순) */
export function getOrderedStationButtons(
  recent: StationRecord[],
  pinned: StationRecord[]
): StationRecord[] {
  // 사용자가 즐겨찾기 관리 모달에서 드래그하여 조정한 순서(pinned 배열 순서)를 그대로 유지
  const pinnedNames = new Set(pinned.map((s) => s.name));
  const recentSorted = recent
    .filter((s) => !pinnedNames.has(s.name))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_LIMIT);
  return [...pinned, ...recentSorted];
}

export function recordSearch(
  station: string,
  recent: StationRecord[],
  pinned: StationRecord[]
): { recent: StationRecord[]; pinned: StationRecord[] } {
  const now = Date.now();
  const isPinned = pinned.some((p) => p.name === station);

  // 핀으로 등록된 역은 검색하더라도 순서(위치)를 바꾸지 않고 timestamp만 갱신
  const newPinned = isPinned
    ? pinned.map((p) => (p.name === station ? { ...p, timestamp: now } : p))
    : pinned;

  const newRecent = isPinned
    ? recent.filter((r) => r.name !== station)
    : [{ name: station, timestamp: now }, ...recent.filter((r) => r.name !== station)].slice(
        0,
        RECENT_LIMIT
      );

  return { recent: newRecent, pinned: newPinned };
}

export function togglePin(
  station: string,
  recent: StationRecord[],
  pinned: StationRecord[]
): { recent: StationRecord[]; pinned: StationRecord[] } {
  const isPinned = pinned.some((p) => p.name === station);

  if (isPinned) {
    const removed = pinned.find((p) => p.name === station)!;
    const newPinned = pinned.filter((p) => p.name !== station);
    const newRecent = [
      { name: station, timestamp: removed.timestamp },
      ...recent.filter((r) => r.name !== station),
    ].slice(0, RECENT_LIMIT);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pinnedStationsChanged"));
    }

    return {
      pinned: newPinned,
      recent: newRecent,
    };
  }

  const fromRecent = recent.find((r) => r.name === station);
  const timestamp = fromRecent?.timestamp ?? Date.now();
  const newPinned = [...pinned, { name: station, timestamp }];
  const newRecent = recent.filter((r) => r.name !== station);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinnedStationsChanged"));
  }

  return {
    pinned: newPinned,
    recent: newRecent,
  };
}

/** 즐겨찾기(핀) 역 목록 순서 재정렬 및 스토리지 저장 */
export function reorderPinnedStations(newPinned: StationRecord[]): void {
  savePinnedStations(newPinned);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinnedStationsChanged"));
  }
}

/** 즐겨찾기(핀) 단건 삭제 */
export function removePinnedStationDirect(stationName: string): StationRecord[] {
  const current = loadPinnedStations();
  const updated = current.filter((p) => p.name !== stationName);
  savePinnedStations(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinnedStationsChanged"));
  }
  return updated;
}
