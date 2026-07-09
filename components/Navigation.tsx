"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface LastRoute {
  trainNo: string;
  lineName: string;
  destination: string;
  currentLocationMsg: string;
  updnLine: string;
  bstatnNm: string;
  subwayId: string;
  statnNm: string;
  timestamp?: number;
}

export default function Navigation() {
  const [routeHref, setRouteHref] = useState("#");
  const pathname = usePathname();

  useEffect(() => {
    // 마지막 조회 경로 복원
    const savedRoute = localStorage.getItem("lastRoute");
    if (savedRoute) {
      try {
        const r: LastRoute = JSON.parse(savedRoute);
        const now = Date.now();
        if (r.timestamp && now - r.timestamp > 30 * 60 * 1000) {
          // 30분 이상 경과 시 초기화
          localStorage.removeItem("lastRoute");
        } else {
          const params = new URLSearchParams({
            lineName: r.lineName,
            destination: r.destination,
            currentLocationMsg: r.currentLocationMsg,
            updnLine: r.updnLine,
            bstatnNm: r.bstatnNm,
            subwayId: r.subwayId,
            statnNm: r.statnNm,
          });
          setRouteHref(`/route/${encodeURIComponent(r.trainNo)}?${params.toString()}`);
        }
      } catch (e) { }
    }
  }, []);

  return (
    <>
      {/* NavigationDrawer (Web) */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full dark:border-slate-800 border-slate-200 w-72 dark:bg-slate-900 bg-white shadow-2xl dark:divide-slate-800 divide-slate-100 pt-16 transition-colors">
        <div className="p-6">
          <div className="font-sans text-lg font-bold dark:text-indigo-50 text-slate-800">
            지하철 도착 정보
          </div>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-2">
          <a
            className={`flex items-center gap-3 px-6 py-3 font-sans text-sm font-semibold transition-all duration-300 ease-in-out ${pathname === '/' ? 'dark:bg-indigo-900/40 bg-indigo-50 dark:text-indigo-300 text-indigo-600 border-l-4 border-indigo-600' : 'dark:text-slate-400 text-slate-600 pl-4 dark:hover:bg-slate-800 hover:bg-slate-50'}`}
            href="/"
          >
            <span className="material-symbols-outlined">hub</span>
            트래커
          </a>
          <a
            className={`flex items-center gap-3 px-6 py-3 font-sans text-sm font-semibold transition-all duration-300 ease-in-out ${pathname.startsWith('/route') ? 'dark:bg-indigo-900/40 bg-indigo-50 dark:text-indigo-300 text-indigo-600 border-l-4 border-indigo-600' : 'dark:text-slate-400 text-slate-600 pl-4 dark:hover:bg-slate-800 hover:bg-slate-50'}`}
            href={routeHref}
          >
            <span className="material-symbols-outlined">map</span>
            경로
          </a>
          <a
            className={`flex items-center gap-3 px-6 py-3 font-sans text-sm font-semibold transition-all duration-300 ease-in-out ${pathname === '/alarms' ? 'dark:bg-indigo-900/40 bg-indigo-50 dark:text-indigo-300 text-indigo-600 border-l-4 border-indigo-600' : 'dark:text-slate-400 text-slate-600 pl-4 dark:hover:bg-slate-800 hover:bg-slate-50'}`}
            href="/alarms"
          >
            <span className="material-symbols-outlined">notifications</span>
            알림
          </a>
          <a
            className="flex items-center gap-3 px-6 py-3 dark:text-slate-400 text-slate-600 pl-4 dark:hover:bg-slate-800 hover:bg-slate-50 font-sans text-sm font-semibold transition-all duration-300 ease-in-out"
            href="http://www.seoulmetro.co.kr/kr/cyberStation.do"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="material-symbols-outlined">explore</span>
            노선도(웹)
          </a>
        </div>
      </nav>

      {/* BottomNavBar (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 lg:hidden dark:bg-slate-900/90 bg-white/90 backdrop-blur-md border-t dark:border-indigo-900/50 border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-colors">
        <a
          className={`flex flex-col items-center justify-center px-3 py-1 transition-transform ${pathname === '/' ? 'dark:bg-indigo-900/30 bg-indigo-50 dark:text-indigo-300 text-indigo-600 rounded-xl active:scale-95' : 'text-slate-500 hover:text-indigo-500'}`}
          href="/"
        >
          <span className="material-symbols-outlined">hub</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            트래커
          </span>
        </a>
        <a
          className={`flex flex-col items-center justify-center px-3 py-1 transition-transform ${pathname.startsWith('/route') ? 'dark:bg-indigo-900/30 bg-indigo-50 dark:text-indigo-300 text-indigo-600 rounded-xl active:scale-95' : 'text-slate-500 hover:text-indigo-500'}`}
          href={routeHref}
        >
          <span className="material-symbols-outlined">map</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            경로
          </span>
        </a>
        <a
          className={`flex flex-col items-center justify-center px-3 py-1 transition-transform ${pathname === '/alarms' ? 'dark:bg-indigo-900/30 bg-indigo-50 dark:text-indigo-300 text-indigo-600 rounded-xl active:scale-95' : 'text-slate-500 hover:text-indigo-500'}`}
          href="/alarms"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            알림
          </span>
        </a>

        <a
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-500"
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
    </>
  );
}
