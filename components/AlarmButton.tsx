"use client";

import React, { useState } from "react";
import AlarmModal from "./AlarmModal";
import CustomAlarmModal from "./CustomAlarmModal";
import { setupSubwayAlarm } from "@/utils/alarmActions";

interface AlarmButtonProps {
  stationName: string;
  timeString: string;
  arrivalTime: number;
  isMissingData: boolean;
}

export default function AlarmButton({ stationName, timeString, arrivalTime, isMissingData }: AlarmButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const handleClick = () => {
    if (isMissingData) {
      setIsCustomModalOpen(true);
      return;
    }

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
    const notifyAt = arrivalTime - 2 * 60 * 1000;
    
    await setupSubwayAlarm({
      stationName,
      arrivalTime,
      notifyAt,
      title: `지하철 알림: ${stationName}역`,
      body: `${stationName}역 도착 2분 전입니다!`,
      successMessage: `'${stationName}역' 도착 2분 전 알람이 설정되었습니다.`
    });
  };

  const handleCustomConfirm = async (minutes: number) => {
    setIsCustomModalOpen(false);
    const now = Date.now();
    const notifyAt = now + minutes * 60 * 1000;
    const customArrivalTime = notifyAt; // Use notifyAt as the arrival time reference

    await setupSubwayAlarm({
      stationName,
      arrivalTime: customArrivalTime,
      notifyAt,
      title: `지하철 알림: ${stationName}역`,
      body: `${stationName}역 지정 알람 시간입니다!`,
      successMessage: `'${stationName}역' ${minutes}분 후 알람이 설정되었습니다.`
    });
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleCustomCancel = () => {
    setIsCustomModalOpen(false);
  };

  return (
    <>
      <button 
        onClick={handleClick}
        className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
          isMissingData 
            ? 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 bg-slate-50 border-slate-200 text-slate-500 shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md cursor-pointer'
            : 'dark:bg-indigo-900/40 dark:border-indigo-700/30 dark:text-indigo-400 dark:hover:bg-indigo-800/50 bg-white border-slate-200 text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md cursor-pointer'
        }`}
      >
        {isMissingData ? '--:--' : timeString}
      </button>

      <AlarmModal 
        isOpen={isModalOpen}
        stationName={stationName}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      
      <CustomAlarmModal
        isOpen={isCustomModalOpen}
        onConfirm={handleCustomConfirm}
        onCancel={handleCustomCancel}
      />
    </>
  );
}
