# ADR-010 — PWA 최소구성 (manifest + Service Worker, dist 전체 precache)

- 상태: 승인
- 관련: [[ADR-004-github-pages-public-subpath]], [[ADR-008-visual-identity]], [[ADR-009-audio]]

## 맥락

배포 전엔 PWA 요건이 0이었다 — `manifest.webmanifest` 없음, SW 등록 없음, 설치 불가.
GitHub Pages 는 정적 호스팅이라 응답 헤더 커스터마이즈가 안 되고(`cache-control: max-age=600`
고정), 오프라인 재방문 보장이 HTTP 캐시 운에 맡겨져 있었다. 목표는 "온라인의 모든 기능을
오프라인에서도 동일하게" — 오디오·이미지 강등 없이 전량 오프라인 서빙.

## 결정

1. **`vite-plugin-pwa`(generateSW strategy) 채택.** injectManifest 대신 generateSW — 커스텀
   SW 로직이 필요 없고(라우팅/알림 등 0), workbox 기본 precache-and-route 로 충분.
2. **`registerType: 'prompt'`, `injectRegister: null`.** 새 SW는 조용히 대기만 하고
   자동 리로드 안 함 — 대국 중 판 소실 방지가 최우선(로컬 PvP 포함 진행 중 게임 상태는
   메모리에만 있고 중간저장 없음). SW 등록은 `injectRegister` 자동주입 대신
   `src/main.mjs` 에서 `virtual:pwa-register` 직접 import — 프로젝트의 단일 진입점
   규약(`<script>` 는 `<head>` 1개, `<body>` 스크립트 금지)을 그대로 따름.
3. **precache 범위 = dist 전체** (`globPatterns: '**/*.{js,css,html,ico,png,jpg,webp,svg,mp3,xml}'`).
   "오프라인 100% 패리티" 요구상 이미지·오디오 강등 불가라 셸만으론 부족. 개별 파일 전부
   workbox 기본 임계(2 MiB) 이내라 별도 상향 설정 불필요. 실측: **151 엔트리, 6,726 KiB**.
4. **manifest 필드**: `id`/`start_url`/`scope` 는 `/germ-warfare/` 리터럴 — [[ADR-004]] 의
   기존 base 하드코딩 컨벤션(`theme.css`, `assets.mjs` 등)과 동일 패턴 유지(리포명 변경 시
   일괄치환). `background_color`/`theme_color` 는 `#efeee7`(종이 배경, `theme.css`·
   `#loading` 게이트와 동일 토큰 — 스플래시→로딩 화면 색 불일치 없음). `display: standalone`.
   `orientation` 필드는 **의도적으로 생략** — 세로 강제는 이미 CSS(`#rotate-notice`,
   `theme.css` 미디어쿼리)가 담당 중이라 manifest 레벨 락은 중복이고, 데스크톱/태블릿
   가로 사용에 부작용 검증이 안 됐다.
5. **iOS 보강 메타**(`index.html`): `apple-mobile-web-app-capable`,
   `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, `theme-color`.
   iOS Safari 는 manifest 의 `display`/`theme_color` 를 그대로 안 읽어 별도 필요.
6. **폰트(Google Fonts CDN)는 이번 범위 밖.** cross-origin 이라 기본 `globPatterns` 로
   안 잡힌다 — 진짜 airplane mode 에선 서체가 폴백(`sans-serif`)으로 무너진다. self-host
   전환은 후속 커밋(라이선스 검토 완료: Dongle/Gugi 는 OFL 무-RFN, Orbitron 은 OFL+RFN —
   서브셋 대신 업스트림 원본을 무손실 woff2 변환해 RFN 유지 예정).
7. **아이콘은 기존 `public/icons/icon-192.png`·`icon-512.png` 재사용**, `purpose: 'any'` 만.
   maskable 변형은 없음 — Android 홈화면에서 흰 배경 원형 크롭 가능성, 후속 과제.
8. **`devOptions` 미설정**(dev 서버 SW 비활성 기본값 유지). 오프라인 검증은
   `npm run build && npm run preview` 로만 — 프로젝트 기존 검증 규약 그대로.

## 결과

- ✅ `manifest.webmanifest` + `sw.js`/`workbox-*.js` 자동 생성, `dist/index.html` 에
  `<link rel="manifest">` 자동 주입 확인.
- ✅ `npm run build`/`npm test` 통과. precache 151 엔트리(6,726 KiB) 실측 일치
  (`caches.open(...).then(c => c.keys())` → 151).
- ✅ **실브라우저(Safari) 오프라인 재현 2회 독립 검증** — preview 서버 강제 종료 후 재로드:
  (1) 대국 진행 중 화면(보드·말·마스코트·점수) 정상, (2) 타이틀 재진입 정상. Network 패널
  Initiator = service worker 확인.
- ⚠️ 폰트는 여전히 Google Fonts CDN 의존 — self-host 전까진 완전한 airplane mode 미검증.
- ⚠️ maskable 아이콘 없음 — 후속 과제로 남김, 지금 스코프에서 의도적으로 미구현.
- ✅ 업데이트 확인/적용 UI는 [[ADR-012-update-check-ui]] 로 구현 완료.
- ⚠️ `base` 하드코딩 13곳(`src/loading/assets.mjs` 등)은 이 ADR 범위 밖, 기존 컨벤션 유지.
