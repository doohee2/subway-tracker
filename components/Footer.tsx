export default function Footer() {
  return (
    <footer className="w-full py-8 px-10 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto bg-slate-950 border-t border-slate-800">
      <p className="text-xs font-medium text-slate-500">
        © 2026 by doohee2
      </p>
      <div className="flex gap-4">
        <a
          className="text-xs font-medium text-slate-400 hover:text-indigo-400 underline"
          href="#"
        >
          Privacy Policy
        </a>
        <a
          className="text-xs font-medium text-slate-400 hover:text-indigo-400 underline"
          href="#"
        >
          Terms of Service
        </a>
        <a
          className="text-xs font-medium text-slate-400 hover:text-indigo-400 underline"
          href="#"
        >
          API Status
        </a>
      </div>
    </footer>
  );
}
