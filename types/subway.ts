export interface RealtimeArrival {
  subwayId: string; // 호선 (1001: 1호선, 1002: 2호선 등)
  updnLine: string; // 상하행선구분 (0:상행/내선, 1:하행/외선)
  trainLineNm: string; // 도착지방면 (성수행 - 건대입구방면)
  statnNm: string; // 지하철역명
  barvlDt: string; // 열차도착예정시간(초)
  btrainNo: string; // 열차번호
  bstatnNm: string; // 종착지하철역명
  arvlMsg2: string; // 첫번째도착메세지 (진입, 도착 등)
  arvlMsg3: string; // 두번째도착메세지 (종합운동장 도착, 12분 후 (광명사거리) 등)
  arvlCd: string; // 도착코드 (0:진입, 1:도착, 2:출발, 3:전역출발, 4:전역진입, 5:전역도착, 99:운행중)
}

export interface SubwayAPIResponse {
  errorMessage: {
    status: number;
    code: string;
    message: string;
    link: string;
    developerMessage: string;
    total: number;
  };
  realtimeArrivalList: RealtimeArrival[];
}

// 클라이언트가 사용하기 편하게 그룹핑된 데이터 포맷
export interface ArrivalItem {
  id: string; // 고유ID (열차번호)
  estimatedTimeMsg: string; // 도착 예상 시간 (ex. 3 분, 진입 중)
  currentLocationMsg: string; // 현재 위치 (ex. 2 정거장 전)
  trainNumber: string; // 열차번호
  isUrgent: boolean; // 1분 이내 혹은 진입 중 등 강조 여부
  updnLine: string; // 상하행선구분
  bstatnNm: string; // 종착지하철역명
  subwayId: string; // 호선 ID
  statnNm: string; // 검색한 기준역
}

export interface ArrivalGroup {
  lineName: string; // 호선명 (1호선, 2호선...)
  lineNumber: string; // 호선 숫자/알파벳 (1, 2, K, B 등)
  destination: string; // 행선지 (성수 - 다음: 건대입구)
  arrivals: ArrivalItem[];
}
