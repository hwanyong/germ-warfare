// 로컬 설정 영속화 (localStorage) — 데모 전용 계층 (docs/architecture.md §4 storage/).
// localStorage 불가 환경(시크릿 모드 등)에서는 조용히 세션 한정 기본값으로 동작한다.

const KEY = 'gw-settings' // 키 규약: gw-* (gw-lang, gw-progress-v1 과 동일)

export function loadSettings() {
	try {
		return JSON.parse(localStorage.getItem(KEY)) ?? {}
	}
	catch {
		return {}
	}
}

export function saveSettings(patch) {
	const next = { ...loadSettings(), ...patch }
	try {
		localStorage.setItem(KEY, JSON.stringify(next))
	}
	catch { /* 저장 불가 — 세션 한정 설정으로 동작 */ }
	return next
}
