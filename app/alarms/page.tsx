"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SubwayAlarm } from "@/components/AlarmManager";

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<SubwayAlarm[]>([]);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  const loadAlarms = useCallback(() => {
    try {
      const stored = localStorage.getItem("subway_alarms");
      if (stored) {
        setAlarms(JSON.parse(stored));
      } else {
        setAlarms([]);
      }
    } catch (e) {
      console.error("Failed to load alarms", e);
    }
  }, []);

  useEffect(() => {
    // Check if device is iOS and not in PWA standalone mode
    const checkPwaStatus = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(userAgent);
      // @ts-ignore - standalone is Apple specific
      const isStandalone = ('standalone' in window.navigator) && window.navigator.standalone;

      if (isIos && !isStandalone) {
        setShowPwaPrompt(true);
      }
    };
    checkPwaStatus();

    loadAlarms();

    // Listen for updates from AlarmManager or other tabs
    window.addEventListener("subway_alarms_updated", loadAlarms);

    // Also set an interval to refresh the UI in case of background deletions
    const interval = setInterval(loadAlarms, 5000);

    return () => {
      window.removeEventListener("subway_alarms_updated", loadAlarms);
      clearInterval(interval);
    };
  }, [loadAlarms]);

  const handleDelete = (id: string) => {
    try {
      const newAlarms = alarms.filter(a => a.id !== id);
      localStorage.setItem("subway_alarms", JSON.stringify(newAlarms));
      setAlarms(newAlarms);
      window.dispatchEvent(new Event("subway_alarms_updated"));
    } catch (e) {
      console.error("Failed to delete alarm", e);
    }
  };

  const formatTime = (timestamp: number) => {
    // Format to KST (UTC+9)
    const kstDate = new Date(timestamp + (9 * 60 * 60 * 1000));
    const hours = kstDate.getUTCHours().toString().padStart(2, '0');
    const minutes = kstDate.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <>
      <Header />
      <Navigation />

      <main className="flex-1 overflow-y-auto mt-16 pb-20 lg:pb-0 lg:ml-72 bg-surface min-h-screen">
        <div className="max-w-container-max mx-auto w-full p-4 md:p-lg flex flex-col gap-md min-h-[calc(100vh-4rem)]">

          {showPwaPrompt && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex flex-col gap-3 mt-4 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 p-2 z-10">
                <button
                  onClick={() => setShowPwaPrompt(false)}
                  className="text-indigo-400 hover:text-indigo-300 w-8 h-8 flex items-center justify-center rounded-full hover:bg-indigo-500/20 transition-colors"
                  aria-label="안내 닫기"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex items-start gap-3 relative z-0">
                <div className="bg-indigo-500/20 p-2.5 rounded-xl text-indigo-400 mt-1">
                  <span className="material-symbols-outlined text-2xl">add_to_home_screen</span>
                </div>
                <div className="flex-1 pr-4">
                  <h3 className="text-white font-bold text-lg mb-1">앱처럼 편리하게 사용하세요</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    하단의 <span className="inline-block bg-slate-800 px-1.5 py-0.5 rounded align-middle mx-1"><span className="material-symbols-outlined text-[16px] leading-none block">ios_share</span></span> 공유 버튼을 누르고<br />
                    <strong className="text-indigo-300 font-semibold">홈 화면에 추가</strong>를 선택하면 앱처럼 사용할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          <section className="flex flex-col gap-md mt-6">
            <h2 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 text-3xl">notifications_active</span>
              설정된 알람 목록
            </h2>

            {alarms.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-4 shadow-sm mt-4">
                <span className="material-symbols-outlined text-5xl text-slate-700">notifications_off</span>
                <p className="text-slate-400 font-medium text-lg">설정된 알람이 없습니다.</p>
                <p className="text-slate-500 text-sm">경로 상세 페이지에서 도착 예정 시간 버튼을 눌러 알람을 설정해보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md mt-4">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                    <div className="flex flex-col gap-1 ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white tracking-tight">{formatTime(alarm.arrivalTime)}</span>
                        <span className="text-xs font-semibold px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full">예정</span>
                      </div>
                      <div className="text-slate-400 font-medium flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {alarm.stationName}역 도착 전
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(alarm.id)}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      aria-label="알람 삭제"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Footer />
        </div>
      </main>
    </>
  );
}
