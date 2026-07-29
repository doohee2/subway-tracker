import { NextResponse } from "next/server";
import { getQstashClient } from "@/utils/qstash";
import { AlarmCancelSchema } from "@/utils/apiValidation";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    
    // 1. Zod 스키마 유효성 검증
    const validation = AlarmCancelSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, code: "MESSAGE_ID_REQUIRED", error: "요청을 처리할 수 없습니다." },
        { status: 400 }
      );
    }

    const { messageId } = validation.data;
    const client = getQstashClient();

    try {
      await client.messages.cancel(messageId);
    } catch (error: any) {
      // If the message is already delivered or deleted, QStash returns 404
      if (error.status === 404) {
        return NextResponse.json(
          { ok: false, code: "ALARM_NOT_FOUND", error: "존재하지 않거나 이미 삭제된 알람입니다." },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // 2. 에러 위생화
    console.error("[Alarm Cancel Error]", error);
    return NextResponse.json(
      { ok: false, code: "ALARM_CANCEL_FAILED", error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}
