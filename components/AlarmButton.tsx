"use client";

import React, { useState } from "react";
import AlarmModal from "./AlarmModal";
import { AlarmReserveResponse, SubwayAlarm } from "@/types/alarm";
import { loadAndNormalizeAlarms, saveAlarms } from "@/utils/alarmStorage";

interface AlarmButtonProps {
  stationName: string;
  timeString: string;
  arrivalTime: number;
  isMissingData: boolean;
}

export default function AlarmButton({ stationName, timeString, arrivalTime, isMissingData }: AlarmButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isStandaloneMode = () => {
    const isDisplayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIosStandalone =
      typeof navigator !== "undefined" &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    return isDisplayModeStandalone || isIosStandalone;
  };

  const isAppInForeground = () => document.visibilityState === "visible";

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getPushSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID 공개키가 설정되지 않았습니다.");
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
    }

    const subscriptionJson = subscription.toJSON();
    if (!subscriptionJson.endpoint || !subscriptionJson.keys?.auth || !subscriptionJson.keys?.p256dh) {
      throw new Error("푸시 구독 정보가 올바르지 않습니다.");
    }

    return {
      endpoint: subscriptionJson.endpoint,
      expirationTime: subscriptionJson.expirationTime,
      keys: {
        auth: subscriptionJson.keys.auth,
        p256dh: subscriptionJson.keys.p256dh,
      },
    };
  };

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
      const alarms = loadAndNormalizeAlarms();
      const notifyAt = arrivalTime - 2 * 60 * 1000;
      const useLocalStrategy = isAppInForeground() && !isStandaloneMode();

      const duplicate = alarms.find(
        (alarm) => alarm.stationName === stationName && alarm.arrivalTime === arrivalTime
      );
      if (duplicate) {
        alert("이미 같은 도착 시각의 알람이 설정되어 있습니다.");
        return;
      }

      const newAlarm: SubwayAlarm = {
        id: `${stationName}-${arrivalTime}-${Math.random().toString(36).substr(2, 9)}`,
        stationName,
        arrivalTime,
        notifyAt,
        strategy: useLocalStrategy ? "local" : "qstash",
      };

      if (!useLocalStrategy) {
        const delayMs = Math.max(1000, notifyAt - Date.now());
        const subscription = await getPushSubscription();

        const reserveRes = await fetch("/api/alarm/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delayMs,
            subscription,
            payload: {
              title: `지하철 알림: ${stationName}역`,
              body: `${stationName}역 도착 2분 전입니다!`,
              stationName,
              arrivalTime,
              alarmId: newAlarm.id,
            },
          }),
        });

        const reserveData = (await reserveRes.json()) as AlarmReserveResponse;
        if (!reserveRes.ok || !reserveData.ok || !reserveData.messageId) {
          throw new Error(reserveData.error || "서버 알람 예약에 실패했습니다.");
        }

        newAlarm.qstashMessageId = reserveData.messageId;
      }

      alarms.push(newAlarm);
      saveAlarms(alarms);
      window.dispatchEvent(new Event("subway_alarms_updated"));

      alert(
        useLocalStrategy
          ? `'${stationName}역' 도착 2분 전 알람이 설정되었습니다.`
          : `'${stationName}역' 서버 예약 알람이 설정되었습니다.`
      );
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
