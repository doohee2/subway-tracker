import webpush from "web-push";
import { PushSubscriptionData } from "@/types/alarm";

let configured = false;

export function configureWebPush() {
  if (configured) return;

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID environment variables are not fully configured.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendWebPush(
  subscription: PushSubscriptionData,
  payload: unknown
) {
  configureWebPush();
  return webpush.sendNotification(subscription as webpush.PushSubscription, JSON.stringify(payload));
}
