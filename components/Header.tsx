"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "./ThemeProvider";
import { APP_CONFIG } from "@/utils/config";
import UserAvatar from "./UserAvatar";


export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 lg:px-10 h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm transition-colors">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[28px] sm:text-[34px] text-indigo-600 dark:text-indigo-400 transition-colors drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
          directions_subway
        </span>
        <svg viewBox="0 0 360 60" className="h-[28px] sm:h-[34px] w-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="45" fontWeight="900" fontSize="42" letterSpacing="-0.04em" className="fill-indigo-600 dark:fill-indigo-400 transition-colors duration-300">Subway</text>
          <circle cx="178" cy="32" r="6" className="fill-indigo-600 dark:fill-indigo-400 transition-colors duration-300" />
          <path d="M184 32 L200 32" stroke="currentColor" strokeWidth="4" className="stroke-indigo-600 dark:stroke-indigo-400 transition-colors duration-300" strokeDasharray="4 4" />
          <text x="206" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-slate-800 dark:fill-white transition-colors duration-300">Tracker</text>
        </svg>
        <button
          onClick={() => setShowInfo(true)}
          className="ml-1 text-slate-400 hover:text-indigo-500 transition-colors flex items-center justify-center focus:outline-none"
          title="안내"
        >
          <span className="material-symbols-outlined text-[20px]">info</span>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 dark:bg-indigo-500/20 bg-slate-100 dark:text-indigo-400 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                <span className="material-symbols-outlined text-3xl">info</span>
              </div>
              <h3 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight transition-colors">
                안내
              </h3>
              <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed text-left transition-colors">
                {APP_CONFIG.INFO_MESSAGE}
              </p>
            </div>
            <div className="flex border-t dark:border-slate-800 border-slate-100 transition-colors">
              <button
                onClick={() => setShowInfo(false)}
                className="flex-1 py-4 dark:text-indigo-400 text-slate-700 dark:hover:text-indigo-300 hover:text-slate-900 dark:hover:bg-indigo-900/20 hover:bg-slate-50 transition-colors font-bold text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
