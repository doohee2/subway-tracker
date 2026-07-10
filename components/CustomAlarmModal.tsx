"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface CustomAlarmModalProps {
  isOpen: boolean;
  onConfirm: (minutes: number) => void;
  onCancel: () => void;
}

export default function CustomAlarmModal({ isOpen, onConfirm, onCancel }: CustomAlarmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [minutes, setMinutes] = useState(5);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}`);
      setMinutes(5); // Reset to default when opened
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const adjustMinutes = (amount: number) => {
    setMinutes((prev) => Math.max(1, prev + amount));
  };

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center dark:bg-slate-950/60 bg-slate-900/30 backdrop-blur-sm p-4 transition-colors">
      <div
        style={{ width: 'min(448px, calc(100vw - 2rem))', flexShrink: 0 }}
        className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-colors"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 dark:bg-indigo-500/20 bg-slate-100 dark:text-indigo-400 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
            <span className="material-symbols-outlined text-3xl">schedule</span>
          </div>
          <h3 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight transition-colors">
            사용자 알람 설정
          </h3>
          <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed text-left transition-colors">
            현재 시간 <strong className="dark:text-white text-slate-900">{currentTimeStr}</strong> 기준 <strong className="text-indigo-500 dark:text-indigo-400">{minutes}분</strong> 후에 사용자 입력 알람을 맞추시겠습니까?
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button onClick={() => adjustMinutes(-10)} className="px-3 py-1.5 rounded-md text-sm font-semibold dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">-10</button>
            <button onClick={() => adjustMinutes(-5)} className="px-3 py-1.5 rounded-md text-sm font-semibold dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">-5</button>
            <button onClick={() => adjustMinutes(-1)} className="px-3 py-1.5 rounded-md text-sm font-semibold dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">-1</button>

            <div className="w-px h-6 dark:bg-slate-700 bg-slate-300 mx-1"></div>

            <button onClick={() => adjustMinutes(1)} className="px-3 py-1.5 rounded-md text-sm font-semibold dark:bg-indigo-500/20 bg-indigo-50 dark:text-indigo-400 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors">+1</button>
            <button onClick={() => adjustMinutes(5)} className="px-3 py-1.5 rounded-md text-sm font-semibold dark:bg-indigo-500/20 bg-indigo-50 dark:text-indigo-400 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors">+5</button>
            <button onClick={() => adjustMinutes(10)} className="px-3 py-1.5 rounded-md text-sm font-semibold dark:bg-indigo-500/20 bg-indigo-50 dark:text-indigo-400 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors">+10</button>
          </div>

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
            onClick={() => onConfirm(minutes)}
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
