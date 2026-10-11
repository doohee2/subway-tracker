"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import { APP_CONFIG } from "@/utils/config";
import UserAvatar from "./UserAvatar";
import { purgeSensitiveOfflineCaches } from "@/utils/cachePurging";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateApp = async () => {
    setIsUpdating(true);
    try {
      await purgeSensitiveOfflineCaches();
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      alert("로컬 앱 캐시가 삭제되었습니다. 최신 버전으로 새로고침합니다.");
      window.location.reload();
    } catch (error) {
      console.error("앱 캐시 삭제 중 오류 발생:", error);
      alert("캐시 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 lg:px-10 h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm transition-colors">
      <button
        onClick={() => setShowInfo(true)}
        className="flex items-center gap-2 focus:outline-none cursor-pointer group text-left transition-opacity hover:opacity-90"
        title="Subway Tracker 안내"
      >
        <span className="material-symbols-outlined text-[28px] sm:text-[34px] text-indigo-600 dark:text-indigo-400 transition-colors drop-shadow-sm group-hover:scale-105" style={{ fontVariationSettings: "'FILL' 1" }}>
          directions_subway
        </span>
        <svg viewBox="0 0 360 60" className="h-[28px] sm:h-[34px] w-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="45" fontWeight="900" fontSize="42" letterSpacing="-0.04em" className="fill-indigo-600 dark:fill-indigo-400 transition-colors duration-300">Subway</text>
          <circle cx="178" cy="32" r="6" className="fill-indigo-600 dark:fill-indigo-400 transition-colors duration-300" />
          <path d="M184 32 L200 32" stroke="currentColor" strokeWidth="4" className="stroke-indigo-600 dark:stroke-indigo-400 transition-colors duration-300" strokeDasharray="4 4" />
          <text x="206" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-slate-800 dark:fill-white transition-colors duration-300">Tracker</text>
        </svg>
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          aria-label="Toggle Dark Mode"
        >
          <span className="material-symbols-outlined">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <UserAvatar size={36} />
      </div>

      {showInfo && typeof window !== 'undefined' && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center dark:bg-slate-950/60 bg-slate-900/30 backdrop-blur-sm p-4">
          <div
            style={{ width: 'min(448px, calc(100vw - 2rem))', flexShrink: 0 }}
            className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-colors"
          >
            {/* 타이틀 바 (왼쪽: 앱 아이콘 + 타이틀, 오른쪽: X 닫기 버튼) */}
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800 border-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] sm:text-[28px] text-indigo-600 dark:text-indigo-400 transition-colors drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  directions_subway
                </span>
                <svg viewBox="0 0 360 60" className="h-[22px] sm:h-[26px] w-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <text x="0" y="45" fontWeight="900" fontSize="42" letterSpacing="-0.04em" className="fill-indigo-600 dark:fill-indigo-400 transition-colors duration-300">Subway</text>
                  <circle cx="178" cy="32" r="6" className="fill-indigo-600 dark:fill-indigo-400 transition-colors duration-300" />
                  <path d="M184 32 L200 32" stroke="currentColor" strokeWidth="4" className="stroke-indigo-600 dark:stroke-indigo-400 transition-colors duration-300" strokeDasharray="4 4" />
                  <text x="206" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-slate-800 dark:fill-white transition-colors duration-300">Tracker</text>
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
                aria-label="닫기"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* 본문 (설명 + 업데이트 버튼) */}
            <div className="p-6 space-y-4">
              <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed text-left transition-colors">
                {APP_CONFIG.INFO_MESSAGE}
              </p>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={handleUpdateApp}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isUpdating ? "animate-spin" : ""}`}>
                    sync
                  </span>
                  {isUpdating ? "캐시 삭제 중..." : "최신 버전 업데이트"}
                </button>
              </div>
            </div>

            <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">
              <a
                href="https://landing-doohee2.vercel.app/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
              >
                개인정보처리방침
              </a>
              <span>{APP_CONFIG.VERSION}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
