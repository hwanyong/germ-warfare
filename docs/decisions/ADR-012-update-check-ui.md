# ADR-012 — 수동 업데이트 확인/적용 UI

- 상태: 승인
- 관련: [[ADR-010-pwa-offline-shell]]

## 맥락

[[ADR-010]] 이 `registerType: 'prompt'` 로 대국 중 판 소실을 막았지만, 그 대가로 새 SW 는
"모든 탭이 닫힐 때까지" 조용히 대기만 한다 — 사용자가 새 버전이 있는지 확인하거나 원할 때
적용할 방법이 없었다(콘솔 로그만). 개발 중 SW 를 강제로 갈아치우려면
`navigator.serviceWorker.getRegistrations().then(...unregister())` 콘솔 명령이 필요했는데,
이건 플레이어에게 노출할 수 없는 개발자 전용 우회다.

## 결정

1. **`src/pwa/update.mjs` 신설** — `main.mjs` 에 인라인이던 `registerSW()` 호출을 이 모듈로
   옮기고, 구독 가능한 상태(`idle/checking/available/up-to-date`) + `checkForUpdate()`/
   `applyPendingUpdate()` 를 export. `main.mjs` 는 `initUpdater()` 한 줄만 호출(단일 진입점
   규약 유지 — SW 등록 로직은 여전히 그 안에서 시작되지만 상태·트리거는 별도 관심사로 분리).
2. **"지금 확인" 은 안전, "적용" 은 Settings 씬에서만 노출.** `checkForUpdate()` 는
   `registration.update()` 만 트리거 — 리로드 없어 대국 중 눌러도 무해. `applyPendingUpdate()`
   는 실제 리로드를 일으키므로(대기 SW 로 skip-waiting → 페이지 새로고침), **인게임 Pause
   오버레이(`settings-panel.mjs`, play 씬과 공유)엔 넣지 않고 Title 전용 Settings 씬
   (`settings.mjs`)에만** 배선 — Pause 중 실수로 눌러 판을 잃는 경로 원천 차단.
3. **버튼 노출 조건**: "적용" 버튼은 상태가 `available` 일 때만 렌더 — 대기 중인 새 버전이
   없으면 아예 안 보여서 헛눌림 방지.

## 결과

- ✅ 플레이어가 콘솔 없이 업데이트 확인/적용 가능 — ADR-010 의 대국-보호 설계는 그대로 유지.
- ✅ [[ADR-010]] §"업데이트 프롬프트 UI 없음" 후속 과제 해소.

## Addendum — "지금 확인" 제거, "적용"을 nuclear reset 으로 단순화

- 상태: 승인

원래 설계(§결정 1-3)는 `idle/checking/available/up-to-date` 4상태 + 구독 기반 재렌더로
"확인"과 "적용"을 분리했다. 이 상태기계 자체가 버그 온상이었다(리스너가 알림 도중 자신을
재구독 → `Set.forEach` 가 순회 중 추가 항목까지 방문 → 동기 무한루프로 탭 행행). 패치보다
설계를 걷어내는 쪽을 택한다 — 상태 추적이 UI 편의(라벨) 하나만을 위해 존재했고, 그 편의의
가치가 복잡도/버그 표면적을 정당화하지 못했다.

**변경**:
1. **"지금 확인" 버튼 제거.** `checkForUpdate()`/`getUpdateState()`/`onUpdateState()`/`STATE`
   전부 삭제 — Settings 씬은 더 이상 SW 의 `updatefound`/`waiting` 상태를 구독하지 않는다.
2. **"적용하고 재시작" 하나만 남기고 무조건 노출.** 클릭 시 확인 대화상자(오프라인이면 접속
   불가할 수 있음을 경고) → OK 시 `forceUpdate()`: SW 등록 전부 해제(`unregister()`) +
   Cache Storage 전부 삭제(`caches.delete()`) 후 `location.reload()`. `registerSW()` 가 주는
   `updateSW(true)`(대기 워커 skip-waiting) 메커니즘에 더 이상 의존하지 않는다 — 대기 워커가
   있든 없든, 실제로 새 버전이 있든 없든 항상 완전히 새로 받는다("확인 안 된 업데이트 있어도
   그냥 세게 누르면 됨" 이 의도).
3. 대국 중 노출 금지 원칙(§결정 2)은 그대로 유지 — Title 전용 Settings 씬에만 배선.

## 결과 (Addendum)

- ✅ 상태기계·구독·재마운트 사이클 전체 제거 — 무한루프의 근본 원인이 된 서브시스템 자체가
  더 이상 존재하지 않는다.
- ✅ UI 단순화: 버튼 1개, 분기 없음.
- ⚠️ "정말 새 버전이 있는지" 사전 확인 없이 항상 강제 재다운로드 — 오프라인 중 클릭하면
  게임이 일시적으로 접속 불가해질 수 있어 확인 대화상자로 경고.
