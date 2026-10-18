import Link from "next/link";
import {
  getStationsForLine,
  extractCurrentStation
} from '@/utils/subwayData';
import RouteTrackerClient from '@/components/RouteTrackerClient';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
export default async function RoutePage({ params, searchParams }: { params: Promise<{ trainNo: string }>, searchParams: Promise<{ [key: string]: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const trainNo = resolvedParams.trainNo;
  const { lineName = "", destination = "", currentLocationMsg = "", updnLine = "", bstatnNm = "", subwayId = "", statnNm = "", recptnDt = "", btrainSttus = "일반" } = resolvedSearchParams;
  const trackerUrl = statnNm ? `/?station=${encodeURIComponent(statnNm)}` : "/";

  const currentStationName = extractCurrentStation(currentLocationMsg);
  const stations = getStationsForLine(lineName, updnLine, currentStationName, bstatnNm);

  return (
    <div className="flex-1 overflow-y-auto dark:bg-slate-950 bg-slate-50 dark:text-slate-200 text-slate-800 transition-colors">
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
        bstatnNm={bstatnNm}
        routeParams={{ updnLine, subwayId, statnNm }}
        initialRecptnDt={recptnDt}
        initialBtrainSttus={btrainSttus}
      />
      </div>

      {/* BottomNavBar (Mobile only) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-safe dark:bg-slate-950/90 bg-white/90 backdrop-blur-md border-t dark:border-slate-800 border-slate-200 lg:hidden transition-colors">
        <Link
          className="flex flex-col items-center justify-center dark:text-slate-500 text-slate-500 dark:hover:text-indigo-400 hover:text-indigo-600"
          href={trackerUrl}
        >
          <span className="material-symbols-outlined">hub</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            트래커
          </span>
        </Link>
        <button
          className="flex flex-col items-center justify-center dark:bg-indigo-900/30 bg-indigo-50 dark:text-indigo-300 text-indigo-600 rounded-xl px-3 py-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            경로
          </span>
        </button>
        <Link
          className="flex flex-col items-center justify-center dark:text-slate-500 text-slate-500 dark:hover:text-indigo-400 hover:text-indigo-600"
          href="/alarms"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            알림
          </span>
        </Link>
        <a
          className="flex flex-col items-center justify-center dark:text-slate-500 text-slate-500 dark:hover:text-indigo-400 hover:text-indigo-600"
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
