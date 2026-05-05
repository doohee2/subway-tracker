import { NextResponse } from "next/server";
import { SubwayAPIResponse } from "@/types/subway";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let station = searchParams.get("station");

  if (!station) {
    return NextResponse.json(
      { error: "Station parameter is required" },
      { status: 400 }
    );
  }

  // 역명에서 '역'으로 끝나는 경우 제거 (API 특성상 '역'을 빼야 검색이 잘 됨. 단, 서울역 등 예외는 있지만 일반적으로 제거)
  if (station.endsWith("역") && station !== "서울역") {
    station = station.slice(0, -1);
  }

  const API_KEY = process.env.SEOUL_SUBWAY_API_KEY;

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Server API Key is not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${API_KEY}/json/realtimeStationArrival/0/20/${encodeURIComponent(
      station
    )}`;

    const response = await fetch(url, { cache: "no-store" });
    const data: SubwayAPIResponse | any = await response.json();

    if (data.errorMessage && data.errorMessage.status !== 200) {
      return NextResponse.json(
        { error: data.errorMessage.message, details: data },
        { status: 500 }
      );
    }

    if (!data.realtimeArrivalList || data.realtimeArrivalList.length === 0) {
      return NextResponse.json({ realtimeArrivalList: [] });
    }

    return NextResponse.json({ realtimeArrivalList: data.realtimeArrivalList });
  } catch (error) {
    console.error("Failed to fetch subway data:", error);
    return NextResponse.json(
      { error: "Failed to fetch subway data" },
      { status: 500 }
    );
  }
}
