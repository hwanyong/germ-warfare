// Germ Warfare (세균전) = Ataxx/감염 영토전 규칙 엔진 (SSOT).
//
// 7x7 그리드, 2팀. 한 수 = 빈칸 점령: CLONE(인접 복제, 원본 유지) 또는
// MOVE/JUMP(거리 2 이동, 원본 제거). 점령 후 새 칸 8방향의 적 칸을 감염(뒤집기).
// 다수 칸 승리.
//
// 원본: GameRoomSystem/versions/v0_prototype/services/germwarfare/modules/map.mjs
// 변경점 (순수 추출):
//   1. `class Map` -> `class GameMap` (전역 Map 섀도잉 제거)
//   2. getMoveTarget 동점 타이브레이크의 Math.random -> 시드 PRNG (결정성 확보)
//   3. Twitch/네트워크 의존 없음. 순수 규칙만 (I/O 0). 미래 서버가 동일 코드로 재실행 가능.
//
// 참고: docs/architecture.md, docs/decisions/ADR-007-rules-ssot.md

import { STATE } from './constants.mjs'
import { mulberry32, randomSeed } from './rng.mjs'

const USERS = {
	ID0: 'USER0',
	ID1: 'USER1'
}
const BLOCKED = 'BLOCKED' // 막힌 칸 마커 (fields 그리드에 노출)

class Field {
	#axis = {
		x: null,
		y: null
	}
	#owner = null
	#teams = [USERS.ID0, USERS.ID1] // N팀 일반화 (프리포올)
	#riskMax = 6
	#score = { risk: {}, attack: {} }
	#relatedFields = []
	#rng = Math.random

	#events = {
		changed: (owner, axis) => {}
	}

	constructor(axis = null, events = {}, rng = Math.random, teams = [USERS.ID0, USERS.ID1]) {
		if (!axis) {
			throw new Error('Axis is required')
		}

		this.#axis = axis
		this.#rng = rng
		this.#teams = teams
		for (const t of teams) {
			this.#score.risk[t] = 0
			this.#score.attack[t] = STATE.ATTACK.INIT
		}

		this.#events = {
			...this.#events,
			...events
		}
	}

	get axis() {
		return this.#axis
	}
	get owner() {
		return this.#owner
	}
	set owner(userId) {
		this.#events.changed(this.#owner, userId, this.#axis)

		this.#owner = userId
	}
	get score() {
		return this.#score
	}
	get related() {
		return this.#relatedFields
	}
	set related(fields) {
		this.#relatedFields = fields
	}

	calculate = () => {
		for (const t of this.#teams) {
			this.#score.risk[t] = 0
			this.#score.attack[t] = STATE.ATTACK.IMPOSSIBLE
		}

		this.#relatedFields.forEach((fields, distance) => {
			const score = Math.max(0, this.#riskMax - distance)

			fields.forEach(field => {
				if (!this.#teams.includes(field.owner)) return // null/BLOCKED 는 risk·attack 무관

				// 프리포올: owner 가 아닌 모든 팀이 이 말로부터 압박을 받는다
				for (const t of this.#teams) {
					if (t !== field.owner) this.#score.risk[t] += score
				}

				if (this.#owner) return

				if (distance == 1) this.#score.attack[field.owner] = STATE.ATTACK.CLONE
				else if (distance == 2 && this.#score.attack[field.owner] != STATE.ATTACK.CLONE) this.#score.attack[field.owner] = STATE.ATTACK.MOVE
			})
		})
	}
	attack = (userId, target = null) => {
		if (this.#owner) {
			console.log('This field is already owned by', this.#owner)

			throw new Error('[00-00]This field is already owned')
		}

		if (this.#score.attack[userId] == STATE.ATTACK.IMPOSSIBLE) {
			console.log('Invalid distance')

			throw new Error('[00-01]Invalid distance')
		}

		this.owner = userId

		if (this.#score.attack[userId] == STATE.ATTACK.MOVE) {
			target.field.clear()
		}

		return this
	}
	move = userId => { // include clone
		const target = this.getMoveTarget(userId)

		if (target.type == STATE.ATTACK.IMPOSSIBLE) {
			console.error('Cannot move')

			throw new Error('[00-04]Cannot move')
		}

		return target
	}
	infect = userId => {
		this.#relatedFields[1].forEach(field => {
			// 프리포올: 인접한 모든 타팀 말 감염 (null/BLOCKED 제외)
			if (!this.#teams.includes(field.owner) || field.owner === userId) return

			field.owner = userId
		})
	}
	getMoveTarget = userId => {
		// get less risk
		// get short distance
		// compare risk and distance

		const target = {
			type: STATE.ATTACK.IMPOSSIBLE,
			field: null
		}

		if (this.#score.attack[userId] == STATE.ATTACK.IMPOSSIBLE) return target

		if (this.#score.attack[userId] == STATE.ATTACK.CLONE) {
			target.type = STATE.ATTACK.CLONE
			target.field = this.#relatedFields[1].find(field => field.owner == userId)

			return target
		}

		let minRisk = Infinity
		let targets = []

		// this.#relatedFields[2] 의 원소들 중에 owner == userId 이면서 risk가 가장 낮은 것들을 찾아 targets에 push
		this.#relatedFields[2].forEach(field => {
			if (field.owner != userId) return

			if (field.score.risk[userId] < minRisk) {
				minRisk = field.score.risk[userId]
				targets = [field]
			}
			else if (field.score.risk[userId] == minRisk) {
				targets.push(field)
			}
		})

		target.type = STATE.ATTACK.MOVE
		// 시드 PRNG로 동점 타이브레이크 → 결정적 (원본은 Math.random)
		target.field = targets[Math.floor(this.#rng() * targets.length)]

		return target
	}
	clear = () => {
		this.owner = null
	}
}
class GameMap {
	#canInit = true
	#w = 7
	#h = 7
	#blocked = [] // [{x,y}] 막힌 칸 (점령/통과 불가)
	#fields = []
	#fieldsBasedOnUser = []

	#teams = [USERS.ID0, USERS.ID1]
	#count = {}

	#seed = 0
	#rng = Math.random

	#events = {
		initialized: () => {},
		attacked: () => {},
		moved: () => {},
		infected: () => {}
	}

	#generateRelatedFieldAboutCurrentField = (fields, { x: colCrtIdx, y: rowCrtIdx }) => {
		const maxDist = Math.max(this.#w, this.#h) // 거리 버킷 0..maxDist-1
		return fields.reduce((accRow, _row, rowIdx) => _row.reduce((accCol, _col, colIdx) => {
			const distance = Math.max(Math.abs(rowIdx - rowCrtIdx), Math.abs(colIdx - colCrtIdx))

			accCol[distance].push(_col)

			return accCol
		}, accRow), Array.from({ length: maxDist }, () => []))
	}
	#initFields = fields => fields.map((row, rowCrtIdx) => row.map((col, colCrtIdx) => new Field({ x: colCrtIdx, y: rowCrtIdx }, {
		changed: this.#changeFieldOwner
	}, this.#rng, this.#teams)))
	#initRelatedFields = fields => {
		return fields.map((row, rowCrtIdx) => row.map((col, colCrtIdx) => {
			col.related = this.#generateRelatedFieldAboutCurrentField(fields, { x: colCrtIdx, y: rowCrtIdx })

			return col
		}))
	}
	#calcScore = () => {
		this.#fields.forEach(row => row.forEach(col => col.calculate()))
	}
	#changeFieldOwner = (before, after, axis) => {
		this.#fieldsBasedOnUser[axis.y][axis.x] = after

		if (before in this.#count) this.#count[before]--
		if (after in this.#count) this.#count[after]++
	}

	constructor({ events = {}, seed, grid, blocked, teams } = {}) {
		this.#seed = seed ?? randomSeed()
		this.#rng = mulberry32(this.#seed)
		this.#w = grid?.w ?? 7
		this.#h = grid?.h ?? 7
		this.#blocked = blocked ?? []
		this.#teams = teams ?? [USERS.ID0, USERS.ID1]
		for (const t of this.#teams) this.#count[t] = 0

		this.#events = {
			...this.#events,
			...events
		}
	}

	get teams() {
		return [...this.#teams]
	}

	get count() {
		return this.#count
	}
	get fields() {
		return this.#fieldsBasedOnUser
	}
	get isInitialized() {
		return !this.#canInit
	}
	get seed() {
		return this.#seed
	}
	get size() {
		return { w: this.#w, h: this.#h }
	}
	get blocked() {
		return this.#blocked.map(b => ({ ...b }))
	}

	//#region A2: legalMoves / terminal / winner (docs/roadmap.md PHASE A)
	/** userId 가 점령 가능한 빈 칸 목록. @returns {{x,y,type}[]} type=STATE.ATTACK.CLONE|MOVE */
	legalMoves = userId => {
		const moves = []
		this.#fields.forEach((row, y) => row.forEach((field, x) => {
			if (field.owner) return
			const t = field.score.attack[userId]
			if (t === STATE.ATTACK.CLONE || t === STATE.ATTACK.MOVE) moves.push({ x, y, type: t })
		}))
		return moves
	}
	/** 플레이 가능 칸 수 (막힌 칸 제외) */
	get totalCells() {
		return this.#w * this.#h - this.#blocked.length
	}
	/** 종료 판정: 보드 꽉참 / 생존팀 ≤1 / 전 생존팀 무수 (프리포올 일반화) */
	isTerminal = () => {
		const total = this.#teams.reduce((s, t) => s + this.#count[t], 0)
		if (total >= this.totalCells) return true
		const alive = this.#teams.filter(t => this.#count[t] > 0)
		if (alive.length <= 1) return true
		if (alive.every(t => this.legalMoves(t).length === 0)) return true
		return false
	}
	/** 승자 userId(최다 칸), 공동 1위면 null (isTerminal 후 호출) */
	winner = () => {
		let best = null, bestC = -1, tie = false
		for (const t of this.#teams) {
			const c = this.#count[t]
			if (c > bestC) { best = t; bestC = c; tie = false }
			else if (c === bestC) tie = true
		}
		return tie ? null : best
	}

	/** 명시적 소스 기준 합법 타겟. from(자기 칸)에서 거리1=CLONE, 거리2=MOVE 인 빈 칸. */
	legalMovesFrom = (userId, from) => {
		if (this.#fieldsBasedOnUser[from.y]?.[from.x] !== userId) return []
		const out = []
		this.#fieldsBasedOnUser.forEach((row, y) => row.forEach((owner, x) => {
			if (owner) return
			const d = Math.max(Math.abs(x - from.x), Math.abs(y - from.y))
			if (d === 1) out.push({ x, y, type: STATE.ATTACK.CLONE })
			else if (d === 2) out.push({ x, y, type: STATE.ATTACK.MOVE })
		}))
		return out
	}
	/** 타겟 칸의 원본 risk 점수표 조회 — { [USERS.ID0]:n, [USERS.ID1]:n }.
	 * risk[P] = P 가 그 칸에서 받는 적 근접 압박(거리 가중 6−d 합). 높을수록 위험/노출. */
	riskAt = ({ x, y }) => ({ ...this.#fields[y][x].score.risk })

	/** 소스→타겟 적용. CLONE(거리1, 원본유지) / MOVE(거리2, 원본소멸) + 감염. @returns 'clone'|'move' */
	applyMove = (userId, from, to) => {
		const legal = this.legalMovesFrom(userId, from).find(m => m.x === to.x && m.y === to.y)
		if (!legal) throw new Error('[00-05]Illegal move')
		const move = legal.type === STATE.ATTACK.MOVE
		this.#fields[to.y][to.x].owner = userId        // count++ (changed 이벤트)
		if (move) this.#fields[from.y][from.x].clear()  // MOVE: 원본 소멸 (count--)
		this.#fields[to.y][to.x].infect(userId)         // 인접 적 감염
		this.#calcScore()
		return move ? 'move' : 'clone'
	}
	//#endregion

	initialized = () => {
		this.#canInit = false

		this.#calcScore()

		this.#events.initialized()
	}
	initField = (userId, axis) => {
		if (!this.#canInit) {
			console.error('Cannot init field after initialized')

			throw new Error('[00-02]Cannot init field after initialized')
		}

		this.#fields[axis.y][axis.x].attack(userId)
	}
	setField = (userId, axis) => {
		if (this.#canInit) {
			console.error('Cannot set field before initialized')

			throw new Error('[00-03]Cannot set field before initialized')
		}

		try {
			const target = this.#fields[axis.y][axis.x].move(userId)
			this.#events.moved()

			this.#fields[axis.y][axis.x].attack(userId, target) //* Same: this.initField(userId, axis)
			this.#events.attacked()

			this.#fields[axis.y][axis.x].infect(userId)
			this.#events.infected()

			this.#calcScore()
		}
		catch (err) {
			console.error(err)
		}
	}
	clear() {
		const blank = Array.from({ length: this.#h }, () => Array.from({ length: this.#w }, () => 0))
		this.#fieldsBasedOnUser = Array.from({ length: this.#h }, () => Array.from({ length: this.#w }, () => null))
		this.#fields = this.#initFields(blank)
		this.#fields = this.#initRelatedFields(this.#fields)

		for (const t of this.#teams) this.#count[t] = 0

		// 막힌 칸 마킹 (점령 불가, risk/감염 무관)
		for (const { x, y } of this.#blocked) {
			this.#fields[y][x].owner = BLOCKED
		}

		this.#canInit = true
	}
	display = () => {
		const table = this.#fields.map(row => row.map(col =>
			col.owner === USERS.ID0 ? '0' : col.owner === USERS.ID1 ? '1' : col.owner === BLOCKED ? '#' : '-'
		))
		console.table(table)
		console.table(this.#count)
	}
}

//#region D: 경량 그리드 시뮬 (AI 룩어헤드 전용)
// owner 2D 그리드(map.fields 사본)만 다루는 순수 함수들. 규칙은 위 Field/GameMap 과
// 동일해야 한다(CLONE 거리1 원본유지 / MOVE 거리2 원본소멸 / 감염=거리1 적 뒤집기).
// 규칙 SSOT 유지를 위해 이 파일에 함께 둔다.

const rivalOf = u => (u === USERS.ID0 ? USERS.ID1 : USERS.ID0)

/** map.fields 딥클론 */
const cloneGrid = grid => grid.map(row => row.slice())

/** 그리드에서 userId 의 모든 (from,to) 합법수 */
function gridMoves(grid, userId) {
	const out = []
	const H = grid.length, W = grid[0].length
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
		if (grid[y][x] !== userId) continue
		for (let ty = Math.max(0, y - 2); ty <= Math.min(H - 1, y + 2); ty++)
			for (let tx = Math.max(0, x - 2); tx <= Math.min(W - 1, x + 2); tx++) {
				if (grid[ty][tx] !== null) continue
				const d = Math.max(Math.abs(tx - x), Math.abs(ty - y))
				if (d === 1 || d === 2) out.push({ from: { x, y }, to: { x: tx, y: ty }, clone: d === 1 })
			}
	}
	return out
}

/** 그리드에 수 적용(새 그리드 반환) — CLONE/MOVE + 감염(모든 인접 타팀, 프리포올) */
function gridApply(grid, userId, from, to) {
	const g = cloneGrid(grid)
	const d = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y))
	g[to.y][to.x] = userId
	if (d === 2) g[from.y][from.x] = null // MOVE: 원본 소멸
	for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
		const ny = to.y + dy, nx = to.x + dx
		const v = g[ny]?.[nx]
		if (v != null && v !== BLOCKED && v !== userId) g[ny][nx] = userId // 감염
	}
	return g
}

/** 말수차 = count(me) − max(count(각 상대)) — 2팀이면 기존과 동일 */
function gridMaterial(grid, userId) {
	const counts = {}
	for (const row of grid) for (const o of row) {
		if (o != null && o !== BLOCKED) counts[o] = (counts[o] ?? 0) + 1
	}
	const me = counts[userId] ?? 0
	let bestEnemy = 0
	for (const k in counts) if (k !== userId && counts[k] > bestEnemy) bestEnemy = counts[k]
	return me - bestEnemy
}
//#endregion

export { GameMap, USERS, BLOCKED, cloneGrid, gridMoves, gridApply, gridMaterial, rivalOf }
