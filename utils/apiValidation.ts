import { z } from "zod";

// Subway Station Realtime Arrival Query Schema
export const SubwayQuerySchema = z.object({
  station: z.string().min(1, "Station parameter must not be empty").max(50, "Station parameter is too long"),
});

// Subway Realtime Position Query Schema
export const PositionQuerySchema = z.object({
  lineName: z.string().min(1, "lineName parameter must not be empty").max(50, "lineName parameter is too long"),
});

// Push Subscription Keys Schema
const PushKeysSchema = z.object({
  p256dh: z.string().min(1, "p256dh key is required"),
  auth: z.string().min(1, "auth key is required"),
});

// Push Subscription Schema
export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url("Endpoint must be a valid URL"),
  expirationTime: z.number().nullable().optional(),
  keys: PushKeysSchema,
});

// Alarm Notification Payload Schema
export const AlarmPayloadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  stationName: z.string().min(1, "Station name is required"),
  arrivalTime: z.number().int("Arrival time must be an integer timestamp"),
  alarmId: z.string().min(1, "Alarm ID is required"),
});

// Alarm Reserve Request Schema
export const AlarmReserveSchema = z.object({
  delayMs: z.number().int().positive("delayMs must be greater than 0"),
  subscription: PushSubscriptionSchema,
  payload: AlarmPayloadSchema,
});

// Alarm Cancel Request Schema
export const AlarmCancelSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
});

// Push Delivery Request Schema
export const PushDeliverySchema = z.object({
  subscription: PushSubscriptionSchema,
  payload: AlarmPayloadSchema,
});
