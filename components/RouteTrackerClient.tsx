"use client";

import { useState, useEffect } from "react";
import AlarmButton from "@/components/AlarmButton";
import { hmToSeconds, parseKSTDate, formatKSTTime } from "@/utils/subwayData";
import { getLineColor, getLineNumberText } from "@/utils/subwayColors";

interface Station {
  station_cd: string;
  station_nm: string;
  fr_code: string;
}

interface TimeData {
  sbwy_stns_nm: string;
  hm: string;
}

interface RouteTrackerClientProps {
  trainNo: string;
  lineName: string;
  destination: string;
  initialCurrentLocationMsg: string;
  initialCurrentStationName: string;
  stations: Station[];
  times: TimeData[];
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
  times,
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

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/subway/position?lineName=${encodeURIComponent(lineName)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
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
      alert("데이터를 갱신하는 중 오류가 발생했습니다.");
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
  const currentStationInfo = stations[currentIndex] || { station_nm: currentStationName };

  let endIndex = stations.length;
  if (bstatnNm) {
    const bIndex = stations.findIndex(s => s.station_nm.includes(bstatnNm) || bstatnNm.includes(s.station_nm));
    if (bIndex > currentIndex) {
      endIndex = bIndex + 1;
    }
  }

  const nextStations = stations.slice(currentIndex + 1, endIndex);

  const getStationTimeSeconds = (stationName: string) => {
    const match = times.find(t => t.sbwy_stns_nm.includes(stationName) || stationName.includes(t.sbwy_stns_nm));
    return match ? hmToSeconds(match.hm) : 0;
  };

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
        <div className="md:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-[0_4px_12px_rgba(63,81,181,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full ${lineColor} flex items-center justify-center text-white text-xs font-bold`}>{lineNumberText}</span>
                <span className="text-white font-bold text-sm">{lineName}</span>
                <span className="text-slate-400 text-sm font-medium">열차번호: #{trainNo}</span>
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                {destination}
              </h2>
              <div className="flex items-center gap-2 text-slate-300 mt-2">
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
        <div className="hidden md:block overflow-hidden rounded-xl border border-slate-800 relative group">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-slate-900 flex flex-col justify-end p-6">
             <p className="text-xs text-indigo-400 uppercase tracking-widest font-bold">실시간 위치 정보</p>
             <p className="text-sm font-semibold text-white mt-1">{currentLocationMsg}</p>
          </div>
        </div>
      </section>

      {/* Route Timeline */}
      <section className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 md:p-10">
        <h3 className="text-xl font-bold text-white mb-8 px-2">운행 노선 상세</h3>
        <div className="relative space-y-0">
          {/* Vertical Line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-1 bg-slate-800"></div>

          {/* Previous Station */}
          {prevStation && (
            <div className="relative flex items-center gap-6 py-4 group">
              <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
              </div>
              <div className="flex-1 flex items-center justify-between border-b border-slate-800/50 pb-4">
                <span className="text-lg font-medium text-slate-400">{prevStation.station_nm}역</span>
                <span className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-500 text-sm font-bold">지남</span>
              </div>
            </div>
          )}

          {/* Current Station */}
          <div className="relative flex items-center gap-6 py-4 group">
            <div className="z-10 w-10 h-10 rounded-full bg-indigo-600 border-4 border-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
            </div>
            <div className="flex-1 flex items-center justify-between border-b border-indigo-900/30 pb-4 bg-indigo-900/10 rounded-r-xl px-4 -mx-4">
              <span className="text-xl font-bold text-white">{currentStationInfo.station_nm}역</span>
              <span className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold animate-pulse">
                {currentLocationMsg === '0' || currentLocationMsg === '진입' ? '진입' : currentLocationMsg === '1' || currentLocationMsg === '도착' ? '도착' : '출발'}
              </span>
            </div>
          </div>

          {/* Next Stations */}
          {nextStations.map((station, idx) => {
            const segSeconds = getStationTimeSeconds(station.station_nm);
            cumulativeSeconds += segSeconds || 120; // fallback 2 mins if missing but we need cumulative logic
            
            const isMissingData = segSeconds === 0;
            
            // Calculate estimated arrival time
            const estTime = new Date(lastUpdated.getTime() + cumulativeSeconds * 1000);
            const timeString = formatKSTTime(estTime);

            return (
              <div key={idx} className="relative flex items-center gap-6 py-4 group">
                <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
                <div className="flex-1 flex items-center justify-between border-b border-slate-800/50 pb-4">
                  <span className="text-lg font-medium text-slate-200">{station.station_nm}역</span>
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
    </main>
  );
}
