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
    try {
      await client.messages.cancel(messageId);
    } catch (error: any) {
      // If the message is already delivered or deleted, QStash returns 404
      if (error.status === 404) {
        return NextResponse.json(
          { ok: false, code: "ALARM_NOT_FOUND", error: "Alarm not found or already deleted." },
          { status: 404 }
        );
      }
      throw error; // Re-throw other errors to be caught by the outer catch
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to cancel reserved alarm:", error);
    return NextResponse.json(
      { ok: false, code: "ALARM_CANCEL_FAILED", error: "Failed to cancel reserved alarm." },
      { status: 500 }
    );
  }
}
