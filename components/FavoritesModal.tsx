"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  loadPinnedStations,
  reorderPinnedStations,
  removePinnedStationDirect,
  StationRecord,
} from "@/utils/stationHistory";
import {
  loadFavoriteTransfers,
  removeFavoriteTransfer,
  reorderFavoriteTransfers,
  FavoriteTransfer,
  FAVORITE_TRANSFERS_CHANGED_EVENT,
} from "@/utils/favoriteStorage";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";

interface FavoritesModalProps {
  isOpen: boolean;
  isChildModalOpen?: boolean;
  onClose: () => void;
  onSelectStation: (stationName: string) => void;
  onSelectTransfer: (stationName: string, lineName: string, direction?: string) => void;
}

export default function FavoritesModal({
  isOpen,
  isChildModalOpen,
  onClose,
  onSelectStation,
  onSelectTransfer,
}: FavoritesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [pinnedList, setPinnedList] = useState<StationRecord[]>([]);
  const [transferList, setTransferList] = useState<FavoriteTransfer[]>([]);

  // 지하철역 드래그 앤 드롭 상태
  const [draggedStationIndex, setDraggedStationIndex] = useState<number | null>(null);
  const [dragOverStationIndex, setDragOverStationIndex] = useState<number | null>(null);

  // 환승 정보 드래그 앤 드롭 상태
  const [draggedTransferIndex, setDraggedTransferIndex] = useState<number | null>(null);
  const [dragOverTransferIndex, setDragOverTransferIndex] = useState<number | null>(null);

  // 모바일 터치 드래그 참조 및 스크롤 영역 참조
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchDraggedStationRef = useRef<number | null>(null);
  const touchDragOverStationRef = useRef<number | null>(null);
  const touchDraggedTransferRef = useRef<number | null>(null);
  const touchDragOverTransferRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 오픈 시 및 이벤트 발생 시 최신 데이터 로드
  useEffect(() => {
    if (!isOpen) return;

    const reloadData = () => {
      setPinnedList(loadPinnedStations());
      setTransferList(loadFavoriteTransfers());
    };

    reloadData();

    const handlePinnedChange = () => setPinnedList(loadPinnedStations());
    const handleTransferChange = () => setTransferList(loadFavoriteTransfers());

    window.addEventListener("pinnedStationsChanged", handlePinnedChange);
    window.addEventListener(FAVORITE_TRANSFERS_CHANGED_EVENT, handleTransferChange);

    return () => {
      window.removeEventListener("pinnedStationsChanged", handlePinnedChange);
      window.removeEventListener(FAVORITE_TRANSFERS_CHANGED_EVENT, handleTransferChange);
    };
  }, [isOpen]);

  // ESC 키 닫기 (자식 모달인 환승 카드가 떠 있는 동안에는 즐겨찾기 창이 닫히지 않도록 방어)
  useEffect(() => {
    if (!isOpen || isChildModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isChildModalOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // 1. 역 핀 삭제
  const handleRemovePinned = (stationName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removePinnedStationDirect(stationName);
    setPinnedList(updated);
  };

  // 2. 환승 즐겨찾기 삭제
  const handleRemoveTransfer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeFavoriteTransfer(id);
    setTransferList(updated);
  };

  // 3. 지하철역 드래그 앤 드롭 핸들러
  const handleStationDragStart = (index: number) => {
    setDraggedStationIndex(index);
  };

  const handleStationDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverStationIndex !== index) {
      setDragOverStationIndex(index);
    }
  };

  const handleStationDrop = (index: number) => {
    if (draggedStationIndex === null || draggedStationIndex === index) {
      setDraggedStationIndex(null);
      setDragOverStationIndex(null);
      return;
    }

    const updated = [...pinnedList];
    const [movedItem] = updated.splice(draggedStationIndex, 1);
    updated.splice(index, 0, movedItem);

    setPinnedList(updated);
    reorderPinnedStations(updated);
    setDraggedStationIndex(null);
    setDragOverStationIndex(null);
  };

  const handleStationDragEnd = () => {
    setDraggedStationIndex(null);
    setDragOverStationIndex(null);
  };

  // 4. 환승 정보 드래그 앤 드롭 핸들러
  const handleTransferDragStart = (index: number) => {
    setDraggedTransferIndex(index);
  };

  const handleTransferDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverTransferIndex !== index) {
      setDragOverTransferIndex(index);
    }
  };

  const handleTransferDrop = (index: number) => {
    if (draggedTransferIndex === null || draggedTransferIndex === index) {
      setDraggedTransferIndex(null);
      setDragOverTransferIndex(null);
      return;
    }

    const updated = [...transferList];
    const [movedItem] = updated.splice(draggedTransferIndex, 1);
    updated.splice(index, 0, movedItem);

    setTransferList(updated);
    reorderFavoriteTransfers(updated);
    setDraggedTransferIndex(null);
    setDragOverTransferIndex(null);
  };

  const handleTransferDragEnd = () => {
    setDraggedTransferIndex(null);
    setDragOverTransferIndex(null);
  };

  // 5. 모바일 터치 드래그 앤 드롭 핸들러 (지하철역)
  const handleStationTouchStart = (e: React.TouchEvent, index: number) => {
    touchDraggedStationRef.current = index;
    touchDragOverStationRef.current = index;
    setDraggedStationIndex(index);
    setDragOverStationIndex(index);
  };

  const handleStationTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    // 스크롤 컨테이너 자동 스크롤
    if (scrollContainerRef.current) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const touchY = touch.clientY;
      const scrollZone = 36;
      if (touchY < containerRect.top + scrollZone) {
        scrollContainerRef.current.scrollTop -= 6;
      } else if (touchY > containerRect.bottom - scrollZone) {
        scrollContainerRef.current.scrollTop += 6;
      }
    }

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el?.closest("[data-station-index]");
    if (target) {
      const targetIndex = Number(target.getAttribute("data-station-index"));
      if (!isNaN(targetIndex) && targetIndex !== touchDragOverStationRef.current) {
        touchDragOverStationRef.current = targetIndex;
        setDragOverStationIndex(targetIndex);
      }
    }
  };

  const handleStationTouchEnd = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const from = touchDraggedStationRef.current;
    const to = touchDragOverStationRef.current;

    if (from !== null && to !== null && from !== to) {
      setPinnedList((prev) => {
        const updated = [...prev];
        const [movedItem] = updated.splice(from, 1);
        updated.splice(to, 0, movedItem);
        reorderPinnedStations(updated);
        return updated;
      });
    }

    touchDraggedStationRef.current = null;
    touchDragOverStationRef.current = null;
    setDraggedStationIndex(null);
    setDragOverStationIndex(null);
  };

  const handleStationTouchCancel = () => {
    touchDraggedStationRef.current = null;
    touchDragOverStationRef.current = null;
    setDraggedStationIndex(null);
    setDragOverStationIndex(null);
  };

  // 6. 모바일 터치 드래그 앤 드롭 핸들러 (환승 정보)
  const handleTransferTouchStart = (e: React.TouchEvent, index: number) => {
    touchDraggedTransferRef.current = index;
    touchDragOverTransferRef.current = index;
    setDraggedTransferIndex(index);
    setDragOverTransferIndex(index);
  };

  const handleTransferTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    // 스크롤 컨테이너 자동 스크롤
    if (scrollContainerRef.current) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const touchY = touch.clientY;
      const scrollZone = 36;
      if (touchY < containerRect.top + scrollZone) {
        scrollContainerRef.current.scrollTop -= 6;
      } else if (touchY > containerRect.bottom - scrollZone) {
        scrollContainerRef.current.scrollTop += 6;
      }
    }

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el?.closest("[data-transfer-index]");
    if (target) {
      const targetIndex = Number(target.getAttribute("data-transfer-index"));
      if (!isNaN(targetIndex) && targetIndex !== touchDragOverTransferRef.current) {
        touchDragOverTransferRef.current = targetIndex;
        setDragOverTransferIndex(targetIndex);
      }
    }
  };

  const handleTransferTouchEnd = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const from = touchDraggedTransferRef.current;
    const to = touchDragOverTransferRef.current;

    if (from !== null && to !== null && from !== to) {
      setTransferList((prev) => {
        const updated = [...prev];
        const [movedItem] = updated.splice(from, 1);
        updated.splice(to, 0, movedItem);
        reorderFavoriteTransfers(updated);
        return updated;
      });
    }

    touchDraggedTransferRef.current = null;
    touchDragOverTransferRef.current = null;
    setDraggedTransferIndex(null);
    setDragOverTransferIndex(null);
  };

  const handleTransferTouchCancel = () => {
    touchDraggedTransferRef.current = null;
    touchDragOverTransferRef.current = null;
    setDraggedTransferIndex(null);
    setDragOverTransferIndex(null);
  };

  return createPortal(
    <div
      className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center dark:bg-slate-950/60 bg-slate-900/30 backdrop-blur-sm p-2 sm:p-3 transition-colors"
      onClick={onClose}
    >
      <div
        style={{ width: "min(480px, calc(100vw - 1.5rem))", height: "calc(100vh - 1.5rem)", flexShrink: 0 }}
        className="rounded-2xl dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border p-3.5 sm:p-4 shadow-2xl transition-all max-h-[96vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-amber-500 text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              즐겨찾기 관리
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div ref={scrollContainerRef} className="mt-2.5 overflow-y-auto space-y-3.5 pr-1 flex-1 min-h-0">
          {/* 섹션 1: 즐겨찾기 지하철역 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-primary text-[17px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  push_pin
                </span>
                즐겨찾기 지하철역
                <span className="text-xs px-2 py-0.2 rounded-full font-bold bg-primary/10 text-primary">
                  {pinnedList.length}
                </span>
              </h4>
            </div>

            {pinnedList.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 dark:text-slate-500 rounded-lg border border-dashed dark:border-slate-800 border-slate-200">
                등록된 즐겨찾기 역이 없습니다.
              </div>
            ) : (
              <div className="space-y-1">
                {pinnedList.map((station, index) => {
                  const isDragging = draggedStationIndex === index;
                  const isOver = dragOverStationIndex === index;

                  return (
                    <div
                      key={station.name}
                      data-station-index={index}
                      draggable
                      onDragStart={() => handleStationDragStart(index)}
                      onDragOver={(e) => handleStationDragOver(e, index)}
                      onDrop={() => handleStationDrop(index)}
                      onDragEnd={handleStationDragEnd}
                      onClick={() => {
                        onSelectStation(station.name);
                        onClose();
                      }}
                      className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg border transition-all cursor-pointer group select-none ${
                        isDragging
                          ? "opacity-40 border-amber-500/50 bg-amber-50/20"
                          : isOver
                          ? "border-primary bg-primary/5"
                          : "dark:border-slate-800/80 border-slate-200 dark:bg-slate-800/60 bg-slate-50 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* 드래그 핸들 아이콘 (모바일 터치 및 데스크톱) */}
                        <span
                          className="material-symbols-outlined text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing text-[16px] shrink-0 touch-none p-1.5 -m-1.5 select-none"
                          title="드래그하여 순서 변경"
                          onClick={(e) => e.stopPropagation()}
                          onTouchStart={(e) => handleStationTouchStart(e, index)}
                          onTouchMove={handleStationTouchMove}
                          onTouchEnd={handleStationTouchEnd}
                          onTouchCancel={handleStationTouchCancel}
                        >
                          drag_indicator
                        </span>
                        <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
                          directions_subway
                        </span>
                        <span className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-white truncate">
                          {station.name.endsWith("역") ? station.name : `${station.name}역`}
                        </span>
                      </div>

                      <div className="flex items-center shrink-0">
                        {/* X 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={(e) => handleRemovePinned(station.name, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="즐겨찾기 삭제"
                          aria-label="즐겨찾기 삭제"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 섹션 2: 즐겨찾기 환승 정보 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-[17px]">
                  swap_horiz
                </span>
                즐겨찾기 환승 정보
                <span className="text-xs px-2 py-0.2 rounded-full font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {transferList.length}
                </span>
              </h4>
            </div>

            {transferList.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 dark:text-slate-500 rounded-lg border border-dashed dark:border-slate-800 border-slate-200">
                등록된 환승 정보가 없습니다.
              </div>
            ) : (
              <div className="space-y-1">
                {transferList.map((item, index) => {
                  const lineColor = getLineColor(item.currentLine);
                  const lineText = getLineNumberText(item.currentLine);
                  const displayStation = item.stationName.endsWith("역")
                    ? item.stationName
                    : `${item.stationName}역`;
                  const isDragging = draggedTransferIndex === index;
                  const isOver = dragOverTransferIndex === index;

                  return (
                    <div
                      key={item.id}
                      data-transfer-index={index}
                      draggable
                      onDragStart={() => handleTransferDragStart(index)}
                      onDragOver={(e) => handleTransferDragOver(e, index)}
                      onDrop={() => handleTransferDrop(index)}
                      onDragEnd={handleTransferDragEnd}
                      onClick={() => {
                        onSelectTransfer(item.stationName, item.currentLine, item.currentDirection);
                      }}
                      className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg border transition-all cursor-pointer group select-none ${
                        isDragging
                          ? "opacity-40 border-amber-500/50 bg-amber-50/20"
                          : isOver
                          ? "border-amber-500 bg-amber-500/5"
                          : "dark:border-slate-800/80 border-slate-200 dark:bg-slate-800/60 bg-slate-50 hover:border-amber-500/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {/* 1줄 표현: 드래그 핸들 + 노선 뱃지 + 환승역이름 + 노선-방면 */}
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span
                          className="material-symbols-outlined text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing text-[16px] shrink-0 touch-none p-1.5 -m-1.5 select-none"
                          title="드래그하여 순서 변경"
                          onClick={(e) => e.stopPropagation()}
                          onTouchStart={(e) => handleTransferTouchStart(e, index)}
                          onTouchMove={handleTransferTouchMove}
                          onTouchEnd={handleTransferTouchEnd}
                          onTouchCancel={handleTransferTouchCancel}
                        >
                          drag_indicator
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full ${lineColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}
                        >
                          {lineText}
                        </span>
                        <span className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-white truncate">
                          {displayStation}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600 text-xs shrink-0">·</span>
                        <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                          {item.currentLine} {item.currentDirection ? `${item.currentDirection} ` : ""}하차
                        </span>
                      </div>

                      {/* X 삭제 버튼 */}
                      <div className="flex items-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleRemoveTransfer(item.id, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                          title="환승 즐겨찾기 삭제"
                          aria-label="환승 즐겨찾기 삭제"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="mt-2 pt-2 border-t dark:border-slate-800 border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
