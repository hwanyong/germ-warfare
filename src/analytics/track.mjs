import { hasAnyProgress } from '../storage/progress.mjs'

// Umami 가상 페이지뷰(씬 진입) 래퍼. 미로드(애드블록 등) 시 안전한 no-op.
// play 씬은 여기서 안 씀 — src/scene/scenes/play.mjs 가 튜토리얼 게이트 통과 후 직접 호출(왕복 중복 방지).
// url 은 vite base(=GitHub Pages subpath, SSOT: vite.config.js)를 그대로 씀 — 실경로와 일치시켜야
// Umami Pages 리포트에서 자동수집분과 같은 계층으로 잡힘. auto-track 은 index.html 에서 꺼둠(중복 방지).
export function trackView(name) {
	window.umami?.track(props => ({ ...props, url: `${import.meta.env.BASE_URL}${name}` }))
}

// 앱 실행(세션)당 1회만 — 씬 진입마다 도는 trackView 와 별도. 재방문·PWA설치 여부 신호.
// returning: Umami 방문자해시(월단위 salt 로테이션)보다 안정적인 기기 로컬 신호(progress.mjs SSOT 재사용).
export function trackSessionStart() {
	window.umami?.track('session_start', {
		returning: hasAnyProgress(),
		standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false
	})
}
