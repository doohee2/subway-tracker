export default function Navigation() {
  return (
    <>
      {/* NavigationDrawer (Web) */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full border-r border-slate-800 w-72 bg-slate-900 shadow-2xl divide-y divide-slate-800 pt-16">
        <div className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-indigo-300 bg-indigo-500/20 font-bold text-xl">
            S
          </div>
          <div>
            <div className="font-sans text-sm font-semibold text-indigo-50">
              Subway Tracker
            </div>
            <div className="text-xs text-slate-400">by doohee2</div>
          </div>
        </div>
        <div className="flex-1 py-4 flex flex-col gap-2">
          <a
            className="flex items-center gap-3 px-6 py-3 bg-indigo-900/40 text-indigo-300 border-l-4 border-indigo-600 font-sans text-sm font-semibold transition-all duration-300 ease-in-out"
            href="#"
          >
            <span className="material-symbols-outlined">hub</span>
            트래커
          </a>
          <a
            className="flex items-center gap-3 px-6 py-3 text-slate-400 pl-4 hover:bg-slate-800 font-sans text-sm font-semibold transition-all duration-300 ease-in-out"
            href="#"
          >
            <span className="material-symbols-outlined">map</span>
            경로
          </a>
          <a
            className="flex items-center gap-3 px-6 py-3 text-slate-400 pl-4 hover:bg-slate-800 font-sans text-sm font-semibold transition-all duration-300 ease-in-out"
            href="#"
          >
            <span className="material-symbols-outlined">notifications</span>
            알림
          </a>
          <a
            className="flex items-center gap-3 px-6 py-3 text-slate-400 pl-4 hover:bg-slate-800 font-sans text-sm font-semibold transition-all duration-300 ease-in-out"
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
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 lg:hidden bg-slate-900/90 backdrop-blur-md border-t border-indigo-900/50 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]">
        <a
          className="flex flex-col items-center justify-center bg-indigo-900/30 text-indigo-300 rounded-xl px-3 py-1 active:scale-95 transition-transform"
          href="#"
        >
          <span className="material-symbols-outlined">hub</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            트래커
          </span>
        </a>
        <a
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400"
          href="#"
        >
          <span className="material-symbols-outlined">map</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            경로
          </span>
        </a>
        <a
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400"
          href="#"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
            알림
          </span>
        </a>
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
    </>
  );
}
