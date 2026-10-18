# Subway Tracker (서울 지하철 실시간 도착 정보 및 경로 추적 시스템)

본 문서는 `Subway Tracker` 프로젝트의 전체적인 프로그램 개요, 핵심 기능, 아키텍처 및 기술 스택, 주요 구현 알고리즘, 수정 발전사, 그리고 개발 및 배포 시 참고해야 할 핵심 주의사항을 종합적으로 정리한 개발 통합 문서입니다.

---

## 1. 프로그램 소개 (Program Overview)

**Subway Tracker**는 서울시 지하철 공공데이터를 기반으로 실시간 열차 도착 정보 조회, 열차 위치 기반 실시간 이동 경로 추적, 그리고 목표 역 도착 전 스마트 알림을 제공하는 모던 웹 애플리케이션이자 PWA(Progressive Web App)입니다.

### 1.1. 개발 배경 및 목적
*   **복잡한 지하철 환경에서의 직관적 정보 제공**: 서울 지하철의 복잡한 환승 노선, 순환선(2호선), 분기선(5호선 마천/하남검단산 방면 등) 환경에서도 사용자가 자신이 탈 열차의 현재 위치와 다음 역들의 도착 예정 시각을 한눈에 확인할 수 있도록 돕습니다.
*   **모바일 네이티브 앱 수준의 웹 경험(PWA)**: 별도의 앱스토어 설치 없이 웹 브라우저를 통해 홈 화면에 추가할 수 있으며, 데스크톱과 모바일(iOS Safari 및 Android Chrome) 양쪽 모두에서 최적화된 반응형 인터페이스를 제공합니다.
*   **신뢰성 높은 도착 알림**: 모바일 브라우저의 백그라운드 제약을 극복하기 위해 Serverless Delayed Scheduler(Upstash QStash)와 Web Push API를 결합하여, 사용자가 앱을 닫거나 다른 화면을 보고 있어도 목적지 도착 직전에 정확한 푸시 알림을 수신할 수 있도록 구현되었습니다.

---

## 2. 주요 기능 설명 (Key Features)

| 기능 분류 | 세부 기능 | 설명 |
| :--- | :--- | :--- |
| **실시간 도착 정보** | **역별 실시간 도착 조회** | 특정 지하철 역을 검색하여 상·하행(내선/외선) 방면별 실시간 도착 열차 목록과 잔여 시간/위치를 확인합니다. |
| | **역명 별칭(Alias) 자동 보정** | '서울역'을 제외한 '역' 접미사 자동 제거 및 사용자가 줄임말이나 혼동하기 쉬운 역명을 입력해도 정규 역명으로 자동 매핑합니다. |
| | **아코디언 카드 뷰** | 여러 노선이 교차하는 환승역에서도 노선별 도착 정보를 아코디언 형태로 접고 펼치며 깔끔하게 탐색할 수 있습니다. |
| | **최근 검색 기록** | 브라우저 로컬 스토리지를 활용하여 최근 검색한 역을 저장하고 원클릭으로 재조회합니다. |
| **실시간 경로 추적** | **열차 위치 기반 경로 추적** | 특정 열차를 선택하면 해당 열차의 실시간 운행 위치와 종착역까지의 모든 정차역 목록 및 예상 소요시간을 타임라인으로 시각화합니다. |
| | **도착 예정 시간 자동 계산** | API 정보수신일시(`recptnDt`), 열차 진입/도착/출발 오프셋, 역간 보정 시간(`adj_hm`) 또는 기본 시간+정차 시간(30초)을 합산해 도착 시각을 계산합니다. |
| | **복잡 노선 지능형 필터링** | 2호선 무한 순환 및 지선(성수/신정), 5호선 강동 분기(마천/하남검단산) 경로를 목적지에 맞춰 동적으로 잘라내어 올바른 경로만 렌더링합니다. |
| | **마지막 조회 경로 복원** | 최근 추적한 열차 경로를 로컬 스토리지(`lastRoute`)에 저장하여 내비게이션 '경로' 탭에서 즉시 재진입할 수 있으며, 30분 경과 시 자동 만료됩니다. |
| **스마트 도착 알림** | **예상 도착 2분 전 알람** | 경로 추적 화면에서 내릴 역을 선택하면 도착 예정 시각 **2분 전**에 알림을 예약합니다 (잔여 시간 2분 이하 시 예약 제한 및 중복 방지). |
| | **사용자 지정 시간 알람** | 실시간 정보가 없거나(`--:--`) 직접 타이머 형태로 맞추고 싶을 때 `+1, -1, +5, -5, +10, -10`분 단위로 원하는 시점에 알람을 맞춥니다. |
| | **하이브리드 알림 발송** | 일반 브라우저 포그라운드에서는 로컬 Notification API를, PWA Standalone 모드나 백그라운드에서는 Upstash QStash + Web Push를 사용합니다. |
| | **알람 생명주기 관리** | 알람 목록 조회, 단건/전체 삭제(ConfirmModal), 발송 1분 후 자동 청소 및 도착 10분 경과 시 강제 폴백 청소(Auto Cleanup)를 지원합니다. |
| **UI & UX** | **다크/라이트 테마 전환** | 사용자 선호에 따른 테마 전환과 브라우저 로컬 저장, Tailwind CSS v4 기반의 안정적인 테마 스타일을 제공합니다. |
| | **앱 안내 모달 & 브랜딩** | 헤더 로고 클릭 시 상단 타이틀 바 형태의 안내 모달이 오픈되며, 개인정보처리방침 링크 및 버전 정보를 제공합니다. |
| | **원클릭 앱 최신 캐시 업데이트** | 브라우저 캐시로 인해 구버전이 유지되는 문제를 방지하기 위해, 오프라인 캐시를 소각하고 서비스를 즉시 갱신하는 업데이트 버튼을 제공합니다. |
| | **프로필 엑박(Broken Image) 방어** | 외부 유저 아바타 도달 실패 시 엑박 대신 시스템 기본 아이콘(`account_circle`)으로 즉각 전환(Fallback)합니다. |

---

## 3. 개발 프레임워크 및 기술 스택 (Tech Stack)

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                  │
├──────────────────────────────┬──────────────────────────────┤
│      Frontend (Client)       │     Backend (Serverless)     │
├──────────────────────────────┼──────────────────────────────┤
│ • React 19 (Hooks, Context)  │ • Next.js Route Handlers     │
│ • TypeScript 5               │ • Zod 4 (Strict Validation)  │
│ • Tailwind CSS v4            │ • Upstash QStash SDK         │
│ • Workbox 7 (Runtime Caching)│ • Web-Push (VAPID Signature) │
│ • Material Symbols Outlined  │ • Seoul Open Data Subway API │
└──────────────────────────────┴──────────────────────────────┘
```

*   **프레임워크**: **Next.js 16.2.4** (App Router 기반, Server & Client Components 분리 아키텍처)
*   **UI 라이브러리**: **React 19.2.4** (`react`, `react-dom`)
*   **언어**: **TypeScript 5** (`tsconfig.json`을 통한 엄격한 정적 타입 검사)
*   **스타일링**: **Tailwind CSS v4** (`@tailwindcss/postcss`), 커스텀 CSS 변수 기반 다크 모드
*   **입력 검증 라이브러리**: **Zod 4.4.3** (API Request Body, Query, Path 안전 파싱)
*   **백그라운드 스케줄링**: **@upstash/qstash 2.10.1** (서버리스 지연 푸시 예약 및 암호화 서명 검증)
*   **웹 푸시**: **web-push 3.6.7** (RFC 8292 VAPID 표준 기반 Web Push 전송)
*   **서비스 워커 및 PWA**: Workbox 7 (`workbox-sw.js`, Service Worker 기반 런타임 캐싱 이원화)
*   **아이콘 및 폰트**: Google Fonts CDN (`Material Symbols Outlined`), `next/font/google` (`Inter`)
*   **패키지 관리 및 린터**: npm, ESLint 9 (`eslint.config.mjs`)

---

## 4. 프로젝트 구조 및 파일 역할 (Project Structure)

```text
/subway tracker/
├── app/                              # Next.js App Router (페이지 및 API 엔드포인트)
│   ├── layout.tsx                    # 전역 레이아웃 (공통 폰트, AlarmManager, ThemeProvider, Header, Navigation)
│   ├── page.tsx                      # 메인 페이지 (역 검색, 실시간 도착 목록 렌더링)
│   ├── globals.css                   # Tailwind v4 지시어 및 전역 다크모드 커스텀 변수
│   ├── alarms/page.tsx               # 알림 목록 관리 페이지 (알람 추가, 단건/전체 삭제, PWA 설치 유도)
│   ├── route/[trainNo]/page.tsx      # 실시간 열차 경로 추적 페이지 (RouteTrackerClient 렌더링)
│   └── api/                          # 서버리스 API 라우트
│       ├── subway/route.ts           # 서울시 실시간 역 도착 정보 프록시 API (Zod 검증, 에러 위생화)
│       ├── subway/position/route.ts  # 서울시 실시간 열차 위치 프록시 API (Zod 검증, 에러 위생화)
│       ├── alarm/reserve/route.ts    # QStash 지연 발송 예약 API (Zod 검증, QStash 클라이언트 연동)
│       ├── alarm/cancel/route.ts     # QStash 예약 취소 API (404 예외 처리, 로컬 동기화)
│       └── push/route.ts             # QStash 웹훅 수신 및 Web Push 실제 발송 API (서명 검증, Zod 검증)
├── components/                       # 재사용 가능한 React UI 컴포넌트
│   ├── Header.tsx                    # 상단 헤더 (앱 로고 클릭 모달 트리거, 테마 토글, UserAvatar, 안내 모달)
│   ├── Navigation.tsx                # 데스크톱 사이드바 & 모바일 하단 내비게이션 바 (최근 경로 30분 복원)
│   ├── Footer.tsx                    # 하단 카피라이트 및 버전 정보
│   ├── SearchSection.tsx             # 역 검색창, 추천 검색어 드롭다운, 최근 검색어 태그
│   ├── ArrivalCard.tsx               # 도착 정보 카드 (노선별 배지, 열차 위치, 아코디언, 알람 버튼)
│   ├── RouteTrackerClient.tsx        # 열차 경로 시각화 타임라인, 역간 소요시간 계산, 도착 알람 설정
│   ├── AlarmButton.tsx               # 도착 2분 전 알람 / 사용자 지정 알람 모달 분기 호출 버튼
│   ├── AlarmModal.tsx                # 실시간 도착 정보 연동 알람 설정 모달
│   ├── CustomAlarmModal.tsx          # 사용자 직접 분(+X분) 지정 알람 설정 모달
│   ├── ConfirmModal.tsx              # 범용 확인 모달 (알람 전체 삭제 등)
│   ├── AlarmManager.tsx              # 전역 백그라운드 알람 감시자 (5초 주기 트리거, 만료 알람 자동 청소)
│   ├── ThemeProvider.tsx             # 다크/라이트 모드 상태 관리 Context Provider
│   └── UserAvatar.tsx                # 프로필 이미지 컴포넌트 (onError 감지 및 기본 아이콘 Fallback)
├── utils/                            # 비즈니스 로직 및 유틸리티 모듈
│   ├── apiValidation.ts              # Zod 기반 API 입력값 검증 스키마 모음
│   ├── alarmActions.ts               # 알람 등록 공통 함수 (로컬 vs QStash 분기, 중복 검사, VAPID 구독)
│   ├── alarmStorage.ts               # 로컬 스토리지 알람 데이터 CRUD 및 정규화
│   ├── cachePurging.ts               # PWA 오프라인 캐시 소각 및 로컬 데이터 완전 초기화
│   ├── config.ts                     # 전역 설정값 (APP_CONFIG: 버전, 공지 메시지)
│   ├── errorMessage.ts               # 에러 메시지 생성 및 포맷팅 유틸
│   ├── push.ts                       # web-push 라이브러리 연동 및 VAPID 설정
│   ├── qstash.ts                     # Upstash QStash 인스턴스 및 Receiver 팩토리
│   ├── stationHistory.ts             # 최근 검색 역 로컬 스토리지 입출력
│   ├── subwayColors.ts               # 노선별 고유 헥스코드 및 UI 색상 매핑
│   └── subwayData.ts                 # 정적 지하철 데이터 파싱, KST 시각 보정, 별칭 변환, 2/5호선 분기 처리
├── types/                            # TypeScript 타입 선언
│   ├── alarm.ts                      # 알람, 웹푸시 구독, 페이로드, 에러코드 타입
│   └── subway.ts                     # 서울시 공공데이터 API 응답 및 가공 지하철 데이터 타입
├── json/                             # 지하철 정적 데이터셋
│   ├── subway_data.json              # 통합 정적 데이터 (역 기본정보, 인접역 소요시간, 별칭 통합본)
│   ├── stations.json                 # 원본 역 정보 데이터
│   ├── distances.json                # 원본 역간 소요시간 데이터
│   ├── stations_nm_alias.json        # 역명 별칭 데이터
│   └── adjust.json                   # 노선별 누락 구간 시간 보정 파라미터
├── public/                           # 정적 웹 자산
│   ├── sw.js                         # 서비스 워커 (Workbox 이미지 캐싱, Web Push 이벤트 처리)
│   ├── manifest.json                 # PWA 웹 매니페스트
│   ├── apple-icon.png                # iOS 홈 화면 바로가기 아이콘
│   └── favicon.ico                   # 기본 파비콘
├── scripts/
│   └── generate_subway_data.js       # 정적 데이터 파일들을 통합 subway_data.json으로 빌드하는 스크립트
├── next.config.ts                    # Next.js 전역 설정 (6대 HTTP 보안 헤더, CSP, 허용 개발 오리진)
└── tsconfig.json                     # TypeScript 컴파일러 설정
```

---

## 5. 핵심 기능 구현 및 주요 수정사항 발전사 (Implementation & Evolution)

### 5.1. 정적 데이터 통합 및 소요시간 자동 보정 알고리즘
*   **4개 데이터셋의 단일 통합 (`generate_subway_data.js` -> `subway_data.json`)**:
    *   기존에는 `stations.json`(역 정보), `distances.json`(역간 시간/거리), `stations_nm_alias.json`(역명 별칭), `adjust.json`(보정 시간)을 개별 관리했으나, 런타임 I/O 병목을 줄이기 위해 빌드 스크립트를 통해 단일 고속 JSON(`subway_data.json`)으로 통합 매핑했습니다.
*   **누락 구간 비례 보정 (`adjust.json`)**:
    *   공공데이터의 일부 구간 소요시간이 `0:00`으로 누락되어 있거나 실제 운행 시간과 오차가 있는 구간은, 노선별 공식 총 소요시간(`tot_hm`)을 각 역의 기준 시간(`hm`) 비율에 따라 비례 분배하거나 균등 배분하여 자동 보정(`adj_hm`, `adj_hm2`)합니다.
*   **방향성 판별, 초기 오프셋 및 정차시간 가산 (`RouteTrackerClient.tsx`)**:
    *   열차의 진행 방향을 이전 역과 현재 역의 `fr_code` 증감(`localeCompare`)으로 판별하여 오름차순(정방향)일 때는 `adj_hm2`/`hm2`, 내림차순(역방향)일 때는 `adj_hm`/`hm`을 선택합니다.
    *   보정 시간(`adj_hm`/`adj_hm2`)이 있는 구간은 해당 값을 즉시 사용하고, 기본 시간(`hm`/`hm2`)만 있는 구간은 중간 정차역마다 **30초의 정차시간**을 합산합니다.
    *   현재 열차 상태에 따라 **진입(`60초`), 도착(`30초`), 출발(`0초`)의 초기 오프셋(`initialOffset`)**을 부여하고, API의 **정보수신일시(`recptnDt`, KST 기준)**를 기점으로 각 역의 도착 예정 시각을 정밀하게 도출합니다. 데이터가 완전히 누락된 구간은 임의 추정을 멈추고 `--:--`로 표기합니다.

### 5.2. 복잡한 노선(2호선 순환선 및 5호선 강동 분기) 예외 처리
*   **2호선 무한 순환선 및 지선 분리**:
    *   **순환 루프 배열 확장**: 2호선 본선은 시청역(201)과 충정로역(243)이 양방향에서 끊김 없이 순환하므로, 내부적으로 역 배열을 2배(`[...lineStations, ...lineStations]`)로 확장하여 종착역까지의 루프를 단절 없이 탐색하며, 순환선 특성상 종착역 이후 구간 자르기(slice)를 적용하지 않습니다.
    *   **지선 필터링**: 성수지선(`211` + `211-n`) 및 신정지선(`234` + `234-n`) 열차는 현재역과 목적지(`bstatnNm`)에 따라 본선과 지선을 엄격히 분리해 불필요한 역이 노출되지 않도록 최적화했습니다.
*   **5호선 강동 분기(마천 방면 / 하남검단산 방면) 대응**:
    *   **경로 필터링**: 강동역(548)에서 분기하는 5호선의 특성을 반영하여, 현재역 또는 목적지가 마천 지선(`P549~P555`)인 경우 하남검단산 본선(`549~558`)을 제거하고, 반대의 경우 마천 지선을 제거합니다.
    *   **`hm2` 분기점 강제 매핑**: 둔촌동역(P549)의 물리적 이전 역이 강동역(548)임을 인식시키고, `distances.json`에서 해당 분기 구간 소요시간(1분 50초)을 추출해 `hm2` 필드에 정확히 강제 바인딩했습니다.

### 5.3. 하이브리드 알림 시스템 (Web Push + Upstash QStash)
*   **환경별 이원화 알림 전략 (`alarmActions.ts`)**:
    *   **로컬 전략 (`strategy: "local"`)**: 일반 브라우저에서 앱이 포그라운드(`document.visibilityState === "visible"`)이고 PWA Standalone 모드가 아닐 때 사용하며, `AlarmManager`가 브라우저 `Notification` API로 직접 알림을 띄웁니다.
    *   **QStash 전략 (`strategy: "qstash"`)**: iOS/Android의 PWA Standalone 모드(`display-mode: standalone` 또는 `navigator.standalone`)이거나 백그라운드 상태일 때 사용하며, 모바일 OS의 백그라운드 타이머 정지 제약을 극복하기 위해 VAPID 기반 Web Push와 Upstash QStash를 결합합니다.
*   **도착 2분 전 예약 및 중복 방지**:
    *   실시간 도착 연동 알람은 **도착 예정 시각 2분 전(`arrivalTime - 2분`)**으로 자동 설정되며, 남은 시간이 2분 이하일 경우 예약을 차단합니다. 또한 동일 역·동일 도착 시각에 대한 중복 알람 등록을 방지합니다.
*   **Upstash QStash 스케줄링**:
    *   목표 알림 시간까지 남은 시간(`delayMs`)을 초 단위로 변환하여 `app/api/alarm/reserve`로 지연(Delay) 메시지를 예약하고 반환된 `messageId`를 로컬 알람 객체에 저장합니다.
    *   예약 시각에 QStash 서버가 `app/api/push`를 웹훅으로 호출하면, 암호화 서명을 검증한 뒤 사용자의 디바이스로 Web Push를 발송합니다.

### 5.4. 사용자 정의 알람 및 스마트 라이프사이클 관리
*   **사용자 정의 알람 모달 (`CustomAlarmModal`)**:
    *   실시간 도착 정보가 제공되지 않거나(`--:--` 버튼 클릭 시), 알림 목록 페이지에서 사용자가 직접 타이머를 맞추고 싶을 때 `+1, -1, +5, -5, +10, -10`분 단위로 조절(최소 1분 이상) 가능한 커스텀 알림 모달을 제공합니다.
*   **알람 일괄 삭제 및 QStash 404 예외 핸들링**:
    *   단건 삭제 시 QStash에서 이미 발송 완료되어 404(`ALARM_NOT_FOUND`)가 반환되면 `"존재하지 않거나 이미 삭제된 알람입니다."` 안내 후 로컬 목록에서 정상 삭제합니다.
    *   알림이 1개 이상일 때 노출되는 "전체 삭제" 버튼(`ConfirmModal`) 실행 시에는 모든 QStash 취소 요청을 `Promise.allSettled`로 병렬 처리하며 404 등의 에러를 조용히 무시(Silently Ignore)하고 로컬 스토리지와 오프라인 캐시를 일괄 초기화합니다.
*   **2단계 자동 청소 루틴 (`AlarmManager.tsx`)**:
    *   전역 `AlarmManager`가 5초 주기로 알람 목록을 스캔하여, 1차로 QStash 알람의 알림 예정 시각(`notifyAt`)이 **1분 이상 경과**하면 로컬 스토리지에서 자연스럽게 자동 삭제하고, 2차 폴백으로 도착 예정 시각(`arrivalTime`)이 **10분 이상 경과**한 모든 잔여 알람을 강제 청소합니다.

### 5.5. 4단계 보안 아키텍처 및 하드닝 체계 (Security Hardening)
Next.js App Router와 서버리스 함수 간의 경계를 보호하기 위한 전방위 보안 체계를 구축했습니다.
1.  **엔드포인트 인가 및 Zod 검증**:
    *   모든 API 라우트(`app/api/**`)에 `zod` 기반 스키마 검증(`safeParse`)을 전면 도입하여, 비정상적 페이로드 및 쿼리 파라미터 유입 시 즉시 HTTP 400 Bad Request를 반환합니다.
    *   `app/api/push` 핸들러는 Upstash 암호화 서명(`upstash-signature`)을 대조하여 검증된 호출만 허용하며, 만료된 푸시 구독(HTTP 404/410)은 재시도 루프를 막기 위해 `staleSubscription: true`(HTTP 200)로 우아하게 종료합니다.
2.  **에러 메시지 위생화 (Error Sanitization)**:
    *   공공데이터 API 실패 시 원문 JSON이나 데이터베이스 쿼리 스택 트레이스를 클라이언트에 일절 노출하지 않고, 터미널 로그(`console.error`)에만 남긴 채 브라우저 응답은 `"요청을 처리할 수 없습니다."`로 통일했습니다.
3.  **환경 변수 Zero-Leak 원칙**:
    *   서버 비밀키(`SEOUL_SUBWAY_API_KEY`, `QSTASH_TOKEN`, `VAPID_PRIVATE_KEY` 등)에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않고 순수 백엔드 전용 변수로 격리했습니다.
4.  **PWA 오프라인 캐시 소각 (Cache Purging)**:
    *   데이터 초기화, 최신 버전 업데이트 또는 알람 전체 삭제 시 `utils/cachePurging.ts` (`purgeSensitiveOfflineCaches`)를 호출하여 브라우저의 Cache Storage를 완전히 파괴 소각하는 보안 루틴을 도입했습니다.
5.  **6대 강력 HTTP 보안 헤더 (`next.config.ts`)**:
    *   CSP(Content-Security-Policy, Workbox 로드를 위한 `https://storage.googleapis.com` 및 `worker-src 'self' blob:` 허용 포함), HSTS, X-Frame-Options(`DENY`), X-Content-Type-Options(`nosniff`), Referrer-Policy, Permissions-Policy를 전역 라우트에 적용했습니다.

### 5.6. PWA 이미지 캐싱 이원화 전략 및 UI Fallback UX
*   **서비스 워커(`public/sw.js`) 캐싱 이원화**:
    *   **외부(Cross-Origin) 이미지 (`StaleWhileRevalidate`)**: 구글 OAuth 아바타 등 외부 도메인 이미지(`url.origin !== self.location.origin`)는 백그라운드에서 최신 이미지를 갱신받을 수 있도록 `StaleWhileRevalidate` 전략을 적용하고, Opaque(상태 0) 응답을 허용하며 TTL을 30일로 제한했습니다.
    *   **내부(Self-Origin) 정적 자산 (`CacheFirst`)**: Next.js 정적 빌드 자산, 폰트, 로컬 이미지에는 1년짜리 `CacheFirst` 정책을 확정하여 오프라인 즉각 로딩 성능을 확보했습니다.
*   **프로필 엑박(Broken Image) 방어벽 (`UserAvatar.tsx`)**:
    *   외부 이미지 도달 실패 시 브라우저 기본 물음표(?) 엑박이 노출되지 않도록 `onError` 핸들러를 장착하고, 세련된 기본 아이콘(`account_circle`)으로 즉시 Fallback 렌더링하도록 개선했습니다.

### 5.7. UI/UX 현대화 (헤더 및 앱 안내 모달 개편)
*   **헤더 안내 트리거 일원화**: 기존의 별도 'i' 안내 버튼을 제거하고, 상단 좌측의 지하철 앱 로고와 'Subway Tracker' 타이틀 영역 전체를 클릭 가능한 버튼으로 통합하여 안내 모달을 호출하도록 일원화했습니다.
*   **상단 타이틀 바 도입 및 닫기 UX 간소화**: 안내 모달 상단에 좌측 정렬된 앱 로고/타이틀과 우측 끝 'X' 닫기 버튼으로 구성된 타이틀 바를 배치하고, 하단의 불필요한 '확인' 버튼을 제거하여 모달 구조를 정돈했습니다.
*   **로컬 캐시 삭제 기반 "최신 버전 업데이트" 버튼**: 모달 안내 문구 바로 아래에 캐시 삭제 업데이트 버튼을 배치하여, 클릭 시 `purgeSensitiveOfflineCaches()`와 서비스 워커 갱신을 수행하고 즉시 새로고침되도록 구현했습니다.
*   **개인정보처리방침 링크 및 버전 바**: 모달 최하단에 `@VERSION` 정보와 동일한 규격으로 "개인정보처리방침" 링크(`https://landing-doohee2.vercel.app/privacy`)를 배치했습니다.

---

## 6. 구현의 기술적 특징 및 주의사항 (Developer Notes)

### 6.1. Next.js App Router 컴포넌트 경계 및 Hydration Mismatch 방어
*   `page.tsx` 등 상위 페이지는 SEO 및 초기 렌더링 최적화를 위해 **Server Component**로 작동하며, 상호작용 및 상태 관리가 필요한 UI(`RouteTrackerClient`, 모달, 검색 바 등)는 `'use client'`를 선언하여 **Client Component**로 엄격히 분리했습니다.
*   클라이언트와 서버 간의 시간 차이, `Math.random()`, 브라우저 로컬 스토리지 참조로 인한 **Hydration Mismatch 에러**를 방지하기 위해 `useEffect` 마운트 이후에 상태를 동기화하거나 KST(`UTC+9`) 고정 포맷터(`parseKSTDate`, `formatKSTTime`)를 사용하는 패턴을 준수해야 합니다.

### 6.2. 서울 공공데이터 지하철 API 및 역명 매핑 특이사항
*   **역명 접미사 및 공식 별칭(Alias) 정규화**:
    *   서울시 `realtimeStationArrival` API는 `'서울역'`을 제외하고 `'역'` 접미사가 붙어 있으면 조회가 실패하므로 `app/api/subway/route.ts`에서 역명 끝의 `'역'`을 자동으로 제거합니다.
    *   또한 `'천호'`처럼 괄호 부역명이 포함된 역은 API 질의 시 `'천호(풍납토성)'`으로 조회해야 정확히 반환되는 경우가 있어, `getStationRealName()`을 통해 `station_alias[0]`의 공식 명칭으로 자동 치환하여 요청합니다.
*   **CORS 및 키 노출 방어**: 외부 공공 API는 브라우저에서 직접 호출하지 않고 반드시 내부 API 라우트(`app/api/subway/*`)를 통하도록 프록시 처리하여 CORS 에러와 API Key 클라이언트 노출을 원천 방지합니다.

### 6.3. 환경 변수 설정 및 Vercel 프로덕션 배포 가이드
프로덕션 배포(Vercel 등) 시 아래의 환경 변수 원칙을 반드시 준수해야 합니다:

| 환경 변수명 | 위치 / 노출 여부 | 설명 | 프로덕션 주의사항 |
| :--- | :--- | :--- | :--- |
| `SEOUL_SUBWAY_API_KEY` | Server Only | 서울시 공공데이터 지하철 인증키 | Vercel 환경 변수에 설정 |
| `QSTASH_TOKEN` | Server Only | Upstash QStash API 토큰 | Upstash 콘솔에서 발급 후 설정 |
| `QSTASH_CURRENT_SIGNING_KEY` | Server Only | QStash 웹훅 서명 검증 키 | Upstash 콘솔에서 발급 후 설정 |
| `QSTASH_NEXT_SIGNING_KEY` | Server Only | QStash 웹훅 차기 서명 키 | Upstash 콘솔에서 발급 후 설정 |
| `QSTASH_PUSH_ENDPOINT_URL` | Server Only | QStash가 웹훅을 호출할 서버 URL | **반드시 실제 배포 도메인으로 변경** (예: `https://subway.yourdomain.com/api/push`) |
| `VAPID_PRIVATE_KEY` | Server Only | Web Push VAPID 비밀키 | 서버에서 푸시 암호화 서명 시 사용 |
| `VAPID_SUBJECT` | Server Only | Web Push 연락처 (mailto) | 관리자 이메일 주소 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`| Client Expose | Web Push 브라우저 구독용 공개키 | 브라우저 PushManager 구독 시 사용 |
| `NEXT_PUBLIC_SHOW_DETAILED_ALARM_ERROR` | Client Expose | 알람 에러 디버깅 플래그 | 프로덕션에서는 false 권장 |

> ⚠️ **중요**: 로컬 개발 시 `QSTASH_PUSH_ENDPOINT_URL`이 `http://localhost:3000/api/push`로 되어 있으나, 로컬호스트 주소는 외부 QStash 서버에서 접근할 수 없습니다. 로컬 푸시 테스트 시에는 `ngrok` 등의 터널링 도구를 사용하거나 실제 배포 서버 URL로 연결해야 합니다.

### 6.4. 코드 품질 및 타입 검증 규칙
*   모든 비즈니스 로직과 컴포넌트 수정 후에는 반드시 아래 명령어를 실행하여 문법 및 타입 무결성을 입증해야 합니다:
    ```bash
    npx tsc --noEmit
    ```
*   `any` 타입의 무분별한 사용을 지양하고, `types/subway.ts` 및 `types/alarm.ts`에 정의된 정규 인터페이스를 활용하여 타입 안정성을 유지합니다.

---

## 7. 지하철 노선도 그래프 자료구조 개선 계획 및 로드맵 (Graph Migration Roadmap)

기존 1차원 배열(`fr_code` 단순 정렬) 구조에서 발생하는 다중 분기 노선 왜곡, `distances.json` 역방향 매칭 누락, 급행(Express) 정차역 미반영 문제를 해결하기 위한 3단계 고도화 계획입니다.

### 7.1. 데이터 파일 구성 변화 (기존 5개 파일 체계 유지)
*   `json/stations.json` (유지): 역 기본 정보 원본
*   `json/distances.json` (유지): 서울교통공사(1~8호선) 역간 거리·소요시간 원본 (양방향 매칭 적용)
*   `json/stations_nm_alias.json` (유지): 역명 별칭 원본
*   `json/adjust.json` (**확장 - Step 1**): 전 노선 주요 구간별 총 소요시간(`tot_hm`) 정의 파일로 확장하여 코레일·민자·외곽 노선(`01호선`, `03호선`, `04호선`, `09호선`, `경의선`, `경춘선`, `공항철도`, `수인분당선`, `서해선` 등) 소요시간 보정
*   `json/subway_data.json` (**스키마 확장 - Step 2**): 기존 필드 하위 호환 유지 + 각 역 노드에 인접 역 연결 그래프 간선 배열(`edges: [{ to: string, sec: number }]`) 추가

### 7.2. 단계별 실행 과제 및 진행 상태
*   **[완료] Step 1 (소요시간 매칭 오류 수정 및 전 노선 누락 구간 보완)**:
    *   `scripts/generate_subway_data.js`에서 `distances.json` 매칭 시 정방향·역방향 모두 탐색하도록 수정 완료 (1호선 서울역~청량리 등 복구).
    *   `json/adjust.json`에 25개 주요 노선·지선 구간별 표준 소요시간 추가 및 미정의 구간 기본 역간 소요시간(120초) Fallback 적용 완료.
*   **[완료] Step 2 (인접 리스트 그래프 `edges` 전환 및 다중 분기 탐색 엔진 구축)**:
    *   `scripts/generate_subway_data.js`에서 노선별 분기·순환·특수 역코드 토폴로지(1호선 연천/구로/금천구청/병점 분기, 2호선 본선 순환 및 성수/신정 분기, 5호선 강동 분기, 6호선 응암 단선 루프, 경의중앙선 효창공원앞 및 서울역/용산 분기, 경춘선 광운대/상봉 분기, 공항철도 마곡나루/청라국제도시/영종 번호 보정)를 반영하여 총 799개 역의 양방향/단방향 그래프 간선(`edges`) 생성 완료.
    *   `utils/subwayData.ts`의 `normalizeLineName`(경의중앙선↔경의선, 우이신설선↔우이신설경전철 매핑) 및 `getStationsForLine`을 그래프 BFS 최단 경로 탐색 기반으로 리팩토링하고, `components/RouteTrackerClient.tsx`에서 그래프 간선 소요시간(`edge.sec`)을 1순위로 참조하도록 개선 완료.
*   **[다음 할 일 / 예정] Step 3 (실시간 API 급행 `btrainSttus`/`directAt` 연동 및 급행 정차역 패턴 적용)**:
    *   실시간 도착 API(`btrainSttus`: 일반/급행/ITX) 및 실시간 위치 API(`directAt`: 0/1/7)의 급행 여부를 프론트엔드 타입(`types/subway.ts`)과 UI(`ArrivalCard.tsx`, `RouteTrackerClient.tsx`)에 전달하여 `[급행]` 배지 표시.
    *   노선별 급행 정차역 패턴(`expressStops`)을 기반으로 급행열차 추적 시 통과역 정차시간(30초) 제외 및 급행 주행시간 보정을 적용하여 급행 도착 예정 시각 정밀 산출.

