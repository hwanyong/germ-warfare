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
