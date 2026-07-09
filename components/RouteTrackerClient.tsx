"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AlarmButton from "@/components/AlarmButton";
import { hmToSeconds, parseKSTDate, formatKSTTime } from "@/utils/subwayData";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";
import { createClientError, extractClientErrorInfo, formatUserErrorMessage } from "@/utils/errorMessage";
import { APP_CONFIG } from "@/utils/config";

interface Station {
  station_cd: string;
  station_nm: string;
  fr_code: string;
  hm: string;
  hm2: string;
  adj_hm?: string;
  adj_hm2?: string;
}

interface RouteTrackerClientProps {
  trainNo: string;
  lineName: string;
  destination: string;
  initialCurrentLocationMsg: string;
  initialCurrentStationName: string;
  stations: Station[];
  bstatnNm: string;
  // 마지막 경로 복원을 위해 저장할 전체 쿼리 파라미터
  routeParams: {
    updnLine: string;
    subwayId: string;
    statnNm: string;
  };
  initialRecptnDt?: string;
}

export default function RouteTrackerClient({
  trainNo,
  lineName,
  destination,
  initialCurrentLocationMsg,
  initialCurrentStationName,
  stations,
  bstatnNm,
  routeParams,
  initialRecptnDt,
}: RouteTrackerClientProps) {
  const [currentLocationMsg, setCurrentLocationMsg] = useState(initialCurrentLocationMsg);
  const [currentStationName, setCurrentStationName] = useState(initialCurrentStationName);

  // 초기값 설정: initialRecptnDt가 있으면 그것을 사용, 없으면 현재 시간
  const getInitialLastUpdated = () => {
    if (initialRecptnDt) {
      try {
        return parseKSTDate(initialRecptnDt);
      } catch (e) {
        return new Date();
      }
    }
    return new Date();
  };

  const [lastUpdated, setLastUpdated] = useState<Date>(getInitialLastUpdated());
  const [isLoading, setIsLoading] = useState(true); // 첫 진입 시 바로 로딩 상태로 시작
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/subway/position?lineName=${encodeURIComponent(lineName)}`);
      const data = await res.json();
      if (!res.ok) {
        throw createClientError(data.code ?? "SUBWAY_POSITION_FETCH_FAILED", data.error ?? "Failed to fetch");
      }

      if (data.realtimePositionList) {
        const train = data.realtimePositionList.find((t: { trainNo: string; statnNm: string; trainSttus: string; recptnDt: string }) => t.trainNo === trainNo);
        if (train) {
          setCurrentStationName(train.statnNm);
          setCurrentLocationMsg(train.trainSttus === '0' ? '진입' : train.trainSttus === '1' ? '도착' : '출발');

          if (train.recptnDt) {
            try {
              // API의 recptnDt (정보수신일시)를 기준으로 설정
              const recptnTime = parseKSTDate(train.recptnDt);
              setLastUpdated(recptnTime);
            } catch (e) {
              setLastUpdated(new Date());
            }
          } else {
            setLastUpdated(new Date());
          }
        } else {
          // 열차를 찾을 수 없는 경우 처리 (선택사항)
          alert("현재 열차의 실시간 위치 정보를 찾을 수 없습니다.");
        }
      }
    } catch (error) {
      console.error(error);
      const { code, technicalMessage } = extractClientErrorInfo(error, "SUBWAY_POSITION_FETCH_FAILED");
      alert(formatUserErrorMessage("데이터를 갱신하는 중 오류가 발생했습니다.", code, technicalMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // 페이지 첫 진입 시 자동으로 API 조회 및 마지막 경로 저장
  useEffect(() => {
    // 마지막으로 조회한 경로를 localStorage에 저장
    const lastRoute = {
      trainNo,
      lineName,
      destination,
      currentLocationMsg: initialCurrentLocationMsg,
      updnLine: routeParams.updnLine,
      bstatnNm,
      subwayId: routeParams.subwayId,
      statnNm: routeParams.statnNm,
      timestamp: Date.now(),
    };
    localStorage.setItem("lastRoute", JSON.stringify(lastRoute));

    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let currentIndex = stations.findIndex(s => s.station_nm === currentStationName);
  if (currentIndex === -1) {
    currentIndex = stations.findIndex(s => s.station_nm.includes(currentStationName) || currentStationName.includes(s.station_nm));
  }
  if (currentIndex === -1) currentIndex = 1;

  const prevStation = stations[currentIndex - 1] || null;
  const currentStationInfo = stations[currentIndex] || { station_cd: "", station_nm: currentStationName, fr_code: "" };

  let endIndex = stations.length;
  // 2호선(순환선)의 경우 종점 자르기 로직을 적용하지 않음
  if (bstatnNm && !lineName.includes('2호선') && !lineName.includes('02호선')) {
    const bIndex = stations.findIndex(s => s.station_nm.includes(bstatnNm) || bstatnNm.includes(s.station_nm));
    if (bIndex > currentIndex) {
      endIndex = bIndex + 1;
    }
  }

  const nextStations = stations.slice(currentIndex + 1, endIndex);

  const getStationTimeSeconds = (prev: Station, curr: Station) => {
    if (!prev || !curr) return 0;
    const isAscending = prev.fr_code.localeCompare(curr.fr_code, undefined, { numeric: true, sensitivity: 'base' }) < 0;

    const adj = isAscending ? curr.adj_hm2 : curr.adj_hm;
    const base = isAscending ? curr.hm2 : curr.hm;

    if (adj && adj !== "0:00") {
      return hmToSeconds(adj);
    } else if (base && base !== "0:00") {
      return hmToSeconds(base) + 30; // 30초 정차시간 추가
    }
    return 0; // 데이터 없음
  };

  let hasMissingData = false;

  // 현재 상태에 따른 초기 오프셋: 진입=60초, 도착=30초, 출발=0초
  const initialOffset =
    currentLocationMsg === '진입' || currentLocationMsg === '0' ? 60
      : currentLocationMsg === '도착' || currentLocationMsg === '1' ? 30
        : 0;
  let cumulativeSeconds = initialOffset;

  const lineColor = getLineColor(lineName);
  const lineNumberText = getLineNumberText(lineName);

  return (
    <main className="pt-20 pb-24 px-4 max-w-[1280px] mx-auto">
      {/* Summary Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 p-6 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-[0_4px_12px_rgba(63,81,181,0.08)] transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full ${lineColor} flex items-center justify-center text-white text-xs font-bold`}>{lineNumberText}</span>
                <span className="dark:text-white text-slate-800 font-bold text-sm">{lineName}</span>
                <span className="text-slate-400 text-sm font-medium">열차번호: #{trainNo}</span>
              </div>
              <h2 className="text-3xl font-bold dark:text-white text-slate-900 tracking-tight">
                {destination}
              </h2>
              <div className="flex items-center gap-2 dark:text-slate-300 text-slate-600 mt-2">
                <span className="material-symbols-outlined text-indigo-400 text-sm">location_on</span>
                <span className="font-semibold">현재역: {currentStationInfo.station_nm}역</span>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1.5 mt-4 md:mt-0">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 w-full md:w-auto justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                다시 조회
              </button>
              <p className="text-[10px] text-slate-500 font-medium mr-1">
                데이터 기준: {formatKSTTime(lastUpdated)}
              </p>
            </div>
          </div>
        </div>
        <div className="hidden md:block overflow-hidden rounded-xl border dark:border-slate-800/60 border-slate-200 relative group transition-colors">
          <div className="absolute inset-0 dark:bg-slate-800/30 bg-slate-50 flex flex-col justify-end p-6 dark:group-hover:bg-slate-800/50 transition-colors">
            <p className="text-xs text-indigo-400 uppercase tracking-widest font-bold">실시간 위치 정보</p>
            <p className="text-sm font-semibold dark:text-slate-300 text-slate-800 mt-1 transition-colors">{currentLocationMsg}</p>
          </div>
        </div>
      </section>

      {/* Route Timeline */}
      <section className="dark:bg-slate-900/50 bg-white rounded-2xl border dark:border-slate-800 border-slate-200 p-6 md:p-10 transition-colors">
        <div className="flex items-center gap-2 mb-8 px-2">
          <h3 className="text-xl font-bold dark:text-white text-slate-900">운행 노선 상세</h3>
          <button
            onClick={() => setShowInfoModal(true)}
            className="dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-800 transition-colors flex items-center justify-center"
            title="안내"
          >
            <span className="material-symbols-outlined text-[20px]">info</span>
          </button>
        </div>
        <div className="relative space-y-0">
          {/* Vertical Line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-1 dark:bg-slate-800 bg-slate-200"></div>

          {/* Previous Station */}
          {prevStation && (
            <div className="relative flex items-center gap-6 py-4 group">
              <div className="z-10 w-10 h-10 rounded-full dark:bg-slate-800 bg-slate-200 border-4 dark:border-slate-950 border-white flex items-center justify-center transition-colors">
                <div className="w-2 h-2 rounded-full dark:bg-slate-500 bg-slate-400"></div>
              </div>
              <div className="flex-1 flex items-center justify-between border-b dark:border-slate-800/50 border-slate-100 pb-4">
                <Link href={`/?station=${encodeURIComponent(prevStation.station_nm)}`} className="text-lg font-medium dark:text-slate-400 text-slate-500 hover:text-indigo-400 transition-colors">
                  {prevStation.station_nm}역
                </Link>
                <span className="px-4 py-1.5 rounded-lg dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400 text-sm font-bold">지남</span>
              </div>
            </div>
          )}

          {/* Current Station */}
          <div className="relative flex items-center gap-6 py-2 group">
            <div className="z-10 w-10 h-10 rounded-full bg-indigo-600 border-4 dark:border-slate-950 border-white flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-colors">
              <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
            </div>
            <div className="flex-1 flex items-center justify-between border-b border-indigo-900/30 py-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-r-xl px-4 -mx-4">
              <Link href={`/?station=${encodeURIComponent(currentStationInfo.station_nm)}`} className="text-xl font-bold dark:text-white text-indigo-950 hover:text-indigo-500 transition-colors">
                {currentStationInfo.station_nm}역
              </Link>
              <span className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold animate-pulse">
                {currentLocationMsg === '0' || currentLocationMsg === '진입' ? '진입' : currentLocationMsg === '1' || currentLocationMsg === '도착' ? '도착' : '출발'}
              </span>
            </div>
          </div>

          {/* Next Stations */}
          {nextStations.map((station, idx) => {
            const prevSt = idx === 0 ? currentStationInfo : nextStations[idx - 1];
            const segSeconds = getStationTimeSeconds(prevSt as Station, station);

            if (segSeconds === 0) {
              hasMissingData = true;
            }

            if (!hasMissingData) {
              cumulativeSeconds += segSeconds;
            }

            const isMissingData = hasMissingData;

            // Calculate estimated arrival time
            const estTime = new Date(lastUpdated.getTime() + cumulativeSeconds * 1000);
            const timeString = formatKSTTime(estTime);

            return (
              <div key={idx} className="relative flex items-center gap-6 py-4 group">
                <div className="z-10 w-10 h-10 rounded-full dark:bg-slate-800 bg-slate-100 border-4 dark:border-slate-950 border-white flex items-center justify-center transition-colors">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
                <div className="flex-1 flex items-center justify-between border-b dark:border-slate-800/50 border-slate-100 pb-4">
                  <Link href={`/?station=${encodeURIComponent(station.station_nm)}`} className="text-lg font-medium dark:text-slate-200 text-slate-700 hover:text-indigo-500 transition-colors">
                    {station.station_nm}역
                  </Link>
                  <AlarmButton
                    stationName={station.station_nm}
                    timeString={timeString}
                    arrivalTime={estTime.getTime()}
                    isMissingData={isMissingData}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {showInfoModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center dark:bg-slate-950/60 bg-slate-900/30 backdrop-blur-sm p-4">
          <div
            style={{ width: 'min(448px, calc(100vw - 2rem))', flexShrink: 0 }}
            className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-colors"
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 dark:bg-indigo-500/20 bg-slate-100 dark:text-indigo-400 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                <span className="material-symbols-outlined text-3xl">info</span>
              </div>
              <h3 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight transition-colors">
                주의
              </h3>
              <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed text-left transition-colors">
                {APP_CONFIG.INFO_MESSAGE}
              </p>
            </div>
            <div className="flex border-t dark:border-slate-800 border-slate-100 transition-colors">
              <button
                onClick={() => setShowInfoModal(false)}
                className="flex-1 py-4 dark:text-indigo-400 text-slate-700 dark:hover:text-indigo-300 hover:text-slate-900 dark:hover:bg-indigo-900/20 hover:bg-slate-50 transition-colors font-bold text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
