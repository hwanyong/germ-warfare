// 프리로드 매니페스트 — 2단계.
// CRITICAL: Title/메뉴 즉시 렌더에 필요(커서·버튼·배경). 이것만 받으면 게임 시작.
// DEFERRED: Play(게임) 전용 자산. 게임 시작 후 백그라운드로 받음.

const A = '/germ-warfare/assets'

export const CRITICAL_IMAGES = [
	`${A}/paper.jpg`,                                  // 배경
	`${A}/cursor/pointer3D.png`, `${A}/cursor/hand.png`, // 커스텀 커서
	`${A}/frame/circle.png`, `${A}/frame/thin.png`       // 버튼·카드 프레임
]

export const DEFERRED_IMAGES = [
	`${A}/cell-green.png`, `${A}/cell-pink.png`,
	`${A}/cell-green-sm.png`, `${A}/cell-pink-sm.png`,
	`${A}/ship/ship-p1.png`, `${A}/ship/ship-p2.png`,
	`${A}/laser/beam-p1.png`, `${A}/laser/beam-p2.png`,
	`${A}/laser/burst-p1.png`, `${A}/laser/burst-p2.png`,
	`${A}/frame/square.png`, `${A}/frame/arrow.png`,
	`${A}/crosshair/aim-move.png`, `${A}/crosshair/aim-clone.png`,
	// 마을 배경(stage-01) + 파괴 스왑
	...['castle', 'house', 'church', 'treePine', 'tower', 'rocks', 'houseSmall', 'mill',
		'treePines', 'well', 'houseTall', 'towerTall', 'treePineTall', 'tent', 'ruins', 'skull']
		.map(n => `${A}/cartography/${n}.png`)
]
