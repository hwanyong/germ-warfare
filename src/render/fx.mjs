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

	// 정적 변위필터(SMIL 애니 없음) — 세균마다 유기적 외곽선 부여하되 per-frame 비용 0.
	// (애니 필터를 다수 세균에 적용하면 컴포지터 포화 → 커스텀 커서 드롭. 움직임은 CSS breathe 로.)
	let defs = ''
	for (let i = 0; i < WOBBLE_VARIANTS; i++) {
		const seed = i * 17 + 3
		const bf = (0.016 + i * 0.0015).toFixed(4)
		const bf2 = (+bf + 0.006).toFixed(4)
		defs += `
			<filter id="germ-wobble-${i}" x="-20%" y="-20%" width="140%" height="140%">
				<feTurbulence type="fractalNoise" baseFrequency="${bf} ${bf2}" numOctaves="1" seed="${seed}" result="n" />
				<feDisplacementMap in="SourceGraphic" in2="n" scale="4.5"
					xChannelSelector="R" yChannelSelector="G" />
			</filter>`
	}
	svg.innerHTML = `<defs>${defs}</defs>`
	document.body.appendChild(svg)
}

// 팀 → 스프라이트/hue (p3/p4 는 에셋 없음 — p1/p2 재활용 + hue 변주)
const fxSprite = team => SHIP_DEF[team]?.sprite ?? team
const fxHue = team => SHIP_DEF[team]?.hue ?? 0

// burst 스파크 (손그림, 팀색). px 지정 시 그 크기, 아니면 CSS 기본(착탄용).
function spark(layer, team, x, y, px) {
	const s = el('img', 'laser-spark')
	s.src = `${BASE}/laser/burst-${fxSprite(team)}.png`
	s.style.left = `${x}px`
	s.style.top = `${y}px`
	if (px) s.style.width = `${px}px`
	if (fxHue(team)) s.style.filter = `hue-rotate(${fxHue(team)}deg)`
	layer.appendChild(s)
	s.animate(
		[
			{ transform: 'translate(-50%,-50%) scale(0.2) rotate(0deg)', opacity: 1 },
			{ transform: 'translate(-50%,-50%) scale(1.1) rotate(35deg)', opacity: 0 }
		],
		{ duration: 340, easing: 'ease-out' }
	).finished.then(() => s.remove())
}

/** 발사구(muzzle) → targetY 레이저 빔 1발 — playMove/playJump/playQuickFill 공용.
 * punch: 착탄 직전 굵어지는 펀치 프레임(생성 레이저용). 소멸 시 자체 제거. @returns muzzle 좌표 */
function fireBeam(layer, ship, targetY, { dur = 440, punch = true } = {}) {
	const m = ship.muzzle()
	const beam = el('div', 'laser-beam')
	beam.dataset.team = ship.team
	beam.style.left = `${m.x}px`
	beam.style.top = `${m.y}px`
	beam.style.height = `${Math.max(targetY - m.y, 0)}px`
	layer.appendChild(beam)
	const frames = punch
		? [
			{ transform: 'translateX(-50%) scaleY(0) scaleX(1)', opacity: 0.3 },
			{ transform: 'translateX(-50%) scaleY(1) scaleX(1)', opacity: 1, offset: 0.4 },
			{ transform: 'translateX(-50%) scaleY(1) scaleX(1.8)', opacity: 1, offset: 0.6 },
			{ transform: 'translateX(-50%) scaleY(1) scaleX(1)', opacity: 0 }
		]
		: [
			{ transform: 'translateX(-50%) scaleY(0)', opacity: .2 },
			{ transform: 'translateX(-50%) scaleY(1)', opacity: 1, offset: .5 },
			{ transform: 'translateX(-50%) scaleY(1)', opacity: 0 }
		]
	beam.animate(frames, { duration: dur, easing: 'ease-out' }).finished.then(() => beam.remove())
	return m
}

/** 우주선 게임 오브젝트 — 위치·크기·발사구를 스스로 관리. */
class Ship {
	constructor(layer, team, homeFrac, spriteTeam = null, hue = 0) {
		this.layer = layer
		this.team = team
		this.homeFrac = homeFrac // { fx, fy } — board 대비 비율
		this.home = { x: 0, y: 0 }
		this.x = 0
		this.y = 0

		this.el = el('div', 'ship')
		this.el.dataset.team = team
		this.img = el('img')
		this.img.src = `${BASE}/ship/ship-${spriteTeam ?? team}.png` // p3/p4 는 p1/p2 스프라이트 재활용
		this.img.alt = ''
		if (hue) this.el.style.filter = `hue-rotate(${hue}deg)` // N팀 색 변주
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
		const bw = board.clientWidth
		const bh = board.clientHeight
		let x = bw * this.homeFrac.fx
		let y = bh * this.homeFrac.fy
		// 좁은 화면(보드가 뷰포트 폭을 거의 채움): 보드 옆 대기 지점이 화면 밖 →
		// x 를 뷰포트 안쪽으로 클램프하고 보드 위/아래로 파킹 (보드·말 미가림 + 가로 오버플로 방지)
		const b = board.getBoundingClientRect()
		const half = this.w / 2 + 4
		const lo = half - b.left
		const hi = document.documentElement.clientWidth - b.left - half
		if (x < lo || x > hi) {
			x = Math.min(Math.max(x, lo), hi)
			y = this.homeFrac.fy < 0.5 ? bh * -0.1 : bh * 1.1
		}
		this.home = { x, y }
		return this.home
	}
}

// 팀별 홈(보드 바깥 코너) + 스프라이트/색 변주 (p3/p4 = p1/p2 재활용 + hue)
const SHIP_DEF = {
	p1: { home: { fx: -0.1, fy: 0.02 }, sprite: 'p1', hue: 0 },   // 좌상단 바깥
	p2: { home: { fx: 1.1, fy: 0.98 }, sprite: 'p2', hue: 0 },    // 우하단 바깥
	p3: { home: { fx: 1.1, fy: 0.02 }, sprite: 'p1', hue: 80 },   // 우상단 바깥 — 파랑 계열
	p4: { home: { fx: -0.1, fy: 0.98 }, sprite: 'p2', hue: 60 }   // 좌하단 바깥 — 주황 계열
}

/** 팀별 Ship 마운트. 이미지 로드까지 대기 후 홈 배치. @returns {{[team]:Ship}} */
export async function mountShips(board, teams = ['p1', 'p2']) {
	const layer = board.querySelector('.fx-layer')
	const ships = {}
	for (const tm of teams) {
		const d = SHIP_DEF[tm]
		ships[tm] = new Ship(layer, tm, d.home, d.sprite, d.hue)
	}
	await Promise.all(Object.values(ships).map(s => s.ready))
	const placeHome = () => {
		for (const s of Object.values(ships)) {
			const atHome = s.x === s.home.x && s.y === s.home.y
			const h = s.resolveHome(board)
			if (atHome) s.place(h.x, h.y) // 비행 중이면 다음 귀환이 새 홈을 사용
		}
	}
	placeHome()
	// 회전/리사이즈 → 보드 크기 변화 시 대기 우주선 재배치 (보드 제거 시 관찰도 함께 소멸)
	new ResizeObserver(placeHome).observe(board)
	return ships
}

/**
 * 한 수 애니메이션 — 캐릭터(Ship) 기준.
 * @param {HTMLElement} board - .board (position:relative, .fx-layer 포함)
 * @param {Ship} ship - 발사 주체 캐릭터
 * @param {{pos:string, onImpact?:Function, onPhase?:Function}} opts - pos = "A0"..
 *   onPhase('launch'|'laser'|'impact'|'return') — 단계 시작 알림(사운드 등 외부 동기화용, render 는 소비처 무지)
 */
export async function playMove(board, ship, { pos, onImpact, onPhase }) {
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
	onPhase?.('launch')
	await ship.moveTo(cx, airY, 460)

	// 2) 발사 — 전부 캐릭터의 발사구(muzzle) 기준 (위치·크기 오프셋)
	onPhase?.('laser')
	const m = fireBeam(layer, ship, cyCenter)
	spark(layer, ship.team, m.x, m.y, ship.w * MUZZLE_SPARK_K) // 총구 스파크(캐릭터 크기 기준)

	await wait(150)

	// 3) 착탄 → burst(대칭, 셀 중앙) + 플래시 + 세균 생성
	onPhase?.('impact')
	spark(layer, ship.team, cx, cyCenter)
	impactFlash(layer, ship.team, cx, cyCenter)
	onImpact?.()
	await wait(130)

	// 4) 귀환
	onPhase?.('return')
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
 * 자동 마무리 채움 — 우주선이 타겟 위로 짧게 이동 후 압축 레이저 발사로 생성(빠른 템포).
 * 클론 = 레이저 생성이라는 본편 문법(playMove)의 축약판. 연속 호출용(귀환 없음) — 시퀀스 끝에 shipHome().
 */
export async function playQuickFill(board, ship, { pos, onImpact, onPhase }) {
	const layer = board.querySelector('.fx-layer')
	const tile = board.querySelector(`.tile[data-pos="${pos}"]`)
	if (!ship || !tile) { onImpact?.(); return }
	const T = tileMetric(board, pos)
	const airY = T.top - T.h + ship.h / 2 - FIRE_LIFT * 0.5 // playMove 보다 낮은 공중 — 템포 우선
	await ship.moveTo(T.cx, airY, 180)
	onPhase?.('laser')
	const m = fireBeam(layer, ship, T.cy, { dur: 260 })
	spark(layer, ship.team, m.x, m.y, ship.w * MUZZLE_SPARK_K * 0.8) // 총구 스파크 (축소판)
	await wait(110) // 빔 도달 타이밍 뒤 착탄
	onPhase?.('impact')
	spark(layer, ship.team, T.cx, T.cy)
	impactFlash(layer, ship.team, T.cx, T.cy)
	onImpact?.()
	await wait(90)
}

/** 우주선 홈 귀환 */
export async function shipHome(ship) {
	await ship.moveTo(ship.home.x, ship.home.y, 420)
}

/**
 * MOVE(점프) 애니 — 우주선이 소스 세균을 수거해 타겟으로 운반 후 생성.
 * @param {{fromPos, toPos, onPickup?, onDrop?, onPhase?}} opts
 *   onPhase('launch'|'pickup'|'carry'|'drop'|'return') — 단계 시작 알림
 */
export async function playJump(board, ship, { fromPos, toPos, onPickup, onDrop, onPhase }) {
	const layer = board.querySelector('.fx-layer')
	if (!ship || !board.querySelector(`.tile[data-pos="${fromPos}"]`) || !board.querySelector(`.tile[data-pos="${toPos}"]`)) {
		onPickup?.(); onDrop?.(); return
	}
	const F = tileMetric(board, fromPos)
	const T = tileMetric(board, toPos)
	const airOf = m => m.top - m.h * 1.1 + ship.h / 2 - FIRE_LIFT

	// 1) 소스 상공으로
	onPhase?.('launch')
	await ship.moveTo(F.cx, airOf(F), 420)

	// 2) 트랙터 빔 + 수거 스파크 → 소스 제거, 배에 미니 세균 부착
	onPhase?.('pickup')
	fireBeam(layer, ship, F.cy, { dur: 320, punch: false })
	spark(layer, ship.team, F.cx, F.cy, ship.w)
	onPickup?.() // 모델: 소스 세균 제거 (렌더가 소스 germ 축소/제거)

	const mini = el('img', 'carry-germ')
	mini.src = `${BASE}/cell-${fxSprite(ship.team) === 'p1' ? 'green' : 'pink'}-sm.png`
	if (fxHue(ship.team)) mini.style.filter = `hue-rotate(${fxHue(ship.team)}deg)`
	mini.style.left = '0'; mini.style.top = '0'
	layer.appendChild(mini)
	const cargoY = m => m.top - m.h * 1.1 + ship.h * 1.05 - FIRE_LIFT // 배 아래
	mini.style.transform = `translate(${F.cx - mini.offsetWidth / 2}px, ${cargoY(F) - mini.offsetHeight / 2}px)`
	await wait(140)

	// 3) 운반 — 배 + 미니 세균 동시에 타겟 상공으로
	onPhase?.('carry')
	await Promise.all([
		ship.moveTo(T.cx, airOf(T), 520),
		translateTo(mini, T.cx, cargoY(T), 520)
	])

	// 4) 투하 — 미니 제거, 타겟 생성 + 스파크/플래시
	onPhase?.('drop')
	mini.remove()
	spark(layer, ship.team, T.cx, T.cy)
	impactFlash(layer, ship.team, T.cx, T.cy)
	onDrop?.() // 모델: 타겟 세균 생성
	await wait(130)

	// 5) 귀환
	onPhase?.('return')
	await ship.moveTo(ship.home.x, ship.home.y, 460)
}
