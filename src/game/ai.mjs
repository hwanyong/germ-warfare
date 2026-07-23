// AI (PHASE D) — 원본 점수표(risk) 재사용 + 2노브 난이도.
//
// move값 = 공격이득(감염×2 + 복제+1) − RISK_W × 원본 risk[me][타겟]   ← 공격+수비
// 노브 A(결정도): easy=큰 노이즈+블런더, normal=작은 노이즈 → move값 argmax
// 노브 B(깊이):   hard=negamax+αβ depth3 (리프 eval=말수차, 루트 정렬=move값)
// 참고: docs/roadmap.md PHASE D
import { USERS, gridMoves, gridApply, gridMaterial, rivalOf } from './map.mjs'

const RISK_W = 0.35 // 수비 가중 (risk 스케일 ≈ 0~20, 감염이득 ≈ 0~12)

export const DIFFICULTY = {
	easy: { noise: 6, blunder: 0.35, depth: 0 },
	normal: { noise: 1.5, blunder: 0.08, depth: 0 },
	hard: { noise: 0, blunder: 0, depth: 3 }
}

// 즉시 감염 수 (그리드 기준)
function flipsAt(grid, userId, to) {
	const enemy = rivalOf(userId)
	let n = 0
	for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
		if (!dx && !dy) continue
		if (grid[to.y + dy]?.[to.x + dx] === enemy) n++
	}
	return n
}

// move값 = 공격이득 − 수비(원본 risk 점수표)
function moveValue(map, grid, userId, mv) {
	const attack = flipsAt(grid, userId, mv.to) * 2 + (mv.clone ? 1 : 0)
	const exposure = map.riskAt(mv.to)[userId] // 원본 점수표: 타겟에서 내가 받는 압박
	return attack - RISK_W * exposure
}

// negamax + alpha-beta. 리프 eval = 말수차(지배항).
function negamax(grid, userId, depth, alpha, beta) {
	const moves = gridMoves(grid, userId)
	if (depth === 0 || moves.length === 0) {
		if (moves.length === 0) {
			// 상대도 못 두면 종국 평가, 아니면 패스
			const enemy = rivalOf(userId)
			if (gridMoves(grid, enemy).length === 0) {
				const m = gridMaterial(grid, userId)
				return m > 0 ? 1000 + m : m < 0 ? -1000 + m : 0
			}
			return -negamax(grid, rivalOf(userId), depth, -beta, -alpha)
		}
		return gridMaterial(grid, userId)
	}
	let best = -Infinity
	for (const mv of moves) {
		const next = gridApply(grid, userId, mv.from, mv.to)
		const score = -negamax(next, rivalOf(userId), depth - 1, -beta, -alpha)
		if (score > best) best = score
		if (best > alpha) alpha = best
		if (alpha >= beta) break // αβ 컷
	}
	return best
}

/**
 * userId 의 한 수 선택.
 * @param {'easy'|'normal'|'hard'} difficulty
 * @returns {{from:{x,y}, to:{x,y}, type:'clone'|'move'}|null}
 */
export function pickMove(map, userId, difficulty = 'normal', rng = Math.random) {
	const cfg = DIFFICULTY[difficulty] ?? DIFFICULTY.normal
	const grid = map.fields.map(row => row.slice())
	const moves = gridMoves(grid, userId)
	if (!moves.length) return null

	const valued = moves.map(mv => ({ ...mv, v: moveValue(map, grid, userId, mv) }))

	let pick
	if (cfg.depth > 0) {
		// Hard: negamax. 루트 정렬 = move값(αβ 효율) → 최고 탐색점수, 동점 시 move값.
		valued.sort((a, b) => b.v - a.v)
		let bestScore = -Infinity
		for (const mv of valued) {
			const next = gridApply(grid, userId, mv.from, mv.to)
			const s = -negamax(next, rivalOf(userId), cfg.depth - 1, -Infinity, Infinity)
			mv.s = s
			if (s > bestScore) { bestScore = s; pick = mv }
		}
	} else {
		// Easy/Normal: 결정도 노브 — 블런더(완전 랜덤) + 노이즈 얹은 argmax
		if (rng() < cfg.blunder) {
			pick = valued[Math.floor(rng() * valued.length)]
		} else {
			let best = -Infinity
			for (const mv of valued) {
				const noisy = mv.v + (rng() * 2 - 1) * cfg.noise
				if (noisy > best) { best = noisy; pick = mv }
			}
		}
	}

	return { from: pick.from, to: pick.to, type: pick.clone ? 'clone' : 'move' }
}
