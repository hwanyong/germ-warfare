// Seedable PRNG (mulberry32).
//
// 규칙 엔진의 유일한 무작위 지점(getMoveTarget 동점 타이브레이크)을 결정적으로
// 만들기 위한 시드 기반 난수. 데모에서는 재현/디버깅용, 미래의 멀티플레이어 앱
// (별도 개발)에서는 서버 권위 재시뮬레이션의 전제조건이 된다.
// 참고: docs/decisions/ADR-006-anticheat-scope.md

/**
 * @param {number} seed - 32bit unsigned 정수 시드
 * @returns {() => number} 매 호출마다 [0, 1) 실수를 내는 결정적 난수 함수
 */
export function mulberry32(seed) {
	let a = seed >>> 0

	return function () {
		a |= 0
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/**
 * 시드를 명시하지 않은 캐주얼 플레이용 무작위 시드.
 * @returns {number} 32bit unsigned 정수
 */
export function randomSeed() {
	return Math.floor(Math.random() * 0x100000000)
}
