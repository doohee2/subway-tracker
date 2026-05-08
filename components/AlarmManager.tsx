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
          if (alarm.strategy !== "local") {
            return true;
          }

          const notifyTime = alarm.arrivalTime - (2 * 60 * 1000); // 2 minutes before arrival

          if (now >= notifyTime) {
            if (Notification.permission === "granted") {
              new Notification(`지하철 알림: ${alarm.stationName}역`, {
                body: `${alarm.stationName}역 도착 2분 전입니다!`,
                icon: "/favicon.ico",
              });
            }
            hasChanges = true;
            return false;
          }

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
