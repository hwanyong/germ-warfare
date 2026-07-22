# ADR-004 — GitHub Pages, 새 공개 repo, 하위경로

- 상태: 승인
- 관련: [[ADR-005-multiplayer-separate-app]]

## 맥락

기존 `GameRoomSystem` 은 **private** 이라 Free 플랜에서 Pages 불가(공개 repo 필요).
호스트 후보: GitHub Pages vs Firebase Hosting. 이 앱은 정적 무료 데모.

## 결정

- **새 공개 repo** `germ-warfare` 생성 (기존 private repo 재활용 대신). 무료 데모라 소스 공개 무방.
- **GitHub Pages 프로젝트 페이지** → `https://hwanyong.github.io/germ-warfare/` (하위경로).
- Vite `base: '/germ-warfare/'`, GitHub Actions 빌드→배포(`dist` 커밋 금지).
- 커스텀 도메인 불필요(하위경로 수용).

## 결과

- ✅ 무료·간단·즉시 배포.
- Pages는 정적 전용(컴퓨트 0)이지만, 멀티/서버는 이 repo에 안 붙으므로(ADR-005) 막다른 길 아님.
- 정적 클라는 이식이 자명 → 나중 다른 호스트 이전도 저비용(락인 아님).
