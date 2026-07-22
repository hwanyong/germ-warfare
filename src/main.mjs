// 진입점 — 로딩 게이트 → 셀프플레이 데모(디자인/애니 아이덴티티).
//
// 부팅: 이미지/폰트 프리로드(진행률 표시) → 로딩 씬 페이드아웃 → 게임 시작.
// 실제 인터랙티브 게임(메뉴/클릭/AI)은 P0.
// 참고: docs/architecture.md, docs/design.md

import './styles/theme.css'
import './styles/board.css'
import './styles/fx.css'
import { GameMap, USERS } from './game/index.mjs'
import { installFx, mountShips, playMove, WOBBLE_VARIANTS } from './render/fx.mjs'
import { PRELOAD_IMAGES } from './loading/assets.mjs'
import { preloadAll } from './loading/preload.mjs'

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const teamUser = t => (t === 'p1' ? USERS.ID0 : USERS.ID1)
const ownerTeam = o => (o === USERS.ID0 ? 'p1' : o === USERS.ID1 ? 'p2' : null)
const posToXY = pos => ({ x: +pos[1], y: ROWS.indexOf(pos[0]) })
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ---- 부팅: 로딩 게이트 ----
async function boot() {
	const pctEl = document.getElementById('load-pct')
	const fillEl = document.getElementById('load-fill')
	const loadingEl = document.getElementById('loading')

	await preloadAll(PRELOAD_IMAGES, (done, total) => {
		const p = Math.round((done / total) * 100)
		if (pctEl) pctEl.textContent = `${p}%`
		if (fillEl) fillEl.style.width = `${p}%`
	})

	startGame()

	// 로딩 씬 페이드아웃 후 제거
	loadingEl?.classList.add('done')
	setTimeout(() => loadingEl?.remove(), 350)
}

// ---- 게임(데모) ----
function startGame() {
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
					`<div class="tile frame-thin" data-pos="${r}${x}"></div>`).join('')).join('')}
				<div class="fx-layer"></div>
			</div>
			<p class="note">규칙 + 디자인/애니 데모 — 자동 재생. 실제 게임은 P0.</p>
		</div>
	`

	const board = document.getElementById('board')
	const s1 = document.getElementById('s1')
	const s2 = document.getElementById('s2')

	installFx()
	let ships // { p1: Ship, p2: Ship }
	let map

	const tile = pos => board.querySelector(`.tile[data-pos="${pos}"]`)

	// 한 칸의 세균을 소유주에 맞춰 동기화 (변화 없으면 idle 유지)
	function syncTile(pos, { pop = false } = {}) {
		const { x, y } = posToXY(pos)
		const owner = ownerTeam(map.fields[y][x])
		const t = tile(pos)
		let cell = t.querySelector('.cell')
		if (!owner) { cell?.remove(); return }
		if (!cell) {
			// 불규칙 idle: 울렁 변종/숨쉬기 주기/위상 per-cell 랜덤
			cell = document.createElement('div')
			cell.className = `cell w${Math.floor(Math.random() * WOBBLE_VARIANTS)}`
			cell.style.setProperty('--bd', `${(2.6 + Math.random() * 1.8).toFixed(2)}s`)
			cell.style.setProperty('--bdelay', `${(Math.random() * -4).toFixed(2)}s`)
			t.appendChild(cell)
		}
		cell.dataset.owner = owner
		if (pop) {
			cell.animate(
				[{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: 0.7 }, { transform: 'scale(1)' }],
				{ duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' }
			)
		}
	}

	function syncAll() {
		ROWS.forEach((r, y) => { for (let x = 0; x < 7; x++) syncTile(`${r}${x}`) })
		s1.textContent = String(map.count[USERS.ID0]).padStart(2, '0')
		s2.textContent = String(map.count[USERS.ID1]).padStart(2, '0')
	}

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

	// 데모 수순 (전부 CLONE — 코너 시드 인접)
	const SCRIPT = [
		{ team: 'p1', pos: 'A1' }, { team: 'p2', pos: 'G5' },
		{ team: 'p1', pos: 'A5' }, { team: 'p2', pos: 'G1' },
		{ team: 'p1', pos: 'B1' }, { team: 'p2', pos: 'F5' }
	]

	async function loop() {
		ships = await mountShips(board) // 이미지 프리로드 완료 상태라 즉시
		while (true) {
			reset()
			await sleep(700)
			for (const move of SCRIPT) {
				await playMove(board, ships[move.team], {
					pos: move.pos,
					onImpact: () => {
						const { x, y } = posToXY(move.pos)
						map.setField(teamUser(move.team), { x, y })
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
}

boot()
