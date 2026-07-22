# Germ Warfare — 아키텍처

> 이 문서는 프로젝트 정체성·전략·구조의 SSOT다. 개별 결정의 근거는
> [`decisions/`](decisions/) ADR 참조.

## 1. 게임

**세균전 = Ataxx(감염 영토전).** 7x7 그리드, 2팀이 각자 코너 2칸에서 시작.
한 수 = 빈칸 점령:

- **CLONE**: 인접(체비쇼프 거리 1) 아군이 있으면 새 말 복제 — 원본 유지 (+1)
- **MOVE / JUMP**: 거리 2 아군을 이동 — 원본 제거 (순증 0)
- **INFECT**: 점령 직후 새 칸의 8방향 적 말을 모두 뒤집음

보드가 꽉 차거나 한 팀이 0이 되면 종료, 다수 칸 승리.

규칙 엔진은 `src/game/map.mjs`(`GameMap`)에 있으며 **순수·무의존(I/O 0)**. 이 코드가
클라이언트(플레이), AI(탐색), 그리고 미래 서버(재시뮬 검증)의 **단일 진실원(SSOT)**.

## 2. 전략 — 두 개의 앱

이 저장소는 **딱 하나**를 만든다: **무료 싱글 PvE 웹 게임 데모.**

```
┌─ 앱1 (이 repo): 무료 싱글 PvE 데모 ─┐   자산 이식   ┌─ 앱2 (미래, 별도 repo) ─┐
│ 100% client-side, 서버 0            │ ──────────▶ │ 멀티플레이 + 상점(스킨)  │
│ GitHub Pages 정적 배포, 공개        │  규칙·AI·렌더 │ 서버 권위 · 통화 · 결제   │
│ 치팅방지 ≈ 0 (자기 세이브 = 자해)   │             │ (착수 시 별도 분석)      │
└─────────────────────────────────────┘             └──────────────────────────┘
```

- 멀티플레이어/상점은 **이 코드베이스에 붙이지 않는다** — 완전 별도 앱으로 재개발.
  그래서 이 repo는 서버·통화·복잡한 치팅방지를 **미래대비할 필요가 없다** (ADR-005).
- 이 데모의 역할: 재미 검증 + 포트폴리오/유입 + **앱2가 물려받을 규칙/AI/렌더 자산**의 검증장.
- 관객·재미가 증명되면 앱2(유료 멀티)로 수익화. 인디 정석.

## 3. 배포 / 저장소

- **새 공개 repo `germ-warfare`** (기존 private `GameRoomSystem`/`germ_warfare/cli` 는 아카이브).
- **GitHub Pages 프로젝트 페이지** → `https://hwanyong.github.io/germ-warfare/` (하위경로).
  `vite.config.js` `base: '/germ-warfare/'`. `.github/workflows/deploy.yml` 이 자동 빌드·배포.
- **flat 단일 앱** — 모노레포/패키지 아님. 소비자가 하나뿐(브라우저)이라 패키지 분리는 과설계.
  앱2(2번째 소비자)가 실제로 생길 때 규칙 엔진을 공유 모듈로 승격(복사 또는 npm 배포). (ADR-003)

## 4. 구조

```
germ-warfare/
├── index.html                # SPA 셸
├── vite.config.js            # base:'/germ-warfare/'
├── .github/workflows/deploy.yml
├── public/assets/            # 보드 스프라이트/아이콘 (GameRoomSystem public/lib 에서 salvage)
├── docs/                     # 이 문서 + ADR
└── src/
    ├── main.mjs              # 진입점 (현재 규칙 엔진 스모크; P0에서 실게임 부팅)
    ├── game/     ★이식자산   # 규칙 엔진 SSOT — map.mjs(GameMap), constants, rng, index, test
    ├── ai/       ★이식자산   # PvE 상대 (메인스레드; legalMoves+simulate+eval+negamax)
    ├── render/   ★이식자산   # 보드 렌더
    ├── menu/                 # 시작 / 스테이지 선택 / 설정 (로비 대체)
    ├── match/                # 턴 루프 드라이버 (human ↔ AI)
    └── storage/              # localStorage (설정 / 스테이지 진행)
```
★ = 앱2로 이식되는 자산. `menu/match/storage` 는 데모 전용.

## 5. PvE 설계 (Helldyinger `training-ground` 벤치마크)

동일 개발자의 성숙 프로젝트 Helldyinger(ashfront)의 PvE 패턴을 채택:

- **PvE = "네트워크 없는 씬 + 클라이언트 권위"** — 서버 왕복 0, 브라우저에서 규칙+AI 실행.
- AI가 상대팀(USER1)을 잡는다. AI 한 수 = `legalMoves` → `simulateMove`(보드 딥클론) →
  `eval`(말 수 차 + 감염 이득 + risk + mobility) → negamax/alpha-beta.
- **3난이도 = 데이터 + 파라미터** (인프라 아님): 탐색 깊이 + 휴리스틱 풍부도 + 블런더율 + think-time.
  - Easy: depth-0 그리디/랜덤, 즉시 flip 최대, 블런더 ~35%
  - Normal: depth 1~2 minimax, 말수차+risk회피, 블런더 ~10%
  - Hard: depth 3~4 negamax+αβ, +risk맵+mobility+코너, 블런더 ~0%
- 안 베낄 것: C++ 권위서버·룸서버·매치메이킹·Cloudflare 터널·WASM·워크트리·codegen — 전부 앱2/과잉.

## 6. 치팅방지 범위

이 데모는 **client-side + 무료 + 통화 없음** → 인스펙터로 스테이지 위조/룰 무력화가
가능하지만 **자기 세이브 조작 = 자해**라 방어 대상이 아니다. 클라 난독화·무결성체크는 금지(보안극장).

지금 하는 유일한 일 = **규칙 엔진을 시드 결정적으로** 만들기(`map.mjs` 타이브레이크 PRNG).
이유는 치팅방지가 아니라 (a) 데모 재현/디버깅 (b) 앱2 서버 권위 재시뮬의 전제. 통화/구매/PvP
치팅방지는 전부 앱2 소관. (ADR-006)

## 7. 로드맵

| 단계 | 내용 | 게이트 |
|---|---|---|
| **P0** | 메뉴 + 보드 렌더 + human 로컬 플레이 (`src/game` 직결) | 타일 클릭이 실제 보드 갱신 |
| **P1** | AI 엔진(legalMoves/simulate/eval/negamax) + 턴매니저 + 종료판정 | AI 상대로 한 판 완주 |
| **P2** | 3난이도 데이터 프로파일 + 스테이지 선택 | Easy/Normal/Hard 체감차 |
| **P3** | 진행/전적 localStorage (append-only) | 새로고침 후 유지 |
| later | 맵 다양성 (그리드/막힌칸 파라미터화) | 맵 여러 종 |
| **앱2** | 멀티 + 상점 = 별도 repo. 이 repo의 game/ai/render 이식 | — |

## 8. 계보 (이 repo가 온 길)

- **원본**: `GameRoomSystem`(2023) — 세균전을 Twitch 스트리머/시청자 채팅 게임으로. `map.mjs`
  규칙 엔진은 여기서 태어남. 채팅→게임 리턴 경로는 fork-per-room IPC 한계로 미배선.
- **곁가지**: `germ_warfare/cli`(2024) — 재설계 시도. core/ 엔진은 stub·타장르 AI라 **폐기**.
- **현재**: Twitch/멀티룸/채팅 전부 버리고 규칙 엔진만 추출 → client-side PvE 데모로 수렴.
