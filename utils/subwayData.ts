import fs from 'fs';
import path from 'path';

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

// Memory cache
let stationsCache: StationInfo[] | null = null;
let distancesCache: StationDistance[] | null = null;

export function loadStationsData(): StationInfo[] {
  if (stationsCache) return stationsCache;
  const filePath = path.join(process.cwd(), 'json', '서울교통공사_노선별 지하철역 정보.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  stationsCache = parsed.DATA;
  return stationsCache!;
}

export function loadDistancesData(): StationDistance[] {
  if (distancesCache) return distancesCache;
  const filePath = path.join(process.cwd(), 'json', '서울교통공사_역간거리.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  distancesCache = parsed.DATA;
  return distancesCache!;
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

// 특정 노선의 모든 역 목록 가져오기 (순서대로 정렬)
export function getStationsForLine(lineName: string, updnLine: string): StationInfo[] {
  const data = loadStationsData();
  const normalized = normalizeLineName(lineName);
  
  // 해당 호선의 역만 필터링
  let lineStations = data.filter(s => s.line_num === normalized);
  
  // fr_code 기준으로 정렬 (순서 결정)
  // 문자열 비교로 정렬
  lineStations.sort((a, b) => {
    return a.fr_code.localeCompare(b.fr_code, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 상행/내선 및 하행/외선 정렬 순서를 다시 한 번 반대로 변경합니다.
  if (updnLine === '0' || updnLine.includes('상행') || updnLine.includes('외선')) {
    lineStations.reverse();
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
  let match = msg.match(/\((.*?)\)/) || msg.match(/\[(.*?)\]/);
  if (match) return match[1].replace(/역$/, '');
  
  // "성수 진입", "성수 도착", "성수"
  let parts = msg.split(' ');
  return parts[0].replace(/역$/, '').replace(/\[|\]/g, '');
}
