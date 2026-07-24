# Germ Warfare — 디자인 가이드

> 비주얼 아이덴티티 SSOT. 결정 근거는 [`decisions/ADR-008-visual-identity.md`](decisions/ADR-008-visual-identity.md).
> 토큰 구현은 [`../src/styles/theme.css`](../src/styles/theme.css).

## 1. 아이덴티티 — "손그림 종이 보드게임"

기존 GameRoomSystem 프로토타입의 미학을 **그대로 계승**한다. sci-fi 아님. 4요소:

| 요소 | 실체 | 에셋 |
|---|---|---|
| 세균 말 | 굵은 먹선 카툰 블롭. **민트 그린(You) vs 코랄 핑크(AI)** | `cell-green.png` / `cell-pink.png` (+ `-sm`) |
| 배경 | **한지(mulberry paper)** 텍스처 타일 반복 | `paper.jpg` |
| 프레임 | **Kenney cartography** 손그림 border-image — 타일·버튼·패널을 액자화 (**시그니처**) | `frame/{thin,circle,square,arrow}.png` |
| 타이포 | **Orbitron**(숫자/점수) · **Gugi**(타이틀) · **Dongle**(본문 한글) | Google Fonts |
| 커서/인터랙션 | 손그림 커스텀 커서 · 버튼 hover 확대/active 축소 · ripple 로딩 | `cursor/*` |

## 2. 토큰 (theme.css)

```
--ink #2a2a2a   --p1 #3add8d(You/그린)   --p2 #f9606f(AI/핑크)   한지 배경
--frame-thin(타일) --frame-circle(버튼) --frame-square(패널)
--font-num Orbitron  --font-title Gugi  --font-body Dongle
```
색 hex는 스프라이트에서 근사 추출 — P0에서 정밀 샘플 후 확정.

## 3. 레이아웃 전환 (3열 오버레이 → 보드 중심 반응형)

기존은 Twitch 스트림 오버레이용 3열(플레이어 채팅 | 보드 | 라이벌 채팅), 모바일 차단.
데모는 **보드 중심 단일열 + 반응형**(모바일 포함 — 도달률):

```
┌───────────────────────────┐
│   🟢 You  12 : 8  AI 🔴    │  컴팩트 HUD (턴 표시)
│   ┌───────────────────┐   │
│   │   보드 7×7 정사각   │   │  min(92vmin,560px), 화면 채움
│   └───────────────────┘   │
│   [설정]        [메뉴]     │
└───────────────────────────┘
```

## 4. 에셋 처리 (생존 / 전용 / 폐기)

- ✅ **생존**: 세균 말, 한지 배경, 커서, crosshair(합법수 표시), 손그림 프레임(실사용 4종),
  폰트, 보드 grid·score 뱃지·START 버튼·ripple.
- 🔄 **전용**: 세팅폼(VS+타이머+START) → 난이도/스테이지 선택 · `alien_walk` 뷰어 → 마스코트 세균.
- ❌ **폐기**: 채팅 패널·vote UI·cuttingline · 스트리머/뷰어(viewerCrowd) · twitch 로고/색·AdSense ·
  ship 아바타 · 3열 레이아웃 · cartography 나머지 100+개(미복사).

## 5. 복사된 에셋 (`public/assets/`, 린 20종 · 232K)

```
cell-{green,pink}.png, cell-{green,pink}-sm.png, dome.png, paper.jpg
cursor/{pointer3D,hand,pointerFlat}(+_shadow).png
crosshair/{aim-move,aim-clone}.png
frame/{thin,circle,square,arrow}.png
mascot/germ-{green,pink}.webp
```
전체 팩(150+)이 아니라 **실사용만** 복사(린 유지). twitch/ship/AdSense 제외.

## 6. 화면별 적용 (P0~)

- **타이틀/메뉴**: Gugi "세균전" + 마스코트 세균 + 원형 프레임 버튼 `[시작][스테이지][설정]`.
- **난이도 선택**: 세팅폼 프레임 재활용, Easy/Normal/Hard 카드(그린/핑크 아트), "vs AI".
- **보드**: `frame-thin` 타일 + `cell` 소유 표시 + hover 시 crosshair(합법수만) + AI 턴 핑크 자동착수 +
  감염 뒤집기 애니(cell 스케일).
- **결과**: score 뱃지 확대 + 승자 세균 + `[재대결]`.

## 7. 애니메이션 (구현됨 — src/render/fx.mjs, src/styles/fx.css)

### 이동 (우주선 + 레이저)
각 진영은 UFO 탄 세균 캐릭터(`ship/ship-p1|p2.png`)를 홈(상단/하단 중앙)에 둔다.
한 수 = `playMove(board, {team, pos, onImpact})` 시퀀스 (WAAPI Promise 순차):
1. 홈 → **타겟 셀 상공**("공중")으로 이동 (460ms, ease)
2. **레이저 하강** (팀색 그라디언트 빔, scaleY 130ms) + 총구/착탄 **스파크**(`laser/burst-*.png`)
3. **착탄 = onImpact** → `map.setField` → 세균 **pop** 생성 (감염 반영 재동기화)
4. **귀환** (460ms). idle 시 ship-bob 으로 부유.

### 세균 idle 울렁임
- **외곽선 울렁**: SVG `feTurbulence`+`feDisplacementMap`(`#germ-wobble`, baseFrequency SMIL 애니) →
  래스터 블롭 외곽선이 유기적으로 undulate. `installFx()` 가 1회 주입.
- **숨쉬기**: CSS `germ-breathe`(scale 1↔1.055), per-cell `animation-delay` 랜덤 위상.
- `prefers-reduced-motion: reduce` 시 전부 off.

> 데모(`main.mjs`)가 이 애니를 셀프플레이로 시연. P0의 `src/render`/`src/match` 가
> 클릭 인터랙션에 `playMove` 를 연결한다(합법수 hover=crosshair → 클릭 → playMove → setField).

## 8. 사운드 (구현됨 — src/audio, ADR-009)

톤 = **카툰 + 레트로 SF 혼합**(손그림 아이덴티티의 청각판). ElevenLabs 생성,
`public/assets/audio/` 13종(~3.2MB), 전부 `src/audio/manifest.mjs` 등록(SSOT). 전 항목 배선 완료:

| 에셋 | 트리거 (배선 지점) |
|---|---|
| `bgm-main` | play/result 제외 전 씬 메인 테마 — 씬 매핑 `SCENE_BGM`(main.mjs), 첫 유효 제스처 후 발음 |
| `bgm-battle` | play 씬 전용 전투 루프 — 씬 전환 시 페이드 교체, result 는 BGM 무음(징글만) |
| `sfx-launch/laser/impact` | `playMove`/`playJump` onPhase — 귀환은 launch 저피치, 트랙터빔은 laser 저피치 재활용 |
| `sfx-spawn` / `sfx-infect` | play 씬 onImpact/onDrop 생성 pop / postMove 뒤집기 diff>0 시 1회 |
| `sfx-select` / `sfx-invalid` | play 씬 소스 세균 선택 / 소스 선택 상태에서 비합법 타겟 클릭 |
| `sfx-turn` | play 씬 내 턴 시작(AI 턴 무음 — N:N 스팸 방지) |
| `sfx-button` | 전 씬 `.btn` 클릭(document 위임 1곳, main.mjs) |
| `jingle-win` / `jingle-lose` | result 씬 마운트 시 승/패 분기 |

사운드 켬/끔 = 설정 씬(`settings.sound`), localStorage `gw-settings`
(`src/storage/settings.mjs`). 씬→BGM 매핑은 SceneManager `onEnter` 훅으로 main.mjs 가 담당.
튜토리얼 미니보드는 fx 파이프 미사용이라 범위 밖. `prefers-reduced-motion` 과 비커플링 — ADR-009.

## 9. 미래 폴리시 (선택)

- CSS 커서 → 그림자 포함 애니 div 커서(기존 방식) 승격.
- 축 라벨(A–G / 0–6) 재도입.
- 이동(JUMP) 시 원본 세균 소멸 모션, 사운드, 우주선 오프보드 파킹(현재 홈이 보드 가장자리와 겹침).
