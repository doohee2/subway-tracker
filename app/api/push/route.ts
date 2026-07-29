import { NextResponse } from "next/server";
import { getQstashReceiver } from "@/utils/qstash";
import { sendWebPush } from "@/utils/push";
import { PushDeliverySchema } from "@/utils/apiValidation";

export async function POST(request: Request) {
  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "요청을 처리할 수 없습니다." }, { status: 401 });
  }

  const rawBody = await request.text();

  try {
    // 1. 리소스 소유권 및 호출 엔드포인트 암호화 서명 검증
    const receiver = getQstashReceiver();
    await receiver.verify({
      signature,
      body: rawBody,
      url: process.env.QSTASH_PUSH_ENDPOINT_URL,
    });
  } catch (error) {
    console.error("[QStash Signature Verification Failed]", error);
    return NextResponse.json({ ok: false, error: "요청을 처리할 수 없습니다." }, { status: 401 });
  }

  try {
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: "요청을 처리할 수 없습니다." }, { status: 400 });
    }

    // 2. Zod 스키마 기반 엄격한 페이로드 검증
    const validation = PushDeliverySchema.safeParse(parsedJson);
    if (!validation.success) {
      return NextResponse.json({ ok: false, error: "요청을 처리할 수 없습니다." }, { status: 400 });
    }

    const { subscription, payload } = validation.data;

    await sendWebPush(subscription, payload);
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

    // 3. 에러 위생화
    console.error("[Push Delivery Failed Error]", error);
    return NextResponse.json({ ok: false, error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
