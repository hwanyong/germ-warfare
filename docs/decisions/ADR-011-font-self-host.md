# ADR-011 — 폰트 self-host (Google Fonts CDN 제거)

- 상태: 승인
- 관련: [[ADR-008-visual-identity]], [[ADR-010-pwa-offline-shell]]
- 근거 문서(외부 검증 가능): [[../FONT-LICENSE-AUDIT]]

## 맥락

[[ADR-010]] 로 SW 전량 precache 를 갖췄지만, 폰트(Dongle/Gugi/Orbitron)는 여전히
`fonts.googleapis.com`/`fonts.gstatic.com` cross-origin CDN 의존이라 SW 기본 설정으로
안 잡힌다 — 진짜 airplane mode 에선 서체가 폴백(sans-serif)으로 무너진다. self-host 만이
근본 해결. 단, 서체 3종 전부 SIL OFL 1.1 이라 라이선스 검토가 선행돼야 했다
(상세 근거·1차 출처 인용은 [[FONT-LICENSE-AUDIT]] 참조 — 이 ADR 은 결정만 요약).

## 결정

1. **Google Fonts CDN 완전 제거.** `index.html` 의 preconnect/stylesheet `<link>` 3줄 삭제.
   `google/fonts` GitHub 리포(각 폰트 저작권자가 공개한 1차 소스)에서 원본 `.ttf` 직접 수급.
2. **서브셋 없이 무손실 포맷 변환만**(ttf→woff2, fontTools). Google 이 주는 unicode-range
   분할 서브셋(376파일, 2.43MB)보다 **오히려 작다**(5파일, 918,392 B) — 파일당 헤더/사전
   중복이 없어서. 글리프·OpenType 기능(GSUB/GPOS/fvar 등) 전량 보존 확인(DSIG 서명만
   웹폰트 변환 표준 관행대로 제거).
3. **Orbitron 은 내부 name 테이블을 `GW Orbitron` 으로 전면 개명**(family/full/PostScript/
   가변폰트 named-instance 전부). 저작권자가 지정한 Reserved Font Name 이 있는 유일한
   폰트라 — 라이선스 3항이 규제하는 대상("사용자에게 제시되는 주 폰트명")을 아예 없앤 것.
   저작권 고지(RFN 선언문 포함)·라이선스·저작자 정보는 name 테이블에 그대로 보존.
   Dongle/Gugi 는 RFN 자체가 없어 원명 그대로 유지.
4. **파일 배치**: `public/assets/fonts/`(기존 asset 하드코딩 컨벤션과 동일 패턴,
   `/germ-warfare/assets/fonts/...`). 폰트별 `*-OFL.txt` 원본 라이선스 전문 동봉.
5. **`@font-face`**: `theme.css` 에 5개 정의(Dongle 3웨이트 개별, Gugi 1, Orbitron variable
   `font-weight: 400 900` 범위 1개). `font-display: swap`.
6. **`docs/FONT-LICENSE-AUDIT.md` 신설** — 조사 근거·1차 출처 인용·재현 커맨드를 전부 담아
   **외부에서 검증 가능**하게 함. Credits 화면에서 이 문서로 직접 링크(게임 내 도달 가능).
7. **[[ADR-010]] §6 후속 과제 해소**: `vite.config.js` workbox `globPatterns` 에 `woff2`/`txt`
   추가 — 폰트도 dist 전체 precache 대상에 포함(오프라인 100% 패리티, PHASE 목표 충족).

## 결과

- ✅ 외부 origin 의존 0 — SW precache 만으로 서체까지 완전 오프라인.
- ✅ Google 서브셋보다 작음(918,392 B vs 2,433,088 B) — precache 예산 오히려 감소.
- ✅ 글리프·스마트폰트 기능·품질 무손실(실측 검증, [[FONT-LICENSE-AUDIT]] §4).
- ✅ 라이선스 리스크 해석에 기대지 않고 조건 자체를 제거(Orbitron 개명) — 외부 검증 가능한
  근거 문서로 뒷받침.
- ⚠️ `warmFonts()`(`src/loading/preload.mjs`) 의 기존 주석이 "구글폰트 서브셋 지연로드"를
  근거로 들었으나, 단일 파일 self-host 로 그 문제 자체가 소멸 — 주석을 실제 잔존 목적(첫
  네트워크 요청 조기 발생)으로 정정. 폰트명도 `GW Orbitron` 으로 갱신.
