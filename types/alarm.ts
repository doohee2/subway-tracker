export interface AlarmNotificationPayload {
  title: string;
  body: string;
  stationName: string;
  arrivalTime: number;
  alarmId: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface AlarmReserveRequest {
  delayMs: number;
  subscription: PushSubscriptionData;
  payload: AlarmNotificationPayload;
}

export type AlarmErrorCode =
  | "NOTIFICATION_UNSUPPORTED"
  | "NOTIFICATION_PERMISSION_DENIED"
  | "PUSH_UNSUPPORTED"
  | "VAPID_PUBLIC_KEY_MISSING"
  | "INVALID_PUSH_SUBSCRIPTION"
  | "INVALID_DELAY"
  | "INVALID_PAYLOAD"
  | "NETWORK_ERROR"
  | "QSTASH_CONFIG_MISSING"
  | "QSTASH_RESERVE_FAILED"
  | "UNKNOWN_ERROR";

export interface AlarmReserveResponse {
  ok: boolean;
  messageId?: string;
  code?: AlarmErrorCode;
  error?: string;
}

export interface AlarmCancelRequest {
  messageId: string;
}

export interface PushDeliveryRequest {
  subscription: PushSubscriptionData;
  payload: AlarmNotificationPayload;
}

export type AlarmStrategy = "local" | "qstash";

export interface SubwayAlarm {
  id: string;
  stationName: string;
  arrivalTime: number;
  notifyAt: number;
  strategy: AlarmStrategy;
  qstashMessageId?: string;
}
