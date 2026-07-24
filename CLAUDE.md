# germ-warfare — 프로젝트 규약

세균전(Ataxx) client-side PvE 웹 게임 데모. 상세는 `docs/architecture.md`, `docs/design.md`, `docs/decisions/`.
**작업 순서 = `docs/roadmap.md`** (다음 할 일은 여기서 확인).

## HTML 규약 (필수)

- **`<script>` 는 무조건 `<head>` 안에 둔다. `<body>` 안 script 절대 금지.**
- **`<script>` 는 기본으로 `defer` 사용** (`<script type="module" defer src="...">`).
- CSS `<link>` 도 `<head>`.

## 아키텍처 규약

- **flat 단일 앱** — 모노레포/패키지 아님 (ADR-003).
- **`src/game` = 규칙 엔진 SSOT** — 순수·무의존(I/O 0). 클라·AI·(미래)서버가 동일 코드 사용. inline 재구현 금지.
- 규칙의 무작위는 시드 PRNG(`src/game/rng.mjs`)로만 — `Math.random` 직접 사용 금지(결정성).
- **이식 자산**(`src/game`, `src/ai`, `src/render`)은 순수·클린 유지 — 미래 멀티플레이 앱이 재사용(ADR-005).
- 에셋은 `public/assets/`. 활성(배선) 에셋은 린하게, 배경/이펙트 라이브러리(cartography 등)는 별도 보관.
  **에셋 고를 땐 이미지 재분석 말고 [`docs/assets.md`](docs/assets.md) 카탈로그 참조**(114개 상세 묘사·구별점).
- 오디오 에셋(`public/assets/audio/`)은 **`src/audio/manifest.mjs` 등록 필수** (ADR-009).

## 배포

- GitHub Pages 프로젝트 페이지, base `/germ-warfare/` (`vite.config.js`).
- `main` push → `.github/workflows/deploy.yml` 자동 빌드(+`npm test` 게이트)·배포.
- `dist` 커밋 금지.

## 검증

- 변경 후 `npm test` + `npm run build`. 런타임/애니 변경은 `npm run preview` 로 브라우저 실동작 확인.
