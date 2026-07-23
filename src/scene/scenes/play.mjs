// Play 씬 (PHASE B) — 인터랙티브. human(p1/그린) vs 스텁 AI(p2/핑크).
// 소스 세균 선택(사각 프레임) → 합법 타겟 호버(복제/이동 미리보기 + 커서) → 클릭 실행.
// clone=레이저 생성 애니, move=우주선 수거→운반→생성 애니. 종료판정→Result.
import { div, onClick } from '../dom.mjs'
import { GameMap, USERS, BLOCKED, STATE, mulberry32 } from '../../game/index.mjs'
import { installFx, mountShips, playMove, playJump, playQuickFill, shipHome, WOBBLE_VARIANTS } from '../../render/fx.mjs'
import { pickMove, effectiveDifficulty } from '../../game/ai.mjs'
import { gridMoves } from '../../game/map.mjs'
import { STAGES } from '../../data/stages.mjs'
import { isTutorialDone } from '../../storage/progress.mjs'
import { t, getLang } from '../../i18n/index.mjs'

const CARTO = '/germ-warfare/assets/cartography'
const ALL_ENGINE_TEAMS = [USERS.ID0, USERS.ID1, 'USER2', 'USER3'] // N:N 프리포올 최대 4팀
const TEAM_HUE = { p1: 0, p2: 0, p3: 80, p4: 60 } // p3/p4 = 스프라이트 재활용 + 색 변주
const rowChar = y => String.fromCharCode(65 + y) // A, B, C, ...
const sleep = ms => new Promise(r => setTimeout(r, ms))

export function playScene(ctx) {
	const { stage = 'stage-01', difficulty = 'normal' } = ctx.params

	// A6: 첫 플레이 = 튜토리얼 자동
	if (!isTutorialDone()) {
		queueMicrotask(() => ctx.go('tutorial', { returnTo: 'play', stage, difficulty }))
		return { el: div('scene') }
	}

	const stageData = STAGES[stage]
	// 실제 AI 레벨 = 스테이지 기본(ai) ± 유저 노브 시프트 (진행 커브는 데이터가 결정)
	const aiLevel = effectiveDifficulty(stageData.ai, difficulty)
	const { w: W, h: H } = stageData.grid
	const ROWS = Array.from({ length: H }, (_, y) => rowChar(y))
	const posToXY = pos => ({ x: +pos.slice(1), y: pos.charCodeAt(0) - 65 })
	const posStr = p => `${rowChar(p.y)}${p.x}`
	const blockedSet = new Set((stageData.blocked ?? []).map(b => `${b.x},${b.y}`))
	// N:N — 스테이지 팀 수 (기본 2). human = 첫 팀(p1), 나머지 전부 AI.
	const nTeams = stageData.teams ?? 2
	const ENGINE_TEAMS = ALL_ENGINE_TEAMS.slice(0, nTeams)
	const VIEW_TEAMS = ENGINE_TEAMS.map((_, i) => `p${i + 1}`)
	const HUMAN = ENGINE_TEAMS[0]
	const viewOf = uid => VIEW_TEAMS[ENGINE_TEAMS.indexOf(uid)]
	const ownerTeam = o => (ENGINE_TEAMS.includes(o) ? viewOf(o) : null)
	let running = true
	let paused = false
	let map
	let ships
	let turns = 0
	let cancelHuman = null
	const aiRng = mulberry32(0xa1b2 ^ Date.now() >>> 0) // AI 블런더/노이즈용 (매판 다른 변주)

	const el = div('scene', `
		<div class="play-top">
			<span class="sub">${stageData.name[getLang()] ?? stageData.name.en} · ${difficulty.toUpperCase()}${aiLevel !== difficulty ? ` · AI ${aiLevel.toUpperCase()}` : ''}</span>
			<div class="play-hud">
				${VIEW_TEAMS.map((tm, i) => `
					${i > 0 ? '<span class="sub">:</span>' : ''}
					<span class="cell badge" data-owner="${tm}" style="width:1.1em;height:1.1em;display:inline-block;${TEAM_HUE[tm] ? `filter:hue-rotate(${TEAM_HUE[tm]}deg)` : ''}"></span>
					<span class="num" data-score="${tm}">00</span>`).join('')}
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
	const scoreEls = Object.fromEntries(VIEW_TEAMS.map(tm => [tm, el.querySelector(`[data-score="${tm}"]`)]))
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
			const wob = Math.floor(Math.random() * WOBBLE_VARIANTS)
			cell.className = `cell w${wob}`
			cell.dataset.wob = wob
			cell.style.setProperty('--bd', `${(2.6 + Math.random() * 1.8).toFixed(2)}s`)
			cell.style.setProperty('--bdelay', `${(Math.random() * -4).toFixed(2)}s`)
			t.appendChild(cell)
		}
		if (cell.dataset.owner !== owner) {
			// 오너 변경(감염 포함): hue 를 반드시 재설정 — 이전 팀 hue 잔존 시 색이 안 바뀌어 보임
			cell.dataset.owner = owner
			cell.style.filter = TEAM_HUE[owner]
				? `url(#germ-wobble-${cell.dataset.wob}) hue-rotate(${TEAM_HUE[owner]}deg)`
				: '' // p1/p2 는 클래스(w{n}) filter 로 복원
		}
		if (pop) cell.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: 0.7 }, { transform: 'scale(1)' }],
			{ duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' }
		)
	}
	function syncAll() {
		ROWS.forEach((r, y) => { for (let x = 0; x < W; x++) syncTile(`${r}${x}`) })
		ENGINE_TEAMS.forEach(uid => { scoreEls[viewOf(uid)].textContent = String(map.count[uid]).padStart(2, '0') })
	}
	function reset() {
		map = new GameMap({ seed: 42, grid: stageData.grid, blocked: stageData.blocked, teams: ENGINE_TEAMS })
		map.clear()
		VIEW_TEAMS.forEach((tm, i) => (stageData.seeds[tm] ?? []).forEach(a => map.initField(ENGINE_TEAMS[i], a)))
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
				for (const m of map.legalMovesFrom(HUMAN, source)) {
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

	// 자동 마무리 — 인터랙션 차단, CLONE 만(빈칸 단조 감소 → 타팀 부활 불가) 순차 채움
	async function autoFinish(filler) {
		clearHints()
		turnEl.textContent = t('play.finishing')
		const ship = ships[viewOf(filler)]
		// 주의: isTerminal 을 가드로 쓰면 전멸(생존≤1) 상태에서 한 칸도 못 채움 — 빈칸 기준으로 순회
		while (running) {
			while (paused && running) await sleep(120)
			const empties = map.totalCells - ENGINE_TEAMS.reduce((a, u) => a + map.count[u], 0)
			if (empties <= 0) break
			const g = map.fields.map(r => r.slice())
			const clones = gridMoves(g, filler).filter(m => m.clone)
			if (!clones.length) break // 도달 불가 지역만 남음 → 그대로 종료
			const mv = clones[0]
			const before = map.fields.map(r => r.slice())
			await playQuickFill(board, ship, {
				pos: posStr(mv.to),
				onImpact: () => { map.applyMove(filler, mv.from, mv.to); syncTile(posStr(mv.to), { pop: true }); syncAll() }
			})
			postMove(before, posStr(mv.to))
		}
		if (running) await shipHome(ship)
		if (running) finishGame()
	}

	function finishGame() {
		running = false
		clearHints()
		const own = map.count[HUMAN]
		const enemy = Math.max(...ENGINE_TEAMS.filter(u => u !== HUMAN).map(u => map.count[u]))
		ctx.go('result', { stage, difficulty, result: map.winner() === HUMAN ? 'win' : 'lose', own, enemy, turns })
	}

	async function turnLoop() {
		ships = await mountShips(board, VIEW_TEAMS)
		reset()
		await sleep(300)
		let idx = 0 // 라운드로빈: human(p1) 선공 → AI 팀들 순서대로
		let stall = 0 // 연속 패스 수 (전원 무수 감지)
		while (running) {
			while (paused && running) await sleep(120)
			if (!running) return
			// 승부 확정 검사 — 전멸(생존≤1) 또는 단독 가동(둘 수 있는 팀 1)이면
			// 빈칸이 남아있는 한 승자 우주선이 자동 채움(Ataxx 잔여칸 귀속) 후 종료
			{
				const alive = ENGINE_TEAMS.filter(u => map.count[u] > 0)
				const canMove = alive.filter(u => map.legalMoves(u).length > 0)
				if (alive.length <= 1 || canMove.length <= 1) {
					const filler = canMove[0] // 전멸 시 = 유일 생존팀, 갇힘 시 = 유일 가동팀
					const empties = map.totalCells - ENGINE_TEAMS.reduce((a, u) => a + map.count[u], 0)
					if (filler && empties > 0) return autoFinish(filler)
					return finishGame()
				}
			}
			if (map.isTerminal()) return finishGame()

			const cur = ENGINE_TEAMS[idx % ENGINE_TEAMS.length]
			idx++
			if (map.count[cur] === 0 || map.legalMoves(cur).length === 0) { // 전멸/무수 → 패스
				if (++stall >= ENGINE_TEAMS.length) return finishGame()
				continue
			}
			stall = 0

			turnEl.textContent = cur === HUMAN ? t('play.yourTurn') : t('play.aiTurn')
			if (cur === HUMAN) {
				const mv = await humanTurn()
				if (!running || !mv) return
				clearHints()
				await execMove(viewOf(cur), cur, mv.from, mv.to)
			} else {
				await sleep(450)
				const mv = pickMove(map, cur, aiLevel, aiRng)
				if (mv) await execMove(viewOf(cur), cur, mv.from, mv.to)
			}
			turns++
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
