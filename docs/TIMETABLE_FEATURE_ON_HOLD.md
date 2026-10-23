# ⏸️ [기능 추가 보류] 역별 도착 시간표 조회 기능 (Dexie.js + 벽면 시간표 UI)

> [!WARNING]
> **이 기능은 현재 개발이 보류(ON HOLD)되었습니다. 구현하지 마세요.**
>
> - **보류 일자**: 2026-10-24
> - **보류 사유**: 공공데이터로 확보 가능한 시간표가 일부 노선에 한정되어 있습니다. 시간표 데이터가 없는 노선(공항철도, 신분당선, 경춘선, 서해선, GTX-A, 경전철 등)이 많아서, 일부 노선에서만 동작하는 불완전한 기능이 될 수 있습니다.
> - **문서 목적**: 나중에 기능을 다시 추진할 때 바로 쓸 수 있도록 **구현 프롬프트와 이미 만든 데이터 파이프라인 정보를 보관**합니다.
> - **재개 조건**: 주요 미지원 노선의 시간표 원본을 확보하고, `scripts/preprocess_subway.py`로 `json/subway_standard_timetables.json`을 다시 생성한 뒤 노선 커버리지를 확인할 것.

---

## 0. 보류 시점의 준비 현황 (재개 시 참고)

### 0.1. 이미 완료된 자산
| 구분 | 경로 | 상태 |
| :--- | :--- | :--- |
| 시간표 원본 | `timetable/` | 코레일 엑셀 3종(경의중앙선, 4호선 과천·안산선, 수인분당선) + 서울교통공사 CSV(1~9호선) |
| 전처리 스크립트 | `scripts/preprocess_subway.py` | ✅ 완료 (CSV/XLSX 파싱, 역명 정규화, 무정차 필터, 심야 보정, 중복 제거) |
| 표준 시간표 JSON | `json/subway_standard_timetables.json` | ✅ 생성 완료 (3,441개 그룹, 480,841건, 22.63 MB / `--compact` 시 15.95 MB, Gzip 1.58 MB) |

### 0.2. 보류 시점의 노선 커버리지
- **수록 노선 (11개)**: `1호선` ~ `9호선`, `수인분당선`, `경의중앙선`
- **미수록 노선 (예시)**: `공항철도`, `신분당선`, `경춘선`, `서해선`, `GTX-A`, `우이신설경전철`, `신림선`, `김포도시철도`, `인천선`, `인천2호선`, `의정부경전철`, `용인경전철` 등
- 1호선은 서울교통공사 CSV 기준이라 **서울교통공사 관할 역 위주**로 수록되어 있습니다. 코레일 관할 구간(경인·경부·경원선 등)은 원본을 따로 확보해야 합니다.

### 0.3. 원본 프롬프트에서 바뀐 핵심 방향
| 항목 | 원본 프롬프트 (변경 전) | 업데이트 (변경 후) |
| :--- | :--- | :--- |
| 데이터 입력 | 사용자가 브라우저에서 CSV/XLSX를 직접 업로드 | **미리 생성한 `json/subway_standard_timetables.json`을 읽어 적재** |
| 파싱 위치 | 클라이언트 (`papaparse`, `xlsx`) | **빌드 전 단계** (`scripts/preprocess_subway.py`)에서 처리 완료 |
| 필요 패키지 | `dexie`, `papaparse`, `xlsx` | **`dexie`만 필요** |
| DB 레코드 단위 | 열차 1건 = 1레코드 (약 48만 행) | **역·호선·요일·방향 1그룹 = 1레코드 (3,441행)** |
| 데이터 관리 모달 | 파일 업로드 + 청크 `bulkPut` | **데이터 버전 확인 + 다운로드/갱신 + 초기화** |

---

## 1. 구현 프롬프트 (보관용 · 보류 중)

> [!IMPORTANT]
> 아래 내용은 **기능 재개 시** 그대로 요청에 사용할 수 있도록 정리한 프롬프트입니다. 재개 전 0.2절의 노선 커버리지를 다시 확인하세요.

현재 `Subway Tracker` 프로젝트에 평일/토요일/휴일 시간대별 열차 도착 시간표를 오프라인(로컬 DB)으로 빠르게 조회하는 기능을 추가해 줘.
시간표 데이터는 사용자 업로드 없이 **전처리 스크립트(`scripts/preprocess_subway.py`)로 미리 생성한 `json/subway_standard_timetables.json`을 읽어** IndexedDB(`Dexie.js`)에 적재해야 해.

아래 기술 요구사항에 맞춰 패키지 설치, DB 설계, 데이터 로더, UI, 기존 알람 연동까지 구현해 줘.
(이 프로젝트는 Next.js 16이므로 작업 전에 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인할 것.)

---

### 1.1. 데이터 소스: `json/subway_standard_timetables.json`

#### A. 생성 방법
```bash
# timetable/ 폴더의 원본(CSV/XLSX)을 전처리하여 json/subway_standard_timetables.json 생성
python scripts/preprocess_subway.py

# 배포·캐싱용 압축본 (권장)
python scripts/preprocess_subway.py -o public/data/subway_standard_timetables.min.json --compact
```

#### B. 데이터 구조 (`columns` & `data` 분리형)
```json
[
  {
    "line": "수인분당선",
    "stationName": "수서",
    "dayType": "평일",
    "direction": "상행",
    "timetables": {
      "columns": ["hour", "minute", "destStation", "isExpress", "trainNo"],
      "data": [
        [5, "31", "왕십리", false, "K6000"],
        [5, "42", "왕십리", false, "K6002"],
        [7, "31", "왕십리", true, "K6300"]
      ]
    }
  }
]
```
| 필드 | 값 규격 |
| :--- | :--- |
| `line` | `"1호선"` ~ `"9호선"`, `"수인분당선"`, `"경의중앙선"` |
| `stationName` | 정규화된 표준 역명 (`'역'` 접미사 제거, 단 `"서울역"`은 유지 / 코레일 약칭 → 표준 역명 변환 완료) |
| `dayType` | `"평일"` \| `"토요일"` \| `"휴일"` (코레일 '휴일' 시트는 토요일·휴일 양쪽에 복제됨) |
| `direction` | `"상행"` \| `"하행"` \| `"내선"` \| `"외선"` (2호선 본선은 내선/외선) |
| `hour` | 숫자. 새벽 00시 → `24`, 01시 → `25` (최대 `27`)로 정규화되어 있음 |
| `minute` | 두 자리 문자열 (`"05"`, `"42"`) |
| `destStation` | 정규화된 종착역명 |
| `isExpress` | 급행 여부 (`boolean`) |
| `trainNo` | 열차번호 문자열 (`"K6000"`, `"4006"` 등) |

- 각 그룹의 `data`는 이미 **시간순으로 정렬**되어 있고, 무정차 통과역은 **이미 빠져 있음**.
- 원본 프롬프트의 `origStation`(시발역) 필드는 **현재 JSON에 없음**. 필요하면 `preprocess_subway.py`의 `TIMETABLE_COLUMNS`에 추가한 뒤 다시 생성할 것.

#### C. 파일 배치 및 로딩 방식
- 파일이 크므로(원본 22.63 MB) **클라이언트 번들에 `import`하지 말 것**.
- `--compact` 압축본을 `public/data/`에 두고, 첫 실행 시 `fetch()`로 1회 내려받아 Dexie에 적재할 것 (Gzip 전송 시 약 1.58 MB).
- 데이터 버전 키(예: 파일 생성일 또는 해시)를 `localStorage`에 저장해서, 버전이 바뀔 때만 다시 적재할 것.

---

### 1.2. 패키지 설치 및 로컬 DB (`lib/timetableDb.ts`) 구축
- 설치 패키지: **`dexie`** (원본 프롬프트의 `papaparse`, `xlsx`는 필요 없음)
- `lib/timetableDb.ts`에 `Dexie.js` 스키마를 정의해 줘.
  - 테이블명: `timetables`
  - 인덱스 스키마: `&[stationName+line+dayType+direction], stationName, line`
  - 레코드 단위: JSON의 **그룹 1개 = 레코드 1개** (총 약 3,441건)
  - 필드 구성:
    - `line`, `stationName`, `dayType`, `direction`: 1.1절 규격과 동일
    - `columns`: `string[]`
    - `data`: `[number, string, string, boolean, string][]`
- 별도 `meta` 테이블 또는 `localStorage`에 `dataVersion`과 `loadedAt`을 저장할 것.

---

### 1.3. 데이터 로더 (`utils/timetableLoader.ts`)
1. `public/data/subway_standard_timetables.min.json`을 `fetch()`로 받아 파싱해.
2. 각 그룹을 `{ line, stationName, dayType, direction, columns, data }` 형태로 펼쳐서 `bulkPut`으로 적재해 (약 3,441건이므로 1회 또는 500건 단위 청크로 충분함).
3. 적재 진행률(0~100%)을 콜백으로 전달해.
4. 조회 헬퍼를 제공해:
   ```ts
   getStationTimetable(line, stationName, dayType, direction)
   // → { hour, minute, destStation, isExpress, trainNo }[] 로 매핑해서 반환
   ```
5. **노선·역명 매핑 주의**:
   - 실시간 API와 `subway_data.json`은 `"01호선"`, `"경의선"` 같은 표기를 쓰지만, 시간표 JSON은 `"1호선"`, `"경의중앙선"`을 씀. `utils/subwayData.ts`의 `normalizeLineName` / `normalizeRouteLine`과 맞춰 변환 함수를 만들 것.
   - 시간표 JSON은 4호선 총신대입구를 `"총신대입구(이수)"`로 저장함 (`subway_data.json`의 `station_alias`와 일치). 역명 비교 시 `station_alias`를 함께 확인할 것.
   - 시간표가 없는 노선/역이면 `null`을 반환하고, UI에서 "시간표 정보가 없는 노선입니다"라고 안내할 것.

---

### 1.4. 데이터 관리 모달 (`components/TimetableDataModal.tsx`)
1. 현재 적재된 시간표 데이터 버전, 적재 일시, 수록 노선 목록 표시.
2. **[시간표 데이터 내려받기/갱신]** 버튼: 1.3절 로더 실행 + 진행률 게이지(`0~100%`) 표시.
3. **[시간표 데이터 삭제]** 버튼: 기존 `ConfirmModal`로 확인 후 Dexie 테이블 초기화.
4. 기존 `utils/cachePurging.ts`(`purgeSensitiveOfflineCaches`)로 전체 초기화할 때 시간표 DB도 같이 지울지 결정해서 반영할 것.

---

### 1.5. 전철역 벽면 시간표 UI (`components/StationTimetableModal.tsx`) & 알람 연동
- 역 검색 결과 카드(`ArrivalCard.tsx`)에서 **[🕒 시간표]** 버튼 클릭 시 바텀 시트/모달로 표시. 시간표가 없는 노선은 버튼을 비활성화하거나 숨길 것.
- 요일 탭(`[평일]` | `[토요일]` | `[휴일]`) 및 방면 탭(`상행/하행` 또는 `내선/외선`) 제공. 오늘 요일 탭을 기본 선택.
- 05시~25시 벽면 시간표 그리드 (분 + 행선지 표시, 급행은 빨간 테두리와 `[급]` 뱃지). `hour` 24·25는 화면에 `00`·`01`로 표시.
- 모달을 열면 현재 시각 행으로 부드럽게 자동 스크롤(`scrollIntoView`)하고 하이라이트할 것. 시각은 기존 KST 포맷터(`parseKSTDate`, `formatKSTTime`) 규칙을 따를 것.
- 특정 열차 칩을 누르면 기존 알람 예약 흐름(`AlarmModal.tsx` / `utils/alarmActions.ts`)과 연동할 것 (도착 2분 전 알람 규칙과 중복 방지 규칙 유지).
- 다크/라이트 테마, 모바일 반응형 등 기존 UI 규격을 따를 것.

---

### 1.6. 검증
- `npx tsc --noEmit` 통과.
- 수록 노선(예: 수인분당선 수서, 2호선 내선/외선, 경의중앙선 급행 정차역)과 미수록 노선(예: 신분당선)에서 각각 정상 동작 및 안내 문구 확인.

---

## 2. 참고: 전처리 스크립트 핵심 규칙 요약 (`scripts/preprocess_subway.py`)
- **입력**: `timetable/` 폴더의 서울교통공사 CSV(테이블형), 코레일 엑셀(`.xlsx`, 2차원 열차 다이어그램)
- **역명 정규화**: `KORAIL_STATION_MAP`으로 코레일 약칭 변환 (`신인천`→`인천`, `과천청`→`정부과천청사`, `4서울`→`서울역`, `당고개`→`불암산`, `별가람`→`별내별가람` 등), `'서울역'`을 제외한 `'역'` 접미사 제거
- **무정차 통과역 제외**: 시발역이 아닌데 도착 시각이 없고 출발 시각만 있는 행
- **급행 판별**: 엑셀은 열차번호 대역(`K44`, `K57`, `K58`, `K63`, `S43`), CSV는 `급행여부` 컬럼
- **중복 제거**: CSV와 엑셀에 같이 실린 열차(예: 4호선 `4006` / `S4006`)를 `(hour, minute, 열차번호 숫자)` 키로 제거
- **출력 옵션**: `--format table|flat|object`, `--compact`, `-o <경로>`
