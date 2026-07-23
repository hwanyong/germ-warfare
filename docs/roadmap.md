# Roadmap — germ-warfare

> 작업 순서 SSOT. 다른 AI/개발자가 이 문서로 방향을 파악하고 이어간다.
> 결정 근거는 `decisions/` ADR, 아키텍처는 `architecture.md`, 에셋은 `assets.md`.

## 세계관

우주인(세균 유닛)이 지구 인간 마을을 침공해 영역을 다투는 **Ataxx 영토전**.
무료 싱글 PvE 웹 게임 데모. 멀티/상점 = **별도 앱**(ADR-005).

## 이미 완료 (baseline)

- 저장소/배포: flat 단일앱, GitHub Pages 자동배포(`main` push → build+test → deploy).
- 규칙 엔진 `src/game`: Ataxx `GameMap`(순수·무의존, 시드 결정적). 테스트 통과.
- 디자인: "손그림 종이 보드게임" 아이덴티티, 반응형 보드, 테마 토큰.
- 이펙트 `src/render/fx.mjs`: Ship 게임오브젝트, 레이저 빔/스파크/플래시, 세균 idle 울렁(desync).
- 로딩 게이트(preload) + 진행률.
- 에셋 라이브러리 전량 + 카탈로그(`assets.md`, 114개).
- **현 상태 = 셀프플레이 데모.** 인터랙션·AI·씬흐름·스테이지 없음. 엔진 2팀·7×7 하드코딩.

## 엔진 선결 과제 (해당 페이즈에서 함께)

- **E1 legalMoves(team)** — 합법 타겟 열거(hover crosshair/클릭검증/AI). `#calcScore`가 셀별 attack 가부 이미 계산 → 노출만.
- **E2 terminal + winner** — 보드 꽉참 / count[team]==0 / 합법수 0 → 게임오버+승자. (현재 win 판정 없음, Result 씬 전제)
- **E3 simulateMove** — 보드 딥클론 후 적용(AI lookahead). (in-place setField뿐이라 신규)

---

## 작업 순서 (재구성)

### PHASE A — 씬 뼈대 + 엔진 갭  [3-1]
- **A1 씬 매니저**: Scene 추상 + 레지스트리. 씬 = **Title → StageSelect → Play → Result → Settings**.
  흐름: `[시작화면]→(시작)→[스테이지선택]→(선택)→[플레이]→(종료판정)→[결과]→(재대결/스테이지선택/메뉴)`.
- **A2 엔진 E1(legalMoves) + E2(terminal+winner)** — Play 검증 + Result 전제.
- **A3 Stage 데이터 최소형**: 스테이지를 **데이터로**(grid 7×7 + 코너 시드) 1개 정의. 하드코딩 금지 → item 2로 확장 가능.
  - 참고: **StageSelect는 지금 1개 스테이지만** 표시(추후 다수).

### PHASE B — 인터랙티브 플레이  [3-2 / 3a]
- **B1 Play 보드**: 타일/세균 렌더(기존) + 클릭 소스 선택 + hover 합법타겟 → **crosshair 2종**
  (거리1=`aim-clone` / 거리2=`aim-move`, 룰과 대응) + **cursor 상태**(기본/포인터/액티브).
- **B2 TurnManager**: human 턴 → `setField`(+기존 레이저/ship fx) → AI 턴(**스텁 = 엔진 `getMoveTarget`**) → 반복 → E2 종료 → Result.
- **B3 move-log 기록**(append-only) — 치팅방지 인에이블러 선적립(ADR-006). 값싸므로 여기서.

### PHASE C — 전 에셋 쇼케이스  [3-3 / 3b]
- **C1 cartography 마을 배경 레이어**: 스테이지 데이터대로 셀 아래 건물 배치 → **점령 시 파괴 스왑**(ruins/skull, `assets.md` 활용) + **infect 뒤집기 애니**.
- **C2** 프레임/커서 전상태, Result 폴리시(승자 세균, score 뱃지). → "모든 에셋 쓸모 시연" 완성.

### PHASE D — AI + 3난이도  [3-2]
- **D1 엔진 E3(simulateMove)**.
- **D2 AI**: legalMoves→simulate→eval(말수차+infect이득+risk+mobility+코너)→negamax+αβ.
- **D3 3난이도**(깊이/휴리스틱/블런더율/think-time) + 시드 블런더 무작위. StageSelect/Settings에서 선택.
- ── 여기까지 = **"플레이 가능 + 전 에셋 시연 + 난이도 있는 PvE"** 완성 (item 3 종료) ──

### PHASE E — 스테이지/맵 다양·스토리  [item 2]
- **E1 Stage 스키마 확장**: grid 크기/형태, blocked 칸, N 시드, 배경 배치, objective, story 인트로.
- **E2 map.mjs 그리드 완전 파라미터화**(dims+blocked). (관련필드=체비쇼프라 직사각 자연 일반화)
- **E3 다수 스테이지 + 진행저장**(localStorage append-only, ADR-006) + StageSelect 확장. 맵 변주/스토리 훅.

### PHASE F — 광고 슬롯  [3-3, 연기]
- **F1** 씬 흐름(A1)에 **매치 종료 후 광고 슬롯 훅**(interstitial/reward)만 배치. **실제 통합은 나중**:
  광고계정·정책승인·**동의 배너(GDPR)** 필요, 재미 검증 후. (계정 셋업 = 유저 몫)

### PHASE G — N:N  [item 1, 마지막]
- **G0 의도 확정**: N:N = 1인 vs 다수 **AI**(프리포올, 이 데모 잔류) vs 다수 **인간**(→ 별도 멀티앱, ADR-005).
- **G1**(잔류 시): 엔진 팀 일반화 — `USERS(2)`→`TEAMS[](N)`, `#rival`→others(), count/score/infect/win N팀, 라운드로빈 턴, N 시드.

## 별도 앱으로 이관 (ADR-005/006)

PvP 멀티플레이 · 스킨 상점/통화 · 서버 권위 치팅방지(move-log 재시뮬). 이 데모 밖.

## 순서 근거 (요약)

3(A~D)이 유일하게 "지금 플레이/시연 가능"하게 만들고 1·2가 꽂힐 seam(씬/턴/보드/배경 훅)을 만든다 →
엔진 리스크 최소(3<2<1) → 2의 그리드 일반화가 1의 팀 일반화보다 안전한 선행 → 1은 데모 필수도 최저+멀티앱 긴장이라 최후.
