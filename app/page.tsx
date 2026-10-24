"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SearchSection from "@/components/SearchSection";
import ArrivalCard from "@/components/ArrivalCard";
import { ArrivalGroup, RealtimeArrival } from "@/types/subway";
import { parseKSTDate, formatKSTTime, getStationRealName, getNextStation, getDirectionLabel } from "@/utils/subwayData";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";
import { createClientError, extractClientErrorInfo, formatUserErrorMessage } from "@/utils/errorMessage";
import {
  StationRecord,
  loadPinnedStations,
  loadRecentStations,
  savePinnedStations,
  saveRecentStations,
  normalizeStationStorage,
  getMostRecentStation,
  getOrderedStationButtons,
  recordSearch,
  togglePin,
} from "@/utils/stationHistory";

const getGroupKey = (group: ArrivalGroup) =>
  `${group.lineName}_${group.updnLine ?? ""}`;

const isUpbound = (updnLine?: string) => {
  if (!updnLine) return true;
  return updnLine === "0" || updnLine.includes("상행") || updnLine.includes("외선");
};

const getDisplayGroups = (
  groups: ArrivalGroup[],
  line: string,
  order: "up_first" | "down_first"
) => {
  return groups
    .filter((group) => line === "ALL" || group.lineName === line)
    .sort((a, b) => {
      const lineCompare = a.lineName.localeCompare(b.lineName);
      if (lineCompare !== 0) return lineCompare;

      const aIsUp = isUpbound(a.updnLine ?? a.arrivals[0]?.updnLine);
      const bIsUp = isUpbound(b.updnLine ?? b.arrivals[0]?.updnLine);

      if (aIsUp !== bIsUp) {
        return order === "up_first" ? (aIsUp ? -1 : 1) : (aIsUp ? 1 : -1);
      }

      return a.destination.localeCompare(b.destination);
    });
};

export default function Home() {
  const [recentSearches, setRecentSearches] = useState<StationRecord[]>([]);
  const [pinnedStations, setPinnedStations] = useState<StationRecord[]>([]);
  const [arrivalGroups, setArrivalGroups] = useState<ArrivalGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedLine, setSelectedLine] = useState<string>("ALL");
  const [directionOrder, setDirectionOrder] = useState<"up_first" | "down_first">("up_first");
  const [currentStation, setCurrentStation] = useState<string>("");
  const [initialSearchValue, setInitialSearchValue] = useState("");
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
    time?: string;
  }>({ type: "idle", message: "" });

  const recentRef = useRef<StationRecord[]>([]);
  const pinnedRef = useRef<StationRecord[]>([]);

  useEffect(() => {
    recentRef.current = recentSearches;
  }, [recentSearches]);

  useEffect(() => {
    pinnedRef.current = pinnedStations;
  }, [pinnedStations]);

  const saveRecentSearch = (station: string) => {
    const { recent, pinned } = recordSearch(station, recentRef.current, pinnedRef.current);
    setRecentSearches(recent);
    setPinnedStations(pinned);
    recentRef.current = recent;
    pinnedRef.current = pinned;
    saveRecentStations(recent);
    savePinnedStations(pinned);
  };

  const handlePinToggle = (station: string) => {
    const { recent, pinned } = togglePin(station, recentRef.current, pinnedRef.current);
    setRecentSearches(recent);
    setPinnedStations(pinned);
    recentRef.current = recent;
    pinnedRef.current = pinned;
    saveRecentStations(recent);
    savePinnedStations(pinned);
  };

  const handleSearch = async (station: string, targetLine: string = "ALL") => {
    if (!station) return;

    const realStationName = getStationRealName(station);
    const isDifferentStation = realStationName !== currentStation;

    setCurrentStation(realStationName);
    setStatus({ type: "loading", message: "조회 중입니다..." });
    if (isDifferentStation) {
      setArrivalGroups([]);
    }

    try {
      const res = await fetch(`/api/subway?station=${encodeURIComponent(realStationName)}`);
      const data = await res.json();

      if (!res.ok) {
        throw createClientError(data.code ?? "SUBWAY_FETCH_FAILED", data.error || "도착 정보를 불러오지 못했습니다.");
      }

      if (!data.realtimeArrivalList || data.realtimeArrivalList.length === 0) {
        setStatus({
          type: "error",
          message: "검색 결과가 없습니다. 역 이름을 다시 확인해주세요.",
        });
        return;
      }

      saveRecentSearch(realStationName);

      const groupsMap = new Map<string, ArrivalGroup>();

      data.realtimeArrivalList.forEach((item: RealtimeArrival) => {
        let lineName = item.subwayId;
        const lineIdMap: Record<string, string> = {
          "1001": "1호선", "1002": "2호선", "1003": "3호선", "1004": "4호선",
          "1005": "5호선", "1006": "6호선", "1007": "7호선", "1008": "8호선",
          "1009": "9호선", "1063": "경의중앙선", "1065": "공항철도", "1067": "경춘선",
          "1075": "수인분당선", "1077": "신분당선", "1092": "우이신설선", "1093": "서해선"
        };
        if (lineIdMap[item.subwayId]) {
          lineName = lineIdMap[item.subwayId];
        }

        const isUp = item.updnLine === "0" || item.updnLine.includes("상행") || item.updnLine.includes("외선");
        const normalizedUpdn = isUp ? "0" : "1";
        const groupKey = `${lineName}_${normalizedUpdn}`;

        if (!groupsMap.has(groupKey)) {
          const directionLabel = getDirectionLabel(lineName, normalizedUpdn);
          const nextStation = getNextStation(
            realStationName,
            lineName,
            normalizedUpdn,
            item.bstatnNm,
            item.trainLineNm
          );

          groupsMap.set(groupKey, {
            lineName,
            lineNumber: lineName,
            destination: item.trainLineNm,
            directionLabel,
            nextStationName: nextStation,
            updnLine: normalizedUpdn,
            arrivals: [],
          });
        }

        const group = groupsMap.get(groupKey)!;

        let estTime = item.arvlMsg2;
        let isUrgent = false;

        if (estTime.includes("진입") || estTime.includes("도착") || estTime.includes("전역")) {
          isUrgent = true;
        }

        let calculatedArrivalTime = "";
        if (item.barvlDt && item.barvlDt !== "0") {
          try {
            const recptnTime = parseKSTDate(item.recptnDt);
            const arrivalDate = new Date(recptnTime.getTime() + parseInt(item.barvlDt) * 1000);
            calculatedArrivalTime = formatKSTTime(arrivalDate);
          } catch (e) {
            console.error("Time calculation error:", e);
          }
        }

        const rawSttus = item.btrainSttus?.trim() || "일반";
        const isExpress = rawSttus !== "일반";

        group.arrivals.push({
          id: item.btrainNo + "_" + item.barvlDt + "_" + Math.random(),
          estimatedTimeMsg: estTime,
          currentLocationMsg: item.arvlMsg3,
          trainNumber: item.btrainNo,
          isUrgent,
          updnLine: normalizedUpdn,
          bstatnNm: item.bstatnNm,
          subwayId: item.subwayId,
          statnNm: realStationName,
          recptnDt: item.recptnDt,
          calculatedArrivalTime,
          btrainSttus: rawSttus,
          isExpress,
          barvlDt: item.barvlDt,
          destination: item.trainLineNm,
        });
      });

      // 각 그룹별 후처리 (도착 시간순 정렬 및 방면 요약 정리)
      groupsMap.forEach((group) => {
        // 1. 도착 시간순 오름차순 정렬
        group.arrivals.sort((a, b) => {
          const timeA = a.barvlDt && a.barvlDt !== "0" ? parseInt(a.barvlDt, 10) : 999999;
          const timeB = b.barvlDt && b.barvlDt !== "0" ? parseInt(b.barvlDt, 10) : 999999;
          return timeA - timeB;
        });

        // 2. 종착역 목록 기반 방면 텍스트 요약 (예: "소요산 · 광운대 방면")
        const destNames = Array.from(new Set(group.arrivals.map((a) => a.bstatnNm).filter(Boolean)));
        if (destNames.length > 0) {
          group.destination = `${destNames.slice(0, 3).join(" · ")} 방면`;
        }

        // 3. 다음역이 아직 비어있다면 보강
        if (!group.nextStationName) {
          group.nextStationName = getNextStation(
            realStationName,
            group.lineName,
            group.updnLine ?? "0",
            group.arrivals[0]?.bstatnNm,
            group.arrivals[0]?.destination
          );
        }
      });

      const parsedGroups = Array.from(groupsMap.values());
      parsedGroups.sort((a, b) => a.lineName.localeCompare(b.lineName));

      setArrivalGroups(parsedGroups);
      setSelectedLine(targetLine);

      const nextDisplay = getDisplayGroups(parsedGroups, targetLine, directionOrder);
      if (nextDisplay.length > 0) {
        setExpandedGroups(new Set([getGroupKey(nextDisplay[0])]));
      } else {
        setExpandedGroups(new Set());
      }

      let timeStr = "조회 완료";
      if (data.realtimeArrivalList.length > 0) {
        try {
          const firstRecptnDt = data.realtimeArrivalList[0].recptnDt;
          const recptnTime = parseKSTDate(firstRecptnDt);
          timeStr = `${formatKSTTime(recptnTime)} 기준`;
        } catch (e) {
          timeStr = `${formatKSTTime(new Date())} 기준`;
        }
      }

      const stationDisplayName = realStationName.endsWith("역") ? realStationName : `${realStationName}역`;

      setStatus({
        type: "success",
        message: `${stationDisplayName} 정상 운행 (조회 완료)`,
        time: timeStr,
      });

    } catch (err: unknown) {
      console.error(err);
      const { code, technicalMessage } = extractClientErrorInfo(err, "SUBWAY_FETCH_FAILED");
      setStatus({
        type: "error",
        message: formatUserErrorMessage("도착 정보를 불러오지 못했습니다.", code, technicalMessage),
      });
    }
  };

  useEffect(() => {
    const loadedPinned = loadPinnedStations();
    const loadedRecent = loadRecentStations();
    const { recent, pinned } = normalizeStationStorage(loadedRecent, loadedPinned);

    setRecentSearches(recent);
    setPinnedStations(pinned);
    recentRef.current = recent;
    pinnedRef.current = pinned;
    saveRecentStations(recent);
    savePinnedStations(pinned);

    const params = new URLSearchParams(window.location.search);
    const stationParam = params.get("station");

    if (stationParam) {
      setInitialSearchValue(stationParam);
      handleSearch(stationParam);
    } else {
      const mostRecent = getMostRecentStation(recent, pinned);
      if (mostRecent && mostRecent.timestamp > 0) {
        setInitialSearchValue(mostRecent.name);
        handleSearch(mostRecent.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedStations = getOrderedStationButtons(recentSearches, pinnedStations);
  const pinnedStationNames = pinnedStations.map((s) => s.name);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleLineSelect = (line: string) => {
    setSelectedLine(line);
    const nextDisplay = getDisplayGroups(arrivalGroups, line, directionOrder);
    if (nextDisplay.length > 0) {
      setExpandedGroups(new Set([getGroupKey(nextDisplay[0])]));
    } else {
      setExpandedGroups(new Set());
    }

    if (currentStation) {
      handleSearch(currentStation, line);
    }
  };

  const handleDirectionToggle = () => {
    const nextOrder = directionOrder === "up_first" ? "down_first" : "up_first";
    setDirectionOrder(nextOrder);
    const nextDisplay = getDisplayGroups(arrivalGroups, selectedLine, nextOrder);
    if (nextDisplay.length > 0) {
      setExpandedGroups(new Set([getGroupKey(nextDisplay[0])]));
    } else {
      setExpandedGroups(new Set());
    }
  };

  const uniqueLines = Array.from(new Set(arrivalGroups.map((g) => g.lineName)));
  const displayGroups = getDisplayGroups(arrivalGroups, selectedLine, directionOrder);

  return (
    <>
      <Header />
      <Navigation />

      <main className="flex-1 overflow-y-auto mt-16 pb-20 lg:pb-0 lg:ml-72 bg-surface">
        <div className="max-w-container-max mx-auto w-full p-4 md:p-lg flex flex-col gap-md min-h-[calc(100vh-4rem)]">
          <SearchSection
            onSearch={handleSearch}
            recentSearches={orderedStations.map((s) => s.name)}
            pinnedStations={pinnedStationNames}
            onPinToggle={handlePinToggle}
            onRecentClick={(station) => {
              setInitialSearchValue(station);
              handleSearch(station);
            }}
            initialValue={initialSearchValue}
            status={status}
          />

          {arrivalGroups.length > 0 && (
            <section className="flex flex-col gap-md mt-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* 호선별 필터 및 전체 조회 버튼 그룹 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* 전체 조회 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleLineSelect("ALL")}
                    className={`h-7 px-2.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                      selectedLine === "ALL"
                        ? "bg-primary text-on-primary border-primary shadow-sm"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface border-surface-container-high hover:bg-surface-container-high"
                    }`}
                    aria-pressed={selectedLine === "ALL"}
                  >
                    전체 조회
                  </button>

                  {/* 호선별 아이콘 버튼 */}
                  {uniqueLines.map((line) => {
                    const isSelected = selectedLine === line;
                    const lineColor = getLineColor(line);
                    const lineText = getLineNumberText(line);

                    return (
                      <button
                        key={line}
                        type="button"
                        onClick={() => handleLineSelect(line)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all cursor-pointer ${lineColor} ${
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-surface scale-110 shadow-md opacity-100"
                            : selectedLine === "ALL"
                            ? "opacity-85 hover:opacity-100 hover:scale-105"
                            : "opacity-40 hover:opacity-90 hover:scale-105"
                        }`}
                        title={`${line} 새로고침 및 필터링`}
                        aria-label={`${line} 필터링`}
                        aria-pressed={isSelected}
                      >
                        {lineText}
                      </button>
                    );
                  })}
                </div>

                {/* 상행/하행 정렬 순서 토글 버튼 */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handleDirectionToggle}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold rounded-md bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface transition-all shadow-sm active:scale-95 cursor-pointer"
                    title="상행/하행 표시 순서 변경"
                    aria-label="상행/하행 표시 순서 변경"
                  >
                    <span className="material-symbols-outlined text-[18px]">swap_vert</span>
                    <span className="whitespace-nowrap font-medium">
                      {directionOrder === "up_first" ? "상행" : "하행"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md items-start">
                {displayGroups.map((group) => {
                  const key = getGroupKey(group);
                  return (
                    <ArrivalCard
                      key={key}
                      group={group}
                      isExpanded={expandedGroups.has(key)}
                      onToggle={() => toggleGroup(key)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <Footer />
        </div>
      </main>
    </>
  );
}
