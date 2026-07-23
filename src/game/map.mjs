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

class Field {
	#axis = {
		x: null,
		y: null
	}
	#owner = null
	#rival = {
		[USERS.ID0]: USERS.ID1,
		[USERS.ID1]: USERS.ID0
	}
	#riskMax = 6
	#score = {
		risk: {
			[USERS.ID0]: 0,
			[USERS.ID1]: 0
		},
		attack: {
			// impossible: -1, move: Field object, clone: 1
			[USERS.ID0]: STATE.ATTACK.INIT,
			[USERS.ID1]: STATE.ATTACK.INIT
		}
	}
	#relatedFields = []
	#rng = Math.random

	#events = {
		changed: (owner, axis) => {}
	}

	constructor(axis = null, events = {}, rng = Math.random) {
		if (!axis) {
			throw new Error('Axis is required')
		}

		this.#axis = axis
		this.#rng = rng

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
		this.#score.risk[USERS.ID0] = 0
		this.#score.risk[USERS.ID1] = 0
		this.#score.attack[USERS.ID0] = STATE.ATTACK.IMPOSSIBLE
		this.#score.attack[USERS.ID1] = STATE.ATTACK.IMPOSSIBLE

		this.#relatedFields.forEach((fields, distance) => {
			const score = this.#riskMax - distance

			fields.forEach(field => {
				if (field.owner == null) return

				this.#score.risk[this.#rival[field.owner]] += score

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
			if (field.owner != this.#rival[userId]) return // include null

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

		let minRisk = this.#riskMax * 49 // 49: 7 * 7 map size
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
	#fields = [
	//   0  1  2  3  4  5  6
		[0, 0, 0, 0, 0, 0, 0], // A(0)
		[0, 0, 0, 0, 0, 0, 0], // B(1)
		[0, 0, 0, 0, 0, 0, 0], // C(2)
		[0, 0, 0, 0, 0, 0, 0], // D(3)
		[0, 0, 0, 0, 0, 0, 0], // E(4)
		[0, 0, 0, 0, 0, 0, 0], // F(5)
		[0, 0, 0, 0, 0, 0, 0], // G(6)
	]
	#fieldsBasedOnUser = [
	//   0  1  2  3  4  5  6
		[null, null, null, null, null, null, null], // A(0)
		[null, null, null, null, null, null, null], // B(1)
		[null, null, null, null, null, null, null], // C(2)
		[null, null, null, null, null, null, null], // D(3)
		[null, null, null, null, null, null, null], // E(4)
		[null, null, null, null, null, null, null], // F(5)
		[null, null, null, null, null, null, null], // G(6)
	]

	#count = {
		[USERS.ID0]: 0,
		[USERS.ID1]: 0
	}

	#seed = 0
	#rng = Math.random

	#events = {
		initialized: () => {},
		attacked: () => {},
		moved: () => {},
		infected: () => {}
	}

	#generateRelatedFieldAboutCurrentField = (fields, { x: colCrtIdx, y: rowCrtIdx }) => {
		return fields.reduce((accRow, _row, rowIdx) => _row.reduce((accCol, _col, colIdx) => {
			const distance = Math.max(Math.abs(rowIdx - rowCrtIdx), Math.abs(colIdx - colCrtIdx))

			accCol[distance].push(_col)

			return accCol
		}, accRow), [
			[], // 0: self
			[], // 1
			[], // 2
			[], // 3
			[], // 4
			[], // 5
			[], // 6
		])
	}
	#initFields = fields => fields.map((row, rowCrtIdx) => row.map((col, colCrtIdx) => new Field({ x: colCrtIdx, y: rowCrtIdx }, {
		changed: this.#changeFieldOwner
	}, this.#rng)))
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

		if (before) this.#count[before]--
		if (after) this.#count[after]++
	}

	constructor({ events = {}, seed } = {}) {
		this.#seed = seed ?? randomSeed()
		this.#rng = mulberry32(this.#seed)

		this.#events = {
			...this.#events,
			...events
		}
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
	/** 보드 총 칸 수 */
	get totalCells() {
		return this.#fields.length * this.#fields[0].length
	}
	/** 종료 판정: 보드 꽉참 / 한 팀 전멸 / 양 팀 모두 합법수 없음 */
	isTerminal = () => {
		const c0 = this.#count[USERS.ID0]
		const c1 = this.#count[USERS.ID1]
		if (c0 + c1 >= this.totalCells) return true
		if (c0 === 0 || c1 === 0) return true
		if (this.legalMoves(USERS.ID0).length === 0 && this.legalMoves(USERS.ID1).length === 0) return true
		return false
	}
	/** 승자 userId, 무승부면 null (isTerminal 후 호출) */
	winner = () => {
		const c0 = this.#count[USERS.ID0]
		const c1 = this.#count[USERS.ID1]
		if (c0 === c1) return null
		return c0 > c1 ? USERS.ID0 : USERS.ID1
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
		this.#fields = this.#initFields(this.#fields)
		this.#fields = this.#initRelatedFields(this.#fields)

		this.#count[USERS.ID0] = 0
		this.#count[USERS.ID1] = 0

		this.#canInit = true
	}
	display = () => {
		const table = [
			['-', '-', '-', '-', '-', '-', '-'],
			['-', '-', '-', '-', '-', '-', '-'],
			['-', '-', '-', '-', '-', '-', '-'],
			['-', '-', '-', '-', '-', '-', '-'],
			['-', '-', '-', '-', '-', '-', '-'],
			['-', '-', '-', '-', '-', '-', '-'],
			['-', '-', '-', '-', '-', '-', '-']
		]

		this.#fields.forEach((row, rowIdx) => {
			row.forEach((col, colIdx) => {
				const { owner } = col

				table[rowIdx][colIdx] = (owner == USERS.ID0 ? '0' : owner == USERS.ID1 ? '1' : '-')
			})
		})

		console.table(table)
		console.table(this.#count)
	}
}

export { GameMap, USERS }
