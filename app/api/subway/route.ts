import { NextResponse } from "next/server";
import { SubwayAPIResponse } from "@/types/subway";
import { SubwayQuerySchema } from "@/utils/apiValidation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawStation = searchParams.get("station") ?? "";

  // 1. 엄격한 입력 유효성 검사 (Zod 도입)
  const validation = SubwayQuerySchema.safeParse({ station: rawStation });
  if (!validation.success) {
    return NextResponse.json(
      { code: "STATION_PARAM_REQUIRED", error: "요청을 처리할 수 없습니다." },
      { status: 400 }
    );
  }

  let station = validation.data.station;
  // 역명에서 '역'으로 끝나는 경우 제거 (API 특성상 '역'을 빼야 검색이 잘 됨. 단, 서울역 등 예외는 있지만 일반적으로 제거)
  if (station.endsWith("역") && station !== "서울역") {
    station = station.slice(0, -1);
  }

  const API_KEY = process.env.SEOUL_SUBWAY_API_KEY;
  if (!API_KEY) {
    console.error("SEOUL_SUBWAY_API_KEY is missing in server environment.");
    return NextResponse.json(
      { code: "SUBWAY_API_KEY_MISSING", error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }

  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${API_KEY}/json/realtimeStationArrival/0/20/${encodeURIComponent(
      station
    )}`;

    const response = await fetch(url, { cache: "no-store" });
    const data: SubwayAPIResponse | any = await response.json();

    // 2. 에러 메시지 위생화 (Error Sanitization) - 외부 raw details 및 스택 트레이스 비노출
    if (data.errorMessage && data.errorMessage.status !== 200) {
      console.error("[Subway API Response Error]", data.errorMessage);
      return NextResponse.json(
        { code: "SUBWAY_API_RESPONSE_ERROR", error: "요청을 처리할 수 없습니다." },
        { status: 500 }
      );
    }

    if (!data.realtimeArrivalList || data.realtimeArrivalList.length === 0) {
      return NextResponse.json({ realtimeArrivalList: [] });
    }

    return NextResponse.json({ realtimeArrivalList: data.realtimeArrivalList });
  } catch (error) {
    console.error("[Subway Fetch Failed Error]", error);
    return NextResponse.json(
      { code: "SUBWAY_FETCH_FAILED", error: "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}
