export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 lg:px-10 h-16 bg-slate-900 border-b border-indigo-900/50 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-indigo-400">
          directions_subway
        </span>
        <h1 className="text-2xl font-black tracking-tighter text-indigo-100 font-sans antialiased tracking-tight">
          지하철 도착 정보
        </h1>
      </div>
      <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center">
        {/* Placeholder image for user profile */}
        <div className="w-full h-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm font-bold">
          S
        </div>
      </div>
    </header>
  );
}
