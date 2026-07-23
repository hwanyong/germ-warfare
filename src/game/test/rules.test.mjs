// 규칙 엔진 스모크 + 결정성 테스트.
// 실행: node --test src/game/test/
//
// 목적: src/game 순수 추출이 실제로 동작함을 증명(미배선/미구현 0) +
// 시드 PRNG가 결정성을 보장함을 증명(미래 서버 재시뮬의 전제).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { GameMap, USERS } from '../index.mjs'
import { gridMoves, gridApply, gridMaterial } from '../map.mjs'
import { pickMove } from '../ai.mjs'
import { mulberry32 } from '../rng.mjs'

// 표준 코너 시드: ID0 = (0,0),(6,0) / ID1 = (0,6),(6,6)
function seededGame(seed) {
	const map = new GameMap({ seed })
	map.clear()
	map.initField(USERS.ID0, { x: 0, y: 0 })
	map.initField(USERS.ID0, { x: 6, y: 0 })
	map.initField(USERS.ID1, { x: 0, y: 6 })
	map.initField(USERS.ID1, { x: 6, y: 6 })
	map.initialized()
	return map
}

test('초기화: 각 팀 코너 2칸', () => {
	const map = seededGame(42)
	assert.equal(map.isInitialized, true)
	assert.equal(map.count[USERS.ID0], 2)
	assert.equal(map.count[USERS.ID1], 2)
	assert.equal(map.seed, 42)
})

test('CLONE: 인접 빈칸 점령 시 내 칸 +1, 원본 유지', () => {
	const map = seededGame(42)
	// (1,0) 은 (0,0)[ID0] 과 거리 1 → CLONE 가능
	map.setField(USERS.ID0, { x: 1, y: 0 })
	assert.equal(map.count[USERS.ID0], 3)
	assert.equal(map.count[USERS.ID1], 2)
	assert.equal(map.fields[0][1], USERS.ID0) // fields[y][x]
})

test('결정성: 동일 시드 + 동일 수순 → 동일 결과', () => {
	const play = seed => {
		const map = seededGame(seed)
		map.setField(USERS.ID0, { x: 1, y: 0 })
		map.setField(USERS.ID1, { x: 1, y: 6 })
		map.setField(USERS.ID0, { x: 2, y: 1 })
		return JSON.stringify(map.count)
	}
	assert.equal(play(7), play(7))
})

test('A2 legalMoves: 초기 상태에서 양팀 모두 합법수 존재, 좌표는 빈 칸', () => {
	const map = seededGame(11)
	const m0 = map.legalMoves(USERS.ID0)
	const m1 = map.legalMoves(USERS.ID1)
	assert.ok(m0.length > 0 && m1.length > 0)
	for (const { x, y } of m0) assert.equal(map.fields[y][x], null)
})

test('B applyMove: CLONE(거리1) 원본유지 +1, MOVE(거리2) 원본소멸 순증0', () => {
	// CLONE
	const a = seededGame(11)
	const before = a.count[USERS.ID0]
	a.applyMove(USERS.ID0, { x: 0, y: 0 }, { x: 1, y: 1 }) // 거리1
	assert.equal(a.count[USERS.ID0], before + 1)
	assert.equal(a.fields[1][1], USERS.ID0)
	assert.equal(a.fields[0][0], USERS.ID0) // 원본 유지

	// MOVE (거리2): 원본 소멸 → 순증 0 (감염 없을 때)
	const b = seededGame(11)
	const c0 = b.count[USERS.ID0]
	b.applyMove(USERS.ID0, { x: 0, y: 0 }, { x: 2, y: 2 }) // 거리2
	assert.equal(b.fields[2][2], USERS.ID0)
	assert.equal(b.fields[0][0], null) // 원본 소멸
	assert.equal(b.count[USERS.ID0], c0) // 순증 0

	// 불법 이동은 throw
	assert.throws(() => a.applyMove(USERS.ID0, { x: 0, y: 0 }, { x: 5, y: 5 }))
})

test('B legalMovesFrom: 자기 칸에서만, 거리1=CLONE 거리2=MOVE', () => {
	const map = seededGame(11)
	const from = { x: 0, y: 0 }
	const moves = map.legalMovesFrom(USERS.ID0, from)
	assert.ok(moves.length > 0)
	for (const m of moves) {
		const d = Math.max(Math.abs(m.x - from.x), Math.abs(m.y - from.y))
		assert.ok(d === 1 || d === 2)
		assert.equal(map.fields[m.y][m.x], null)
	}
	assert.equal(map.legalMovesFrom(USERS.ID1, from).length, 0) // 남의 칸
})

test('A2 terminal/winner: 초기 미종료, 전멸 시 종료·승자 판정', () => {
	const map = seededGame(11)
	assert.equal(map.isTerminal(), false)
	assert.equal(map.totalCells, 49)

	// ID1 전멸 시나리오: 초기화만 ID0 4칸으로
	const solo = new GameMap({ seed: 3 })
	solo.clear()
	solo.initField(USERS.ID0, { x: 0, y: 0 })
	solo.initField(USERS.ID0, { x: 6, y: 6 })
	solo.initialized()
	assert.equal(solo.isTerminal(), true) // count[ID1]==0
	assert.equal(solo.winner(), USERS.ID0)
})

test('D grid 유틸: gridApply 는 원본 그리드 불변(순수) + 감염 정확', () => {
	const map = seededGame(11)
	const grid = map.fields.map(r => r.slice())
	const snapshot = JSON.stringify(grid)
	const next = gridApply(grid, USERS.ID0, { x: 0, y: 0 }, { x: 1, y: 1 })
	assert.equal(JSON.stringify(grid), snapshot) // 원본 불변
	assert.equal(next[1][1], USERS.ID0)
	// gridApply 결과 = 엔진 applyMove 결과와 동일해야 (규칙 정합)
	map.applyMove(USERS.ID0, { x: 0, y: 0 }, { x: 1, y: 1 })
	assert.equal(JSON.stringify(next), JSON.stringify(map.fields))
})

test('D gridMoves = 엔진 legalMovesFrom 합집합과 동일', () => {
	const map = seededGame(11)
	const grid = map.fields.map(r => r.slice())
	const g = gridMoves(grid, USERS.ID0)
	let engineCount = 0
	grid.forEach((row, y) => row.forEach((o, x) => {
		if (o === USERS.ID0) engineCount += map.legalMovesFrom(USERS.ID0, { x, y }).length
	}))
	assert.equal(g.length, engineCount)
})

test('D riskAt: 원본 점수표 노출 — 적 인접 칸일수록 내 risk 큼', () => {
	const map = seededGame(11)
	// (1,5): ID1(0,6) 거리1 → risk 5+1=6. (3,1): ID1 두 시드 모두 거리5 → 1+1=2.
	const nearEnemy = map.riskAt({ x: 1, y: 5 })[USERS.ID0]
	const farEnemy = map.riskAt({ x: 3, y: 1 })[USERS.ID0]
	assert.ok(nearEnemy > farEnemy, `${nearEnemy} > ${farEnemy}`)
})

test('D pickMove: 세 난이도 모두 합법수 반환 + hard 결정적', () => {
	const map = seededGame(11)
	for (const d of ['easy', 'normal', 'hard']) {
		const mv = pickMove(map, USERS.ID1, d, mulberry32(5))
		assert.ok(mv && (mv.type === 'clone' || mv.type === 'move'))
		const legal = map.legalMovesFrom(USERS.ID1, mv.from).some(m => m.x === mv.to.x && m.y === mv.to.y)
		assert.ok(legal, `${d} 합법수`)
	}
	// hard = 노이즈 0 → 같은 판이면 같은 수
	const a = pickMove(map, USERS.ID1, 'hard', mulberry32(1))
	const b = pickMove(map, USERS.ID1, 'hard', mulberry32(99))
	assert.deepEqual(a, b)
})

test('D 난이도 강도: hard(negamax, 후공) 가 easy(블런더) 를 종국에서 이김', () => {
	const map = seededGame(7)
	const rng = mulberry32(3)
	for (let i = 0; i < 200 && !map.isTerminal(); i++) {
		const uid = i % 2 === 0 ? USERS.ID0 : USERS.ID1
		const d = uid === USERS.ID0 ? 'easy' : 'hard'
		const mv = pickMove(map, uid, d, rng)
		if (!mv) continue // 패스
		map.applyMove(uid, mv.from, mv.to)
	}
	assert.equal(map.winner(), USERS.ID1, `hard 승자여야 (count ${JSON.stringify(map.count)})`)
})

test('E 그리드 파라미터화: 9x9 + blocked — 점령 불가·totalCells·terminal 정합', () => {
	const map = new GameMap({ seed: 5, grid: { w: 9, h: 9 }, blocked: [{ x: 4, y: 4 }] })
	map.clear()
	map.initField(USERS.ID0, { x: 0, y: 0 })
	map.initField(USERS.ID1, { x: 8, y: 8 })
	map.initialized()
	assert.equal(map.fields.length, 9)
	assert.equal(map.fields[0].length, 9)
	assert.equal(map.totalCells, 81 - 1)          // blocked 제외
	assert.equal(map.fields[4][4], 'BLOCKED')     // 그리드에 마커 노출
	// blocked 는 합법 타겟 아님
	const all = map.legalMoves(USERS.ID0)
	assert.ok(all.every(m => !(m.x === 4 && m.y === 4)))
	// blocked 점령 시도 → 오류 (applyMove 불법)
	assert.throws(() => map.applyMove(USERS.ID0, { x: 0, y: 0 }, { x: 4, y: 4 }))
	// count 는 blocked 오염 없음
	assert.deepEqual(map.count, { [USERS.ID0]: 1, [USERS.ID1]: 1 })
})

test('E blocked 위 AI: gridMoves 가 blocked 타겟 제외 + pickMove 합법', () => {
	const map = new GameMap({ seed: 5, grid: { w: 7, h: 7 }, blocked: [{ x: 1, y: 1 }] })
	map.clear()
	map.initField(USERS.ID0, { x: 0, y: 0 })
	map.initField(USERS.ID1, { x: 6, y: 6 })
	map.initialized()
	const g = map.fields.map(r => r.slice())
	const moves = gridMoves(g, USERS.ID0)
	assert.ok(moves.every(m => !(m.to.x === 1 && m.to.y === 1)), 'blocked 타겟 제외')
	const mv = pickMove(map, USERS.ID0, 'hard', mulberry32(2))
	assert.ok(!(mv.to.x === 1 && mv.to.y === 1))
})

test('G N:N 프리포올: 4팀 감염·count·winner 정합', () => {
	const T = [USERS.ID0, USERS.ID1, 'USER2', 'USER3']
	const map = new GameMap({ seed: 9, grid: { w: 9, h: 9 }, teams: T })
	map.clear()
	map.initField(T[0], { x: 0, y: 0 })
	map.initField(T[1], { x: 8, y: 8 })
	map.initField(T[2], { x: 8, y: 0 })
	map.initField(T[3], { x: 0, y: 8 })
	map.initialized()
	assert.deepEqual(Object.keys(map.count).length, 4)
	assert.equal(map.isTerminal(), false)

	// T2 옆에 T0 이 붙으면 감염으로 T2 말이 T0 소유가 됨 (프리포올: 타팀 전부 감염)
	map.applyMove(T[0], { x: 0, y: 0 }, { x: 1, y: 1 })
	map.applyMove(T[0], { x: 1, y: 1 }, { x: 3, y: 1 }) // MOVE 접근
	map.applyMove(T[0], { x: 3, y: 1 }, { x: 5, y: 1 })
	map.applyMove(T[0], { x: 5, y: 1 }, { x: 7, y: 1 }) // (8,0) T2 인접
	assert.equal(map.fields[0][8], T[0], 'T2 말이 감염됨')
	assert.equal(map.count[T[2]], 0)
	// 승자: 최다 칸 = T0
	assert.equal(map.winner(), T[0])
	// 4팀에서 AI(그리디 폴백)도 합법수 반환
	const mv = pickMove(map, T[1], 'hard', mulberry32(4))
	assert.ok(mv)
})

test('autoFinish 회귀: 전멸(isTerminal=true) 상태에서도 클론 채움 가능해야', () => {
	// 적 전멸 + 빈칸 다수 보드
	const map = new GameMap({ seed: 1 })
	map.clear()
	map.initField(USERS.ID0, { x: 0, y: 0 })
	map.initialized() // ID1 없음 = 전멸 상태
	assert.equal(map.isTerminal(), true) // 생존 ≤ 1 → terminal
	// 그러나 빈칸이 남아있고 클론 수는 존재 → autoFinish 는 isTerminal 가드가 아니라
	// 빈칸 가드로 순회해야 함 (가드가 isTerminal 이면 한 칸도 못 채움 — 회귀 방지)
	const empties = map.totalCells - map.count[USERS.ID0] - map.count[USERS.ID1]
	assert.ok(empties > 0)
	const clones = gridMoves(map.fields.map(r => r.slice()), USERS.ID0).filter(m => m.clone)
	assert.ok(clones.length > 0)
	// 한 칸 채움 시뮬 — applyMove 정상 동작
	map.applyMove(USERS.ID0, clones[0].from, clones[0].to)
	assert.equal(map.count[USERS.ID0], 2)
})
