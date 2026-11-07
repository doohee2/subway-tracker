export interface FavoriteTransfer {
  id: string; // `${stationName}_${currentLine}_${currentDirection || 'ALL'}`
  stationName: string;
  currentLine: string;
  currentDirection?: string;
  timestamp: number;
}

const FAVORITES_STORAGE_KEY = "favoriteTransfers";
export const FAVORITE_TRANSFERS_CHANGED_EVENT = "favoriteTransfersChanged";

export function generateFavoriteTransferId(
  stationName: string,
  currentLine: string,
  currentDirection?: string
): string {
  const normStation = stationName.trim();
  const normLine = currentLine.trim();
  const normDir = (currentDirection || "ALL").trim();
  return `${normStation}_${normLine}_${normDir}`;
}

export function loadFavoriteTransfers(): FavoriteTransfer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error("즐겨찾기 환승 정보 로드 실패:", err);
    return [];
  }
}

export function saveFavoriteTransfers(transfers: FavoriteTransfer[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(transfers));
    window.dispatchEvent(new CustomEvent(FAVORITE_TRANSFERS_CHANGED_EVENT));
  } catch (err) {
    console.error("즐겨찾기 환승 정보 저장 실패:", err);
  }
}

export function isFavoriteTransfer(
  stationName: string,
  currentLine: string,
  currentDirection?: string
): boolean {
  const id = generateFavoriteTransferId(stationName, currentLine, currentDirection);
  const list = loadFavoriteTransfers();
  return list.some((item) => item.id === id);
}

export function toggleFavoriteTransfer(
  stationName: string,
  currentLine: string,
  currentDirection?: string
): boolean {
  const id = generateFavoriteTransferId(stationName, currentLine, currentDirection);
  const list = loadFavoriteTransfers();
  const exists = list.some((item) => item.id === id);

  let updated: FavoriteTransfer[];
  if (exists) {
    updated = list.filter((item) => item.id !== id);
  } else {
    const newItem: FavoriteTransfer = {
      id,
      stationName: stationName.trim(),
      currentLine: currentLine.trim(),
      currentDirection: currentDirection ? currentDirection.trim() : undefined,
      timestamp: Date.now(),
    };
    updated = [newItem, ...list];
  }

  saveFavoriteTransfers(updated);
  return !exists; // true if added, false if removed
}

export function removeFavoriteTransfer(id: string): FavoriteTransfer[] {
  const list = loadFavoriteTransfers();
  const updated = list.filter((item) => item.id !== id);
  saveFavoriteTransfers(updated);
  return updated;
}

export function reorderFavoriteTransfers(newList: FavoriteTransfer[]): void {
  saveFavoriteTransfers(newList);
}
