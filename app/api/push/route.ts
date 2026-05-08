import { NextResponse } from "next/server";
import { PushDeliveryRequest } from "@/types/alarm";
import { getQstashReceiver } from "@/utils/qstash";
import { sendWebPush } from "@/utils/push";

export async function POST(request: Request) {
  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing upstash-signature." }, { status: 401 });
  }

  const rawBody = await request.text();

  try {
    const receiver = getQstashReceiver();
    await receiver.verify({
      signature,
      body: rawBody,
      url: process.env.QSTASH_PUSH_ENDPOINT_URL,
    });
  } catch (error) {
    console.error("QStash signature verification failed:", error);
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as PushDeliveryRequest;
    if (!body.subscription || !body.payload) {
      return NextResponse.json({ ok: false, error: "Invalid push body." }, { status: 400 });
    }

    await sendWebPush(body.subscription, body.payload);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const statusCode =
      typeof error === "object" && error !== null
        ? (error as { statusCode?: number; status?: number }).statusCode ??
          (error as { statusCode?: number; status?: number }).status
        : undefined;

    if (statusCode === 404 || statusCode === 410) {
      return NextResponse.json(
        { ok: true, staleSubscription: true, error: "Subscription is no longer valid." },
        { status: 200 }
      );
    }

    console.error("Failed to send web push:", error);
    return NextResponse.json({ ok: false, error: "Failed to send web push." }, { status: 500 });
  }
}
