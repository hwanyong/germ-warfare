// 진행 저장(A5) — 스테이지 × 난이도별 최고점. 승리 시에만 기록.
// localStorage. 구조: { [stageId]: { easy|normal|hard: { best, wins, plays } } }
// 참고: docs/roadmap.md PHASE A(A5), ADR-006(원장 규율 — 통화 아님·순수 전적이라 스냅샷 허용)

const KEY = 'gw-progress-v1'

// 점수 공식(승리 시): (own*10 + margin*8) * elimMult + fastBonus
//  margin = own - enemy, elimMult = 전멸 2.0, fastBonus = max(0, parTurns - turns) * 12
export const SCORE = { OWN: 10, MARGIN: 8, ELIM_MULT: 2.0, FAST: 12 }

export function computeScore({ own, enemy, turns, parTurns }) {
	const margin = own - enemy
	const elimMult = enemy === 0 ? SCORE.ELIM_MULT : 1.0
	const fastBonus = Math.max(0, parTurns - turns) * SCORE.FAST
	return Math.round((own * SCORE.OWN + margin * SCORE.MARGIN) * elimMult + fastBonus)
}

function load() {
	try { return JSON.parse(localStorage.getItem(KEY)) ?? {} }
	catch { return {} }
}
function save(data) {
	localStorage.setItem(KEY, JSON.stringify(data))
}

export function getRecord(stageId, difficulty) {
	return load()[stageId]?.[difficulty] ?? { best: 0, wins: 0, plays: 0 }
}

/** 플레이 1회 기록. 승리 시에만 score 반영. @returns {{best, newBest}} */
export function recordPlay(stageId, difficulty, { win, score = 0 }) {
	const data = load()
	const stage = (data[stageId] ??= {})
	const rec = (stage[difficulty] ??= { best: 0, wins: 0, plays: 0 })
	rec.plays++
	let newBest = false
	if (win) {
		rec.wins++
		if (score > rec.best) { rec.best = score; newBest = true }
	}
	save(data)
	return { best: rec.best, newBest }
}

/** 해당 스테이지를 (아무 난이도로든) 승리한 적 있는가 — 다음 스테이지 해금 판정 */
export function hasWin(stageId) {
	const s = load()[stageId]
	return !!s && Object.values(s).some(r => r.wins > 0)
}

// 튜토리얼 완료 플래그 (A6)
const TUT_KEY = 'gw-tutorial-done'
export const isTutorialDone = () => localStorage.getItem(TUT_KEY) === '1'
export const setTutorialDone = () => localStorage.setItem(TUT_KEY, '1')
