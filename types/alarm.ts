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

export interface AlarmReserveResponse {
  ok: boolean;
  messageId?: string;
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
