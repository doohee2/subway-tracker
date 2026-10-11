# Subway Tracker (지하철 실시간 도착 정보 조회 프로그램)

본 문서는 현재 작업 중인 `Subway Tracker` 프로젝트의 워크스페이스 분석 결과를 바탕으로, 프로젝트 구조, 개발 환경, 주요 프로그래밍 방법론을 정리한 것입니다.

## 1. 프로젝트 개요 및 구조

이 프로젝트는 서울 지하철의 실시간 도착 정보 및 경로 정보를 제공하는 웹 애플리케이션으로, 최근 PWA(Progressive Web App) 최적화와 알림 기능이 강화되었습니다. 

### 핵심 디렉토리 구조
```text
/subway tracker/
├── app/                  # Next.js 14+ App Router 폴더 (페이지 및 라우팅 로직)
│   ├── alarms/           # 알림 관련 페이지
│   ├── api/              # API 라우트 (지하철 실시간 데이터 프록시 및 백그라운드 알림/푸시 처리용)
│   ├── route/            # 경로 추적 관련 페이지
│   ├── layout.tsx        # 글로벌 레이아웃 (공통 폰트, AlarmManager 주입, 메타데이터 관리)
│   └── page.tsx          # 메인 페이지 (서버 컴포넌트)
├── components/           # 재사용 가능한 UI 컴포넌트 모음
│   ├── AlarmButton.tsx, AlarmManager.tsx, AlarmModal.tsx  # 알림 관련 로직 및 UI
│   ├── ArrivalCard.tsx   # 열차 도착 정보 표시 카드
│   ├── Footer.tsx, Header.tsx, Navigation.tsx # 글로벌 내비게이션 및 레이아웃 요소
│   ├── RouteTrackerClient.tsx # 실시간 열차 위치를 렌더링하는 클라이언트 컴포넌트
│   └── SearchSection.tsx # 지하철 역 검색 기능
├── utils/                # 유틸리티 함수 및 설정값 저장
│   ├── alarmStorage.ts, push.ts, qstash.ts # 로컬 알람 스토리지, 웹 푸시, QStash 스케줄링 유틸리티
│   ├── config.ts         # 공통 설정
│   ├── subwayColors.ts   # 지하철 노선별 고유 색상(헥스코드 등) 정의
│   └── subwayData.ts     # 지하철 API 연동 혹은 가공을 위한 공통 로직
├── types/                # TypeScript 인터페이스 및 타입 정의
│   ├── alarm.ts          # 알람 및 푸시 구독 관련 데이터 타입
│   └── subway.ts         # 공통 지하철 데이터 타입
├── json/                 # 정적 데이터 (예: stations_nm_alias.json 등 별칭 처리 데이터)
├── public/               # 정적 파일 (favicon.ico, apple-icon.png 등)
└── design/               # 디자인 에셋 관련
```

## 2. 개발 환경 기술 스택 (Tech Stack)

*   **프레임워크**: Next.js 16.2.4 (App Router 기반)
*   **UI 라이브러리**: React 19.2.4 (`react`, `react-dom`)
*   **언어**: TypeScript 5 (`tsconfig.json` 활용한 정적 타입 검사)
*   **스타일링**: Tailwind CSS v4 (`@tailwindcss/postcss`), 글로벌 CSS (`globals.css`)
*   **아이콘**: Material Symbols Outlined (Google Fonts CDN을 통해 로드)
*   **폰트**: `next/font/google`의 `Inter` 폰트 사용
*   **패키지 매니저**: `npm` (버전 관리: `package.json`, `package-lock.json`)
*   **린터**: ESLint 9 (`eslint.config.mjs`)

## 3. 주요 프로그래밍 방법론 및 설계 패턴

### 3.1. App Router & 컴포넌트 분리 (Server vs Client)
*   `app/` 내부의 주요 페이지들은 기본적으로 **Server Component**로 작동하며, SEO와 초기 로딩 속도 최적화, 그리고 직접적인 API 키 노출 방지에 이점이 있습니다.
*   실시간으로 업데이트되거나 사용자와 상호작용하는 UI(예: `RouteTrackerClient.tsx`, 모달, 버튼 등)는 상단에 `'use client'` 지시어를 선언하여 **Client Component**로 분리해 설계되었습니다.
*   Next.js API Routes(`app/api/`)를 사용해 서울 공공 데이터 API와의 통신을 위한 서버사이드 프록시를 구축하여 클라이언트에서 직접 외부 API를 호출할 때 발생하는 CORS 문제 및 API 키 노출 보안 문제를 해결했습니다.

### 3.2. 실시간 데이터 갱신 및 상태 관리
*   사용자가 특정 노선이나 역을 조회할 때, "다시 조회" 또는 주기적인 데이터 갱신 로직을 통해 서버 프록시 API(`realtimePosition` 등)에 요청을 보내고 React의 `useState` 및 `useEffect` 훅을 활용하여 UI 상태를 즉각 업데이트합니다.
*   `Math.random()` 등으로 인해 발생하는 서버 렌더링과 클라이언트 렌더링 간의 **Hydration Mismatch 에러**를 방지하기 위해 데이터를 동기화하거나 마운트된 이후에 렌더링하는 안정적인 패턴을 사용합니다.

### 3.3. 접근성 및 PWA (Progressive Web App) 대응
*   iOS 사용자들을 위해 PWA 사양에 맞춘 아이콘 최적화(`apple-icon.png`)를 적용했으며, 알림 페이지 등에서 "홈 화면에 추가"를 유도하는 사용성 개선 로직이 포함되어 있습니다.
*   검색 시 '역'이라는 접미사를 생략하거나 잘못 입력하는 경우에 대비한 Alias(별칭) 자동 처리 로직(`stations_nm_alias.json` 활용)이 있어 검색 신뢰성을 높였습니다.

### 3.4. 디자인 & UI (다크/라이트 모드 테마 및 반응형 아코디언)
*   사용자의 선호에 따라 **다크 모드와 라이트 모드**를 자유롭게 전환할 수 있도록 `ThemeProvider`를 도입하여 브라우저 로컬 스토리지에 테마 상태를 저장합니다.
*   Tailwind CSS v4 환경에서 클래스 기반의 테마 전환을 완벽히 지원하기 위해 `globals.css`에 공식 권장 문법인 `@custom-variant dark (&:is(.dark *));` 규칙을 적용하고, 변수와 `dark:` 유틸리티를 조합해 명시도 충돌 없이 안정적인 테마 전환을 구현했습니다.
*   **다크/라이트 모드 디테일 고도화**: 라이트 모드에서는 버튼 및 배경을 깔끔한 화이트/모노톤 기반(`bg-white`, `border-slate-200` 등)으로 매핑하고, 다크 모드에서는 무거운 그라데이션 대신 세련된 반투명 솔리드 컬러(`dark:bg-slate-800/30`)를 사용하는 등 각 테마에 맞는 최적의 UI 감성을 세밀하게 조정했습니다.
*   여러 개의 열차 도착 정보를 한눈에 파악할 수 있도록 검색 결과 렌더링 시 **아코디언 폴딩 기능**(`ArrivalCard.tsx`)을 추가했으며, 넓은 화면에서 레이아웃이 어색하게 늘어나는 것을 방지하기 위해 Grid 속성에 `items-start`를 적용했습니다.
*   전역 레이아웃에서 하단 Navigation 바나 Modal 창들이 화면에 클리핑되거나 스크롤 시 위치가 틀어지는 문제를 방지하기 위해 Viewport 중심의 Layout(`h-screen`, Flexbox 등)과 고정 위치 Overlay 설계를 채택했습니다.
*   글로벌 알림 매니저인 `<AlarmManager />`를 레이아웃의 보이지 않는 영역에 배치하여, 애플리케이션 어디에서든 백그라운드 도착 알람 기능을 안전하게 처리하도록 구현했습니다.

### 3.5. 백그라운드 푸시 알림 및 스케줄링 (Web Push & QStash)
*   사용자가 앱을 종료하거나 백그라운드 상태에 있어도 정해진 시간에 정확히 도착 알람을 받을 수 있도록 **Web Push API**와 **Service Worker**(`public/sw.js` 등) 기반의 푸시 시스템을 도입했습니다.
*   **Upstash QStash**를 연동하여, `app/api/alarm/reserve` 라우트에서 사용자의 목표 시간에 맞춰 지연(Delay) 발송을 스케줄링하고, 해당 시간에 도달하면 `app/api/push` 라우트를 호출해 실제 푸시 메시지를 전송하는 아키텍처를 구현했습니다.
*   클라이언트 측 로컬 스토리지(`alarmStorage.ts`)와 연계하여 예약된 알람의 상태와 QStash 메시지 ID를 동기화, 알람 취소 및 목록 관리가 용이하도록 설계되었습니다.

### 3.6. 정적 데이터 통합 및 소요시간 자동 보정
*   기존에 개별적으로 사용되던 `stations.json`, `distances.json`, `stations_nm_alias.json` 세 개의 파일을 빌드 전 스크립트(`scripts/generate_subway_data.js`)를 통해 하나의 **통합 데이터 파일(`subway_data.json`)**로 병합하여 런타임 성능과 유지보수성을 극대화했습니다.
*   **소요시간 보정 로직(`adjust.json`)**: 특정 구간의 소요시간 데이터가 누락되어 있거나(`0:00`), 운영상의 이유로 조정이 필요한 경우, `adjust.json`에 정의된 노선별 총 소요시간(`tot_hm`)을 각 역의 기본 소요시간(`hm`) 비율에 따라 비례 배분하거나 구간에 맞게 균등 분배합니다.
*   경로 추적 시 열차의 이동 방향(정방향/역방향)을 `fr_code`의 증감으로 판단하고, 이에 맞춰 올바른 보정 시간(`adj_hm` 또는 `adj_hm2`)을 선택합니다. 모든 정차역마다 기본 30초의 정차시간을 더해 더욱 현실적인 예상 도착 시간을 산출하며, 데이터가 누락된 구간은 무리한 추정을 막기 위해 계산을 중단(알람 비활성화)하도록 구현했습니다.
### 3.7. 복잡한 노선(순환선 및 지선/분기) 예외 처리
*   **2호선 순환선 및 지선 대응**: 
    *   **무한 순환 로직**: 2호선 본선의 경우 경로 생성 시 시청역(201)과 충정로역(243)이 양방향에서 끊임없이 이어질 수 있도록, 데이터 배열을 내부적으로 2배로 확장하여 순환 경로를 지원합니다.
    *   **성수/신정 지선 필터링**: 목적지(`bstatnNm`)에 따라 본선과 지선(211-n, 234-n)을 명확하게 분리하고, 열차 운행 방향에 맞게 배열을 정렬하여 불필요한 경로가 노출되지 않도록 최적화했습니다.
*   **5호선 강동 분기(마천 방면 / 하남검단산 방면) 대응**:
    *   **경로 필터링**: 5호선은 강동역(548)에서 분기합니다. 열차 목적지를 판별하여 하남검단산 방면 열차일 경우 마천 지선 구간(P549~P555)을 경로 배열에서 완전히 제거하고, 마천 방면 열차일 경우 하남검단산 방면 본선 구간(549~558)을 깔끔하게 잘라냅니다.
    *   **소요시간(hm2) 분기점 강제 매핑**: 통합 데이터 빌드 시, 둔촌동역(P549)의 이전 역이 물리적 배열 인덱스가 아닌 강동역(548)임을 명시적으로 인지시키고, `distances.json`에서 해당 구간의 시간(1분 50초)을 직접 추출하여 `hm2` 필드에 정확하게 매핑하는 강제 예외 처리를 적용했습니다.

### 3.8. 사용자 지정 알람 및 고도화된 스토리지 관리 (Custom Alarm & Cleanup)
*   **사용자 지정 시간 알람 (Custom Alarm)**: 실시간 예상 도착 시간이 없거나(`--:--`) 사용자가 직접 특정 시간에 알람을 맞추고 싶을 때를 대비해, 직접 "+X분 후" 타이머 형태의 알람을 설정할 수 있는 기능(`CustomAlarmModal`)을 도입했습니다. 이를 위해 기존 알람 설정 코드를 `utils/alarmActions.ts`로 분리하여 모듈화 및 재사용성을 극대화했습니다.
*   **알람 일괄 삭제 및 서버 예외 처리**: 알람 목록을 한 번에 비울 수 있는 "전체 삭제" 버튼과 공통 확인 모달(`ConfirmModal`)을 추가했습니다. 삭제 진행 중 QStash 서버로부터 이미 처리된 메시지에 대한 404 에러가 반환되더라도, 프론트엔드 로컬 스토리지에서는 이를 조용히(Silently) 무시하고 화면 목록을 정상적으로 갱신하도록 예외 처리를 강화했습니다.
*   **아이폰(PWA) 로컬 상태 자연 삭제 (Auto Cleanup)**: 글로벌 `AlarmManager` 로직을 개선하여, 브라우저 로컬 알람뿐만 아니라 아이폰 환경의 QStash 푸시 알람들도 알림 예정 시간(`notifyAt`)이 1분 이상 지나면 사용자가 직접 지우지 않아도 로컬 스토리지 목록에서 자연스럽게 자동 삭제되도록 정리(Cleanup) 루틴을 보강했습니다. 앱이 종료된 상태여도 다음 번 앱 실행 시 즉각 정리됩니다.

## 4. 보안 아키텍처 및 하드닝 체계 (Security Architecture & Hardening)

본 애플리케이션은 Next.js App Router 및 PWA 환경에서 클라이언트와 서버리스 함수 간의 경계를 보호하기 위해 **4단계 보안 점검 및 하드닝(Hardening) 체계**를 완벽하게 적용하였습니다.

### 4.1. 엔드포인트 인가 및 엄격한 입력 유효성 검사 (Zod)
*   **엔드포인트 인가(Authorization)**: `app/api/push` 등 백엔드 서버리스 핸들러 호출 시 외부 임의 유저 파라미터나 조작된 식별자에 신뢰를 두지 않으며, Upstash 암호화 서명(`upstash-signature`) 등 철저한 인증 체계를 바탕으로 인가 작업을 수행합니다.
*   **Zod 스키마 검증**: `utils/apiValidation.ts`에 각 API 요청(Query Params, Path Variables, Body payload)에 대한 엄격한 Zod 스키마(`SubwayQuerySchema`, `AlarmReserveSchema` 등)를 정의했습니다. `safeParse`를 거친 안전한 데이터만 비즈니스 로직으로 유입되며, 유효성 검사 실패 시 즉각 HTTP 400 Bad Request 에러를 반환합니다.
*   **에러 위생화(Error Sanitization)**: 데이터베이스 쿼리나 공공데이터 API 통신 오류 발생 시 쿼리 구문 원문, raw 예외 데이터(`details`), 스택 트레이스 등을 브라우저 클라이언트 응답에 일절 노출하지 않습니다. 상세 내부 에러는 오직 서버 터미널 로그(`console.error`)에만 기록되며, 클라이언트로 전송되는 500 에러 문구는 `"요청을 처리할 수 없습니다."`로 위생화 통일되었습니다.

### 4.2. 환경 변수 관리 및 백엔드 자격증명 격리 (Zero-Leak)
*   **NEXT_PUBLIC_ 격리 준칙**: 서버 측에서 사용하는 외부 API 키(`SEOUL_SUBWAY_API_KEY`) 및 DB/서버 서명 자격증명(`QSTASH_TOKEN`, `VAPID_PRIVATE_KEY` 등)에는 클라이언트 번들로의 유출을 차단하기 위해 `NEXT_PUBLIC_` 접두사를 철저히 배제하고 순수 백엔드 서버 전용 변수로 격리하였습니다.
*   **배포 대시보드 관리(Vercel 준칙)**: Vercel 등 Production 배포 시 `SEOUL_SUBWAY_API_KEY`, `QSTASH_*` 토큰은 오직 Server Root Environment에만 세팅하며, Web Push 구독을 위한 VAPID 공개키(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`)만 클라이언트 노출 변수로 허용합니다.

### 4.3. PWA 로컬 스토리지 및 오프라인 캐시 보안 (Cache Purging)
*   **토큰 저장 장소 방어**: `localStorage` 및 `IndexedDB`에는 오직 일반 알람 목록, 역 이름 검색어 히스토리, UI 테마(`dark`/`light`) 등 비민감 데이터만 보관하며 토큰/민감 식별자 평문 보관을 차단합니다.
*   **오프라인 캐시 파기(Cache Purging)**: 데이터 초기화 및 전체 삭제 시 다른 사람의 조작이나 캐시 잔류를 막기 위해, `utils/cachePurging.ts` (`purgeSensitiveOfflineCaches`) 모듈을 구비했습니다. 알람 전체 초기화 또는 세션 클리어 시 `window.caches.delete`를 순회 호출하여 로컬 오프라인 캐시 스토리지까지 소각 및 청정 상태로 복구하며, 평상시 오프라인 PWA 서비스는 100% 원활히 구동되도록 분리 설계되었습니다.

### 4.4. Vercel 배포용 6대 강력 HTTP 보안 헤더 장착
*   `next.config.ts` 내의 CommonJS 구문을 청결히 제거하고 ES Module 타입스크립트 기반의 `async headers()` 구성을 완료했습니다.
*   **장착된 6대 HTTP 보안 헤더**:
    *   **Content-Security-Policy (CSP)**: PWA 서비스 워커 구동을 위한 `worker-src 'self' blob:;` 및 이미지(`img-src 'self' data: blob: https:;`), 폰트 및 맞춤 허용 도메인(`connect-src`, `script-src`)만 명시하여 XSS 차단 및 비정상 데이터 외부 송신 방어.
    *   **Strict-Transport-Security (HSTS)**: `max-age=63072000; includeSubDomains; preload`로 HTTPS 암호화 접속 강제.
    *   **X-Frame-Options**: `DENY`로 클릭재킹 및 iframe 감싸기 차단.
    *   **X-Content-Type-Options**: `nosniff` 적용을 통한 MIME 타입 스푸핑 차단.
    *   **Referrer-Policy**: `strict-origin-when-cross-origin`으로 민감 URL 경로 유출 방지.
    *   **Permissions-Policy**: 불필요한 하드웨어 접근 차단을 위해 `camera=(), microphone=(), geolocation=()` 강제 통제 적용.

### 4.5. PWA 이미지 캐싱 이원화 및 프로필 예외 방어 (Image Caching & Fallback UX)
*   **서비스 워커(`public/sw.js`) 캐싱 이원화 규칙**:
    *   **외부(Cross-Origin) 도메인 이미지 런타임 캐시 (우선순위 상단 배치)**: 구글 OAuth 아바타(`*.googleusercontent.com`) 등 외부 도메인 이미지(`request.destination === "image" && url.origin !== self.location.origin`)에 대해 **`StaleWhileRevalidate`** 전략을 적용하여 백그라운드에서 유연하게 갱신되도록 구성했습니다. Opaque(상태 코드 0) 응답 에러를 방지하기 위해 `CacheableResponsePlugin({ statuses: [0, 200] })`를 장착하고 최대 TTL을 30일로 제한했습니다.
    *   **내부(Self Origin) 불변 고정 자산 캐싱 (하단 유지)**: Next.js 빌드 자산(`/_next/static/**`), 내부 CSS/Script/Font, 앱 로컬 정적 이미지에는 1년짜리 **`CacheFirst`** 정책을 확정 적용하여 오프라인 즉각 로딩 및 제로 레이턴시를 구현했습니다.
*   **프로필 이미지 엑박(Broken Image) 방어벽 (`components/UserAvatar.tsx`)**:
    *   상단 헤더(`Header.tsx`) 및 프로필 영역에서 외부 사용자 이미지 도달에 실패(네트워크 단절, CORS 지연, 토큰 누락 등)하더라도 브라우저 기본 깨진 이미지 기호("?")가 노출되지 않도록 `onError` 상태 핸들러(`imgError`)를 장착했습니다.
    *   에러 또는 URL 공백 발생 시 앱 디자인 시스템과 완벽히 동화되는 세련된 유저 기본 아이콘(`account_circle`)으로 즉시 전환(Fallback)되도록 UI를 단단히 보강했습니다.

### 4.6. 앱 안내 모달 UI 고도화 및 로컬 캐시 업데이트/개인정보처리방침 연동
*   **헤더 안내 트리거 일원화 (`Header.tsx`)**: 기존의 별도 'i' 안내 버튼을 제거하고, 상단 좌측의 앱 아이콘과 'Subway Tracker' 타이틀 영역 전체를 클릭 가능한 버튼으로 통합하여 직관적인 모달 호출 UX를 구현했습니다.
*   **앱 안내 모달 브랜딩 일체화**: 기존 모달의 'i' 아이콘 및 '안내' 텍스트를 메인 화면 헤더와 동일한 앱 아이콘 및 'Subway Tracker' SVG 타이틀로 교체하고, 라이트/다크 모드에 맞춰 최적의 색상이 표현되도록 일원화했습니다.
*   **로컬 캐시 삭제 기반 "최신 버전 업데이트" 버튼**: `APP_CONFIG.INFO_MESSAGE` 바로 아래 줄 중앙에 최신 버전 업데이트 버튼을 배치하여, 클릭 시 `purgeSensitiveOfflineCaches()` 및 Service Worker 갱신을 통해 브라우저 캐시를 청소하고 최신 자산으로 즉시 리로드하도록 기능을 구현했습니다.
*   **모달 최하단 정보 바 (개인정보처리방침 & 버전)**: 모달 창 맨 아래 줄에 `@VERSION` 정보와 동일한 글꼴 규격으로 좌측에 "개인정보처리방침" 링크(`https://landing-doohee2.vercel.app/privacy`, 새 창 열림)와 우측에 버전 정보를 균형 있게 배치했습니다.
