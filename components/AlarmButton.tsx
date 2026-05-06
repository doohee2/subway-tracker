"use client";

import React, { useState } from "react";
import AlarmModal from "./AlarmModal";
import { SubwayAlarm } from "./AlarmManager";

interface AlarmButtonProps {
  stationName: string;
  timeString: string;
  arrivalTime: number;
  isMissingData: boolean;
}

export default function AlarmButton({ stationName, timeString, arrivalTime, isMissingData }: AlarmButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (isMissingData) return;

    const now = Date.now();
    const timeDiff = arrivalTime - now;

    // Check if less than 2 minutes
    if (timeDiff <= 2 * 60 * 1000) {
      alert("남은 시간이 부족해 알람을 맞출 수 없습니다.");
      return;
    }

    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setIsModalOpen(false);

    if (!("Notification" in window)) {
      alert("이 브라우저는 알림 기능을 지원하지 않습니다.");
      return;
    }

    let permission = Notification.permission;
    if (permission !== "granted" && permission !== "denied") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      alert("알림 권한이 허용되지 않아 알람을 설정할 수 없습니다.");
      return;
    }

    try {
      const stored = localStorage.getItem("subway_alarms");
      const alarms: SubwayAlarm[] = stored ? JSON.parse(stored) : [];

      const newAlarm: SubwayAlarm = {
        id: `${stationName}-${arrivalTime}-${Math.random().toString(36).substr(2, 9)}`,
        stationName,
        arrivalTime,
      };

      alarms.push(newAlarm);
      localStorage.setItem("subway_alarms", JSON.stringify(alarms));
      
      // Notify other parts of the app
      window.dispatchEvent(new Event("subway_alarms_updated"));

      alert(`'${stationName}역' 도착 2분 전 알람이 설정되었습니다.`);
    } catch (e) {
      console.error(e);
      alert("알람 설정 중 오류가 발생했습니다.");
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button 
        disabled={isMissingData}
        onClick={handleClick}
        className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
          isMissingData 
            ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
            : 'bg-indigo-900/40 border-indigo-700/30 text-indigo-400 hover:bg-indigo-800/50'
        }`}
      >
        {isMissingData ? '역명 버튼' : timeString}
      </button>

      <AlarmModal 
        isOpen={isModalOpen}
        stationName={stationName}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
