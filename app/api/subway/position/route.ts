import { NextResponse } from "next/server";
import { SubwayAPIResponse } from "@/types/subway";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lineName = searchParams.get("lineName");

  if (!lineName) {
    return NextResponse.json(
      { code: "LINE_NAME_PARAM_REQUIRED", error: "lineName parameter is required" },
      { status: 400 }
    );
  }

  const API_KEY = process.env.SEOUL_SUBWAY_API_KEY;

  if (!API_KEY) {
    return NextResponse.json(
      { code: "SUBWAY_API_KEY_MISSING", error: "Server API Key is not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${API_KEY}/json/realtimePosition/0/50/${encodeURIComponent(
      lineName
    )}`;

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (data.errorMessage && data.errorMessage.status !== 200) {
      return NextResponse.json(
        { code: "SUBWAY_POSITION_API_RESPONSE_ERROR", error: data.errorMessage.message, details: data },
        { status: 500 }
      );
    }

    if (!data.realtimePositionList || data.realtimePositionList.length === 0) {
      return NextResponse.json({ realtimePositionList: [] });
    }

    return NextResponse.json({ realtimePositionList: data.realtimePositionList });
  } catch (error) {
    console.error("Failed to fetch subway position data:", error);
    return NextResponse.json(
      { code: "SUBWAY_POSITION_FETCH_FAILED", error: "Failed to fetch subway position data" },
      { status: 500 }
    );
  }
}
