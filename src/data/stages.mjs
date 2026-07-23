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
		parTurns: 20 // 속공 보너스 기준 턴 수 (점수 공식)
	}
}

export const STAGE_ORDER = ['stage-01']
