# ADR-009 — 오디오 (Web Audio + 생성 파이프라인)

- 상태: 승인
- 관련: [[ADR-005-multiplayer-separate-app]], [[ADR-008-visual-identity]]

## 맥락

데모에 소리가 전혀 없었다. BGM/SFX 에셋은 ElevenLabs MCP(`text_to_sound_effects`,
`compose_music`)로 생성한다. 어디에 어떤 스택으로 배선할지, 이식 자산(`src/render` 등)의
순수성을 어떻게 지킬지, 아직 안 쓰이는 미래 이벤트용 에셋을 데드 에셋 금지 규약과
어떻게 화해시킬지가 쟁점.

## 결정

1. **스택 = Web Audio API 직접 사용** (라이브러리 0). BGM은 buffer source `loop` +
   무음 트림(`loopStart/loopEnd`)으로 갭리스, SFX는 per-play BufferSource 중첩.
   게인 그래프 `source → (bgm|sfx) → master`. 자동재생 정책: suspended 생성 →
   **pointerup/keydown 제스처마다 resume 재시도, running 전환 시 정리**(`unlockOnGesture`).
   pointerdown 은 마우스만 유저 활성화를 부여해 터치/키보드가 영구 무음이 되므로 금지.
   iOS 비표준 'interrupted' 는 running 아님 전부 재시도 + visibilitychange/제스처에서 복구.
   **running 아닐 때 SFX는 no-op**(resume 시 몰아터짐 방지).
2. **배치 = `src/audio/` 데모 전용 계층** (scene/storage 동급, 앱2 이식 대상 아님).
   `src/render/fx.mjs` 는 오디오를 모른다 — `playMove`/`playJump` 의 `onPhase` 콜백으로
   단계만 알리고 씬(play/result/settings)과 main.mjs 가 배선(ADR-005 순수성 유지).
   `src/game` 은 I/O 0 그대로. 버튼음은 전 씬 `.btn` document 위임 1곳(main.mjs).
3. **`src/audio/manifest.mjs` = 오디오 에셋 SSOT.** `public/assets/audio/` 의 모든
   파일은 매니페스트에 등록해야 한다(데드 에셋 금지의 오디오판). 미등록 파일 금지.
4. **13종 전 항목 배선 완료** (트리거 표 = design.md §8). BGM 2곡 = 씬 매핑:
   `bgm-main`(play/result 제외 전 씬) / `bgm-battle`(play 전용) / result 는 BGM 무음(징글만).
   매핑은 SceneManager `onEnter` 훅(매니저는 소비처 무지) + main.mjs `SCENE_BGM` 이 SSOT.
   전환은 페이드아웃(0.1s tc)/페이드인(0.4s) 교체. 튜토리얼 미니보드는 fx 파이프 미사용이라 범위 밖.
5. **감염음은 보드 스냅샷 diff 로 판정** — 엔진 `events.infected` 는 감염 0건에도
   발화하고 페이로드가 없어 부적합. play 씬 `postMove` 의 전후 필드 비교(뒤집힌 칸
   카운트)로 실제 감염 시에만 1회 재생.
6. **`prefers-reduced-motion` 과 비커플링** — 모션 선호 ≠ 소리 선호. 소리는 뮤트 토글
   (localStorage `germ-warfare:settings`, `src/storage/settings.mjs`)이 담당.
7. **생성 파이프라인**: MCP 호출마다 `output_directory` 명시 → 자동 생성 파일명을 즉시
   정규명(`bgm-*`/`sfx-*`/`jingle-*`)으로 rename → 매니페스트 등록. 톤 = 카툰 + 레트로 SF.

## 결과

- ✅ 의존성 0으로 정밀 타이밍(FX 단계 동기)·중첩 재생·갭리스 루프 확보.
- ✅ 이식 자산 순수성 유지 — 앱2는 `onPhase` 훅에 자기 오디오를 꽂으면 된다.
- ✅ 에셋 12종(BGM 1 + 징글 2 + SFX 9, ~1.8MB) 전부 매니페스트 등록 + 실제 배선 — 데드 파일 0.
- ⚠️ 새 오디오 에셋 추가 시 매니페스트 등록 + 배선을 같은 커밋에서 — 미배선 방치 금지.
