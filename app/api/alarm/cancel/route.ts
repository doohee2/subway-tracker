import { NextResponse } from "next/server";
import { AlarmCancelRequest } from "@/types/alarm";
import { getQstashClient } from "@/utils/qstash";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AlarmCancelRequest;
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ ok: false, code: "MESSAGE_ID_REQUIRED", error: "messageId is required." }, { status: 400 });
    }

    const client = getQstashClient();
    await client.messages.delete(messageId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to cancel reserved alarm:", error);
    return NextResponse.json(
      { ok: false, code: "ALARM_CANCEL_FAILED", error: "Failed to cancel reserved alarm." },
      { status: 500 }
    );
  }
}
