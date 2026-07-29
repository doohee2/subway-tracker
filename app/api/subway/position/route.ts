import { NextResponse } from "next/server";
import { PositionQuerySchema } from "@/utils/apiValidation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLineName = searchParams.get("lineName") ?? "";

  // 1. 엄격한 입력 유효성 검사 (Zod 도입)
  const validation = PositionQuerySchema.safeParse({ lineName: rawLineName });
  if (!validation.success) {
    return NextResponse.json(
      { code: "LINE_NAME_PARAM_REQUIRED", error: "요청을 처리할 수 없습니다." },
      { status: 400 }
    );
  }

  const { lineName } = validation.data;
  const API_KEY = process.env.SEOUL_SUBWAY_API_KEY;

  if (!API_KEY) {
    console.error("SEOUL_SUBWAY_API_KEY is missing in server environment.");
    return NextResponse.json(
      { code: "SUBWAY_API_KEY_MISSING", error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }

  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${API_KEY}/json/realtimePosition/0/50/${encodeURIComponent(
      lineName
    )}`;

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    // 2. 에러 메시지 위생화 (Error Sanitization) - 외부 raw JSON이나 원문 오류 클라이언트 노출 차단
    if (data.errorMessage && data.errorMessage.status !== 200) {
      console.error("[Subway Position API Response Error]", data.errorMessage);
      return NextResponse.json(
        { code: "SUBWAY_POSITION_API_RESPONSE_ERROR", error: "요청을 처리할 수 없습니다." },
        { status: 500 }
      );
    }

    if (!data.realtimePositionList || data.realtimePositionList.length === 0) {
      return NextResponse.json({ realtimePositionList: [] });
    }

    return NextResponse.json({ realtimePositionList: data.realtimePositionList });
  } catch (error) {
    console.error("[Subway Position Fetch Failed Error]", error);
    return NextResponse.json(
      { code: "SUBWAY_POSITION_FETCH_FAILED", error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}
