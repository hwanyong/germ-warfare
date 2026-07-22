# ADR-008 — 비주얼 아이덴티티 계승 + 반응형 재편

- 상태: 승인
- 관련: [[ADR-002-menu-not-lobby]], [[ADR-005-multiplayer-separate-app]]

## 맥락

기존 GameRoomSystem 프로토타입은 완성도 있는 비주얼 자산을 갖고 있다: "손그림 종이
보드게임" 미학(한지 텍스처 + Kenney cartography 프레임 + 굵은 먹선 카툰 세균 + Orbitron/
Gugi/Dongle + 커스텀 커서). 단 레이아웃은 Twitch 스트림 오버레이용 3열이고 모바일을 차단했다.

## 결정

- **아이덴티티를 그대로 계승**한다(신규 디자인 발명 안 함) — 에셋이 이미 다 있고 distinctive.
- **레이아웃만** 솔로 PvE·반응형으로 재편: 3열(채팅 오버레이) → 보드 중심 단일열, 모바일 포함.
- **실사용 에셋만 린하게 복사**(`public/assets/`, 20종): 세균 말·한지·커서·crosshair·프레임 4종·마스코트.
  전체 cartography 팩(150+)·twitch 로고·ship·AdSense 미복사.
- 팔레트·프레임·폰트를 **CSS 토큰화**(`theme.css`) — 기존 하드코딩 대비 재테마 가능.
- 커서는 우선 CSS `cursor: url()`(무JS); 그림자 애니 div 커서는 후속 폴리시.

## 결과

- ✅ 브랜드 일관성 즉시 확보, 디자인 비용 최소.
- ✅ 반응형 보드 레이아웃(`board.css`)이 P0 `src/render` 의 토대.
- ✅ `main.mjs` 스모크가 테마 적용됨(한지 배경·세균 말·프레임·폰트) — 배선 확인.
- ❌ 채팅/vote/스트리머-뷰어/twitch 잔재 전부 폐기(PvE엔 human vs AI뿐).
