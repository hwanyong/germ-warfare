// Service Worker 등록 + 강제 업데이트 (ADR-010, ADR-012).
// registerType:'prompt' — 새 버전은 대기만 하고 자동 리로드 안 함(대국 중 판 소실 방지).
// "적용하고 재시작" 은 SW 대기열을 신뢰하지 않고 등록 해제+캐시 전체 삭제 후 재시작하는
// nuclear reset — 오프라인/설치 이슈로 낀 캐시까지 확실히 벗겨낸다.
import { registerSW } from 'virtual:pwa-register'

export function initUpdater() {
	registerSW({ onOfflineReady: () => console.info('[pwa] 오프라인 준비 완료.') })
}

/** SW 등록 해제 + 캐시 전체 삭제 후 재시작. 리로드 발생 — 대국 중 노출 금지(Settings 씬 전용). */
export async function forceUpdate() {
	const regs = await navigator.serviceWorker?.getRegistrations?.() ?? []
	await Promise.all(regs.map(r => r.unregister()))
	const keys = await caches?.keys?.() ?? []
	await Promise.all(keys.map(k => caches.delete(k)))
	location.reload()
}
