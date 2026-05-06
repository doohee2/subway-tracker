"use client";

import { useEffect } from "react";

export interface SubwayAlarm {
  id: string;
  stationName: string;
  arrivalTime: number; // Unix timestamp in ms
}

export default function AlarmManager() {
  useEffect(() => {
    // Check alarms every 10 seconds
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem("subway_alarms");
        if (!stored) return;

        const alarms: SubwayAlarm[] = JSON.parse(stored);
        if (!alarms || alarms.length === 0) return;

        const now = Date.now();
        let hasChanges = false;
        
        const remainingAlarms = alarms.filter(alarm => {
          const notifyTime = alarm.arrivalTime - (2 * 60 * 1000); // 2 minutes before arrival
          
          if (now >= notifyTime) {
            // Trigger notification
            if (Notification.permission === "granted") {
              new Notification(`지하철 알림: ${alarm.stationName}역`, {
                body: `${alarm.stationName}역 도착 2분 전입니다!`,
                icon: "/favicon.ico", // Or appropriate icon
              });
            } else {
              // If permission was lost or not granted, fallback to alert?
              // alert(`지하철 알림: ${alarm.stationName}역 도착 2분 전입니다!`);
            }
            hasChanges = true;
            return false; // Remove from list
          }
          
          // Also remove alarms that are way past their time (e.g., 10 mins after arrival) to clean up garbage
          if (now > alarm.arrivalTime + (10 * 60 * 1000)) {
            hasChanges = true;
            return false;
          }

          return true; // Keep in list
        });

        if (hasChanges) {
          localStorage.setItem("subway_alarms", JSON.stringify(remainingAlarms));
          // Dispatch a custom event so other parts of the app can update UI if needed
          window.dispatchEvent(new Event("subway_alarms_updated"));
        }
      } catch (error) {
        console.error("Failed to check subway alarms", error);
      }
    }, 5000); // 5초마다 체크하여 정확도를 높임

    return () => clearInterval(interval);
  }, []);

  return null; // This component does not render anything
}
