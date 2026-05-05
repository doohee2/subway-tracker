import Link from "next/link";
import {
  getStationsForLine,
  extractCurrentStation,
  getStationTimes,
  hmToSeconds,
  secondsToHm
} from '@/utils/subwayData';

export default async function RoutePage({ params, searchParams }: { params: Promise<{ trainNo: string }>, searchParams: Promise<{ [key: string]: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const trainNo = resolvedParams.trainNo;
  const { lineName = "", destination = "", currentLocationMsg = "", updnLine = "", bstatnNm = "", subwayId = "", statnNm = "" } = resolvedSearchParams;

  // 사용자의 요청에 따라 "실시간 위치 정보" 메시지에서 현재 위치하는 역을 추출하여 기준역으로 삼음
  const currentStationName = extractCurrentStation(currentLocationMsg);
  const stations = getStationsForLine(lineName, updnLine);
  const times = getStationTimes(lineName);

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

  let cumulativeSeconds = 0;
  
  // 한국 표준시(KST, UTC+9) 기준으로 현재 시간 계산 (서버 타임존에 관계없이 일관된 시간 계산을 위함)
  const now = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-200">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 h-16 max-w-[1280px] mx-auto bg-slate-950 border-b border-slate-800 shadow-none">
        <div className="flex items-center gap-4">
          <Link href={`/?station=${encodeURIComponent(statnNm)}`} className="flex items-center justify-center p-2 text-indigo-400 hover:bg-slate-900 transition-colors active:opacity-70 rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-['Inter'] font-semibold text-lg tracking-tight text-indigo-400">실시간 지하철</h1>
        </div>
        <button className="text-indigo-400 font-bold hover:bg-slate-900 px-3 py-1.5 rounded-lg active:opacity-70 transition-all duration-150">
          새로고침
        </button>
      </header>

      <main className="pt-20 pb-24 px-4 max-w-[1280px] mx-auto">
        {/* Summary Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-[0_4px_12px_rgba(63,81,181,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-green-600 text-white font-bold text-sm">{lineName}</span>
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
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 mt-4 md:mt-0">
                <span className="material-symbols-outlined">refresh</span>
                다시 조회
              </button>
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
                <span className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold animate-pulse">도착</span>
              </div>
            </div>

            {/* Next Stations */}
            {nextStations.map((station, idx) => {
              const segSeconds = getStationTimeSeconds(station.station_nm);
              cumulativeSeconds += segSeconds || 120; // fallback 2 mins if missing but we need cumulative logic
              
              const isMissingData = segSeconds === 0;
              
              // Calculate estimated arrival time
              const estTime = new Date(now.getTime() + cumulativeSeconds * 1000);
              const timeString = `${estTime.getUTCHours().toString().padStart(2, '0')}:${estTime.getUTCMinutes().toString().padStart(2, '0')}`;

              return (
                <div key={idx} className="relative flex items-center gap-6 py-4 group">
                  <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  </div>
                  <div className="flex-1 flex items-center justify-between border-b border-slate-800/50 pb-4">
                    <span className="text-lg font-medium text-slate-200">{station.station_nm}역</span>
                    <button 
                      disabled={isMissingData}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                        isMissingData 
                          ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                          : 'bg-indigo-900/40 border-indigo-700/30 text-indigo-400 hover:bg-indigo-800/50'
                      }`}
                    >
                      {isMissingData ? '역명 버튼' : timeString}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe bg-slate-950/90 backdrop-blur-md border-t border-slate-800">
        <Link href="/" className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-500 px-3 py-1 active:scale-95 transition-transform duration-200">
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="text-[11px] font-medium">홈</span>
        </Link>
        <button className="flex flex-col items-center justify-center text-indigo-400 bg-indigo-900/30 rounded-xl px-3 py-1 active:scale-95 transition-transform duration-200">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          <span className="text-[11px] font-medium">노선도</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-500 px-3 py-1 active:scale-95 transition-transform duration-200">
          <span className="material-symbols-outlined mb-1">star</span>
          <span className="text-[11px] font-medium">즐겨찾기</span>
        </button>
        <button className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-500 px-3 py-1 active:scale-95 transition-transform duration-200">
          <span className="material-symbols-outlined mb-1">settings</span>
          <span className="text-[11px] font-medium">설정</span>
        </button>
      </nav>
    </div>
  );
}
