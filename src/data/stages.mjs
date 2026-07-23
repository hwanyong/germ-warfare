// Stage 데이터 (SSOT) — 스테이지는 여기서만 정의 (하드코딩 금지).
// PHASE E: grid 크기/blocked/시드/마을배치/스토리 훅 파라미터화.
// name = { en, ko }. story = 인트로 훅(추후 Intro 씬에서 사용, 지금은 예약).

export const STAGES = {
	'stage-01': {
		id: 'stage-01',
		name: { en: 'Village Invasion', ko: '마을 침공' },
		grid: { w: 7, h: 7 },
		blocked: [],
		seeds: {
			p1: [{ x: 0, y: 0 }, { x: 6, y: 0 }],
			p2: [{ x: 0, y: 6 }, { x: 6, y: 6 }]
		},
		parTurns: 20,
		story: null,
		village: [
			{ pos: 'A3', asset: 'castle' },
			{ pos: 'B1', asset: 'house' }, { pos: 'B5', asset: 'church' },
			{ pos: 'C2', asset: 'treePine' }, { pos: 'C4', asset: 'tower' }, { pos: 'C6', asset: 'rocks' },
			{ pos: 'D0', asset: 'houseSmall' }, { pos: 'D3', asset: 'mill' }, { pos: 'D6', asset: 'treePines' },
			{ pos: 'E1', asset: 'well' }, { pos: 'E4', asset: 'houseTall' },
			{ pos: 'F2', asset: 'towerTall' }, { pos: 'F5', asset: 'treePineTall' },
			{ pos: 'G3', asset: 'tent' }
		]
	},
	'stage-02': {
		id: 'stage-02',
		name: { en: 'Rocky Canyon', ko: '바위 협곡' },
		grid: { w: 7, h: 7 },
		// 중앙 가로 바위 벽(틈 2곳) — 우회 전투 유도
		blocked: [
			{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }
		],
		seeds: {
			p1: [{ x: 0, y: 0 }, { x: 6, y: 0 }],
			p2: [{ x: 0, y: 6 }, { x: 6, y: 6 }]
		},
		parTurns: 24,
		story: null,
		village: [
			{ pos: 'A3', asset: 'watchtower' },
			{ pos: 'B1', asset: 'rocksTall' }, { pos: 'B5', asset: 'rocksMountain' },
			{ pos: 'C2', asset: 'bridge' }, { pos: 'C6', asset: 'mine' },
			{ pos: 'E0', asset: 'campfire' }, { pos: 'E4', asset: 'tipi' },
			{ pos: 'F2', asset: 'cactus' }, { pos: 'F6', asset: 'rocksB' },
			{ pos: 'G3', asset: 'graveyard' }
		]
	},
	'stage-03': {
		id: 'stage-03',
		name: { en: 'Grand Plaza', ko: '대광장' },
		grid: { w: 9, h: 9 },
		blocked: [
			{ x: 4, y: 4 } // 중앙 분수(광장 한복판)
		],
		seeds: {
			p1: [{ x: 0, y: 0 }, { x: 8, y: 0 }],
			p2: [{ x: 0, y: 8 }, { x: 8, y: 8 }]
		},
		parTurns: 34,
		story: null,
		village: [
			{ pos: 'A4', asset: 'castleWide' },
			{ pos: 'B2', asset: 'church' }, { pos: 'B6', asset: 'houseTall' },
			{ pos: 'C1', asset: 'house' }, { pos: 'C7', asset: 'houseChimney' },
			{ pos: 'E4', asset: 'well' }, // 분수 옆 우물
			{ pos: 'D2', asset: 'stable' }, { pos: 'D6', asset: 'waterWheel' },
			{ pos: 'F1', asset: 'houses' }, { pos: 'F7', asset: 'lighthouse' },
			{ pos: 'G3', asset: 'treeTall' }, { pos: 'G5', asset: 'flag' },
			{ pos: 'H2', asset: 'palm' }, { pos: 'H6', asset: 'bush' }
		]
	}
}

export const STAGE_ORDER = ['stage-01', 'stage-02', 'stage-03']
