// 프리로드 대상 이미지 매니페스트 (실사용 에셋).
// 로딩 씬이 이걸 전부 받은 뒤 게임을 시작한다.

const A = '/germ-warfare/assets'

export const PRELOAD_IMAGES = [
	`${A}/paper.jpg`,
	`${A}/cell-green.png`, `${A}/cell-pink.png`,
	`${A}/cell-green-sm.png`, `${A}/cell-pink-sm.png`,
	`${A}/ship/ship-p1.png`, `${A}/ship/ship-p2.png`,
	`${A}/laser/beam-p1.png`, `${A}/laser/beam-p2.png`,
	`${A}/laser/burst-p1.png`, `${A}/laser/burst-p2.png`,
	`${A}/frame/thin.png`, `${A}/frame/circle.png`, `${A}/frame/square.png`, `${A}/frame/arrow.png`,
	`${A}/crosshair/aim-move.png`, `${A}/crosshair/aim-clone.png`,
	`${A}/cursor/pointer3D.png`, `${A}/cursor/hand.png`,
	`${A}/frame/square.png`,
	// 마을 배경(stage-01) + 파괴 스왑
	...['castle', 'house', 'church', 'treePine', 'tower', 'rocks', 'houseSmall', 'mill',
		'treePines', 'well', 'houseTall', 'towerTall', 'treePineTall', 'tent', 'ruins', 'skull']
		.map(n => `${A}/cartography/${n}.png`)
]
