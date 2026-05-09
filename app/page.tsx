"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SearchSection from "@/components/SearchSection";
import ArrivalCard from "@/components/ArrivalCard";
import { ArrivalGroup, RealtimeArrival } from "@/types/subway";
import { parseKSTDate, formatKSTTime, getStationRealName } from "@/utils/subwayData";
import { createClientError, extractClientErrorInfo, formatUserErrorMessage } from "@/utils/errorMessage";

export default function Home() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [arrivalGroups, setArrivalGroups] = useState<ArrivalGroup[]>([]);
  const [initialSearchValue, setInitialSearchValue] = useState("");
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
    time?: string;
  }>({ type: "idle", message: "" });

  useEffect(() => {
    // 로컬 스토리지에서 최근 검색어 불러오기
    const saved = localStorage.getItem("recentStations");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) { }
    }

    // URL 파라미터로 station이 넘어오면 자동 검색
    const params = new URLSearchParams(window.location.search);
    const stationParam = params.get("station");
    if (stationParam) {
      setInitialSearchValue(stationParam);
      handleSearch(stationParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveRecentSearch = (station: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== station);
      const updated = [station, ...filtered].slice(0, 5); // 최근 5개 유지
      localStorage.setItem("recentStations", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = async (station: string) => {
    if (!station) return;

    // 별칭 처리 (예: '서울' -> '서울역')
    const realStationName = getStationRealName(station);

    setStatus({ type: "loading", message: "조회 중입니다..." });
    setArrivalGroups([]);

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

      // 검색 성공: 로컬 스토리지 업데이트
      saveRecentSearch(realStationName);
      localStorage.setItem("lastStation", realStationName);

      // 데이터 그룹화 로직
      const groupsMap = new Map<string, ArrivalGroup>();

      data.realtimeArrivalList.forEach((item: RealtimeArrival) => {
        // 도착지 방면과 호선으로 그룹화 키 생성 (예: 2호선_성수 - 다음: 건대입구)
        // trainLineNm은 보통 "성수행 - 건대입구방면" 형태이므로 이를 사용
        const groupKey = `${item.subwayId}_${item.updnLine}_${item.trainLineNm}`;

        if (!groupsMap.has(groupKey)) {
          // subwayId에 따른 호선명 변환 로직 (간단히 매핑)
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

          groupsMap.set(groupKey, {
            lineName,
            lineNumber: lineName, // getLineNumberText 헬퍼에서 처리
            destination: item.trainLineNm,
            arrivals: [],
          });
        }

        const group = groupsMap.get(groupKey)!;

        // 한 카드에 최대 3개까지만
        if (group.arrivals.length < 3) {
          // 메시지 정제
          // arvlMsg2: 진입, 도착, 2분 30초 후 등
          let estTime = item.arvlMsg2;
          let isUrgent = false;

          if (estTime.includes("진입") || estTime.includes("도착") || estTime.includes("전역")) {
            isUrgent = true;
          }

          // 도착 시각 계산
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

          group.arrivals.push({
            id: item.btrainNo + "_" + item.barvlDt + "_" + Math.random(),
            estimatedTimeMsg: estTime,
            currentLocationMsg: item.arvlMsg3,
            trainNumber: item.btrainNo,
            isUrgent,
            updnLine: item.updnLine,
            bstatnNm: item.bstatnNm,
            subwayId: item.subwayId,
            statnNm: realStationName,
            recptnDt: item.recptnDt,
            calculatedArrivalTime,
          });
        }
      });

      const parsedGroups = Array.from(groupsMap.values());

      // 호선명 오름차순 정렬 등 정렬 로직 추가 가능
      parsedGroups.sort((a, b) => a.lineName.localeCompare(b.lineName));

      setArrivalGroups(parsedGroups);

      // recptnDt 기반으로 조회 시간 표시
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

  return (
    <>
      <Header />
      <Navigation />

      <main className="flex-1 overflow-y-auto mt-16 pb-20 lg:pb-0 lg:ml-72 bg-surface">
        <div className="max-w-container-max mx-auto w-full p-4 md:p-lg flex flex-col gap-md min-h-[calc(100vh-4rem)]">
          <SearchSection
            onSearch={handleSearch}
            recentSearches={recentSearches}
            onRecentClick={(station) => {
              setInitialSearchValue(station);
              handleSearch(station);
            }}
            initialValue={initialSearchValue}
            status={status}
          />

          {arrivalGroups.length > 0 && (
            <section className="flex flex-col gap-md mt-6">
              <h2 className="font-h3 text-h3 text-on-surface">실시간 도착 정보</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
                {arrivalGroups.map((group, idx) => (
                  <ArrivalCard key={idx} group={group} />
                ))}
              </div>
            </section>
          )}

          <Footer />
        </div>
      </main>
    </>
  );
}
