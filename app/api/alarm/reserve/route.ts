import { NextResponse } from "next/server";
import { getQstashClient } from "@/utils/qstash";
import { AlarmReserveSchema } from "@/utils/apiValidation";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    
    // 1. Zod 스키마 기반 엄격한 입력 유효성 검사
    const validation = AlarmReserveSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", error: "요청을 처리할 수 없습니다." },
        { status: 400 }
      );
    }

    const { delayMs, subscription, payload } = validation.data;
    const pushApiUrl = process.env.QSTASH_PUSH_ENDPOINT_URL;

    if (!pushApiUrl) {
      console.error("QSTASH_PUSH_ENDPOINT_URL is not configured in environment.");
      return NextResponse.json(
        { ok: false, code: "QSTASH_CONFIG_MISSING", error: "요청을 처리할 수 없습니다." },
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
    // 2. 에러 위생화 - 터미널 로그에만 원문 기록, 클라이언트에는 일반적 메시지만 전달
    console.error("[Alarm Reserve Error]", error);
    const status =
      typeof error === "object" && error !== null
        ? ((error as { status?: number; statusCode?: number }).status ??
          (error as { status?: number; statusCode?: number }).statusCode)
        : undefined;

    if (status === 401) {
      return NextResponse.json(
        { ok: false, code: "QSTASH_AUTH_INVALID", error: "요청을 처리할 수 없습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, code: "QSTASH_RESERVE_FAILED", error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}
