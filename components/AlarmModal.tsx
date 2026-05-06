import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AlarmModalProps {
  isOpen: boolean;
  stationName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AlarmModal({ isOpen, stationName, onConfirm, onCancel }: AlarmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div 
        className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-3xl">notifications_active</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            알람 설정
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed text-left">
            <span className="font-semibold text-indigo-400">{stationName}역</span> 도착 예정시간 전에 알람을 맞추시겠습니까? 알람은 예정시간 <strong className="text-white">2분 전</strong>으로 맞춰집니다.
          </p>
          <div className="bg-slate-800/50 p-3 rounded-lg text-xs text-slate-400 text-left border border-slate-700/50 mt-4">
            <span className="material-symbols-outlined text-amber-500 text-[14px] inline-block align-text-bottom mr-1">warning</span>
            알람 설정 권한이 필요하며, 브라우저를 닫을 경우 알람이 오지 않을 수도 있습니다.
          </div>
        </div>
        <div className="flex border-t border-slate-800">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm"
          >
            아니오
          </button>
          <div className="w-[1px] bg-slate-800"></div>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 transition-colors font-bold text-sm"
          >
            예
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
