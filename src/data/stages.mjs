// Stage 데이터 (SSOT) — 스테이지는 여기서만 정의 (하드코딩 금지).
// 캠페인 재구성: 20 스테이지 = 4 챕터 × 5. 컴팩트 스펙 + 빌더로 양산.
//
// 난이도 레버 (스테이지 진행에 따라 상승):
//   1. grid 크기        7×7 → 10×10
//   2. blocked 지형     없음 → 산개 바위 → 벽/십자/대각 (두께 1 = MOVE 점프로 항상 통과 가능)
//   3. teams(적군 수)   1 → 2 → 3 (엔진 최대 4팀)
//   4. 시드 핸디캡      적 시드 2 → 3~4 + 중앙/전진 배치
//   5. ai 기본레벨      easy → normal → hard (유저 난이도 노브가 ±1 시프트,
//                       src/game/ai.mjs effectiveDifficulty)
//
// 해금: 직전 스테이지 승리 시 (storage/progress.mjs hasWin).
// stage-01 = 기본형 유지(맵/시드/마을 원본 그대로). 마을 배치는 시드 PRNG(결정적) 자동 생성.
// 에셋 선정은 docs/assets.md 카탈로그 기준.

import { mulberry32 } from '../game/rng.mjs'

const P = (x, y) => ({ x, y })
const key = p => `${p.x},${p.y}`
const rowChar = y => String.fromCharCode(65 + y) // A, B, C, ...

//#region 지형 패턴 (전부 두께 1 → 거리2 MOVE 로 점프 가능, 고립 없음)
/** 가로 벽: y 행 전체, gaps 의 x 만 개방 */
const wallH = (w, y, gaps) =>
	Array.from({ length: w }, (_, x) => P(x, y)).filter(p => !gaps.includes(p.x))
/** 세로 벽: x 열 전체, gaps 의 y 만 개방 */
const wallV = (h, x, gaps) =>
	Array.from({ length: h }, (_, y) => P(x, y)).filter(p => !gaps.includes(p.y))
/** 주대각선 (양 끝 코너 제외 — 코너는 시드 자리) */
const diag = (w, h) =>
	Array.from({ length: Math.min(w, h) - 2 }, (_, i) => P(i + 1, i + 1))
/** 중복 좌표 제거 (벽 교차점) */
const dedupe = cells => {
	const seen = new Set()
	return cells.filter(p => !seen.has(key(p)) && seen.add(key(p)))
}
/** 산개 바위 n개 — 테두리·시드 주변(체비쇼프≤1)·기존 blocked 회피, 서로 거리≥2 */
function scatter(rng, { w, h }, n, avoid) {
	const cand = []
	for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
		if (!avoid.has(`${x},${y}`)) cand.push(P(x, y))
	}
	shuffle(cand, rng)
	const out = []
	for (const c of cand) {
		if (out.length >= n) break
		if (out.some(b => Math.max(Math.abs(b.x - c.x), Math.abs(b.y - c.y)) <= 1)) continue
		out.push(c)
	}
	return out
}
function shuffle(arr, rng) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}
//#endregion

//#region 시드 배치 (extra = 핸디캡 — 적 추가 시드)
/** 2팀: p1 상단 코너쌍 / p2 하단 코너쌍 (stage-01 형) */
const seeds2 = (w, h, extra2 = []) => ({
	p1: [P(0, 0), P(w - 1, 0)],
	p2: [P(0, h - 1), P(w - 1, h - 1), ...extra2]
})
/** 3팀: 코너 인접쌍 — p1 좌상 / p2 우하 / p3 우상 (좌하 = 확장 경쟁지) */
const seeds3 = (w, h, { e2 = [], e3 = [] } = {}) => ({
	p1: [P(0, 0), P(1, 0)],
	p2: [P(w - 1, h - 1), P(w - 2, h - 1), ...e2],
	p3: [P(w - 1, 0), P(w - 2, 0), ...e3]
})
/** 4팀: 네 코너 인접쌍 (프리포올) */
const seeds4 = (w, h, { e2 = [], e3 = [], e4 = [] } = {}) => ({
	p1: [P(0, 0), P(1, 0)],
	p2: [P(w - 1, h - 1), P(w - 2, h - 1), ...e2],
	p3: [P(w - 1, 0), P(w - 2, 0), ...e3],
	p4: [P(0, h - 1), P(1, h - 1), ...e4]
})
//#endregion

//#region 마을 자동 배치 (데코 — 게임규칙 무관, 시드 PRNG 로 결정적)
// 챕터 테마별 에셋 풀 (docs/assets.md). ruins/skull 은 파괴 스왑 전용이라 제외.
const THEMES = {
	meadow: {
		landmark: 'castle',
		pool: ['house', 'houseSmall', 'houseTall', 'houseChimney', 'houses', 'church', 'mill',
			'well', 'tower', 'towerTall', 'treePine', 'treePines', 'treePineTall', 'treeTall',
			'bush', 'tent', 'stable', 'waterWheel', 'flag', 'fence']
	},
	canyon: {
		landmark: 'watchtower',
		pool: ['rocksTall', 'rocksMountain', 'rocksA', 'rocksB', 'mine', 'bridge', 'campfire',
			'tipi', 'cactus', 'cactusLarge', 'graveyard', 'wall', 'gate', 'tent', 'towerLow', 'pyramid']
	},
	forest: {
		landmark: 'churchLarge',
		pool: ['treePineTall', 'treePineLarge', 'treePineTallLarge', 'treePinesSmall', 'treePines',
			'treePine', 'houseViking', 'campfire', 'well', 'bridgeRope', 'dock', 'stable',
			'towerWatch', 'lakeRound', 'houseSmall']
	},
	volcano: {
		landmark: 'vulcano',
		pool: ['rocksMountain', 'rocksTall', 'rocksA', 'castleTall', 'castleWideLow', 'wall',
			'gate', 'towerTall', 'towerLow', 'graveyard', 'campfire', 'mine', 'banner', 'flag']
	}
}

/** 빈 칸(시드·blocked 제외)에 랜드마크(중앙 인접) + 테마 오브젝트 자동 배치. */
function autoVillage(rng, { w, h }, blocked, seeds, theme, n) {
	const used = new Set([...blocked.map(key), ...Object.values(seeds).flat().map(key)])
	const cand = []
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		if (!used.has(`${x},${y}`)) cand.push(P(x, y))
	}
	const { landmark, pool } = THEMES[theme]
	const village = []
	const cx = (w - 1) / 2, cy = (h - 1) / 2
	// 랜드마크 = 중앙에서 가장 가까운 빈 칸
	cand.sort((a, b) => (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy)))
	const lm = cand.shift()
	village.push({ pos: `${rowChar(lm.y)}${lm.x}`, asset: landmark })
	// 나머지 = 셔플 후 기존 배치와 체비쇼프 거리≥2 우선, 부족하면 완화
	shuffle(cand, rng)
	const placed = [lm]
	for (const relax of [false, true]) {
		for (const c of cand) {
			if (village.length >= n) break
			if (placed.includes(c)) continue
			if (!relax && placed.some(p => Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y)) < 2)) continue
			placed.push(c)
			village.push({ pos: `${rowChar(c.y)}${c.x}`, asset: pool[Math.floor(rng() * pool.length)] })
		}
		if (village.length >= n) break
	}
	return village
}
//#endregion

//#region 빌더
/** 스펙 → 스테이지. blocked 는 시드와 충돌 시 즉시 에러(데이터 버그 조기 검출). */
function makeStage(spec) {
	const { id, name, grid, teams = 2, seeds, ai, theme, gen } = spec
	const rng = mulberry32(gen)
	const seedKeys = new Set(Object.values(seeds).flat().map(key))
	const seedZone = new Set() // 시드 + 체비쇼프≤1 (scatter 회피 지대)
	for (const s of Object.values(seeds).flat()) {
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
			seedZone.add(`${s.x + dx},${s.y + dy}`)
		}
	}
	let blocked = dedupe(spec.blocked ?? [])
	for (const b of blocked) {
		if (seedKeys.has(key(b))) throw new Error(`[stages] ${id}: blocked ${key(b)} 가 시드와 충돌`)
	}
	if (spec.scatter) {
		const avoid = new Set([...seedZone, ...blocked.map(key)])
		blocked = [...blocked, ...scatter(rng, grid, spec.scatter, avoid)]
	}
	const playable = grid.w * grid.h - blocked.length
	const villageN = Math.min(15, Math.max(8, Math.round(playable * 0.18)))
	return {
		id, name, grid, blocked, teams, seeds, ai,
		parTurns: Math.round(playable * 0.42) + (teams - 2) * 4,
		story: null,
		village: autoVillage(rng, grid, blocked, seeds, theme, villageN)
	}
}
//#endregion

//#region 캠페인 스펙 — 챕터 내 ai·적 시드 수 비감소, 챕터 간 팀 수 비감소 (테스트가 강제)
const CH1 = [ // 푸른 초원 — 2팀, 입문 커브
	// stage-01 은 아래 리터럴(기본형 유지)
	{ id: 'stage-02', name: { en: 'Rolling Hills', ko: '언덕 마을' }, theme: 'meadow', gen: 0xE102,
		grid: { w: 7, h: 7 }, scatter: 3, seeds: seeds2(7, 7), ai: 'easy' },
	{ id: 'stage-03', name: { en: 'Mill Crossing', ko: '방앗간 길목' }, theme: 'meadow', gen: 0xE103,
		grid: { w: 8, h: 7 }, blocked: [P(3, 3), P(4, 3)], seeds: seeds2(8, 7), ai: 'easy' },
	{ id: 'stage-04', name: { en: 'Fenced Front', ko: '울타리 전선' }, theme: 'meadow', gen: 0xE104,
		grid: { w: 8, h: 8 }, blocked: wallH(8, 3, [2, 5]), seeds: seeds2(8, 8), ai: 'normal' },
	{ id: 'stage-05', name: { en: 'Castle Yard', ko: '성 앞마당' }, theme: 'meadow', gen: 0xE105,
		grid: { w: 8, h: 8 }, scatter: 4, seeds: seeds2(8, 8, [P(4, 7)]), ai: 'normal' }
]
const CH2 = [ // 바위 협곡 — 2팀, 지형 + 시드 핸디캡
	{ id: 'stage-06', name: { en: 'Canyon Gate', ko: '협곡 관문' }, theme: 'canyon', gen: 0xE106,
		grid: { w: 9, h: 7 }, blocked: wallH(9, 3, [1, 7]), seeds: seeds2(9, 7, [P(4, 6)]), ai: 'normal' },
	{ id: 'stage-07', name: { en: 'Crossroads', ko: '갈림길' }, theme: 'canyon', gen: 0xE107,
		grid: { w: 9, h: 9 }, blocked: [...wallH(9, 4, [1, 7]), ...wallV(9, 4, [1, 7])],
		seeds: seeds2(9, 9, [P(2, 8)]), ai: 'normal' },
	{ id: 'stage-08', name: { en: 'Switchback', ko: '갈지자 고개' }, theme: 'canyon', gen: 0xE108,
		grid: { w: 9, h: 9 }, blocked: [...wallH(9, 2, [6, 7]), ...wallH(9, 6, [1, 2])],
		seeds: seeds2(9, 9, [P(4, 8), P(8, 4)]), ai: 'normal' },
	{ id: 'stage-09', name: { en: 'Serpent Ridge', ko: '뱀바위 능선' }, theme: 'canyon', gen: 0xE109,
		grid: { w: 9, h: 9 }, blocked: diag(9, 9), seeds: seeds2(9, 9, [P(4, 8), P(8, 4)]), ai: 'hard' },
	{ id: 'stage-10', name: { en: 'Fortress Pass', ko: '요새 고개' }, theme: 'canyon', gen: 0xE10A,
		grid: { w: 10, h: 9 }, blocked: wallH(10, 4, [0, 9]), scatter: 3,
		seeds: seeds2(10, 9, [P(5, 8), P(5, 3)]), ai: 'hard' } // P(5,3) = 요새 돌파 전진 부대
]
const CH3 = [ // 세 갈래 숲 — 3팀 프리포올
	{ id: 'stage-11', name: { en: 'Forest Meet', ko: '숲의 회동' }, theme: 'forest', gen: 0xE10B,
		grid: { w: 9, h: 9 }, teams: 3, seeds: seeds3(9, 9), ai: 'normal' },
	{ id: 'stage-12', name: { en: 'Old Grove', ko: '오래된 수풀' }, theme: 'forest', gen: 0xE10C,
		grid: { w: 9, h: 9 }, teams: 3, blocked: [P(4, 4)], scatter: 3, seeds: seeds3(9, 9), ai: 'normal' },
	{ id: 'stage-13', name: { en: 'Twin Creeks', ko: '쌍개울' }, theme: 'forest', gen: 0xE10D,
		grid: { w: 10, h: 9 }, teams: 3, blocked: [...wallV(9, 3, [1, 7]), ...wallV(9, 6, [2, 6])],
		seeds: seeds3(10, 9, { e2: [P(0, 8)], e3: [P(5, 0)] }), ai: 'normal' },
	{ id: 'stage-14', name: { en: "Watcher's Cross", ko: '감시자의 십자로' }, theme: 'forest', gen: 0xE10E,
		grid: { w: 10, h: 9 }, teams: 3, blocked: [...wallH(10, 4, [2, 7]), ...wallV(9, 5, [2, 6])],
		seeds: seeds3(10, 9, { e2: [P(0, 8)], e3: [P(3, 0)] }), ai: 'hard' },
	{ id: 'stage-15', name: { en: 'Deep Timber', ko: '깊은 숲' }, theme: 'forest', gen: 0xE10F,
		grid: { w: 10, h: 10 }, teams: 3, blocked: [...wallH(10, 3, [7, 8]), ...wallH(10, 6, [1, 2])],
		seeds: seeds3(10, 10, { e2: [P(5, 5)], e3: [P(5, 0)] }), ai: 'hard' } // P(5,5) = 중앙 침투
]
const CH4 = [ // 화산 대혼전 — 4팀 프리포올, 최종장
	{ id: 'stage-16', name: { en: 'Ashfield', ko: '잿빛 들판' }, theme: 'volcano', gen: 0xE110,
		grid: { w: 9, h: 9 }, teams: 4, seeds: seeds4(9, 9), ai: 'normal' },
	{ id: 'stage-17', name: { en: 'Cinder Rocks', ko: '불탄 바위' }, theme: 'volcano', gen: 0xE111,
		grid: { w: 9, h: 9 }, teams: 4, scatter: 5, seeds: seeds4(9, 9), ai: 'hard' },
	{ id: 'stage-18', name: { en: 'Lava Cross', ko: '용암 십자로' }, theme: 'volcano', gen: 0xE112,
		grid: { w: 10, h: 9 }, teams: 4, blocked: [...wallH(10, 4, [1, 8]), ...wallV(9, 4, [1, 7])],
		seeds: seeds4(10, 9, { e3: [P(6, 0)], e4: [P(3, 8)] }), ai: 'hard' },
	{ id: 'stage-19', name: { en: 'Twin Craters', ko: '쌍분화구' }, theme: 'volcano', gen: 0xE113,
		grid: { w: 10, h: 10 }, teams: 4, blocked: [P(3, 3), P(6, 6)], scatter: 4,
		seeds: seeds4(10, 10, { e2: [P(9, 5)], e3: [P(5, 0)], e4: [P(0, 5)] }), ai: 'hard' },
	{ id: 'stage-20', name: { en: 'Volcano Throne', ko: '화산의 왕좌' }, theme: 'volcano', gen: 0xE114,
		grid: { w: 10, h: 10 }, teams: 4,
		blocked: [...wallH(10, 3, [7, 8]), ...wallH(10, 6, [1, 2]), P(4, 4), P(5, 5)],
		seeds: seeds4(10, 10, { e2: [P(9, 5)], e3: [P(5, 0)], e4: [P(0, 5)] }), ai: 'hard' }
]
//#endregion

export const STAGES = {
	// 기본형 (원본 유지 — 유일한 수작업 마을 배치)
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
		// ai 미지정 = 기본형: 유저 난이도 노브 그대로 적용 (effectiveDifficulty 폴스루)
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
	}
}
for (const spec of [...CH1, ...CH2, ...CH3, ...CH4]) STAGES[spec.id] = makeStage(spec)

export const STAGE_ORDER = Object.keys(STAGES)

export const CHAPTERS = [
	{ id: 'ch1', name: { en: 'Green Meadows', ko: '푸른 초원' }, stages: ['stage-01', ...CH1.map(s => s.id)] },
	{ id: 'ch2', name: { en: 'Rocky Canyon', ko: '바위 협곡' }, stages: CH2.map(s => s.id) },
	{ id: 'ch3', name: { en: 'Threeway Woods', ko: '세 갈래 숲' }, stages: CH3.map(s => s.id) },
	{ id: 'ch4', name: { en: 'Volcanic Melee', ko: '화산 대혼전' }, stages: CH4.map(s => s.id) }
]
