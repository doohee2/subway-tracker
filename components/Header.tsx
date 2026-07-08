"use client";

import { useTheme } from "./ThemeProvider";

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 lg:px-10 h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm transition-colors">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">
          directions_subway
        </span>
        <h1 className="text-2xl font-black tracking-tighter text-on-surface font-sans antialiased tracking-tight">
          지하철 도착 정보
        </h1>
      </div>
      <button
        onClick={toggleTheme}
        className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Toggle Dark Mode"
      >
        <span className="material-symbols-outlined">
          {theme === "dark" ? "light_mode" : "dark_mode"}
        </span>
      </button>
    </header>
  );
}
