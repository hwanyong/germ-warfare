// 스테이지 데이터 검증 — 캠페인 전 스테이지의 정합성·난이도 커브·도달성.
// 빌더(양산) 산출물이 엔진 불변식을 지키는지 실제 GameMap 기동으로 확인.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { STAGES, STAGE_ORDER, CHAPTERS } from '../../data/stages.mjs'
import { GameMap } from '../map.mjs'
import { effectiveDifficulty, DIFFICULTY } from '../ai.mjs'

const TEAMS_POOL = ['USER0', 'USER1', 'USER2', 'USER3']
const AI_RANK = { easy: 0, normal: 1, hard: 2 }
const key = p => `${p.x},${p.y}`
const posToXY = pos => ({ x: +pos.slice(1), y: pos.charCodeAt(0) - 65 })

const CARTO_DIR = fileURLToPath(new URL('../../../public/assets/cartography/', import.meta.url))
const CARTO = new Set(readdirSync(CARTO_DIR).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)))

test('STAGE_ORDER ↔ STAGES 정합 + stage-01 기본형 유지', () => {
	assert.deepEqual([...STAGE_ORDER].sort(), Object.keys(STAGES).sort())
	assert.equal(STAGE_ORDER[0], 'stage-01')
	assert.equal(STAGE_ORDER.length, 20)
	// 기본형(stage-01) 스냅샷 — 맵/시드/파/마을 원본 그대로
	const s1 = STAGES['stage-01']
	assert.deepEqual(s1.grid, { w: 7, h: 7 })
	assert.deepEqual(s1.blocked, [])
	assert.deepEqual(s1.seeds, {
		p1: [{ x: 0, y: 0 }, { x: 6, y: 0 }],
		p2: [{ x: 0, y: 6 }, { x: 6, y: 6 }]
	})
	assert.equal(s1.parTurns, 20)
	assert.equal(s1.village.length, 14)
	assert.equal(s1.ai, undefined) // 기본형: ai 미지정 = 유저 노브 그대로
})

test('CHAPTERS 는 STAGE_ORDER 를 순서대로 분할', () => {
	assert.deepEqual(CHAPTERS.flatMap(ch => ch.stages), STAGE_ORDER)
})

test('난이도 커브 — 챕터 간 팀 수 비감소, 챕터 내 ai·적 시드 수 비감소', () => {
	let prevTeams = 2
	for (const ch of CHAPTERS) {
		const teams = STAGES[ch.stages[0]].teams ?? 2
		assert.ok(teams >= prevTeams, `${ch.id}: 팀 수 역행 (${prevTeams}→${teams})`)
		prevTeams = teams
		let prevAi = 0, prevEnemy = 0
		for (const id of ch.stages) {
			const s = STAGES[id]
			assert.equal(s.teams ?? 2, teams, `${id}: 챕터 내 팀 수 불일치`)
			if (s.ai !== undefined) { // 기본형(stage-01)은 ai 미지정 — 커브 체인에서 제외
				const ai = AI_RANK[s.ai]
				assert.ok(ai >= prevAi, `${id}: ai 레벨 역행`)
				prevAi = ai
			}
			const enemy = Object.entries(s.seeds).filter(([k]) => k !== 'p1').flatMap(([, v]) => v).length
			assert.ok(enemy >= prevEnemy, `${id}: 적 시드 수 역행 (${prevEnemy}→${enemy})`)
			prevEnemy = enemy
		}
	}
})

test('전 스테이지 데이터 유효성', () => {
	for (const id of STAGE_ORDER) {
		const s = STAGES[id]
		const { w, h } = s.grid
		assert.ok(w >= 5 && w <= 12 && h >= 5 && h <= 12, `${id}: grid 범위`)
		assert.ok(w <= 10, `${id}: w>10 이면 village pos 가 두 자리 x 필요`)
		assert.ok(Number.isInteger(s.parTurns) && s.parTurns > 0, `${id}: parTurns`)
		assert.ok(s.ai === undefined || s.ai in DIFFICULTY, `${id}: ai 레벨 오타`)
		const teams = s.teams ?? 2
		assert.ok(teams >= 2 && teams <= 4, `${id}: teams 범위`)

		// blocked: 격자 내·중복 없음
		const blockedSet = new Set()
		for (const b of s.blocked) {
			assert.ok(b.x >= 0 && b.x < w && b.y >= 0 && b.y < h, `${id}: blocked ${key(b)} 격자 밖`)
			assert.ok(!blockedSet.has(key(b)), `${id}: blocked ${key(b)} 중복`)
			blockedSet.add(key(b))
		}

		// seeds: p1..pN 정확히 존재, 격자 내, 중복·blocked 충돌 없음
		assert.deepEqual(Object.keys(s.seeds).sort(), Array.from({ length: teams }, (_, i) => `p${i + 1}`).sort(), `${id}: seeds 키 ≠ teams`)
		const seedSet = new Set()
		for (const [team, list] of Object.entries(s.seeds)) {
			assert.ok(list.length >= 1, `${id}: ${team} 시드 없음`)
			for (const p of list) {
				assert.ok(p.x >= 0 && p.x < w && p.y >= 0 && p.y < h, `${id}: ${team} 시드 ${key(p)} 격자 밖`)
				assert.ok(!seedSet.has(key(p)), `${id}: 시드 ${key(p)} 중복`)
				assert.ok(!blockedSet.has(key(p)), `${id}: 시드 ${key(p)} 가 blocked 위`)
				seedSet.add(key(p))
			}
		}

		// village: pos 유효·중복 없음·blocked 위 금지·에셋 실존
		const posSet = new Set()
		for (const v of s.village) {
			const p = posToXY(v.pos)
			assert.ok(p.x >= 0 && p.x < w && p.y >= 0 && p.y < h, `${id}: village ${v.pos} 격자 밖`)
			assert.ok(!posSet.has(v.pos), `${id}: village ${v.pos} 중복`)
			assert.ok(!blockedSet.has(key(p)), `${id}: village ${v.pos} 가 blocked 위`)
			posSet.add(v.pos)
			assert.ok(CARTO.has(v.asset), `${id}: 에셋 ${v.asset}.png 없음`)
		}
	}
})

test('전 스테이지 엔진 기동 — 전 팀 첫 수 존재 + 전 빈 칸 도달 가능', () => {
	for (const id of STAGE_ORDER) {
		const s = STAGES[id]
		const teams = TEAMS_POOL.slice(0, s.teams ?? 2)
		const map = new GameMap({ seed: 1, grid: s.grid, blocked: s.blocked, teams })
		map.clear()
		Object.entries(s.seeds).forEach(([tm, list]) => {
			const uid = teams[+tm.slice(1) - 1]
			list.forEach(a => map.initField(uid, a)) // blocked/점유 위 시드면 여기서 throw
		})
		map.initialized()
		for (const uid of teams) {
			assert.ok(map.legalMoves(uid).length > 0, `${id}: ${uid} 첫 수 없음`)
		}

		// 도달성: 비-blocked 칸 그래프(체비쇼프 거리≤2 = CLONE/MOVE 인접)가 연결돼야 함
		const { w, h } = s.grid
		const blockedSet = new Set(s.blocked.map(key))
		const free = []
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			if (!blockedSet.has(`${x},${y}`)) free.push({ x, y })
		}
		const visited = new Set([key(free[0])])
		const queue = [free[0]]
		while (queue.length) {
			const c = queue.pop()
			for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
				const n = { x: c.x + dx, y: c.y + dy }
				const k = key(n)
				if (n.x < 0 || n.x >= w || n.y < 0 || n.y >= h) continue
				if (blockedSet.has(k) || visited.has(k)) continue
				visited.add(k)
				queue.push(n)
			}
		}
		assert.equal(visited.size, free.length, `${id}: 고립 구역 존재 (${free.length - visited.size}칸 도달 불가)`)
	}
})

test('effectiveDifficulty — 노브 ±1 시프트 + 경계 클램프', () => {
	assert.equal(effectiveDifficulty('easy', 'normal'), 'easy')
	assert.equal(effectiveDifficulty('easy', 'hard'), 'normal')
	assert.equal(effectiveDifficulty('easy', 'easy'), 'easy')       // 하한 클램프
	assert.equal(effectiveDifficulty('hard', 'easy'), 'normal')
	assert.equal(effectiveDifficulty('hard', 'hard'), 'hard')       // 상한 클램프
	assert.equal(effectiveDifficulty('normal', 'hard'), 'hard')
	assert.equal(effectiveDifficulty(undefined, 'normal'), 'normal') // ai 미지정 = 노브 그대로
	assert.equal(effectiveDifficulty(undefined, 'easy'), 'easy')
})
