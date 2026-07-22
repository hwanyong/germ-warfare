// 진입점 (P0 이전 셀프플레이 데모 — 디자인 + 애니 아이덴티티 적용).
//
// 순수 규칙 엔진(src/game)이 브라우저에서 돌고, "손그림 종이 보드게임" 테마 +
// 우주선/레이저 이동 애니 + 세균 idle 울렁임을 보여준다. 짧은 수순을 반복 자동재생.
// 실제 인터랙티브 게임(메뉴/클릭 플레이/AI)은 P0에서 src/{menu,match,ai,render}.
// 참고: docs/design.md, docs/architecture.md

import './styles/theme.css'
import './styles/board.css'
import './styles/fx.css'
import { GameMap, USERS } from './game/index.mjs'
import { installFx, mountShips, playMove, WOBBLE_VARIANTS } from './render/fx.mjs'

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const teamUser = t => (t === 'p1' ? USERS.ID0 : USERS.ID1)
const ownerTeam = o => (o === USERS.ID0 ? 'p1' : o === USERS.ID1 ? 'p2' : null)
const posToXY = pos => ({ x: +pos[1], y: ROWS.indexOf(pos[0]) })

// ---- 정적 스켈레톤 (외부 입력 없음) ----
document.getElementById('app').innerHTML = `
	<div class="screen">
		<h1 class="title">세균전</h1>
		<div class="scoreline">
			<span class="cell badge" data-owner="p1"></span>
			<span class="num" id="s1">02</span>
			<span class="vs">:</span>
			<span class="num" id="s2">02</span>
			<span class="cell badge" data-owner="p2"></span>
		</div>
		<div class="board" id="board">
			${ROWS.map((r, y) => Array.from({ length: 7 }, (_, x) =>
				`<div class="tile frame-thin" data-pos="${r}${x}" style="grid-area:auto"></div>`).join('')).join('')}
			<div class="fx-layer"></div>
		</div>
		<p class="note">규칙 + 디자인/애니 데모 — 자동 재생. 실제 게임은 P0.</p>
	</div>
`

const board = document.getElementById('board')
const s1 = document.getElementById('s1')
const s2 = document.getElementById('s2')

installFx()
mountShips(board)

function tile(pos) {
	return board.querySelector(`.tile[data-pos="${pos}"]`)
}

// 한 칸의 세균을 소유주에 맞춰 동기화 (변화 없으면 울렁임 유지)
function syncTile(pos, { pop = false } = {}) {
	const { x, y } = posToXY(pos)
	const owner = ownerTeam(map.fields[y][x])
	const t = tile(pos)
	let cell = t.querySelector('.cell')
	if (!owner) { cell?.remove(); return }
	if (!cell) {
		cell = document.createElement('div')
		// 불규칙 idle: 울렁 변종(w0..)·숨쉬기 주기·위상 전부 per-cell 랜덤
		cell.className = `cell w${Math.floor(Math.random() * WOBBLE_VARIANTS)}`
		cell.style.setProperty('--bd', `${(2.6 + Math.random() * 1.8).toFixed(2)}s`)
		cell.style.setProperty('--bdelay', `${(Math.random() * -4).toFixed(2)}s`)
		t.appendChild(cell)
	}
	cell.dataset.owner = owner
	if (pop) {
		// 생성 pop — WAAPI(CSS 숨쉬기와 합성, 랜덤 위상 유지)
		cell.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: 0.7 }, { transform: 'scale(1)' }],
			{ duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' }
		)
	}
}

function syncAll() {
	ROWS.forEach((r, y) => { for (let x = 0; x < 7; x++) syncTile(`${r}${x}`) })
	updateScore()
}
function updateScore() {
	s1.textContent = String(map.count[USERS.ID0]).padStart(2, '0')
	s2.textContent = String(map.count[USERS.ID1]).padStart(2, '0')
}

// 데모 수순 (전부 CLONE — 코너 시드 인접)
const SCRIPT = [
	{ team: 'p1', pos: 'A1' }, { team: 'p2', pos: 'G5' },
	{ team: 'p1', pos: 'A5' }, { team: 'p2', pos: 'G1' },
	{ team: 'p1', pos: 'B1' }, { team: 'p2', pos: 'F5' }
]

let map

function reset() {
	map = new GameMap({ seed: 42 })
	map.clear()
	map.initField(USERS.ID0, { x: 0, y: 0 })
	map.initField(USERS.ID0, { x: 6, y: 0 })
	map.initField(USERS.ID1, { x: 0, y: 6 })
	map.initField(USERS.ID1, { x: 6, y: 6 })
	map.initialized()
	board.querySelectorAll('.cell').forEach(c => c.remove())
	syncAll()
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function loop() {
	// 최초 레이아웃 후 배치가 잡히도록 한 프레임 양보
	await sleep(400)
	while (true) {
		reset()
		await sleep(700)
		for (const move of SCRIPT) {
			await playMove(board, {
				team: move.team,
				pos: move.pos,
				onImpact: () => {
					const { x, y } = posToXY(move.pos)
					map.setField(teamUser(move.team), { x, y })
					// 착탄 칸 pop + 감염 반영(주변 재동기화)
					syncTile(move.pos, { pop: true })
					syncAll()
				}
			})
			await sleep(260)
		}
		await sleep(1400)
	}
}

loop()
