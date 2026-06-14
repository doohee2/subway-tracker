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

/** 즐겨찾기(최근 검색 순) + 일반 최근 검색(최근 검색 순) */
export function getOrderedStationButtons(
  recent: StationRecord[],
  pinned: StationRecord[]
): StationRecord[] {
  const pinnedSorted = [...pinned].sort((a, b) => b.timestamp - a.timestamp);
  const pinnedNames = new Set(pinnedSorted.map((s) => s.name));
  const recentSorted = recent
    .filter((s) => !pinnedNames.has(s.name))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_LIMIT);
  return [...pinnedSorted, ...recentSorted];
}

export function recordSearch(
  station: string,
  recent: StationRecord[],
  pinned: StationRecord[]
): { recent: StationRecord[]; pinned: StationRecord[] } {
  const now = Date.now();
  const isPinned = pinned.some((p) => p.name === station);

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
    return {
      pinned: pinned.filter((p) => p.name !== station),
      recent: [
        { name: station, timestamp: removed.timestamp },
        ...recent.filter((r) => r.name !== station),
      ].slice(0, RECENT_LIMIT),
    };
  }

  const fromRecent = recent.find((r) => r.name === station);
  const timestamp = fromRecent?.timestamp ?? Date.now();
  return {
    pinned: [...pinned, { name: station, timestamp }],
    recent: recent.filter((r) => r.name !== station),
  };
}
