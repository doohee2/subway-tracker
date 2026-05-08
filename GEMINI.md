# Subway Tracker (지하철 실시간 도착 정보 조회 프로그램)

본 문서는 현재 작업 중인 `Subway Tracker` 프로젝트의 워크스페이스 분석 결과를 바탕으로, 프로젝트 구조, 개발 환경, 주요 프로그래밍 방법론을 정리한 것입니다.

## 1. 프로젝트 개요 및 구조

이 프로젝트는 서울 지하철의 실시간 도착 정보 및 경로 정보를 제공하는 웹 애플리케이션으로, 최근 PWA(Progressive Web App) 최적화와 알림 기능이 강화되었습니다. 

### 핵심 디렉토리 구조
```text
/subway tracker/
├── app/                  # Next.js 14+ App Router 폴더 (페이지 및 라우팅 로직)
│   ├── alarms/           # 알림 관련 페이지
│   ├── api/              # API 라우트 (프록시 서버, 서울 지하철 실시간 데이터 조회용)
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
│   ├── config.ts         # 공통 설정
│   ├── subwayColors.ts   # 지하철 노선별 고유 색상(헥스코드 등) 정의
│   └── subwayData.ts     # 지하철 API 연동 혹은 가공을 위한 공통 로직
├── types/                # TypeScript 인터페이스 및 타입 정의
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

### 3.4. 디자인 & UI (다크 모드 기본 지원)
*   `app/layout.tsx`에서 최상단 `<html>` 태그에 `className="dark"`를 적용하여 시스템 기본으로 세련된 **다크 모드**를 지원합니다.
*   전역 레이아웃에서 하단 Navigation 바나 Modal 창들이 화면에 클리핑되거나 스크롤 시 위치가 틀어지는 문제를 방지하기 위해 Viewport 중심의 Layout(`h-screen`, Flexbox 등)과 고정 위치 Overlay 설계를 채택했습니다.
*   글로벌 알림 매니저인 `<AlarmManager />`를 레이아웃의 보이지 않는 영역에 배치하여, 애플리케이션 어디에서든 백그라운드 도착 알람 기능을 안전하게 처리하도록 구현했습니다.
