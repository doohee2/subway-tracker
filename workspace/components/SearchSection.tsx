import { useState, KeyboardEvent } from "react";

interface SearchSectionProps {
  onSearch: (station: string) => void;
  recentSearches: string[];
  onRecentClick: (station: string) => void;
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
  status,
}: SearchSectionProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      onSearch(inputValue.trim());
      setInputValue("");
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
        <div className="flex flex-wrap gap-2">
          {recentSearches.map((station) => (
            <button
              key={station}
              onClick={() => onRecentClick(station)}
              className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-body-sm text-body-sm hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              {station}
            </button>
          ))}
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
