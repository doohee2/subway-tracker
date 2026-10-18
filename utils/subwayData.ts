import subwayDataJson from '../json/subway_data.json';

export interface StationEdge {
  to: string;
  sec: number;
  express_sec?: number;
}

export interface StationInfo {
  line_num: string;
  station_name: string;
  station_nm: string; // mapped from station_name for backwards compatibility
  station_alias: string[];
  station_cd: string;
  fr_code: string;
  is_express?: boolean;
  hm: string;
  hm2: string;
  adj_hm: string;
  adj_hm2: string;
  edges?: StationEdge[];
}

export function loadStationsData(): StationInfo[] {
  return (subwayDataJson as any[]).map((d) => ({
    ...d,
    station_nm: d.station_name,
  })) as StationInfo[];
}

// 노선 이름 표준화 (API 호선명 -> subway_data.json 호선명)
export function normalizeLineName(lineName: string): string {
  if (!lineName) return lineName;
  const trimmed = lineName.trim();

  const aliasLineMap: Record<string, string> = {
    경의중앙선: '경의선',
    우이신설선: '우이신설경전철',
    인천1호선: '인천선',
    김포골드라인: '김포도시철도',
    용인에버라인: '용인경전철',
  };
  if (aliasLineMap[trimmed]) {
    return aliasLineMap[trimmed];
  }

  // '2호선' -> '02호선' (단, 인천2호선은 제외)
  const match = trimmed.match(/^(\d+)호선$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `${num.toString().padStart(2, '0')}호선`;
  }
  return trimmed;
}

export function normalizeRouteLine(lineName: string): string {
  const match = lineName.match(/^0?(\d+)호선$/);
  if (match) {
    return parseInt(match[1], 10).toString();
  }
  return lineName;
}

/** 2호선 경로 추적에서 제외할 지선 fr_code (용답~신설동 211-n, 신정~까치산 234-n) */
const LINE2_BRANCH_FR_CODE = /^(211|234)-\d+$/;

export function isExcludedFromLine2Route(frCode: string): boolean {
  return LINE2_BRANCH_FR_CODE.test(frCode);
}

function cleanStationQuery(name: string): string {
  if (!name) return '';
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/방면.*$/, '')
    .replace(/순환.*$/, '')
    .replace(/행$/, '')
    .replace(/역$/, '')
    .trim();
}

function matchStationName(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = cleanStationQuery(a);
  const cleanB = cleanStationQuery(b);
  if (!cleanA || !cleanB) return false;
  return a === b || cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

/** 2호선 지선(211-n, 234-n) 역인지 역명으로 확인 */
export function isLine2BranchStation(lineName: string, stationName: string): boolean {
  if (!stationName) return false;
  if (normalizeLineName(lineName) !== '02호선') return false;

  const station = loadStationsData().find(
    (s) => s.line_num === '02호선' && matchStationName(s.station_nm, stationName)
  );
  return station ? isExcludedFromLine2Route(station.fr_code) : false;
}

/**
 * 그래프 내에서 startCode -> endCode 까지의 최단 경로(fr_code 배열)를 BFS로 탐색합니다.
 */
function bfsShortestPath(
  byCode: Map<string, StationInfo>,
  startCode: string,
  endCode: string,
  allowedFilter?: (code: string) => boolean
): string[] | null {
  if (startCode === endCode) return [startCode];
  const queue: string[][] = [[startCode]];
  const visited = new Set<string>([startCode]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const curr = path[path.length - 1];
    const node = byCode.get(curr);
    if (!node || !node.edges) continue;

    for (const edge of node.edges) {
      if (allowedFilter && !allowedFilter(edge.to)) continue;
      if (edge.to === endCode) {
        return [...path, edge.to];
      }
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push([...path, edge.to]);
      }
    }
  }
  return null;
}

/**
 * 시작 노드 이전의 역(prevStation 표시 및 경로 맥락 유지용)을 역방향 간선으로 추적합니다.
 */
function traceBackwardPrefix(
  byCode: Map<string, StationInfo>,
  startCode: string,
  excludeCodes: Set<string>,
  maxSteps = 5
): string[] {
  const prefix: string[] = [];
  let curr = startCode;
  const seen = new Set<string>(excludeCodes);
  seen.add(curr);

  for (let step = 0; step < maxSteps; step++) {
    // curr로 들어오는 간선(u -> curr)을 가진 후보 역 탐색
    let prevCandidate: string | null = null;
    for (const [code, st] of byCode.entries()) {
      if (seen.has(code)) continue;
      if (st.edges?.some((e) => e.to === curr)) {
        prevCandidate = code;
        break;
      }
    }
    if (!prevCandidate) break;
    prefix.unshift(prevCandidate);
    seen.add(prevCandidate);
    curr = prevCandidate;
  }
  return prefix;
}

/**
 * 그래프 탐색(BFS)을 기반으로 현재 열차의 운행 경로(이전역 포함 ~ 종착역)를 반환합니다.
 */
export function getStationsForLine(
  lineName: string,
  updnLine: string,
  currentStationName?: string,
  bstatnNm?: string
): StationInfo[] {
  const data = loadStationsData();
  const normalized = normalizeLineName(lineName);
  const lineStations = data.filter((s) => s.line_num === normalized);
  if (lineStations.length === 0) return [];

  const byCode = new Map<string, StationInfo>();
  lineStations.forEach((s) => byCode.set(s.fr_code, s));

  const findStation = (name?: string): StationInfo | undefined => {
    if (!name) return undefined;
    const cleaned = cleanStationQuery(name);
    if (!cleaned) return undefined;
    return (
      lineStations.find((s) => cleanStationQuery(s.station_nm) === cleaned) ||
      lineStations.find((s) => matchStationName(s.station_nm, cleaned)) ||
      lineStations.find((s) => s.station_alias?.some((a) => matchStationName(a, cleaned)))
    );
  };

  const currStation = findStation(currentStationName);
  const destStation = findStation(bstatnNm);

  // 1) 2호선 처리 (본선 순환 vs 성수/신정 지선)
  if (normalized === '02호선') {
    const checkSeongsu = (st?: StationInfo) =>
      Boolean(st && (st.fr_code.startsWith('211-') || ['신설동', '용두', '신답', '용답'].includes(st.station_nm)));
    const checkSinjeong = (st?: StationInfo) =>
      Boolean(st && (st.fr_code.startsWith('234-') || ['까치산', '신정네거리', '양천구청', '도림천'].includes(st.station_nm)));

    const isSeongsu = checkSeongsu(currStation) || checkSeongsu(destStation);
    const isSinjeong = checkSinjeong(currStation) || checkSinjeong(destStation);

    if (!isSeongsu && !isSinjeong) {
      // 2호선 본선 순환: 201 ~ 243
      const mainLoop = lineStations
        .filter((s) => /^\d+$/.test(s.fr_code))
        .sort((a, b) => a.fr_code.localeCompare(b.fr_code, undefined, { numeric: true }));

      // 외선(상행, updnLine '0')은 역방향(243 -> 201), 내선(하행, updnLine '1')은 정방향(201 -> 243)
      const isOuterLoop = updnLine === '0' || updnLine.includes('상행') || updnLine.includes('외선');
      const orderedLoop = isOuterLoop ? [...mainLoop].reverse() : [...mainLoop];

      // 순환선이 끊기지 않도록 2배 확장하되 각 스텝의 간선 소요시간을 정확히 매핑
      const doubled = [...orderedLoop, ...orderedLoop];
      return populatePathEdgeTimes(doubled, byCode);
    }
  }

  // 2) 일반 및 분기 노선: 현재역과 종착역이 모두 파악되면 그래프 최단 경로(BFS) 탐색
  if (currStation && destStation && currStation.fr_code !== destStation.fr_code) {
    const forwardCodes = bfsShortestPath(byCode, currStation.fr_code, destStation.fr_code);
    if (forwardCodes && forwardCodes.length > 0) {
      const backwardPrefix = traceBackwardPrefix(
        byCode,
        currStation.fr_code,
        new Set(forwardCodes),
        3
      );
      const fullCodes = [...backwardPrefix, ...forwardCodes];
      const resultStations = fullCodes
        .map((c) => byCode.get(c))
        .filter((s): s is StationInfo => Boolean(s));
      return populatePathEdgeTimes(resultStations, byCode);
    }
  }

  // 3) 종착역만 있거나 현재역===종착역인 경우: 노선 기점부터 종착역까지의 그래프 경로 탐색
  if (destStation) {
    // 기점 후보(연결된 간선이 1개인 끝단 역들 또는 첫 역)에서 destStation으로 가장 긴/적절한 경로 탐색
    const endpoints = lineStations.filter((s) => (s.edges?.length || 0) <= 1 && s.fr_code !== destStation.fr_code);
    const startCandidate = currStation || endpoints[0] || lineStations[0];
    const pathCodes = bfsShortestPath(byCode, startCandidate.fr_code, destStation.fr_code);
    if (pathCodes && pathCodes.length > 1) {
      const prefix = traceBackwardPrefix(byCode, startCandidate.fr_code, new Set(pathCodes), 5);
      const resultStations = [...prefix, ...pathCodes]
        .map((c) => byCode.get(c))
        .filter((s): s is StationInfo => Boolean(s));
      return populatePathEdgeTimes(resultStations, byCode);
    }
  }

  // 4) 기본 폴백: 세그먼트 순서(이미 generate_subway_data.js에서 토폴로지 정렬됨) 및 상하행 방향 적용
  const fallbackList = [...lineStations];
  if (updnLine === '0' || updnLine.includes('상행') || updnLine.includes('외선')) {
    fallbackList.reverse();
  }
  return populatePathEdgeTimes(fallbackList, byCode);
}

/**
 * 경로 배열 내 연속된 역(path[i-1] -> path[i])의 그래프 간선 소요시간(sec)을
 * adj_hm 및 adj_hm2에 직접 매핑하여 RouteTrackerClient가 방향에 무관하게 정확한 시간을 쓰도록 보장합니다.
 */
function populatePathEdgeTimes(path: StationInfo[], byCode: Map<string, StationInfo>): StationInfo[] {
  return path.map((st, idx) => {
    const clone: StationInfo = { ...st };
    if (idx > 0) {
      const prev = path[idx - 1];
      const prevNode = byCode.get(prev.fr_code);
      const edge = prevNode?.edges?.find((e) => e.to === st.fr_code);
      if (edge && edge.sec > 0) {
        const hmStr = secondsToHm(edge.sec);
        clone.adj_hm = hmStr;
        clone.adj_hm2 = hmStr;
      }
    }
    return clone;
  });
}

// 시간(M:SS)을 초 단위로 변환
export function hmToSeconds(hm: string): number {
  if (!hm || !hm.includes(':')) return 0;
  const [m, s] = hm.split(':');
  return parseInt(m, 10) * 60 + parseInt(s, 10);
}

// 초를 M:SS 형식으로 변환
export function secondsToHm(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 열차의 현재역 추출 (arvlMsg3 등에서 괄호 제외 추출)
export function extractCurrentStation(msg: string): string {
  if (!msg) return '';
  // "성수 도착", "5분 후 (건대입구)", "[성수] 진입" 등의 패턴
  const match = msg.match(/\((.*?)\)/) || msg.match(/\[(.*?)\]/);
  if (match) return match[1].replace(/역$/, '');

  // "성수 진입", "성수 도착", "성수"
  const parts = msg.split(' ');
  return parts[0].replace(/역$/, '').replace(/\[|\]/g, '');
}

// KST 시간 문자열을 Date 객체로 변환 (타임존 보정 포함)
export function parseKSTDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // "2024-05-08 06:56:18.0" -> "2024/05/08 06:56:18"
  const cleanStr = dateStr.split('.')[0].replace(/-/g, '/');

  // 시스템 타임존에 관계없이 KST(+0900)로 파싱
  return new Date(cleanStr + ' +0900');
}

// Date 객체를 HH:mm (KST 기준) 문자열로 변환
export function formatKSTTime(date: Date): string {
  // force KST (UTC+9) for display
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${kstDate.getUTCHours().toString().padStart(2, '0')}:${kstDate.getUTCMinutes().toString().padStart(2, '0')}`;
}

/**
 * 역 이름의 별칭(Alias)이 있는 경우 실제 이름(NM)으로 변환합니다.
 */
export function getStationRealName(searchName: string): string {
  if (!searchName) return searchName;

  // '역' 제거하고 비교
  const cleanName = searchName.replace(/역$/, '');

  const stations = loadStationsData();
  const match = stations.find(
    (s) =>
      s.station_nm === cleanName ||
      s.station_nm === searchName ||
      (s.station_alias && s.station_alias.includes(cleanName)) ||
      (s.station_alias && s.station_alias.includes(searchName))
  );

  if (match) {
    // API에 질의하기 위한 정식 명칭은 주로 station_alias의 첫 번째 요소에 저장됨 (예: "천호(풍납토성)")
    return match.station_alias && match.station_alias.length > 0
      ? match.station_alias[0]
      : match.station_nm;
  }

  return searchName;
}
