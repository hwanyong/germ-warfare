// 규칙 엔진 스모크 + 결정성 테스트.
// 실행: node --test src/game/test/
//
// 목적: src/game 순수 추출이 실제로 동작함을 증명(미배선/미구현 0) +
// 시드 PRNG가 결정성을 보장함을 증명(미래 서버 재시뮬의 전제).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { GameMap, USERS } from '../index.mjs'

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
