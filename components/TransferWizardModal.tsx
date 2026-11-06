"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NormalizedTransferRecord } from "@/types/transfer";
import {
  getAvailableSourceLines,
  getAvailableDirectionsForLine,
  SourceDirectionGroup,
  normalizeStationKey,
} from "@/utils/transferData";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";

interface TransferWizardModalProps {
  isOpen: boolean;
  stationName: string;
  initialLineName?: string;
  initialUpdnLine?: string;
  onClose: () => void;
}

export default function TransferWizardModal({
  isOpen,
  stationName,
  initialLineName,
  initialUpdnLine,
  onClose,
}: TransferWizardModalProps) {
  const [mounted, setMounted] = useState(false);

  // 마법사 단계: 1(출발 노선/방면), 2(목적 노선/방면), 3(결과)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSourceLine, setSelectedSourceLine] = useState<string>("");
  const [selectedDirectionGroup, setSelectedDirectionGroup] = useState<SourceDirectionGroup | null>(null);
  const [selectedTargetRecord, setSelectedTargetRecord] = useState<NormalizedTransferRecord | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달이 열릴 때 초기 상태 스마트 셋업
  useEffect(() => {
    if (!isOpen) return;

    const availableLines = getAvailableSourceLines(stationName);
    const matchedLine = initialLineName
      ? availableLines.find((l) => l.includes(initialLineName) || initialLineName.includes(l))
      : null;

    if (matchedLine) {
      setSelectedSourceLine(matchedLine);
      const dirGroups = getAvailableDirectionsForLine(stationName, matchedLine);

      // initialUpdnLine ("0" | "1")과 부합하는 방면 찾기
      const isUp = initialUpdnLine === "0" || initialUpdnLine?.includes("상행") || initialUpdnLine?.includes("외선");
      const targetUpdn = isUp ? "0" : "1";

      const matchedDir =
        dirGroups.find((g) => g.updnCode === targetUpdn) ||
        dirGroups.find((g) => g.updnCode === "ALL") ||
        (dirGroups.length === 1 ? dirGroups[0] : null);

      if (matchedDir) {
        setSelectedDirectionGroup(matchedDir);
        setStep(2); // 스마트 단축: 2단계(갈아탈 노선 선택)로 바로 진입!
        return;
      }

      setStep(1);
      setSelectedDirectionGroup(null);
    } else {
      setStep(1);
      setSelectedSourceLine(availableLines[0] || "");
      setSelectedDirectionGroup(null);
    }
    setSelectedTargetRecord(null);
  }, [isOpen, stationName, initialLineName, initialUpdnLine]);

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

  const displayStationName = stationName.endsWith("역") ? stationName : `${stationName}역`;
  const availableLines = getAvailableSourceLines(stationName);
  const availableDirections = selectedSourceLine
    ? getAvailableDirectionsForLine(stationName, selectedSourceLine)
    : [];

  const handleSelectLine = (line: string) => {
    setSelectedSourceLine(line);
    const dirs = getAvailableDirectionsForLine(stationName, line);
    if (dirs.length === 1) {
      setSelectedDirectionGroup(dirs[0]);
      setStep(2);
    } else {
      setSelectedDirectionGroup(null);
    }
  };

  const handleSelectDirection = (group: SourceDirectionGroup) => {
    setSelectedDirectionGroup(group);
    setStep(2);
  };

  const handleSelectTarget = (record: NormalizedTransferRecord) => {
    setSelectedTargetRecord(record);
    setStep(3);
  };

  const resetToStep1 = () => {
    setStep(1);
    setSelectedTargetRecord(null);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border p-5 sm:p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-500 text-sm">⚡</span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {displayStationName} 환승 맞춤 가이드
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

        {/* 바디 (단계별) */}
        <div className="mt-4 overflow-y-auto space-y-4 pr-1 flex-1">
          {/* STEP 1: 현재 승차한 노선 및 방면 선택 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  1단계: 출발 정보 선택
                </p>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  현재 타고 계신(도착한) 노선을 선택하세요
                </h4>
              </div>

              {availableLines.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  해당 역에 등록된 환승 정보가 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableLines.map((line) => {
                    const isSelected = selectedSourceLine === line;
                    const color = getLineColor(line);
                    const text = getLineNumberText(line);

                    return (
                      <button
                        key={line}
                        type="button"
                        onClick={() => handleSelectLine(line)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 dark:bg-indigo-950/40 bg-indigo-50/80 shadow-sm"
                            : "dark:border-slate-800 border-slate-200 dark:bg-slate-800/60 bg-slate-50 hover:border-slate-400"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                          {text}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {line}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 노선이 선택되었을 때 방면 선택 */}
              {selectedSourceLine && availableDirections.length > 0 && (
                <div className="pt-2 border-t dark:border-slate-800 border-slate-200 space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {selectedSourceLine} 승차 방면을 선택하세요:
                  </p>
                  <div className="space-y-2">
                    {availableDirections.map((dir) => (
                      <button
                        key={dir.directionText}
                        type="button"
                        onClick={() => handleSelectDirection(dir)}
                        className="w-full p-3 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-800/80 bg-slate-50 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all text-left flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {dir.updnCode === "0" ? "상행/외선" : dir.updnCode === "1" ? "하행/내선" : "양방향"}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {dir.directionText}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-slate-400">
                          chevron_right
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: 갈아탈 목적 노선 및 방면 선택 */}
          {step === 2 && selectedDirectionGroup && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">
                    2단계: 갈아탈 노선 선택
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white">{selectedSourceLine}</span>
                    <span>({selectedDirectionGroup.directionText}) 하차</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetToStep1}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  출발 변경
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  어느 노선·방면으로 갈아타시나요?
                </p>

                {selectedDirectionGroup.records.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => handleSelectTarget(rec)}
                    className="w-full p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-800/80 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all text-left flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0">
                      {/* 목적 노선 배지들 */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rec.target_lines.map((line) => {
                          const color = getLineColor(line);
                          const text = getLineNumberText(line);
                          return (
                            <span
                              key={line}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-slate-700 shadow-sm"
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
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        방면:{" "}
                        <span className="text-slate-900 dark:text-white font-bold">
                          {rec.target_direction === "전체" ? "전 방면 환승" : rec.target_direction}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0 group-hover:translate-x-0.5 transition-transform">
                      <span>선택</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: 최종 추천 탑승문(칸-문) 결과 카드 */}
          {step === 3 && selectedTargetRecord && (
            <div className="space-y-4 text-center py-2">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-100 to-emerald-500/10 dark:from-indigo-950/50 dark:via-slate-800/80 dark:to-emerald-950/40 border border-emerald-500/30 shadow-lg">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mb-2">
                  추천 빠른 환승 위치
                </span>

                <div className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 my-3 tracking-tight">
                  🚪 {selectedTargetRecord.boarding_position}
                </div>

                <div className="mt-4 pt-3 border-t dark:border-slate-700/60 border-slate-200/80 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {selectedTargetRecord.current_line} ({selectedTargetRecord.current_direction})
                    <span className="mx-1 text-slate-400">➔</span>
                    {selectedTargetRecord.target_lines.join(", ")} ({selectedTargetRecord.target_direction})
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    위 번호의 출입문에서 내리시면 갈아타는 통로와 가장 가깝습니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl border dark:border-slate-800 border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  다른 노선 선택
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-md cursor-pointer"
                >
                  확인 완료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
