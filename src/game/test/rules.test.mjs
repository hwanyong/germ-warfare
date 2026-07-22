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
