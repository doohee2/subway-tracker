import { AlarmErrorCode, AlarmReserveResponse, SubwayAlarm } from "@/types/alarm";
import { loadAndNormalizeAlarms, saveAlarms } from "@/utils/alarmStorage";
import { createClientError, extractClientErrorInfo, formatUserErrorMessage } from "@/utils/errorMessage";

export const createAlarmError = (code: AlarmErrorCode, message: string) => createClientError(code, message);

export const getDetailedAlarmErrorMessage = (code?: AlarmErrorCode): string => {
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

export const formatAlarmErrorMessage = (code: string, technicalMessage?: string): string =>
  formatUserErrorMessage(getDetailedAlarmErrorMessage(code as AlarmErrorCode), code, technicalMessage);

export const isStandaloneMode = () => {
  const isDisplayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIosStandalone =
    typeof navigator !== "undefined" &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return isDisplayModeStandalone || isIosStandalone;
};

export const isAppInForeground = () => document.visibilityState === "visible";

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

export const getPushSubscription = async () => {
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

export interface SetupAlarmParams {
  stationName: string;
  arrivalTime: number;
  notifyAt: number;
  title: string;
  body: string;
  successMessage?: string;
}

export const setupSubwayAlarm = async ({
  stationName,
  arrivalTime,
  notifyAt,
  title,
  body,
  successMessage,
}: SetupAlarmParams) => {
  if (!("Notification" in window)) {
    alert(formatAlarmErrorMessage("NOTIFICATION_UNSUPPORTED"));
    return false;
  }

  let permission = Notification.permission;
  if (permission !== "granted" && permission !== "denied") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    alert(formatAlarmErrorMessage("NOTIFICATION_PERMISSION_DENIED"));
    return false;
  }

  try {
    const alarms = loadAndNormalizeAlarms();
    const useLocalStrategy = isAppInForeground() && !isStandaloneMode();

    const duplicate = alarms.find(
      (alarm) => alarm.stationName === stationName && alarm.arrivalTime === arrivalTime
    );
    if (duplicate) {
      alert("이미 같은 도착 시각의 알람이 설정되어 있습니다.");
      return false;
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
              title,
              body,
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

    const defaultSuccessMessage = useLocalStrategy
      ? `'${stationName}역' 알람이 설정되었습니다.`
      : `'${stationName}역' 서버 예약 알람이 설정되었습니다.`;

    alert(successMessage || defaultSuccessMessage);
    return true;
  } catch (e: unknown) {
    console.error("Failed to set alarm", e);
    const { code, technicalMessage } = extractClientErrorInfo(e, "UNKNOWN_ERROR");
    alert(formatAlarmErrorMessage(code, technicalMessage));
    return false;
  }
};
