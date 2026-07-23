// 효과 엔진 — 세균 idle 울렁임(SVG 변위필터) + 우주선 게임 오브젝트/레이저 이동 애니.
//
// Ship = 게임 오브젝트: 자신의 위치·크기를 알고, 발사구(muzzle)를 캐릭터 기준
// 오프셋으로 노출한다. 총구 이펙트는 muzzle 위치 + 캐릭터 기준 크기로 적용 →
// 이미지 로드 타이밍/타겟과 무관하게 항상 캐릭터에 붙어 나간다.
// 참고: docs/design.md §애니메이션

const BASE = '/germ-warfare/assets'
const FIRE_LIFT = 20        // 발사 시 우주선을 이만큼(px) 더 높이 띄운다
const MUZZLE_DY = 0.30      // 발사구 = 배 중심에서 아래로 (배 높이 비율)
const MUZZLE_SPARK_K = 1.7  // 총구 스파크 크기 = 배 너비 배수 (캐릭터 기준)

export const WOBBLE_VARIANTS = 8

const el = (tag, cls) => {
	const n = document.createElement(tag)
	if (cls) n.className = cls
	return n
}
const wait = ms => new Promise(r => setTimeout(r, ms))

/** 세균 외곽선 울렁임용 SVG feTurbulence 변위필터 풀(8종)을 1회 주입.
 * seed(패턴)·dur(주기)·begin(위상)이 달라 세포마다 랜덤 배정하면 불규칙하게 울렁인다. */
export function installFx() {
	if (document.querySelector('#germ-wobble-0')) return
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.setAttribute('aria-hidden', 'true')
	svg.setAttribute('width', '0')
	svg.setAttribute('height', '0')
	svg.style.position = 'absolute'

	let defs = ''
	for (let i = 0; i < WOBBLE_VARIANTS; i++) {
		const seed = i * 17 + 3
		const bf = (0.016 + i * 0.0012).toFixed(4)
		const bf2 = (+bf + 0.006).toFixed(4)
		const dur = (5.5 + i * 0.55).toFixed(2)
		const begin = (-i * 0.83).toFixed(2)
		defs += `
			<filter id="germ-wobble-${i}" x="-20%" y="-20%" width="140%" height="140%">
				<feTurbulence type="fractalNoise" baseFrequency="${bf} ${bf2}" numOctaves="1" seed="${seed}" result="n">
					<animate attributeName="baseFrequency" dur="${dur}s" begin="${begin}s"
						values="${bf} ${bf2}; ${bf2} ${bf}; ${bf} ${bf2}" repeatCount="indefinite" />
				</feTurbulence>
				<feDisplacementMap in="SourceGraphic" in2="n" scale="4.5"
					xChannelSelector="R" yChannelSelector="G" />
			</filter>`
	}
	svg.innerHTML = `<defs>${defs}</defs>`
	document.body.appendChild(svg)
}

// burst 스파크 (손그림, 팀색). px 지정 시 그 크기, 아니면 CSS 기본(착탄용).
function spark(layer, team, x, y, px) {
	const s = el('img', 'laser-spark')
	s.src = `${BASE}/laser/burst-${team}.png`
	s.style.left = `${x}px`
	s.style.top = `${y}px`
	if (px) s.style.width = `${px}px`
	layer.appendChild(s)
	s.animate(
		[
			{ transform: 'translate(-50%,-50%) scale(0.2) rotate(0deg)', opacity: 1 },
			{ transform: 'translate(-50%,-50%) scale(1.1) rotate(35deg)', opacity: 0 }
		],
		{ duration: 340, easing: 'ease-out' }
	).finished.then(() => s.remove())
}

/** 우주선 게임 오브젝트 — 위치·크기·발사구를 스스로 관리. */
class Ship {
	constructor(layer, team, homeFrac) {
		this.layer = layer
		this.team = team
		this.homeFrac = homeFrac // { fx, fy } — board 대비 비율
		this.home = { x: 0, y: 0 }
		this.x = 0
		this.y = 0

		this.el = el('div', 'ship')
		this.el.dataset.team = team
		this.img = el('img')
		this.img.src = `${BASE}/ship/ship-${team}.png`
		this.img.alt = ''
		this.el.appendChild(this.img)
		layer.appendChild(this.el)

		// 이미지 로드 완료 = 크기 확정. 로드 전 offsetHeight=0 로 인한 위치 버그 방지.
		this.ready = this.img.complete
			? Promise.resolve()
			: new Promise(res => this.img.addEventListener('load', res, { once: true }))
	}

	get w() { return this.el.offsetWidth }
	get h() { return this.el.offsetHeight }

	place(x, y) {
		this.x = x
		this.y = y
		this.el.style.transform = `translate(${x - this.w / 2}px, ${y - this.h / 2}px)`
	}

	async moveTo(x, y, dur) {
		const to = `translate(${x - this.w / 2}px, ${y - this.h / 2}px)`
		const from = this.el.style.transform || to
		await this.el.animate([{ transform: from }, { transform: to }],
			{ duration: dur, easing: 'cubic-bezier(.5,0,.3,1)' }).finished
		this.el.style.transform = to
		this.x = x
		this.y = y
	}

	// 캐릭터 기준 발사구(오프셋) — 배 아래쪽 중앙
	muzzle() {
		return { x: this.x, y: this.y + this.h * MUZZLE_DY }
	}

	resolveHome(board) {
		this.home = { x: board.clientWidth * this.homeFrac.fx, y: board.clientHeight * this.homeFrac.fy }
		return this.home
	}
}

/** 팀별 Ship 을 마운트. 이미지 로드까지 대기 후 홈 배치. @returns {{p1:Ship,p2:Ship}} */
export async function mountShips(board) {
	const layer = board.querySelector('.fx-layer')
	const ships = {
		p1: new Ship(layer, 'p1', { fx: 0.5, fy: 0.04 }), // 상단 진영
		p2: new Ship(layer, 'p2', { fx: 0.5, fy: 0.96 })  // 하단 진영
	}
	await Promise.all([ships.p1.ready, ships.p2.ready])
	for (const s of Object.values(ships)) {
		const h = s.resolveHome(board)
		s.place(h.x, h.y)
	}
	return ships
}

/**
 * 한 수 애니메이션 — 캐릭터(Ship) 기준.
 * @param {HTMLElement} board - .board (position:relative, .fx-layer 포함)
 * @param {Ship} ship - 발사 주체 캐릭터
 * @param {{pos:string, onImpact?:Function}} opts - pos = "A0"..
 */
export async function playMove(board, ship, { pos, onImpact }) {
	const layer = board.querySelector('.fx-layer')
	const tile = board.querySelector(`.tile[data-pos="${pos}"]`)
	if (!ship || !tile) { onImpact?.(); return }

	const b = board.getBoundingClientRect()
	const t = tile.getBoundingClientRect()
	const cx = t.left - b.left + t.width / 2
	const cyCenter = t.top - b.top + t.height / 2
	const cyTop = t.top - b.top
	const airY = cyTop - t.height * 1.1 + ship.h / 2 - FIRE_LIFT // 셀 위 "공중"

	// 1) 타겟 상공으로 이동
	await ship.moveTo(cx, airY, 460)

	// 2) 발사 — 전부 캐릭터의 발사구(muzzle) 기준 (위치·크기 오프셋)
	const m = ship.muzzle()
	const beamH = Math.max(cyCenter - m.y, 0)

	const beam = el('div', 'laser-beam')
	beam.dataset.team = ship.team
	beam.style.left = `${m.x}px`
	beam.style.top = `${m.y}px`
	beam.style.height = `${beamH}px`
	layer.appendChild(beam)
	spark(layer, ship.team, m.x, m.y, ship.w * MUZZLE_SPARK_K) // 총구 스파크(캐릭터 크기 기준)
	beam.animate(
		[
			{ transform: 'translateX(-50%) scaleY(0) scaleX(1)', opacity: 0.3 },
			{ transform: 'translateX(-50%) scaleY(1) scaleX(1)', opacity: 1, offset: 0.4 },
			{ transform: 'translateX(-50%) scaleY(1) scaleX(1.8)', opacity: 1, offset: 0.6 },
			{ transform: 'translateX(-50%) scaleY(1) scaleX(1)', opacity: 0 }
		],
		{ duration: 440, easing: 'ease-out' }
	).finished.then(() => beam.remove())

	await wait(150)

	// 3) 착탄 → burst(대칭, 셀 중앙) + 플래시 + 세균 생성
	spark(layer, ship.team, cx, cyCenter)
	impactFlash(layer, ship.team, cx, cyCenter)
	onImpact?.()
	await wait(130)

	// 4) 귀환
	await ship.moveTo(ship.home.x, ship.home.y, 460)
}

// 착탄 플래시 헬퍼
function impactFlash(layer, team, x, y) {
	const flash = el('div', 'impact-flash')
	flash.dataset.team = team
	flash.style.left = `${x}px`
	flash.style.top = `${y}px`
	layer.appendChild(flash)
	flash.animate(
		[
			{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1 },
			{ transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }
		],
		{ duration: 300, easing: 'ease-out' }
	).finished.then(() => flash.remove())
}

// 임의 요소를 (cx,cy) 중심으로 이동
async function translateTo(elm, cx, cy, dur) {
	const to = `translate(${cx - elm.offsetWidth / 2}px, ${cy - elm.offsetHeight / 2}px)`
	const from = elm.style.transform || to
	await elm.animate([{ transform: from }, { transform: to }],
		{ duration: dur, easing: 'cubic-bezier(.5,0,.3,1)' }).finished
	elm.style.transform = to
}

function tileMetric(board, pos) {
	const b = board.getBoundingClientRect()
	const t = board.querySelector(`.tile[data-pos="${pos}"]`).getBoundingClientRect()
	return { cx: t.left - b.left + t.width / 2, cy: t.top - b.top + t.height / 2, top: t.top - b.top, h: t.height }
}

/**
 * MOVE(점프) 애니 — 우주선이 소스 세균을 수거해 타겟으로 운반 후 생성.
 * @param {{fromPos, toPos, onPickup?, onDrop?}} opts
 */
export async function playJump(board, ship, { fromPos, toPos, onPickup, onDrop }) {
	const layer = board.querySelector('.fx-layer')
	if (!ship || !board.querySelector(`.tile[data-pos="${fromPos}"]`) || !board.querySelector(`.tile[data-pos="${toPos}"]`)) {
		onPickup?.(); onDrop?.(); return
	}
	const F = tileMetric(board, fromPos)
	const T = tileMetric(board, toPos)
	const airOf = m => m.top - m.h * 1.1 + ship.h / 2 - FIRE_LIFT

	// 1) 소스 상공으로
	await ship.moveTo(F.cx, airOf(F), 420)

	// 2) 트랙터 빔 + 수거 스파크 → 소스 제거, 배에 미니 세균 부착
	const mz = ship.muzzle()
	const beam = el('div', 'laser-beam')
	beam.dataset.team = ship.team
	beam.style.left = `${mz.x}px`
	beam.style.top = `${mz.y}px`
	beam.style.height = `${Math.max(F.cy - mz.y, 0)}px`
	layer.appendChild(beam)
	beam.animate(
		[{ transform: 'translateX(-50%) scaleY(0)', opacity: .2 }, { transform: 'translateX(-50%) scaleY(1)', opacity: 1, offset: .5 }, { transform: 'translateX(-50%) scaleY(1)', opacity: 0 }],
		{ duration: 320, easing: 'ease-out' }
	).finished.then(() => beam.remove())
	spark(layer, ship.team, F.cx, F.cy, ship.w)
	onPickup?.() // 모델: 소스 세균 제거 (렌더가 소스 germ 축소/제거)

	const mini = el('img', 'carry-germ')
	mini.src = `${BASE}/cell-${ship.team === 'p1' ? 'green' : 'pink'}-sm.png`
	mini.style.left = '0'; mini.style.top = '0'
	layer.appendChild(mini)
	const cargoY = m => m.top - m.h * 1.1 + ship.h * 1.05 - FIRE_LIFT // 배 아래
	mini.style.transform = `translate(${F.cx - mini.offsetWidth / 2}px, ${cargoY(F) - mini.offsetHeight / 2}px)`
	await wait(140)

	// 3) 운반 — 배 + 미니 세균 동시에 타겟 상공으로
	await Promise.all([
		ship.moveTo(T.cx, airOf(T), 520),
		translateTo(mini, T.cx, cargoY(T), 520)
	])

	// 4) 투하 — 미니 제거, 타겟 생성 + 스파크/플래시
	mini.remove()
	spark(layer, ship.team, T.cx, T.cy)
	impactFlash(layer, ship.team, T.cx, T.cy)
	onDrop?.() // 모델: 타겟 세균 생성
	await wait(130)

	// 5) 귀환
	await ship.moveTo(ship.home.x, ship.home.y, 460)
}
