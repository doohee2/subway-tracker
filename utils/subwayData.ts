import stationsJson from '../json/stations.json';
import distancesJson from '../json/distances.json';
import aliasesJson from '../json/stations_nm_alias.json';

export interface StationInfo {
  line_num: string;
  station_nm: string;
  station_cd: string;
  fr_code: string;
}

export interface StationDistance {
  acml_dist: number;
  sbwy_rout_ln: string;
  dist_km: number;
  hm: string; // 'M:SS' format
  sbwy_stns_nm: string;
}

export function loadStationsData(): StationInfo[] {
  return stationsJson.DATA as StationInfo[];
}

export function loadDistancesData(): StationDistance[] {
  return distancesJson.DATA as StationDistance[];
}

// 노선 이름 표준화 (예: '2호선' -> '02호선' 또는 '2')
export function normalizeLineName(lineName: string): string {
  // '2호선' -> '02호선'
  const match = lineName.match(/(\d+)호선/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `${num.toString().padStart(2, '0')}호선`;
  }
  return lineName;
}

export function normalizeRouteLine(lineName: string): string {
  // '2호선' -> '2'
  const match = lineName.match(/(\d+)호선/);
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

function matchStationName(a: string, b: string): boolean {
  if (!a || !b) return false;
  const cleanA = a.replace(/역$/, "");
  const cleanB = b.replace(/역$/, "");
  return a === b || cleanA === cleanB || a.includes(b) || b.includes(a);
}

/** 2호선 지선(211-n, 234-n) 역인지 역명으로 확인 */
export function isLine2BranchStation(lineName: string, stationName: string): boolean {
  if (!stationName) return false;
  if (normalizeLineName(lineName) !== "02호선") return false;

  const station = loadStationsData().find(
    (s) => s.line_num === "02호선" && matchStationName(s.station_nm, stationName)
  );
  return station ? isExcludedFromLine2Route(station.fr_code) : false;
}

export function getStationsForLine(lineName: string, updnLine: string, currentStationName?: string, bstatnNm?: string): StationInfo[] {
  const data = loadStationsData();
  const normalized = normalizeLineName(lineName);
  
  // 해당 호선의 역만 필터링
  let lineStations = data.filter(s => s.line_num === normalized);

  let isSeongsuBranch = false;
  let isSinjeongBranch = false;

  if (normalized === '02호선') {
    // 현재역과 종착역의 fr_code 확인
    const checkBranch = (stationName?: string) => {
      if (!stationName) return;
      const cleanName = stationName.replace(/역$/, "");
      const st = lineStations.find(s => s.station_nm === cleanName || s.station_nm.includes(cleanName) || cleanName.includes(s.station_nm));
      if (st) {
        if (st.fr_code.startsWith('211-') || st.station_nm === '신설동' || st.station_nm === '용두' || st.station_nm === '신답' || st.station_nm === '용답') {
          isSeongsuBranch = true;
        }
        if (st.fr_code.startsWith('234-') || st.station_nm === '까치산' || st.station_nm === '신정네거리' || st.station_nm === '양천구청' || st.station_nm === '도림천') {
          isSinjeongBranch = true;
        }
      }
    };

    checkBranch(currentStationName);
    checkBranch(bstatnNm);

    if (isSeongsuBranch) {
      // 성수지선: 성수(211) + 211-n
      lineStations = lineStations.filter(s => s.fr_code === '211' || s.fr_code.startsWith('211-'));
    } else if (isSinjeongBranch) {
      // 신정지선: 신도림(234) + 234-n
      lineStations = lineStations.filter(s => s.fr_code === '234' || s.fr_code.startsWith('234-'));
    } else {
      // 본선: 지선 역 제외
      lineStations = lineStations.filter(s => !isExcludedFromLine2Route(s.fr_code));
    }
  }
  
  // fr_code 기준으로 정렬 (순서 결정)
  // 문자열 비교로 정렬
  lineStations.sort((a, b) => {
    return a.fr_code.localeCompare(b.fr_code, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 상행/내선 및 하행/외선 정렬 순서를 다시 한 번 반대로 변경합니다.
  if (updnLine === '0' || updnLine.includes('상행') || updnLine.includes('외선')) {
    lineStations.reverse();
  }

  // 지선인 경우 종착역(bstatnNm) 방향으로 올바르게 정렬되었는지 확인하고 보정
  if (normalized === '02호선' && (isSeongsuBranch || isSinjeongBranch) && bstatnNm) {
    const cleanDest = bstatnNm.replace(/역$/, "");
    const destIndex = lineStations.findIndex(s => s.station_nm === cleanDest || s.station_nm.includes(cleanDest) || cleanDest.includes(s.station_nm));
    // 목적지가 앞쪽에 있다면 방향이 반대이므로 뒤집음
    if (destIndex !== -1 && destIndex < lineStations.length / 2) {
      lineStations.reverse();
    }
  }

  return lineStations;
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

export function getStationTimes(lineName: string) {
  const data = loadDistancesData();
  const routeLn = normalizeRouteLine(lineName);
  return data.filter(d => d.sbwy_rout_ln === routeLn);
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
  return new Date(cleanStr + " +0900");
}

// Date 객체를 HH:mm (KST 기준) 문자열로 변환
export function formatKSTTime(date: Date): string {
  // force KST (UTC+9) for display
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return `${kstDate.getUTCHours().toString().padStart(2, '0')}:${kstDate.getUTCMinutes().toString().padStart(2, '0')}`;
}

/**
 * 역 이름의 별칭(Alias)이 있는 경우 실제 이름(NM)으로 변환합니다.
 */
export function getStationRealName(searchName: string): string {
  if (!searchName) return searchName;
  
  // '역' 제거하고 비교 (alias 데이터에 '역'이 없는 경우가 많음)
  const cleanName = searchName.replace(/역$/, '');
  
  const aliases = aliasesJson as { STATN_ALIAS: string; STATN_NM: string }[];
  const match = aliases.find(a => a.STATN_ALIAS === cleanName || a.STATN_ALIAS === searchName);
  
  if (match && match.STATN_NM) {
    return match.STATN_NM;
  }
  
  return searchName;
}
