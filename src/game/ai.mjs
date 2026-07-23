// 스텁 AI (PHASE B) — 합법수 중 즉시 감염 이득 최대 그리디 + 약간 무작위.
// 본격 negamax/난이도는 PHASE D. 지금은 플레이 성립용.
import { USERS } from './map.mjs'

const rival = t => (t === USERS.ID0 ? USERS.ID1 : USERS.ID0)

// (from,to) 후보의 즉시 점수 = (CLONE?+1:0) + 2*(타겟 8방향 적 수) [감염 이득]
function scoreMove(fields, userId, from, to, type) {
	const enemy = rival(userId)
	let flips = 0
	for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
		if (!dx && !dy) continue
		const nx = to.x + dx, ny = to.y + dy
		if (fields[ny]?.[nx] === enemy) flips++
	}
	const gain = (type === 1 /* CLONE */ ? 1 : 0) + 2 * flips
	return gain
}

/**
 * userId 의 한 수 선택.
 * @returns {{from:{x,y}, to:{x,y}, type:'clone'|'move'}|null}
 */
export function pickMove(map, userId, rng = Math.random) {
	const fields = map.fields
	const candidates = []
	fields.forEach((row, y) => row.forEach((owner, x) => {
		if (owner !== userId) return
		for (const m of map.legalMovesFrom(userId, { x, y })) {
			candidates.push({ from: { x, y }, to: { x: m.x, y: m.y }, type: m.type, s: scoreMove(fields, userId, { x, y }, m, m.type) })
		}
	}))
	if (!candidates.length) return null

	// 최고 점수 그룹 중 무작위 (약간의 변주)
	const best = Math.max(...candidates.map(c => c.s))
	const top = candidates.filter(c => c.s >= best)
	const pick = top[Math.floor(rng() * top.length)]
	return { from: pick.from, to: pick.to, type: pick.type === 1 ? 'clone' : 'move' }
}
