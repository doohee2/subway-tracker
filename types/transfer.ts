export interface NormalizedTransferRecord {
  id: string;
  station_key: string;          // 정규화된 역명 (예: '충무로', '서울역')
  current_line: string;         // 현재 노선 (예: '4호선', 'GTX-A', '인천1호선')
  current_direction: string;    // 승차 방면 (예: '사당/오이도 방면', '내선 순환')
  updn_code: '0' | '1' | 'ALL'; // 0: 상행/외선, 1: 하행/내선, ALL: 양방향 공통
  branch_hint: '성수지선' | '신정지선' | '마천' | '하남검단산' | '급행' | null;
  target_lines: string[];       // 갈아탈 노선 목록 (예: ['3호선'], ['경의중앙선', '경춘선'])
  target_direction: string;     // 갈아탈 방면 (예: '하행/오금 방면', '전체')
  boarding_position: string;    // 추천 빠른 탑승 위치 (예: '7-1', '2-2, 8-3', '모든 문')
  // 원본 추적용 필드(station_display, target_line_raw, raw_source, raw_target)는
  // 번들 용량 절감을 위해 런타임 데이터에서 제외 (원본 subway_transfer_info_v*.json 참고)
}

export interface DirectionOption {
  directionText: string;
  updnCode: '0' | '1' | 'ALL';
  records: NormalizedTransferRecord[];
}

export interface LineOption {
  lineName: string;
  directions: DirectionOption[];
}
