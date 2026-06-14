import { APP_CONFIG } from "@/utils/config";

export default function Footer() {
  return (
    <footer className="w-full py-8 px-10 flex justify-center items-center mt-auto bg-slate-950 border-t border-slate-800">
      <p className="text-xs font-medium text-slate-500">
        © {APP_CONFIG.VERSION}
      </p>
    </footer>
  );
}
