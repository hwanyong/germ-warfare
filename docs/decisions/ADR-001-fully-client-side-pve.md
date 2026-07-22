# ADR-001 — 완전 클라이언트 사이드 PvE

- 상태: 승인
- 관련: [[ADR-005-multiplayer-separate-app]], [[ADR-002-menu-not-lobby]]

## 맥락

원본(GameRoomSystem)은 게임을 fork-per-room 자식 프로세스 + websocket 으로 서버에서
돌렸고, 게임 상태를 브라우저로 되돌리는 리턴 경로가 구조적으로 막혀(살아있는 websocket을
자식 프로세스 IPC로 못 넘김) 실제 게임 루프가 미배선이었다. PvE는 서버 심판이 필요 없다.

## 결정

게임을 **100% 브라우저에서** 실행한다. 규칙 엔진(`src/game`)과 AI 상대가 모두 클라이언트.
플레이 루프에 서버 왕복이 없다. Helldyinger `training-ground`(클라이언트 권위 `LocalAuthority`)
패턴과 동일.

## 결과

- ✅ 원본의 fork/websocket 리턴 구조 난제를 **원천 우회**.
- ✅ 서버 인프라 0으로 첫 완주 도달.
- ⚠️ 클라이언트는 적의 손안 → 로컬 치팅 원천봉쇄 불가. 데모라 무방(ADR-006).
- AI는 메인스레드(7x7 얕은 탐색엔 충분). 깊은 탐색 오프로드는 필요 시 후순위.
