"use client";

import { useEffect } from "react";
import { SubwayAlarm } from "@/types/alarm";
import { loadAndNormalizeAlarms, saveAlarms } from "@/utils/alarmStorage";

export default function AlarmManager() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Failed to register service worker", error);
      });
    }

    const interval = setInterval(() => {
      try {
        const alarms: SubwayAlarm[] = loadAndNormalizeAlarms();
        if (!alarms || alarms.length === 0) return;

        const now = Date.now();
        let hasChanges = false;

        const remainingAlarms = alarms.filter(alarm => {
          // Fallback in case notifyAt is somehow missing (older data)
          const notifyTime = alarm.notifyAt || alarm.arrivalTime - (2 * 60 * 1000);

          if (alarm.strategy === "local") {
            if (now >= notifyTime) {
              if (Notification.permission === "granted") {
                new Notification(`지하철 알림: ${alarm.stationName}역`, {
                  body: alarm.stationName === "사용자 지정" 
                    ? `설정하신 사용자 지정 알람 시간입니다!` 
                    : `${alarm.stationName}역 도착 2분 전입니다!`,
                  icon: "/favicon.ico",
                });
              }
              hasChanges = true;
              return false; // Remove local alarm after firing
            }
          } else {
            // QStash (iPhone PWA) alarms:
            // Naturally remove them from the UI list a short moment after the notification was supposed to be delivered.
            // We give it a 1-minute buffer so it doesn't disappear *before* the push actually arrives.
            if (now > notifyTime + (1 * 60 * 1000)) {
              hasChanges = true;
              return false;
            }
          }

          // Global fallback cleanup: strictly clean anything 10 mins past arrival
          if (now > alarm.arrivalTime + (10 * 60 * 1000)) {
            hasChanges = true;
            return false;
          }

          return true;
        });

        if (hasChanges) {
          saveAlarms(remainingAlarms);
          window.dispatchEvent(new Event("subway_alarms_updated"));
        }
      } catch (error) {
        console.error("Failed to check subway alarms", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
