"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NormalizedTransferRecord } from "@/types/transfer";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";

interface TransferInfoSlideCardProps {
  isOpen: boolean;
  stationName: string;
  currentLine: string;
  currentDirection?: string;
  transfers: NormalizedTransferRecord[];
  onClose: () => void;
}

export default function TransferInfoSlideCard({
  isOpen,
  stationName,
  currentLine,
  currentDirection,
  transfers,
  onClose,
}: TransferInfoSlideCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC 키 닫기 지원
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const currentLineColor = getLineColor(currentLine);
  const currentLineText = getLineNumberText(currentLine);
  const displayStationName = stationName.endsWith("역") ? stationName : `${stationName}역`;

  return createPortal(
    <div 
      className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-end sm:items-center justify-center dark:bg-slate-950/60 bg-slate-900/30 backdrop-blur-sm transition-colors p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        style={{ width: 'min(500px, 100vw)', flexShrink: 0 }}
        className="rounded-t-2xl sm:rounded-2xl dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border p-5 shadow-2xl transition-all max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 드래그 핸들 (모바일) */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />

        {/* 헤더 */}
        <div className="flex items-start justify-between pb-3 border-b dark:border-slate-800 border-slate-200">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-5 h-5 rounded-full ${currentLineColor} text-white flex items-center justify-center text-[10px] font-bold`}>
                {currentLineText}
              </span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {currentLine} {currentDirection ? `${currentDirection} ` : ""}하차
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>🔀</span> {displayStationName} 빠른 환승 위치
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

        {/* 안내 리스트 */}
        <div className="mt-3 overflow-y-auto space-y-2.5 pr-1 max-h-[60vh]">
          {transfers.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              해당 진행 방향의 환승 정보가 존재하지 않습니다.
            </div>
          ) : (
            transfers.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border dark:border-slate-800/80 border-slate-200 dark:bg-slate-800/60 bg-slate-50 flex items-center justify-between gap-3 transition-colors hover:border-indigo-400/50"
              >
                <div className="space-y-1.5 min-w-0">
                  {/* 갈아탈 노선 뱃지들 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.target_lines.map((line) => {
                      const color = getLineColor(line);
                      const text = getLineNumberText(line);
                      return (
                        <span
                          key={line}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-slate-700 shadow-sm"
                          style={{ backgroundColor: color.startsWith("bg-") ? undefined : color }}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${color} text-white flex items-center justify-center text-[9px] font-bold`}>
                            {text}
                          </span>
                          <span>{line}</span>
                        </span>
                      );
                    })}
                  </div>

                  {/* 목적 방면 */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                    목적지:{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.target_direction === "전체" ? "전 방면 환승" : item.target_direction}
                    </span>
                  </div>

                  {/* 승차 방면 보조 문구 */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    현재 승차: {item.current_direction}
                  </div>
                </div>

                {/* 빠른 탑승 위치 강조 */}
                <div className="text-right shrink-0 pl-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                    빠른 하차문
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    🚪 {item.boarding_position}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 닫기 버튼 */}
        <div className="mt-4 pt-3 border-t dark:border-slate-800 border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
