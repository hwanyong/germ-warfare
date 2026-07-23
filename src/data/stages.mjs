// Stage 데이터 (SSOT) — 하드코딩 금지, 스테이지는 여기서만 정의.
// PHASE E 에서 grid 형태/blocked/배경배치/story 로 확장 (docs/roadmap.md).

export const STAGES = {
	'stage-01': {
		id: 'stage-01',
		name: '마을 침공',
		grid: { w: 7, h: 7 },
		// 팀별 초기 시드 (x, y)
		seeds: {
			p1: [{ x: 0, y: 0 }, { x: 6, y: 0 }],
			p2: [{ x: 0, y: 6 }, { x: 6, y: 6 }]
		},
		parTurns: 20, // 속공 보너스 기준 턴 수 (점수 공식)
		// 배경 인간 마을 (cartography). 셀 점령 시 파괴(ruins/skull) 연출. 코너 시드 회피, 불규칙 배치.
		village: [
			{ pos: 'A3', asset: 'castle' },
			{ pos: 'B1', asset: 'house' }, { pos: 'B5', asset: 'church' },
			{ pos: 'C2', asset: 'treePine' }, { pos: 'C4', asset: 'tower' }, { pos: 'C6', asset: 'rocks' },
			{ pos: 'D0', asset: 'houseSmall' }, { pos: 'D3', asset: 'mill' }, { pos: 'D6', asset: 'treePines' },
			{ pos: 'E1', asset: 'well' }, { pos: 'E4', asset: 'houseTall' },
			{ pos: 'F2', asset: 'towerTall' }, { pos: 'F5', asset: 'treePineTall' },
			{ pos: 'G3', asset: 'tent' }
		]
	}
}

export const STAGE_ORDER = ['stage-01']
