import { SubwayAlarm } from "@/types/alarm";

const STORAGE_KEY = "subway_alarms";
const TWO_MINUTES_MS = 2 * 60 * 1000;

type LegacyAlarm = {
  id?: string;
  stationName?: string;
  arrivalTime?: number;
  notifyAt?: number;
  strategy?: "local" | "qstash";
  qstashMessageId?: string;
};

function toNormalizedAlarm(item: LegacyAlarm): SubwayAlarm | null {
  if (!item?.id || !item.stationName || typeof item.arrivalTime !== "number") {
    return null;
  }

  const strategy = item.strategy === "qstash" ? "qstash" : "local";
  return {
    id: item.id,
    stationName: item.stationName,
    arrivalTime: item.arrivalTime,
    notifyAt:
      typeof item.notifyAt === "number"
        ? item.notifyAt
        : Math.max(0, item.arrivalTime - TWO_MINUTES_MS),
    strategy,
    qstashMessageId: item.qstashMessageId,
  };
}

export function loadAndNormalizeAlarms(): SubwayAlarm[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as LegacyAlarm[];
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map(toNormalizedAlarm)
      .filter((v): v is SubwayAlarm => v !== null);

    const unique = new Map<string, SubwayAlarm>();
    for (const alarm of normalized) {
      const dedupeKey = `${alarm.stationName}-${alarm.arrivalTime}`;
      const existing = unique.get(dedupeKey);
      if (!existing || (existing.strategy === "local" && alarm.strategy === "qstash")) {
        unique.set(dedupeKey, alarm);
      }
    }

    const result = Array.from(unique.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("Failed to load alarms from storage", error);
    return [];
  }
}

export function saveAlarms(alarms: SubwayAlarm[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}
