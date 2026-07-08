import { APP_CONFIG } from "@/utils/config";

export default function Footer() {
  return (
    <footer className="w-full py-8 px-10 flex justify-center items-center mt-auto dark:bg-slate-950 bg-slate-50 border-t dark:border-slate-800 border-slate-200 transition-colors">
      <p className="text-xs font-medium text-slate-500">
        © {APP_CONFIG.VERSION}
      </p>
    </footer>
  );
}
