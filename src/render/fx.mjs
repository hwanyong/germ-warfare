// 효과 엔진 — 세균 idle 울렁임(SVG 변위필터) + 우주선/레이저 이동 애니.
//
// 이동 시퀀스(유저 의도): ship(홈) → 타겟 셀 상공 이동 → 레이저 하강 + 스파크
// → 세균 생성/이동(onImpact) → 귀환. WAAPI Promise 로 순차 대기.
// 참고: docs/design.md §애니메이션

const BASE = '/germ-warfare/assets'
const FIRE_LIFT = 20 // 발사 시 우주선을 이만큼(px) 더 높이 띄운다

const el = (tag, cls) => {
	const n = document.createElement(tag)
	if (cls) n.className = cls
	return n
}
const wait = ms => new Promise(r => setTimeout(r, ms))

/** 세균 외곽선 울렁임용 SVG feTurbulence 변위필터를 1회 주입 */
export function installFx() {
	if (document.querySelector('#germ-wobble')) return
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	svg.setAttribute('aria-hidden', 'true')
	svg.setAttribute('width', '0')
	svg.setAttribute('height', '0')
	svg.style.position = 'absolute'
	svg.innerHTML = `
		<defs>
			<filter id="germ-wobble" x="-20%" y="-20%" width="140%" height="140%">
				<feTurbulence type="fractalNoise" baseFrequency="0.018 0.024" numOctaves="1" seed="7" result="n">
					<animate attributeName="baseFrequency" dur="7s"
						values="0.018 0.024; 0.024 0.017; 0.018 0.024" repeatCount="indefinite" />
				</feTurbulence>
				<feDisplacementMap in="SourceGraphic" in2="n" scale="4.5"
					xChannelSelector="R" yChannelSelector="G" />
			</filter>
		</defs>`
	document.body.appendChild(svg)
}

/** 팀별 우주선을 보드 fx-layer 에 마운트하고 홈(상/하단 중앙)에 배치 */
export function mountShips(board) {
	const layer = board.querySelector('.fx-layer')
	const W = board.clientWidth
	const H = board.clientHeight
	const homes = {
		p1: { x: W * 0.5, y: H * 0.04 }, // ID0 = 상단 코너 진영
		p2: { x: W * 0.5, y: H * 0.96 }  // ID1 = 하단 코너 진영
	}
	for (const team of ['p1', 'p2']) {
		const ship = el('div', 'ship')
		ship.dataset.team = team
		const img = el('img')
		img.src = `${BASE}/ship/ship-${team}.png`
		img.alt = ''
		ship.appendChild(img)
		layer.appendChild(ship)
		ship._home = homes[team]
		requestAnimationFrame(() => place(ship, homes[team].x, homes[team].y))
	}
}

function place(elm, cx, cy) {
	elm.style.transform = `translate(${cx - elm.offsetWidth / 2}px, ${cy - elm.offsetHeight / 2}px)`
}

async function moveTo(elm, cx, cy, dur) {
	const to = `translate(${cx - elm.offsetWidth / 2}px, ${cy - elm.offsetHeight / 2}px)`
	const from = elm.style.transform || to
	await elm.animate([{ transform: from }, { transform: to }],
		{ duration: dur, easing: 'cubic-bezier(.5,0,.3,1)' }).finished
	elm.style.transform = to
}

function spark(layer, team, x, y) {
	const s = el('img', 'laser-spark')
	s.src = `${BASE}/laser/burst-${team}.png`
	s.style.left = `${x}px`
	s.style.top = `${y}px`
	layer.appendChild(s)
	s.animate(
		[
			{ transform: 'translate(-50%,-50%) scale(0.2) rotate(0deg)', opacity: 1 },
			{ transform: 'translate(-50%,-50%) scale(1.1) rotate(35deg)', opacity: 0 }
		],
		{ duration: 340, easing: 'ease-out' }
	).finished.then(() => s.remove())
}

/**
 * 한 수 애니메이션.
 * @param {HTMLElement} board - .board (position:relative, .fx-layer 포함)
 * @param {{team:'p1'|'p2', pos:string, onImpact?:Function}} opts - pos = "A0"..
 */
export async function playMove(board, { team, pos, onImpact }) {
	const layer = board.querySelector('.fx-layer')
	const ship = layer?.querySelector(`.ship[data-team="${team}"]`)
	const tile = board.querySelector(`.tile[data-pos="${pos}"]`)
	if (!ship || !tile) { onImpact?.(); return }

	const b = board.getBoundingClientRect()
	const t = tile.getBoundingClientRect()
	const cx = t.left - b.left + t.width / 2
	const cyCenter = t.top - b.top + t.height / 2
	const cyTop = t.top - b.top
	const shipH = ship.offsetHeight
	const airY = cyTop - t.height * 1.1 + shipH / 2 - FIRE_LIFT // 셀 위 "공중" (발사 시 20px 더 상승)

	// 1) 타겟 상공으로 이동
	await moveTo(ship, cx, airY, 460)

	// 2) 레이저 발사 — 빔 draw+pulse + 하강 볼트 + 총구 스파크
	const beamTop = airY + shipH * 0.5
	const beamH = Math.max(cyCenter - beamTop, 0)

	const beam = el('div', 'laser-beam')
	beam.dataset.team = team
	beam.style.left = `${cx}px`
	beam.style.top = `${beamTop}px`
	beam.style.height = `${beamH}px`
	layer.appendChild(beam)
	spark(layer, team, cx, beamTop) // 총구 스파크
	beam.animate(
		[
			{ transform: 'scaleY(0) scaleX(1)', opacity: 0.3 },
			{ transform: 'scaleY(1) scaleX(1)', opacity: 1, offset: 0.4 },
			{ transform: 'scaleY(1) scaleX(1.8)', opacity: 1, offset: 0.6 }, // 펄스(굵어짐)
			{ transform: 'scaleY(1) scaleX(1)', opacity: 0 }
		],
		{ duration: 440, easing: 'ease-out' }
	).finished.then(() => beam.remove())

	const bolt = el('div', 'laser-bolt') // 빔을 타고 내려가는 탄
	bolt.dataset.team = team
	bolt.style.left = `${cx}px`
	layer.appendChild(bolt)
	bolt.animate(
		[
			{ transform: `translate(-50%, ${beamTop}px) scale(0.6)`, opacity: 1 },
			{ transform: `translate(-50%, ${cyCenter}px) scale(1.15)`, opacity: 1, offset: 0.8 },
			{ transform: `translate(-50%, ${cyCenter}px) scale(0.2)`, opacity: 0 }
		],
		{ duration: 190, easing: 'ease-in' }
	).finished.then(() => bolt.remove())

	await wait(150)

	// 3) 착탄 → 플래시 + 스파크 + 세균 생성/이동
	spark(layer, team, cx, cyCenter)
	const flash = el('div', 'impact-flash')
	flash.dataset.team = team
	flash.style.left = `${cx}px`
	flash.style.top = `${cyCenter}px`
	layer.appendChild(flash)
	flash.animate(
		[
			{ transform: 'translate(-50%,-50%) scale(0.2)', opacity: 1 },
			{ transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }
		],
		{ duration: 300, easing: 'ease-out' }
	).finished.then(() => flash.remove())
	onImpact?.()
	await wait(130)

	// 4) 귀환
	await moveTo(ship, ship._home.x, ship._home.y, 460)
}
