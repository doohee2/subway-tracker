import Link from "next/link";
import {
  getStationsForLine,
  extractCurrentStation,
  getStationTimes
} from '@/utils/subwayData';
import RouteTrackerClient from '@/components/RouteTrackerClient';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
export default async function RoutePage({ params, searchParams }: { params: Promise<{ trainNo: string }>, searchParams: Promise<{ [key: string]: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const trainNo = resolvedParams.trainNo;
  const { lineName = "", destination = "", currentLocationMsg = "", updnLine = "", bstatnNm = "", subwayId = "", statnNm = "", recptnDt = "" } = resolvedSearchParams;
  const trackerUrl = statnNm ? `/?station=${encodeURIComponent(statnNm)}` : "/";

  const currentStationName = extractCurrentStation(currentLocationMsg);
  const stations = getStationsForLine(lineName, updnLine, currentStationName, bstatnNm);
  const times = getStationTimes(lineName);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-200">
      <Header />
      <Navigation />

      <div className="lg:pl-72">
      <RouteTrackerClient 
        trainNo={trainNo}
        lineName={lineName}
        destination={destination}
        initialCurrentLocationMsg={currentLocationMsg}
        initialCurrentStationName={currentStationName}
        stations={stations}
        times={times}
        bstatnNm={bstatnNm}
        routeParams={{ updnLine, subwayId, statnNm }}
        initialRecptnDt={recptnDt}
      />
      </div>

      {/* BottomNavBar (Mobile only) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe bg-slate-950/90 backdrop-blur-md border-t border-slate-800 lg:hidden">
        <Link
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400"
          href={trackerUrl}
        >
          <span className="material-symbols-outlined">hub</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            트래커
          </span>
        </Link>
        <button
          className="flex flex-col items-center justify-center bg-indigo-900/30 text-indigo-300 rounded-xl px-3 py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            경로
          </span>
        </button>
        <Link
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400"
          href="/alarms"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            알림
          </span>
        </Link>
        <a
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400"
          href="http://www.seoulmetro.co.kr/kr/cyberStation.do"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            노선도(웹)
          </span>
        </a>
      </nav>
    </div>
  );
}
