// Play 씬 (PHASE B) — 인터랙티브. human(p1/그린) vs 스텁 AI(p2/핑크).
// 소스 세균 선택(사각 프레임) → 합법 타겟 호버(복제/이동 미리보기 + 커서) → 클릭 실행.
// clone=레이저 생성 애니, move=우주선 수거→운반→생성 애니. 종료판정→Result.
import { div, onClick } from '../dom.mjs'
import { GameMap, USERS, BLOCKED, STATE, mulberry32 } from '../../game/index.mjs'
import { installFx, mountShips, playMove, playJump, WOBBLE_VARIANTS } from '../../render/fx.mjs'
import { pickMove } from '../../game/ai.mjs'
import { STAGES } from '../../data/stages.mjs'
import { isTutorialDone } from '../../storage/progress.mjs'
import { t, getLang } from '../../i18n/index.mjs'

const CARTO = '/germ-warfare/assets/cartography'
const ownerTeam = o => (o === USERS.ID0 ? 'p1' : o === USERS.ID1 ? 'p2' : null)
const rowChar = y => String.fromCharCode(65 + y) // A, B, C, ...
const sleep = ms => new Promise(r => setTimeout(r, ms))
const other = u => (u === USERS.ID0 ? USERS.ID1 : USERS.ID0)

export function playScene(ctx) {
	const { stage = 'stage-01', difficulty = 'normal' } = ctx.params

	// A6: 첫 플레이 = 튜토리얼 자동
	if (!isTutorialDone()) {
		queueMicrotask(() => ctx.go('tutorial', { returnTo: 'play', stage, difficulty }))
		return { el: div('scene') }
	}

	const stageData = STAGES[stage]
	const { w: W, h: H } = stageData.grid
	const ROWS = Array.from({ length: H }, (_, y) => rowChar(y))
	const posToXY = pos => ({ x: +pos.slice(1), y: pos.charCodeAt(0) - 65 })
	const posStr = p => `${rowChar(p.y)}${p.x}`
	const blockedSet = new Set((stageData.blocked ?? []).map(b => `${b.x},${b.y}`))
	let running = true
	let paused = false
	let map
	let ships
	let turns = 0
	let cancelHuman = null
	const aiRng = mulberry32(0xa1b2 ^ Date.now() >>> 0) // AI 블런더/노이즈용 (매판 다른 변주)

	const el = div('scene', `
		<div class="play-top">
			<span class="sub">${stageData.name[getLang()] ?? stageData.name.en} · ${difficulty.toUpperCase()}</span>
			<div class="play-hud">
				<span class="cell badge" data-owner="p1" style="width:1.1em;height:1.1em;display:inline-block"></span>
				<span class="num" id="s1">02</span><span class="sub">:</span><span class="num" id="s2">02</span>
				<span class="cell badge" data-owner="p2" style="width:1.1em;height:1.1em;display:inline-block"></span>
				<button class="btn" data-act="pause" style="font-size:.8rem;padding:.1em .55em">⏸</button>
			</div>
		</div>
		<div class="turn-label" id="turn"></div>
		<div class="board" id="board" style="grid-template-columns:repeat(${W},1fr);grid-template-rows:repeat(${H},1fr);aspect-ratio:${W}/${H}">
			${ROWS.map((r, y) => Array.from({ length: W }, (_, x) =>
				blockedSet.has(`${x},${y}`)
					? `<div class="tile frame-thin blocked" data-pos="${r}${x}"><img class="bld rock" src="${CARTO}/rocks.png" alt="" /></div>`
					: `<div class="tile frame-thin" data-pos="${r}${x}"></div>`).join('')).join('')}
			<div class="fx-layer"></div>
		</div>
	`)

	const board = el.querySelector('#board')
	const s1 = el.querySelector('#s1')
	const s2 = el.querySelector('#s2')
	const turnEl = el.querySelector('#turn')

	installFx()

	const tileEl = pos => board.querySelector(`.tile[data-pos="${pos}"]`)

	// ---- 마을 배경(cartography) + 파괴 연출 ----
	const buildings = {} // pos -> { el, destroyed }
	function renderVillage() {
		Object.values(buildings).forEach(b => b.el.remove())
		for (const k in buildings) delete buildings[k]
		for (const { pos, asset } of (stageData.village ?? [])) {
			const img = document.createElement('img')
			img.className = 'bld'
			img.src = `${CARTO}/${asset}.png`
			img.alt = ''
			tileEl(pos).appendChild(img)
			buildings[pos] = { el: img, destroyed: false }
		}
	}
	function destroyBuilding(pos) {
		const b = buildings[pos]
		if (!b || b.destroyed) return
		b.destroyed = true
		const wreck = `${CARTO}/${Math.random() < 0.5 ? 'ruins' : 'skull'}.png`
		b.el.src = wreck
		b.el.classList.add('destroyed')
		// 파괴 버스트: 큰 잔해가 germ 위로 잠깐 부풀었다 사라짐 (파괴 가시화)
		const burst = document.createElement('img')
		burst.className = 'destroy-burst'
		burst.src = wreck
		tileEl(pos).appendChild(burst)
		burst.animate(
			[{ transform: 'scale(.5) rotate(-8deg)', opacity: .95 }, { transform: 'scale(1.5) rotate(6deg)', opacity: 0 }],
			{ duration: 520, easing: 'ease-out' }
		).finished.then(() => burst.remove())
	}
	function flipAnim(pos) {
		tileEl(pos).querySelector('.cell')?.animate(
			[{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.32) rotate(180deg)', offset: .5 }, { transform: 'scale(1) rotate(360deg)' }],
			{ duration: 400, easing: 'ease-out' }
		)
	}
	// 이동/생성 후: 뒤집힌 칸 애니 + 점령된 마을 파괴
	function postMove(before, exclude) {
		ROWS.forEach((r, y) => { for (let x = 0; x < W; x++) {
			const pos = `${r}${x}`
			const now = map.fields[y][x]
			const was = before[y][x]
			if (now && was && now !== was && pos !== exclude) flipAnim(pos) // 감염 뒤집기
			if (now && buildings[pos] && !buildings[pos].destroyed) destroyBuilding(pos) // 점령 파괴
		} })
	}

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
		if (pop) cell.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: 0.7 }, { transform: 'scale(1)' }],
			{ duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' }
		)
	}
	function syncAll() {
		ROWS.forEach((r, y) => { for (let x = 0; x < W; x++) syncTile(`${r}${x}`) })
		s1.textContent = String(map.count[USERS.ID0]).padStart(2, '0')
		s2.textContent = String(map.count[USERS.ID1]).padStart(2, '0')
	}
	function reset() {
		map = new GameMap({ seed: 42, grid: stageData.grid, blocked: stageData.blocked })
		map.clear()
		stageData.seeds.p1.forEach(a => map.initField(USERS.ID0, a))
		stageData.seeds.p2.forEach(a => map.initField(USERS.ID1, a))
		map.initialized()
		turns = 0
		board.querySelectorAll('.cell').forEach(c => c.remove())
		renderVillage()
		syncAll()
	}

	// ---- 인터랙션 정리 ----
	function clearHints() {
		board.querySelectorAll('.selectable, .selected, .legal').forEach(t => {
			t.classList.remove('selectable', 'selected', 'legal')
			t.removeAttribute('data-owner-hint')
			t.querySelector('.preview')?.remove()
		})
	}
	function markSelectable() {
		ROWS.forEach((r, y) => { for (let x = 0; x < W; x++) {
			tileEl(`${r}${x}`).classList.toggle('selectable', ownerTeam(map.fields[y][x]) === 'p1')
		} })
	}

	// ---- human 턴 ----
	function humanTurn() {
		return new Promise(resolve => {
			let source = null
			markSelectable()

			const showLegal = () => {
				for (const m of map.legalMovesFrom(USERS.ID0, source)) {
					const lt = tileEl(posStr(m))
					lt.classList.add('legal')
					lt.dataset.ownerHint = 'p1'
					lt.dataset.moveType = m.type === STATE.ATTACK.MOVE ? 'move' : 'clone'
				}
			}
			const finish = out => {
				board.removeEventListener('click', onBoardClick)
				board.removeEventListener('pointerover', onOver)
				board.removeEventListener('pointerout', onOut)
				cancelHuman = null
				resolve(out)
			}
			cancelHuman = () => finish(null)

			function onBoardClick(e) {
				const t = e.target.closest('.tile')
				if (!t || paused) return
				const { x, y } = posToXY(t.dataset.pos)
				if (ownerTeam(map.fields[y][x]) === 'p1') { // 소스 (재)선택
					clearHints(); markSelectable()
					source = { x, y }
					t.classList.add('selected')
					showLegal()
				} else if (source && t.classList.contains('legal')) { // 실행
					finish({ from: source, to: { x, y } })
				} else { // 빈 곳 = 선택 해제
					clearHints(); markSelectable(); source = null
				}
			}
			function onOver(e) {
				const tl = e.target.closest('.tile.legal')
				if (!tl || tl.querySelector('.preview')) return
				const isMove = tl.dataset.moveType === 'move'
				const pv = document.createElement('div')
				pv.className = 'preview'
				pv.innerHTML = `<div class="ghost"></div><div class="badge">${isMove ? t('play.move') : t('play.clone')}</div>`
				tl.appendChild(pv)
			}
			function onOut(e) {
				const tl = e.target.closest('.tile')
				if (tl && !tl.contains(e.relatedTarget)) tl.querySelector('.preview')?.remove()
			}

			board.addEventListener('click', onBoardClick)
			board.addEventListener('pointerover', onOver)
			board.addEventListener('pointerout', onOut)
		})
	}

	async function execMove(team, userId, from, to) {
		const legal = map.legalMovesFrom(userId, from).find(m => m.x === to.x && m.y === to.y)
		const fromPos = posStr(from), toPos = posStr(to)
		const before = map.fields.map(row => row.slice()) // 감염/파괴 diff 용 스냅샷
		if (legal.type === STATE.ATTACK.MOVE) {
			await playJump(board, ships[team], {
				fromPos, toPos,
				onPickup: () => { tileEl(fromPos).querySelector('.cell')?.remove() },
				onDrop: () => { map.applyMove(userId, from, to); syncTile(toPos, { pop: true }); syncAll() }
			})
		} else {
			await playMove(board, ships[team], {
				pos: toPos,
				onImpact: () => { map.applyMove(userId, from, to); syncTile(toPos, { pop: true }); syncAll() }
			})
		}
		postMove(before, toPos) // 감염 뒤집기 애니 + 점령 마을 파괴
	}

	function finishGame() {
		running = false
		clearHints()
		const own = map.count[USERS.ID0]
		const enemy = map.count[USERS.ID1]
		ctx.go('result', { stage, difficulty, result: own > enemy ? 'win' : 'lose', own, enemy, turns })
	}

	async function turnLoop() {
		ships = await mountShips(board)
		reset()
		await sleep(300)
		let cur = USERS.ID0 // human 선공
		while (running) {
			while (paused && running) await sleep(120)
			if (!running) return
			if (map.isTerminal()) return finishGame()

			if (map.legalMoves(cur).length === 0) { // 패스
				cur = other(cur)
				if (map.legalMoves(cur).length === 0) return finishGame()
				continue
			}

			turnEl.textContent = cur === USERS.ID0 ? t('play.yourTurn') : t('play.aiTurn')
			if (cur === USERS.ID0) {
				const mv = await humanTurn()
				if (!running || !mv) return
				clearHints()
				await execMove('p1', USERS.ID0, mv.from, mv.to)
			} else {
				await sleep(450)
				const mv = pickMove(map, USERS.ID1, difficulty, aiRng)
				if (mv) await execMove('p2', USERS.ID1, mv.from, mv.to)
			}
			turns++
			cur = other(cur)
		}
	}
	turnLoop()

	function openPause() {
		const ov = div('pause-overlay', `
			<div class="logo">${t('play.paused')}</div>
			<button class="btn primary" data-p="resume">${t('play.resume')}</button>
			<button class="btn" data-p="settings">${t('play.settings')}</button>
			<button class="btn" data-p="quit">${t('play.quit')}</button>
		`)
		onClick(ov, 'data-p', p => {
			if (p === 'resume') { paused = false; ov.remove() }
			else if (p === 'settings') ctx.go('settings')
			else if (p === 'quit') ctx.go('stage-select', { difficulty })
		})
		el.appendChild(ov)
	}
	onClick(el, 'data-act', act => { if (act === 'pause') { paused = true; openPause() } })

	return { el, cleanup() { running = false; cancelHuman?.() } }
}
