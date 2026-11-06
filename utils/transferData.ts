import transferJson from '@/json/subway_transfer_data.json';
import { NormalizedTransferRecord } from '@/types/transfer';

const transferData: NormalizedTransferRecord[] = transferJson as NormalizedTransferRecord[];

// 1. 역명 기준 빠른 O(1) 조회를 위한 메모리 인덱스 구축
const stationIndex = new Map<string, NormalizedTransferRecord[]>();

transferData.forEach((record) => {
  const key = record.station_key;
  if (!stationIndex.has(key)) {
    stationIndex.set(key, []);
  }
  stationIndex.get(key)!.push(record);
});

// 역명 정규화 (서울역 예외 유지, '역' 및 괄호 부역명 제거)
export function normalizeStationKey(stationName: string): string {
  if (!stationName) return '';
  const trimmed = stationName.trim();
  if (trimmed === '서울역') return '서울역';
  return trimmed.replace(/역$/, '').replace(/\(.*?\)/g, '').trim();
}

// 노선명 정규화 (1호선 <-> 01호선, 경의선 <-> 경의중앙선 등)
export function normalizeLineForTransfer(lineName: string): string {
  if (!lineName) return '';
  const trimmed = lineName.trim();

  // 01호선 -> 1호선
  const match = trimmed.match(/^0?(\d+)호선$/);
  if (match) {
    return `${parseInt(match[1], 10)}호선`;
  }

  const aliasMap: Record<string, string> = {
    경의선: '경의중앙선',
    우이신설경전철: '우이신설선',
    인천선: '인천1호선',
    김포도시철도: '김포골드라인',
    용인경전철: '용인경전철',
    '용인 에버라인': '용인경전철',
    의정부경전철: '의정부경전철',
    '의정부 경전철': '의정부경전철',
    '수인·분당선': '수인분당선',
    수인분당: '수인분당선',
  };

  return aliasMap[trimmed] || trimmed;
}

/**
 * [시나리오 1: 노선 타임라인용]
 * 특정 역에서 현재 열차의 노선, 진행 방향(updnLine: "0"|"1"), 종착역(지선 판단), 급행 여부에 맞는 환승 정보 목록을 조회합니다.
 */
export function getTransfersForRouteStation(
  stationName: string,
  currentLine: string,
  updnLine?: string,
  bstatnNm?: string,
  isExpress?: boolean
): NormalizedTransferRecord[] {
  const stKey = normalizeStationKey(stationName);
  const records = stationIndex.get(stKey);
  if (!records || records.length === 0) return [];

  const normLine = normalizeLineForTransfer(currentLine);

  // 현재 노선에 해당하는 레코드 1차 필터링
  const lineRecords = records.filter((r) => r.current_line === normLine);
  if (lineRecords.length === 0) return [];

  // 진행 방향(상·하행) 정규화 ("0": 상행/외선, "1": 하행/내선)
  const isUp = updnLine === '0' || (typeof updnLine === 'string' && (updnLine.includes('상행') || updnLine.includes('외선')));
  const targetUpdn: '0' | '1' = isUp ? '0' : '1';

  // 지선/분기 힌트 판별
  let currentBranchHint: string | null = null;
  if (normLine === '2호선') {
    if (bstatnNm && (bstatnNm.includes('신설동') || bstatnNm.includes('용답') || bstatnNm.includes('성수'))) {
      if (stKey === '신설동' || stKey === '용두' || stKey === '신답' || stKey === '용답') {
        currentBranchHint = '성수지선';
      }
    } else if (bstatnNm && (bstatnNm.includes('까치산') || bstatnNm.includes('신정네거리'))) {
      currentBranchHint = '신정지선';
    }
  } else if (normLine === '5호선') {
    if (bstatnNm && (bstatnNm.includes('마천') || bstatnNm.includes('개롱') || bstatnNm.includes('거여'))) {
      currentBranchHint = '마천';
    } else if (bstatnNm && (bstatnNm.includes('하남') || bstatnNm.includes('미사') || bstatnNm.includes('상일동'))) {
      currentBranchHint = '하남검단산';
    }
  }

  // 방향 및 분기/급행 조건 매칭
  const matched = lineRecords.filter((r) => {
    // 1. 방향 일치 여부 (r.updn_code === "ALL" 이거나 일치해야 함)
    if (r.updn_code !== 'ALL' && r.updn_code !== targetUpdn) {
      return false;
    }

    // 2. 지선 힌트 일치 여부
    if (currentBranchHint) {
      if (r.branch_hint && r.branch_hint !== currentBranchHint) {
        return false;
      }
    } else {
      // 본선 열차인 경우, 성수지선/신정지선 전용 환승 레코드는 제외
      if (r.branch_hint === '성수지선' || r.branch_hint === '신정지선') {
        return false;
      }
    }

    // 3. 1호선 급행 힌트
    if (r.branch_hint === '급행' && !isExpress) {
      return false;
    }

    return true;
  });

  return matched;
}

/**
 * [실시간 도착 카드용]
 * 해당 역에서 현재 노선 및 방향 기준으로 일치하는 모든 환승 데이터 목록을 반환합니다.
 */
export function getTransfersForLineDirection(
  stationName: string,
  currentLine: string,
  updnLine?: string
): NormalizedTransferRecord[] {
  const stKey = normalizeStationKey(stationName);
  const records = stationIndex.get(stKey);
  if (!records || records.length === 0) return [];

  const normLine = normalizeLineForTransfer(currentLine);
  const lineRecords = records.filter((r) => r.current_line === normLine);
  if (lineRecords.length === 0) return [];

  if (!updnLine) return lineRecords;

  const isUp = updnLine === '0' || (typeof updnLine === 'string' && (updnLine.includes('상행') || updnLine.includes('외선')));
  const targetUpdn: '0' | '1' = isUp ? '0' : '1';

  return lineRecords.filter((r) => r.updn_code === 'ALL' || r.updn_code === targetUpdn);
}

/**
 * [실시간 도착 카드용]
 * 해당 역에서 현재 노선 및 방향 기준으로 환승 데이터가 존재하는지 확인합니다.
 */
export function hasTransferForLineDirection(
  stationName: string,
  currentLine: string,
  updnLine?: string
): boolean {
  return getTransfersForLineDirection(stationName, currentLine, updnLine).length > 0;
}

/**
 * [시나리오 2: 마법사 모달용]
 * 특정 역에서 환승 데이터가 존재하는 출발 노선 목록을 반환합니다.
 */
export function getAvailableSourceLines(stationName: string): string[] {
  const stKey = normalizeStationKey(stationName);
  const records = stationIndex.get(stKey);
  if (!records || records.length === 0) return [];

  const lines = new Set<string>();
  records.forEach((r) => lines.add(r.current_line));
  return Array.from(lines).sort();
}

/**
 * [시나리오 2: 마법사 모달용]
 * 특정 역의 출발 노선에서 선택 가능한 승차 방면 목록(레코드 묶음)을 반환합니다.
 */
export interface SourceDirectionGroup {
  directionText: string;
  updnCode: '0' | '1' | 'ALL';
  records: NormalizedTransferRecord[];
}

export function getAvailableDirectionsForLine(
  stationName: string,
  currentLine: string
): SourceDirectionGroup[] {
  const stKey = normalizeStationKey(stationName);
  const records = stationIndex.get(stKey);
  if (!records || records.length === 0) return [];

  const normLine = normalizeLineForTransfer(currentLine);
  const lineRecords = records.filter((r) => r.current_line === normLine);
  if (lineRecords.length === 0) return [];

  const groupMap = new Map<string, SourceDirectionGroup>();

  lineRecords.forEach((r) => {
    const key = r.current_direction;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        directionText: key,
        updnCode: r.updn_code,
        records: [],
      });
    }
    groupMap.get(key)!.records.push(r);
  });

  return Array.from(groupMap.values());
}
