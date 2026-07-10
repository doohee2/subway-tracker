"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, icon = "warning", onConfirm, onCancel }: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center dark:bg-slate-950/60 bg-slate-900/30 backdrop-blur-sm p-4 transition-colors">
      <div 
        style={{ width: 'min(400px, calc(100vw - 2rem))', flexShrink: 0 }}
        className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-colors"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 dark:bg-red-500/20 bg-red-50 dark:text-red-400 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
            <span className="material-symbols-outlined text-3xl">{icon}</span>
          </div>
          <h3 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight transition-colors">
            {title}
          </h3>
          <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed text-center transition-colors">
            {message}
          </p>
        </div>
        <div className="flex border-t dark:border-slate-800 border-slate-100 transition-colors">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:hover:bg-slate-800 hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            취소
          </button>
          <div className="w-[1px] dark:bg-slate-800 bg-slate-200 transition-colors"></div>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 dark:text-red-400 text-red-600 dark:hover:text-red-300 hover:text-red-700 dark:hover:bg-red-900/20 hover:bg-red-50 transition-colors font-bold text-sm"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
