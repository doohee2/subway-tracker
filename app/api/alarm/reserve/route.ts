import { NextResponse } from "next/server";
import { AlarmReserveRequest } from "@/types/alarm";
import { getQstashClient } from "@/utils/qstash";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AlarmReserveRequest;
    const { delayMs, subscription, payload } = body;

    if (!delayMs || delayMs <= 0) {
      return NextResponse.json({ ok: false, error: "delayMs must be greater than 0." }, { status: 400 });
    }

    if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
      return NextResponse.json({ ok: false, error: "Invalid push subscription." }, { status: 400 });
    }

    if (!payload?.alarmId || !payload?.stationName) {
      return NextResponse.json({ ok: false, error: "Invalid notification payload." }, { status: 400 });
    }

    const pushApiUrl = process.env.QSTASH_PUSH_ENDPOINT_URL;
    if (!pushApiUrl) {
      return NextResponse.json(
        { ok: false, error: "QSTASH_PUSH_ENDPOINT_URL is not configured." },
        { status: 500 }
      );
    }

    const client = getQstashClient();
    const delaySeconds = Math.max(1, Math.floor(delayMs / 1000));
    const delay = `${BigInt(delaySeconds)}s` as const;

    const result = await client.publishJSON({
      url: pushApiUrl,
      body: {
        subscription,
        payload,
      },
      delay,
    });

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Failed to reserve alarm:", error);
    return NextResponse.json({ ok: false, error: "Failed to reserve alarm." }, { status: 500 });
  }
}
