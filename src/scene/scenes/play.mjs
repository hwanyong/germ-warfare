// Play 씬 — A1 에서는 기존 셀프플레이 데모(정지가능). 클릭 인터랙션·턴루프·AI 는 PHASE B/D.
// 데모 결과 버튼은 씬 흐름 확인용(실제 종료판정 = A2).
import { div, onClick } from '../dom.mjs'
import { GameMap, USERS } from '../../game/index.mjs'
import { installFx, mountShips, playMove, WOBBLE_VARIANTS } from '../../render/fx.mjs'
import { STAGES } from '../../data/stages.mjs'
import { isTutorialDone } from '../../storage/progress.mjs'

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const teamUser = t => (t === 'p1' ? USERS.ID0 : USERS.ID1)
const ownerTeam = o => (o === USERS.ID0 ? 'p1' : o === USERS.ID1 ? 'p2' : null)
const posToXY = pos => ({ x: +pos[1], y: ROWS.indexOf(pos[0]) })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const SCRIPT = [
	{ team: 'p1', pos: 'A1' }, { team: 'p2', pos: 'G5' },
	{ team: 'p1', pos: 'A5' }, { team: 'p2', pos: 'G1' },
	{ team: 'p1', pos: 'B1' }, { team: 'p2', pos: 'F5' }
]

export function playScene(ctx) {
	const { stage = 'stage-01', difficulty = 'normal' } = ctx.params

	// A6: 첫 플레이 = 튜토리얼 자동 (완료 후 play 로 복귀)
	if (!isTutorialDone()) {
		queueMicrotask(() => ctx.go('tutorial', { returnTo: 'play', stage, difficulty }))
		return { el: div('scene') }
	}

	const stageData = STAGES[stage]
	let running = true
	let paused = false
	let map
	let ships
	let turns = 0

	const el = div('scene', `
		<div class="play-top">
			<span class="sub">${stage} · ${difficulty.toUpperCase()}</span>
			<div class="play-hud">
				<span class="cell badge" data-owner="p1" style="width:1.1em;height:1.1em;display:inline-block"></span>
				<span class="num" id="s1">02</span><span class="sub">:</span><span class="num" id="s2">02</span>
				<span class="cell badge" data-owner="p2" style="width:1.1em;height:1.1em;display:inline-block"></span>
				<button class="btn" data-act="pause" style="font-size:.8rem;padding:.1em .55em">⏸</button>
			</div>
		</div>
		<div class="board" id="board">
			${ROWS.map((r, y) => Array.from({ length: 7 }, (_, x) =>
				`<div class="tile frame-thin" data-pos="${r}${x}"></div>`).join('')).join('')}
			<div class="fx-layer"></div>
		</div>
		<div class="btn-row" style="font-size:.72em">
			<button class="btn" data-act="win">결과(승)·데모</button>
			<button class="btn" data-act="lose">결과(패)·데모</button>
		</div>
	`)

	const board = el.querySelector('#board')
	const s1 = el.querySelector('#s1')
	const s2 = el.querySelector('#s2')

	installFx()

	const tileEl = pos => board.querySelector(`.tile[data-pos="${pos}"]`)

	function syncTile(pos, { pop = false } = {}) {
		const { x, y } = posToXY(pos)
		const owner = ownerTeam(map.fields[y][x])
		const t = tileEl(pos)
		let cell = t.querySelector('.cell')
		if (!owner) { cell?.remove(); return }
		if (!cell) {
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
		// A3: 스테이지 데이터의 시드 사용 (하드코딩 금지)
		stageData.seeds.p1.forEach(a => map.initField(USERS.ID0, a))
		stageData.seeds.p2.forEach(a => map.initField(USERS.ID1, a))
		map.initialized()
		turns = 0
		board.querySelectorAll('.cell').forEach(c => c.remove())
		syncAll()
	}

	async function loop() {
		ships = await mountShips(board)
		while (running) {
			reset()
			await sleep(700)
			for (const mv of SCRIPT) {
				if (!running) break
				while (paused && running) await sleep(120)
				await playMove(board, ships[mv.team], {
					pos: mv.pos,
					onImpact: () => {
						const { x, y } = posToXY(mv.pos)
						map.setField(teamUser(mv.team), { x, y })
						turns++
						syncTile(mv.pos, { pop: true })
						syncAll()
					}
				})
				await sleep(240)
			}
			await sleep(1200)
		}
	}
	loop()

	function openPause() {
		const ov = div('pause-overlay', `
			<div class="logo">일시정지</div>
			<button class="btn primary" data-p="resume">재개</button>
			<button class="btn" data-p="settings">설정</button>
			<button class="btn" data-p="quit">포기</button>
		`)
		onClick(ov, 'data-p', p => {
			if (p === 'resume') { paused = false; ov.remove() }
			else if (p === 'settings') ctx.go('settings')
			else if (p === 'quit') ctx.go('stage-select')
		})
		el.appendChild(ov)
	}

	// 데모 결과 버튼 — 현재 보드 상태를 실전과 동일한 params 로 전달 (B에서 실제 종료판정으로 대체)
	const finish = result => ctx.go('result', {
		stage, difficulty, result,
		own: map?.count[USERS.ID0] ?? 0,
		enemy: map?.count[USERS.ID1] ?? 0,
		turns
	})
	onClick(el, 'data-act', act => {
		if (act === 'pause') { paused = true; openPause() }
		else if (act === 'win') finish('win')
		else if (act === 'lose') finish('lose')
	})

	return { el, cleanup() { running = false } }
}
