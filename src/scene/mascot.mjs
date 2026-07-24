// 마스코트(걷는 세균 애니 webp) 헬퍼 — play HUD·result·title 씬 공용.
// 애니 webp 는 재생 정지가 불가 → 첫 프레임을 canvas 로 떠서 "정지 상태"용
// 정적 이미지(dataURL)로 캐시한다 (턴 표시: 내 턴 = 애니, 아니면 정지).

const BASE = '/germ-warfare/assets/mascot'
const SPRITE = { p1: 'germ-green', p2: 'germ-pink', p3: 'germ-green', p4: 'germ-pink' } // p3/p4 = 재활용(+씬 hue)

/** 마스코트 webp 경로. variant: '' | 'left' | 'fast' (docs/assets.md §mascot) */
export const mascotSrc = (team, variant = '') =>
	`${BASE}/${SPRITE[team] ?? SPRITE.p1}${variant ? `-${variant}` : ''}.webp`

const frozen = new Map() // src -> Promise<dataURL|원본src>

/** 애니 webp 첫 프레임의 정적 dataURL (캐시). 실패 시 원본 src 반환 — 계속 움직이는 우아한 강등 */
export function frozenMascot(team, variant = '') {
	const src = mascotSrc(team, variant)
	if (!frozen.has(src)) {
		frozen.set(src, fetch(src)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.blob()
			})
			.then(blob => createImageBitmap(blob)) // 애니 webp → 첫 프레임 비트맵
			.then(bmp => {
				const c = document.createElement('canvas')
				c.width = bmp.width
				c.height = bmp.height
				c.getContext('2d').drawImage(bmp, 0, 0)
				bmp.close()
				return c.toDataURL()
			})
			.catch(err => {
				console.warn('[mascot] 첫 프레임 추출 실패 — 애니 원본 사용:', err.message)
				return src
			}))
	}
	return frozen.get(src)
}
