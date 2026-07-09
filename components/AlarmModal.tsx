"use client";

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
    <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center dark:bg-slate-950/60 bg-slate-900/30 backdrop-blur-sm p-4 transition-colors">
      <div 
        style={{ width: 'min(448px, calc(100vw - 2rem))', flexShrink: 0 }}
        className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-colors"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 dark:bg-indigo-500/20 bg-slate-100 dark:text-indigo-400 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
            <span className="material-symbols-outlined text-3xl">notifications_active</span>
          </div>
          <h3 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight transition-colors">
            알람 설정
          </h3>
          <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed text-left transition-colors">
            <span className="font-semibold text-indigo-500 dark:text-indigo-400">{stationName}역</span> 도착 예정시간 전에 알람을 맞추시겠습니까? 알람은 예정시간 <strong className="dark:text-white text-slate-900">2분 전</strong>으로 맞춰집니다.
          </p>
          <div className="dark:bg-slate-800/50 bg-slate-50 p-3 rounded-lg text-xs dark:text-slate-400 text-slate-500 text-left border dark:border-slate-700/50 border-slate-200 mt-4 transition-colors">
            <span className="material-symbols-outlined text-amber-500 text-[14px] inline-block align-text-bottom mr-1">warning</span>
            알람 설정 권한이 필요하며, 브라우저를 닫을 경우 알람이 오지 않을 수도 있습니다.
          </div>
        </div>
        <div className="flex border-t dark:border-slate-800 border-slate-100 transition-colors">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:hover:bg-slate-800 hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            아니오
          </button>
          <div className="w-[1px] dark:bg-slate-800 bg-slate-200 transition-colors"></div>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 dark:text-indigo-400 text-slate-700 dark:hover:text-indigo-300 hover:text-slate-900 dark:hover:bg-indigo-900/20 hover:bg-slate-50 transition-colors font-bold text-sm"
          >
            예
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
