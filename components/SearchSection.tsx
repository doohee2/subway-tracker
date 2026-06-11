import { useState, useEffect, KeyboardEvent } from "react";

interface SearchSectionProps {
  onSearch: (station: string) => void;
  recentSearches: string[];
  onRecentClick: (station: string) => void;
  pinnedStations: string[];
  onPinToggle: (station: string) => void;
  initialValue?: string;
  status: {
    type: "idle" | "loading" | "success" | "error";
    message: string;
    time?: string;
  };
}

export default function SearchSection({
  onSearch,
  recentSearches,
  onRecentClick,
  pinnedStations,
  onPinToggle,
  initialValue,
  status,
}: SearchSectionProps) {
  const [inputValue, setInputValue] = useState(initialValue ?? "");

  useEffect(() => {
    if (initialValue) {
      setInputValue(initialValue);
    }
  }, [initialValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      let searchQuery = inputValue.trim();
      if (searchQuery.endsWith("역")) {
        searchQuery = searchQuery.slice(0, -1);
      }
      onSearch(searchQuery);
      setInputValue(searchQuery);
    }
  };

  return (
    <section className="flex flex-col gap-sm">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
          search
        </span>
        <input
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary shadow-sm outline-none transition-colors"
          placeholder="지하철역 이름 검색... (엔터)"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      
      {recentSearches.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {recentSearches.map((station) => {
            const isPinned = pinnedStations.includes(station);
            return (
              <div key={station} className="flex items-center gap-1 bg-transparent">
                <button
                  onClick={() => onPinToggle(station)}
                  className={`flex items-center justify-center rounded-full transition-all cursor-pointer border ${
                    isPinned
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-surface-container/50 text-on-surface-variant/40 hover:bg-surface-container hover:text-on-surface-variant/70 border-transparent"
                  }`}
                  style={{
                    height: "28px",
                    width: "36px",
                  }}
                  title={isPinned ? "즐겨찾기 해제" : "즐겨찾기 등록"}
                >
                  <span
                    className="material-symbols-outlined text-[16px] transition-transform duration-200"
                    style={{
                      fontVariationSettings: isPinned ? "'FILL' 1" : "'FILL' 0",
                      transform: isPinned ? "rotate(0deg)" : "rotate(-45deg)",
                    }}
                  >
                    push_pin
                  </span>
                </button>
                <button
                  onClick={() => onRecentClick(station)}
                  className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-body-sm text-body-sm hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center h-[28px]"
                >
                  {station}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {status.type === "success" && (
        <div className="mt-2 flex items-center justify-between p-3 rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">
              check_circle
            </span>
            <span className="font-body-sm text-body-sm font-medium">
              {status.message}
            </span>
          </div>
          {status.time && (
            <span className="text-xs text-emerald-500/70">{status.time}</span>
          )}
        </div>
      )}

      {status.type === "error" && (
        <div className="mt-2 flex items-center gap-2 p-3 rounded-lg bg-red-900/30 text-red-400 border border-red-800/50">
          <span className="material-symbols-outlined text-red-400">error</span>
          <span className="font-body-sm text-body-sm font-medium">
            {status.message}
          </span>
        </div>
      )}
      
      {status.type === "loading" && (
        <div className="mt-2 flex items-center gap-2 p-3 rounded-lg bg-indigo-900/30 text-indigo-400 border border-indigo-800/50">
          <span className="material-symbols-outlined text-indigo-400 animate-spin">
            refresh
          </span>
          <span className="font-body-sm text-body-sm font-medium">
            {status.message}
          </span>
        </div>
      )}
    </section>
  );
}
