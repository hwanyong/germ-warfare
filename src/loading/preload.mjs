// 프리로드 — 이미지 + 웹폰트 로드 완료를 기다리고 진행률을 보고한다.

/** 이미지 1장 로드 (실패해도 resolve — 로딩이 멈추지 않게) */
export function preloadImage(url) {
	return new Promise(resolve => {
		const img = new Image()
		img.onload = img.onerror = () => resolve(url)
		img.src = url
	})
}

/**
 * 이미지 + 폰트 프리로드 (진행률 게이트용).
 * @param {string[]} images
 * @param {(done:number, total:number)=>void} [onProgress]
 */
export async function preloadAll(images, onProgress) {
	let done = 0
	const total = images.length + 1 // +1 = 폰트
	const tick = () => onProgress?.(++done, total)

	const imageJobs = images.map(u => preloadImage(u).then(tick))
	const fontJob = (document.fonts?.ready ?? Promise.resolve()).then(tick)

	await Promise.all([...imageJobs, fontJob])
}

/** 백그라운드 프리로드 (fire-and-forget, 게임 시작 후 나머지 자산). */
export function preloadInBackground(images) {
	for (const u of images) preloadImage(u)
}

/** UI 문자열 글리프의 폰트 서브셋 예열 (fire-and-forget).
 * 구글폰트 한글 패밀리는 unicode-range 서브셋 지연로드라, 게임 중 처음 보는 글리프가
 * DOM 에 꽂히는 순간 서브셋 로드가 시작되고, 완료 시 문서 전체 'Fonts changed'
 * 재레이아웃·재페인트가 터진다(hover 배지가 대표 트리거 — 보드 전체 깜빡임).
 * 현재 언어 사전 전체를 미리 로드해 이를 무력화한다. 패밀리/웨이트는 theme.css --font-* 스택과 동기. */
export function warmFonts(text) {
	if (!document.fonts?.load) return
	for (const font of ['1em Dongle', '1em Gugi', '700 1em Orbitron'])
		document.fonts.load(font, `${text}0123456789`).catch(() => {})
}
