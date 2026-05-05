export const getLineColor = (lineName: string) => {
  if (lineName.includes("1호선")) return "bg-blue-800";
  if (lineName.includes("2호선")) return "bg-green-500";
  if (lineName.includes("3호선")) return "bg-orange-500";
  if (lineName.includes("4호선")) return "bg-blue-500";
  if (lineName.includes("5호선")) return "bg-purple-500";
  if (lineName.includes("6호선")) return "bg-yellow-600"; // 황토색 계열
  if (lineName.includes("7호선")) return "bg-emerald-600";
  if (lineName.includes("8호선")) return "bg-pink-500";
  if (lineName.includes("9호선")) return "bg-yellow-500";
  if (lineName.includes("경의중앙")) return "bg-teal-500";
  if (lineName.includes("수인분당")) return "bg-yellow-400";
  if (lineName.includes("신분당")) return "bg-red-500";
  if (lineName.includes("공항철도")) return "bg-cyan-500";
  
  return "bg-gray-500";
};

export const getLineNumberText = (lineName: string) => {
  const match = lineName.match(/([0-9]+)호선/);
  if (match) return match[1];
  return lineName.charAt(0);
};
