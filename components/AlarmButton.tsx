"use client";

import React, { useState } from "react";
import AlarmModal from "./AlarmModal";
import { AlarmErrorCode, AlarmReserveResponse, SubwayAlarm } from "@/types/alarm";
import { loadAndNormalizeAlarms, saveAlarms } from "@/utils/alarmStorage";

interface AlarmButtonProps {
  stationName: string;
  timeString: string;
  arrivalTime: number;
  isMissingData: boolean;
}

export default function AlarmButton({ stationName, timeString, arrivalTime, isMissingData }: AlarmButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showDetailedAlarmError = process.env.NEXT_PUBLIC_SHOW_DETAILED_ALARM_ERROR === "true";

  const createAlarmError = (code: AlarmErrorCode, message: string) => {
    const error = new Error(message) as Error & { code: AlarmErrorCode };
    error.code = code;
    return error;
  };

  const getDetailedAlarmErrorMessage = (code?: AlarmErrorCode): string => {
    switch (code) {
      case "NOTIFICATION_UNSUPPORTED":
      case "PUSH_UNSUPPORTED":
        return "현재 실행 환경에서 푸시 알림을 지원하지 않습니다. iPhone에서는 Safari 최신 버전 또는 홈 화면에 추가한 앱(PWA)에서 다시 시도해 주세요.";
      case "NOTIFICATION_PERMISSION_DENIED":
        return "알림 권한이 없거나 차단되어 알람을 설정할 수 없습니다. iPhone 설정 > Safari(또는 홈 화면 앱) > 알림에서 권한을 허용해 주세요.";
      case "VAPID_PUBLIC_KEY_MISSING":
        return "푸시 설정 키(VAPID) 구성에 문제가 있어 알람을 설정할 수 없습니다. 관리자에게 문의해 주세요.";
      case "INVALID_PUSH_SUBSCRIPTION":
        return "푸시 구독 정보가 유효하지 않습니다. 앱을 새로고침한 뒤 알림 권한을 다시 허용하고 시도해 주세요.";
      case "INVALID_DELAY":
        return "알람 예약 시간이 올바르지 않습니다. 도착 2분 이상 남은 열차에서 다시 시도해 주세요.";
      case "NETWORK_ERROR":
        return "네트워크 연결 문제로 알람 예약 요청에 실패했습니다. 인터넷 연결 상태를 확인한 뒤 다시 시도해 주세요.";
      case "QSTASH_AUTH_INVALID":
        return "서버 알람 인증에 실패했습니다. 운영자에게 문의해 주세요.";
      case "QSTASH_CONFIG_MISSING":
      case "QSTASH_RESERVE_FAILED":
        return "서버 예약 알람 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      default:
        return "알람 설정 중 알 수 없는 오류가 발생했습니다. 앱을 새로고침한 뒤 다시 시도해 주세요.";
    }
  };

  const formatAlarmErrorMessage = (code: AlarmErrorCode, technicalMessage?: string): string => {
    const userMessage = getDetailedAlarmErrorMessage(code);
    if (!showDetailedAlarmError) {
      return userMessage;
    }

    const details = [`에러 코드: ${code}`];
    if (technicalMessage) {
      details.push(`원인: ${technicalMessage}`);
    }

    return `${userMessage}\n\n[${details.join(" | ")}]`;
  };

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
      throw createAlarmError("PUSH_UNSUPPORTED", "This browser does not support push notifications.");
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw createAlarmError("VAPID_PUBLIC_KEY_MISSING", "VAPID public key is missing.");
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
    }

    const subscriptionJson = subscription.toJSON();
    if (!subscriptionJson.endpoint || !subscriptionJson.keys?.auth || !subscriptionJson.keys?.p256dh) {
      throw createAlarmError("INVALID_PUSH_SUBSCRIPTION", "Invalid push subscription.");
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
      alert(formatAlarmErrorMessage("NOTIFICATION_UNSUPPORTED"));
      return;
    }

    let permission = Notification.permission;
    if (permission !== "granted" && permission !== "denied") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      alert(formatAlarmErrorMessage("NOTIFICATION_PERMISSION_DENIED"));
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

        let reserveRes: Response;
        try {
          reserveRes = await fetch("/api/alarm/reserve", {
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
        } catch {
          throw createAlarmError("NETWORK_ERROR", "Network request failed.");
        }

        const reserveData = (await reserveRes.json()) as AlarmReserveResponse;
        if (!reserveRes.ok || !reserveData.ok || !reserveData.messageId) {
          throw createAlarmError(
            reserveData.code ?? "QSTASH_RESERVE_FAILED",
            reserveData.error || "Failed to reserve alarm."
          );
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
    } catch (e: unknown) {
      console.error("Failed to set alarm", e);
      const technicalMessage =
        typeof e === "object" && e !== null && "message" in e
          ? String((e as { message?: unknown }).message ?? "")
          : "";
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? ((e as { code?: AlarmErrorCode }).code ?? "UNKNOWN_ERROR")
          : "UNKNOWN_ERROR";
      alert(formatAlarmErrorMessage(code, technicalMessage));
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
