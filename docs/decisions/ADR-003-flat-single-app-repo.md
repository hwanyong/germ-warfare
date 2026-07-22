# ADR-003 — flat 단일 앱 저장소 (모노레포 아님)

- 상태: 승인
- 관련: [[ADR-005-multiplayer-separate-app]], [[ADR-007-rules-ssot]]

## 맥락

"하나의 repo로 통합"이 요구됐다. Helldyinger는 pnpm 모노레포(apps/ + 14 packages +
WASM + codegen + 컨테이너 워크트리)지만 그건 성숙한 멀티플레이 슈터의 **완성형**이다.
이 프로젝트는 0유저·단일 앱·시작 단계.

## 결정

**"1 repo ≠ 패키지 모노레포".** flat 단일 앱으로 간다. pnpm workspace / 다중 패키지 /
WASM / worktree / codegen / arch-lint **없음**. 규칙 엔진은 순수 폴더(`src/game`)로 직접 import.
서버(2번째 소비자)가 실제로 생길 때 공유 모듈로 승격(규칙 3의 법칙).

## 결과

- ✅ 툴체인 세금 0으로 "빨리 플레이 가능한 데모" 목표에 부합.
- ✅ `src/game` 을 순수·무의존으로 유지하는 규율(무료)만으로 미래 승격이 재작성 아닌 이동이 됨.
- 반례로 고려됐던 "지금 game-logic 패키지화"는 소비자가 하나뿐이라 마찰만 추가 → 기각.
