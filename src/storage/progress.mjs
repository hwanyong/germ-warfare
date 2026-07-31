// 진행 저장(A5) — 스테이지 × 난이도별 최고점. 승리 시에만 기록.
// localStorage. 구조: { [stageId]: { easy|normal|hard: { best, wins, plays } } }
// 참고: docs/roadmap.md PHASE A(A5), ADR-006(원장 규율 — 통화 아님·순수 전적이라 스냅샷 허용)

import { STAGE_ORDER } from '../data/stages.mjs'

const KEY = 'gw-progress-v1'

// 점수 공식(승리 시): (own*10 + margin*8) * elimMult + fastBonus
//  margin = own - enemy, elimMult = 전멸 2.0, fastBonus = max(0, parTurns - turns) * 12
export const SCORE = { OWN: 10, MARGIN: 8, ELIM_MULT: 2.0, FAST: 12 }

/** 점수 항목 분해 — result 씬 절차 연출용. computeScore 와 단일 공식(SSOT). */
export function scoreBreakdown({ own, enemy, turns, parTurns }) {
	const margin = own - enemy
	const elim = enemy === 0
	const germs = own * SCORE.OWN
	const marginPts = margin * SCORE.MARGIN
	const sub = germs + marginPts
	const mult = elim ? SCORE.ELIM_MULT : 1.0
	const fast = Math.max(0, parTurns - turns) * SCORE.FAST
	return { own, margin, germs, marginPts, elim, mult, sub, fast, total: Math.round(sub * mult + fast) }
}

export const computeScore = params => scoreBreakdown(params).total

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

/** 이 기기에 저장된 진행기록이 있는가 — 재방문 판정용(analytics session_start) */
export function hasAnyProgress() {
	return Object.keys(load()).length > 0
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

// QR 기기간 이전(A7) — 고정 레이아웃 바이너리. JSON 키 반복(best/wins/plays) 제거해
// 60레코드 기준 ~2.5KB → ~362B로 압축(스테이지·난이도 순서를 오프셋으로 대체).
const BIN_VERSION = 1
const DIFFS = ['easy', 'normal', 'hard']
const RECORD_BYTES = DIFFS.length * 3 * 2 // 난이도3 × 필드3(best,wins,plays) × uint16

/** 진행기록 → Uint8Array. 헤더[version,stageCount] + STAGE_ORDER×DIFFS 순서 고정 슬롯. */
export function exportBinary() {
	const data = load()
	const buf = new ArrayBuffer(2 + STAGE_ORDER.length * RECORD_BYTES)
	const view = new DataView(buf)
	view.setUint8(0, BIN_VERSION)
	view.setUint8(1, STAGE_ORDER.length)
	let offset = 2
	for (const stageId of STAGE_ORDER) {
		for (const diff of DIFFS) {
			const rec = data[stageId]?.[diff] ?? { best: 0, wins: 0, plays: 0 }
			view.setUint16(offset, rec.best, true); offset += 2
			view.setUint16(offset, rec.wins, true); offset += 2
			view.setUint16(offset, rec.plays, true); offset += 2
		}
	}
	return new Uint8Array(buf)
}

/** 바이너리 → 미리보기 객체. 저장은 하지 않음(확인 UI가 동의 후 applyImport 호출). */
export function decodeBinary(bytes) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const version = view.getUint8(0)
	if (version !== BIN_VERSION) throw new Error(`[progress] 지원하지 않는 백업 버전: ${version}`)
	const stageCount = Math.min(view.getUint8(1), STAGE_ORDER.length)
	const stages = []
	let offset = 2
	for (let i = 0; i < stageCount; i++) {
		const rec = { id: STAGE_ORDER[i] }
		for (const diff of DIFFS) {
			rec[diff] = {
				best: view.getUint16(offset, true),
				wins: view.getUint16(offset + 2, true),
				plays: view.getUint16(offset + 4, true)
			}
			offset += 6
		}
		stages.push(rec)
	}
	return { stages }
}

// 병합 = 필드별 최댓값(merge-max) — 어느 방향으로 가져와도 진행 후퇴 없음(ADR-006 원장 규율).
// data 를 in-place 반영(호출부가 save 여부를 결정 — previewImport/applyImport 공용).
function mergeData(data, parsed) {
	let changedStages = 0
	let newBests = 0
	for (const { id, ...diffs } of parsed.stages) {
		const stage = (data[id] ??= {})
		let stageChanged = false
		for (const diff of DIFFS) {
			const incoming = diffs[diff]
			const rec = (stage[diff] ??= { best: 0, wins: 0, plays: 0 })
			if (incoming.best > rec.best) { rec.best = incoming.best; newBests++; stageChanged = true }
			if (incoming.wins > rec.wins) { rec.wins = incoming.wins; stageChanged = true }
			if (incoming.plays > rec.plays) { rec.plays = incoming.plays; stageChanged = true }
		}
		if (stageChanged) changedStages++
	}
	return { changedStages, newBests }
}

/** 저장 없이 병합 결과만 미리 계산 — 확인 UI 요약 표시용. */
export function previewImport(parsed) {
	return mergeData(load(), parsed)
}

/** 실제 병합 + 저장. @returns {{changedStages:number, newBests:number}} */
export function applyImport(parsed) {
	const data = load()
	const summary = mergeData(data, parsed)
	save(data)
	return summary
}
