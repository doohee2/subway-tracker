export const getLineColor = (lineName: string): string => {
  if (!lineName) return "bg-gray-500";
  const name = lineName.trim();

  // 1. 특수/경전철 및 인천 노선 (1·2호선 포함 문자열보다 우선 검사)
  if (name.includes("인천1호선") || name.includes("인천선") || name.includes("인천 1호선")) return "bg-sky-600";
  if (name.includes("인천2호선") || name.includes("인천 2호선")) return "bg-amber-500";
  if (name.includes("GTX")) return "bg-purple-700";
  if (name.includes("공항철도")) return "bg-cyan-600";
  if (name.includes("경의중앙") || name.includes("경의선")) return "bg-teal-500";
  if (name.includes("수인분당")) return "bg-yellow-500";
  if (name.includes("신분당")) return "bg-red-500";
  if (name.includes("경춘선")) return "bg-teal-600";
  if (name.includes("경강선")) return "bg-blue-600";
  if (name.includes("서해선")) return "bg-lime-600";
  if (name.includes("우이신설")) return "bg-emerald-500";
  if (name.includes("신림선")) return "bg-blue-500";
  if (name.includes("김포") || name.includes("골드라인")) return "bg-amber-400";
  if (name.includes("의정부")) return "bg-orange-500";
  if (name.includes("용인") || name.includes("에버라인")) return "bg-lime-500";

  // 2. 수도권 1~9호선
  if (name.includes("1호선") || name === "01호선") return "bg-blue-800";
  if (name.includes("2호선") || name === "02호선") return "bg-green-500";
  if (name.includes("3호선") || name === "03호선") return "bg-orange-500";
  if (name.includes("4호선") || name === "04호선") return "bg-blue-500";
  if (name.includes("5호선") || name === "05호선") return "bg-purple-600";
  if (name.includes("6호선") || name === "06호선") return "bg-yellow-700"; // 황토색
  if (name.includes("7호선") || name === "07호선") return "bg-emerald-600";
  if (name.includes("8호선") || name === "08호선") return "bg-pink-500";
  if (name.includes("9호선") || name === "09호선") return "bg-lime-700";

  return "bg-gray-500";
};

export const getLineNumberText = (lineName: string): string => {
  if (!lineName) return "";
  const name = lineName.trim();

  if (name.includes("인천1호선") || name.includes("인천선") || name.includes("인천 1호선")) return "인1";
  if (name.includes("인천2호선") || name.includes("인천 2호선")) return "인2";
  if (name.includes("GTX-A") || name === "GTX") return "A";
  if (name.includes("공항철도")) return "공";
  if (name.includes("경의중앙") || name.includes("경의선")) return "경";
  if (name.includes("수인분당")) return "수";
  if (name.includes("신분당")) return "신";
  if (name.includes("경춘선")) return "춘";
  if (name.includes("경강선")) return "강";
  if (name.includes("서해선")) return "서";
  if (name.includes("우이신설")) return "우";
  if (name.includes("신림선")) return "림";
  if (name.includes("김포") || name.includes("골드라인")) return "김";
  if (name.includes("의정부")) return "의";
  if (name.includes("용인") || name.includes("에버라인")) return "용";
  if (name.includes("성수지선")) return "성";
  if (name.includes("신정지선")) return "정";

  const match = name.match(/([0-9]+)호선/);
  if (match) return match[1];

  return name.charAt(0);
};
