# Germ Warfare (세균전)

7x7 그리드 감염 영토전(Ataxx). **클라이언트 사이드 PvE 웹 게임 데모** — 무료 싱글 플레이.
서버 없이 브라우저에서 100% 실행. AI 상대(3단계 난이도 예정).

> 멀티플레이어 + 상점(스킨)은 **별도 앱으로 재개발** 예정. 이 저장소는 규칙/AI/렌더
> 자산을 검증·생산하는 무료 데모다. 배경·의사결정은 [`docs/architecture.md`](docs/architecture.md)
> 와 [`docs/decisions/`](docs/decisions/) ADR 참조.

## 개발

```bash
npm install
npm run dev        # vite 개발 서버
npm test           # 규칙 엔진 테스트 (node --test)
npm run build      # 정적 빌드 (dist/)
```

## 배포

GitHub Pages 프로젝트 페이지 → `https://hwanyong.github.io/germ-warfare/`
(`.github/workflows/deploy.yml` 이 `main` push 시 자동 빌드·배포)

## 구조

```
src/
├── game/     규칙 엔진 (SSOT, 순수·무의존, 시드 결정적) — 미래 앱 이식 자산
├── ai/       PvE 상대 (메인스레드)                      — 이식 자산
├── render/   보드 렌더                                  — 이식 자산
├── menu/     시작 / 스테이지 선택 / 설정
├── match/    턴 루프 드라이버
└── storage/  localStorage (설정 / 진행)
```
