# ADR-007 — 규칙 엔진 SSOT (map.mjs)

- 상태: 승인
- 관련: [[ADR-003-flat-single-app-repo]], [[ADR-006-anticheat-scope]]

## 맥락

세균전(Ataxx) 규칙의 실제 구현이 두 곳에 있었다:
- `GameRoomSystem/.../modules/map.mjs` — **유일한 실제 작동 엔진** (347줄, Field/Map,
  체비쇼프 related-fields, #calcScore risk, CLONE/MOVE, infect, #count).
- `germ_warfare/cli/core/game/map.mjs` — **빈 stub** (`calculate(){ }`, `infect(){ }`).
  같은 repo의 ai-worker/score-worker는 연속좌표 슈터용(타 장르), player.mjs는 float 좌표.

## 결정

- **`GameRoomSystem/map.mjs` 를 SSOT로 채택**, `src/game/map.mjs`로 순수 추출.
- `germ_warfare/cli` 는 **폐기**(core 전부 사장). `case_01.json` 만 테스트 픽스처로 salvage.
- 추출 시 변경:
  1. `class Map` → `class GameMap` (전역 `Map` 섀도잉 제거)
  2. `Math.random` 타이브레이크 → 시드 PRNG (ADR-006)
  3. Twitch/네트워크 의존 제거 → 순수 규칙 (I/O 0)
  4. `constants` 에서 `STATE.MESSAGE.CHAT/VOTE` 제거

## 결과

- ✅ 규칙 코드 1벌. 클라이언트·AI·(미래)서버가 동일 코드 사용.
- ✅ `node --test src/game/test/` 로 추출 동작 + 결정성 검증(미배선/미구현 0).
- ⚠️ `case_01.json` 은 픽스처로 보관하되, 규칙 세부(체비쇼프/타이브레이크)와의 정합은
  P1에서 재확인 후 회귀 오라클로 채택.
- 원본 `GameRoomSystem`/`germ_warfare/cli` 는 provenance 아카이브로 남긴다(삭제 아님).
