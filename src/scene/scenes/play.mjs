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
import { playSfx, playBgm } from '../../audio/audio.mjs'
import { mascotSrc, frozenMascot } from '../mascot.mjs'
import { settingsControls } from '../settings-panel.mjs'

// FX 단계 → 사운드 (playMove/playJump 공용). 귀환·트랙터빔은 기존 소리 변조 재활용.
const PHASE_SFX = {
	launch: () => playSfx('sfx-launch'),
	laser: () => playSfx('sfx-laser'),
	pickup: () => playSfx('sfx-laser', { rate: 0.8, gain: 0.8 }),
	impact: () => playSfx('sfx-impact'),
	drop: () => playSfx('sfx-impact'),
	return: () => playSfx('sfx-launch', { rate: 0.85, gain: 0.5 })
}

const CARTO = '/germ-warfare/assets/cartography'
const ALL_ENGINE_TEAMS = [USERS.ID0, USERS.ID1, 'USER2', 'USER3'] // N:N 프리포올 최대 4팀
const TEAM_HUE = { p1: 0, p2: 0, p3: 80, p4: 60 } // p3/p4 = 스프라이트 재활용 + 색 변주
const sleep = ms => new Promise(r => setTimeout(r, ms))

export function playScene(ctx) {
	const { stage = 'stage-01', difficulty = 'normal', mode = 'pve', players, stageData: customStage, prefill } = ctx.params

	// A6: 첫 플레이 = 튜토리얼 자동 (로컬 대전은 제외 — 캐주얼 멀티라 강제 튜토 부적합)
	if (mode !== 'local' && !isTutorialDone()) {
		queueMicrotask(() => ctx.go('tutorial', { returnTo: 'play', stage, difficulty, mode, players }))
		return { el: div('scene') }
	}

	const stageData = customStage ?? STAGES[stage]
	// 실제 AI 레벨 = 스테이지 기본(ai) ± 유저 노브 시프트 (진행 커브는 데이터가 결정)
	const aiLevel = effectiveDifficulty(stageData.ai, difficulty)
	const { w: W, h: H } = stageData.grid
	const CELLS = W * H
	const BIG = CELLS > 144 // 대형 커스텀 보드(>12×12) — 셀 애니 경량화 + AI 깊이탐색 클램프
	// 타일 좌표 인코딩 = "y_x" 숫자 (letter-row 는 26칸 초과 시 특수문자·CSS 이스케이프로 깨짐 → 커스텀 대형보드 대응)
	const posStr = p => `${p.y}_${p.x}`
	const posToXY = pos => { const i = pos.indexOf('_'); return { y: +pos.slice(0, i), x: +pos.slice(i + 1) } }
	const blockedSet = new Set((stageData.blocked ?? []).map(b => `${b.x},${b.y}`))
	// N:N — 스테이지 팀 수 (기본 2). human = 첫 팀(p1), 나머지 전부 AI.
	const nTeams = stageData.teams ?? 2
	const ENGINE_TEAMS = ALL_ENGINE_TEAMS.slice(0, nTeams)
	const VIEW_TEAMS = ENGINE_TEAMS.map((_, i) => `p${i + 1}`)
	const HUMAN = ENGINE_TEAMS[0]
	const viewOf = uid => VIEW_TEAMS[ENGINE_TEAMS.indexOf(uid)]
	const ownerTeam = o => (ENGINE_TEAMS.includes(o) ? viewOf(o) : null)
	const playerLabel = uid => t('localSetup.playerLabel', { n: ENGINE_TEAMS.indexOf(uid) + 1 })

	// 좌석 컨트롤러(사람/AI) — Local PvP(mode='local', players 전달) 또는 기존 PvE(p1=사람, 나머지 AI) 폴백.
	// CONTROLLER 는 가변 — Pause 중 기권 시 해당 좌석만 AI(easy 고정)로 실시간 전환.
	const CONTROLLER = {}
	const AI_LEVEL = {}
	ENGINE_TEAMS.forEach((uid, i) => {
		const p = players?.find(pp => pp.team === VIEW_TEAMS[i])
		CONTROLLER[uid] = p ? p.controller : (i === 0 ? 'human' : 'ai')
		AI_LEVEL[uid] = p ? (p.aiDifficulty ?? 'normal') : aiLevel
	})
	const isHuman = uid => CONTROLLER[uid] === 'human'

	let running = true
	let paused = false
	let map
	let ships
	let turns = 0
	let cancelHuman = null
	let pendingHumanUid = null
	// 씬 사후 발음 차단 — cleanup(씬 전환) 후에도 인플라이트 애니/AI 수의 await 연속은
	// 끝까지 실행되므로, 사운드·BGM 방출은 전부 running 게이트를 거쳐야 새 씬 오디오를 안 덮는다.
	const phaseSfx = p => { if (running) PHASE_SFX[p]?.() }
	const sfx = (...args) => { if (running) playSfx(...args) }
	const aiRng = mulberry32(0xa1b2 ^ Date.now() >>> 0) // AI 블런더/노이즈용 (매판 다른 변주)

	const el = div('scene', `
		<div class="play-top">
			<span class="sub">${stageData.name[getLang()] ?? stageData.name.en}${mode === 'local' ? '' : ` · ${difficulty.toUpperCase()}${aiLevel !== difficulty ? ` · AI ${aiLevel.toUpperCase()}` : ''}`}</span>
			<button class="btn" data-act="pause" style="font-size:1rem;padding:.1em .5em;letter-spacing:.1em">II</button>
		</div>
		<div class="turn-label" id="turn"></div>
		<div class="board" id="board" style="grid-template-columns:repeat(${W},1fr);grid-template-rows:repeat(${H},1fr);aspect-ratio:${W}/${H};--ar:${(W / H).toFixed(4)}">
			${Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) =>
				blockedSet.has(`${x},${y}`)
					? `<div class="tile frame-thin blocked" data-pos="${y}_${x}"><img class="bld rock" src="${CARTO}/rocks.png" alt="" /></div>`
					: `<div class="tile frame-thin" data-pos="${y}_${x}"></div>`).join('')).join('')}
			<div class="fx-layer"></div>
		</div>
		<div class="score-panel">
			${VIEW_TEAMS.map((tm, i) => `
				<div class="score-chip" data-chip="${tm}">
					<img class="mascot" data-mascot="${tm}" src="${mascotSrc(tm)}" alt=""${TEAM_HUE[tm] ? ` style="filter:hue-rotate(${TEAM_HUE[tm]}deg)"` : ''}>
					<span class="num" data-score="${tm}">00</span>
					<span class="sub ai-tag" data-ai-tag="${tm}"${mode === 'local' && !isHuman(ENGINE_TEAMS[i]) ? '' : ' style="display:none"'}>AI</span>
				</div>`).join('')}
		</div>
	`)

	const board = el.querySelector('#board')
	const scoreEls = Object.fromEntries(VIEW_TEAMS.map(tm => [tm, el.querySelector(`[data-score="${tm}"]`)]))
	const turnEl = el.querySelector('#turn')
	const chipEls = Object.fromEntries(VIEW_TEAMS.map(tm => [tm, el.querySelector(`[data-chip="${tm}"]`)]))
	const mascotEls = Object.fromEntries(VIEW_TEAMS.map(tm => [tm, el.querySelector(`[data-mascot="${tm}"]`)]))

	// 턴 표시 — 현재 턴 팀 마스코트만 걷기 애니, 나머지는 첫 프레임 정지.
	// (애니 webp 는 정지 불가 → frozenMascot 이 뜬 정적 프레임으로 스왑, 비동기 완료 시 active 재확인)
	function setTurnTeam(active) {
		for (const tm of VIEW_TEAMS) {
			const on = tm === active
			chipEls[tm].classList.toggle('active', on)
			const img = mascotEls[tm]
			if (on) img.src = mascotSrc(tm)
			else frozenMascot(tm).then(u => { if (!chipEls[tm].classList.contains('active')) img.src = u })
		}
	}

	// 실시간 전투 BGM — 칸이 절반 이상 차면 우세/열세 변주로 교체, 동률은 직전 곡 유지 (ADR-009)
	let battleBgm = 'bgm-battle'
	function syncBattleBgm() {
		if (!running) return // 씬 이탈 후 인플라이트 수가 새 씬의 BGM 을 전투 변주로 덮는 것 방지
		const total = ENGINE_TEAMS.reduce((a, u) => a + map.count[u], 0)
		if (total * 2 < map.totalCells) return // 전반전 — 기본 전투 테마 유지
		const own = map.count[HUMAN]
		const top = Math.max(...ENGINE_TEAMS.filter(u => u !== HUMAN).map(u => map.count[u]))
		if (own === top) return
		const want = own > top ? 'bgm-battle-up' : 'bgm-battle-down'
		if (want !== battleBgm) { battleBgm = want; playBgm(want) }
	}

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
	// 이동/생성 후: 뒤집힌 칸 애니 + 점령된 마을 파괴 (+감염 시 감염음 1회)
	function postMove(before, exclude) {
		let flipped = 0
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
			const pos = `${y}_${x}`
			const now = map.fields[y][x]
			const was = before[y][x]
			if (now && was && now !== was && pos !== exclude) { flipAnim(pos); flipped++ } // 감염 뒤집기
			if (now && buildings[pos] && !buildings[pos].destroyed) destroyBuilding(pos) // 점령 파괴
		}
		if (flipped) sfx('sfx-infect')
	}

	function syncTile(pos, { pop = false } = {}) {
		const { x, y } = posToXY(pos)
		const owner = ownerTeam(map.fields[y][x])
		const t = tileEl(pos)
		let cell = t.querySelector('.cell')
		if (!owner) { cell?.remove(); return }
		if (!cell) {
			cell = document.createElement('div')
			if (BIG) {
				cell.className = 'cell lite' // 대형 보드: wobble/breathe 애니 생략(성능)
			} else {
				const wob = Math.floor(Math.random() * WOBBLE_VARIANTS)
				cell.className = `cell w${wob}`
				cell.dataset.wob = wob
				cell.style.setProperty('--bd', `${(2.6 + Math.random() * 1.8).toFixed(2)}s`)
				cell.style.setProperty('--bdelay', `${(Math.random() * -4).toFixed(2)}s`)
			}
			t.appendChild(cell)
		}
		if (cell.dataset.owner !== owner) {
			// 오너 변경(감염 포함): hue 를 반드시 재설정 — 이전 팀 hue 잔존 시 색이 안 바뀌어 보임
			cell.dataset.owner = owner
			cell.style.filter = TEAM_HUE[owner]
				? (BIG ? `hue-rotate(${TEAM_HUE[owner]}deg)` : `url(#germ-wobble-${cell.dataset.wob}) hue-rotate(${TEAM_HUE[owner]}deg)`)
				: '' // p1/p2 는 클래스(w{n}) filter 로 복원
		}
		if (pop) cell.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: 0.7 }, { transform: 'scale(1)' }],
			{ duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' }
		)
	}
	function syncAll() {
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) syncTile(`${y}_${x}`)
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
	function markSelectable(myView) {
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
			tileEl(`${y}_${x}`).classList.toggle('selectable', ownerTeam(map.fields[y][x]) === myView)
		}
	}

	// ---- human 턴 (uid = 지금 두는 사람의 엔진 팀) ----
	function humanTurn(uid) {
		const myView = viewOf(uid)
		return new Promise(resolve => {
			let source = null
			markSelectable(myView)

			const showLegal = () => {
				for (const m of map.legalMovesFrom(uid, source)) {
					const lt = tileEl(posStr(m))
					lt.classList.add('legal')
					lt.dataset.ownerHint = myView
					lt.dataset.moveType = m.type === STATE.ATTACK.MOVE ? 'move' : 'clone'
				}
			}
			const finish = out => {
				board.removeEventListener('click', onBoardClick)
				board.removeEventListener('pointerover', onOver)
				board.removeEventListener('pointerout', onOut)
				cancelHuman = null
				pendingHumanUid = null
				resolve(out)
			}
			cancelHuman = () => finish(null)
			pendingHumanUid = uid

			function onBoardClick(e) {
				const t = e.target.closest('.tile')
				if (!t || paused) return
				const { x, y } = posToXY(t.dataset.pos)
				if (ownerTeam(map.fields[y][x]) === myView) { // 소스 (재)선택
					clearHints(); markSelectable(myView)
					source = { x, y }
					t.classList.add('selected')
					sfx('sfx-select')
					showLegal()
				} else if (source && t.classList.contains('legal')) { // 실행
					finish({ from: source, to: { x, y } })
				} else { // 빈 곳 = 선택 해제
					if (source) sfx('sfx-invalid') // 소스 선택 상태에서 비합법 타겟 시도
					clearHints(); markSelectable(myView); source = null
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

	// 로컬 핫싯 전환 화면 — 명시적 탭 전까지 board 리스너 자체가 안 붙어 오터치를 원천 차단한다.
	function passOverlay(uid) {
		return new Promise(resolve => {
			const myView = viewOf(uid)
			const ov = div('pass-overlay', `
				<span class="cell badge" data-owner="${myView}" style="width:1.6em;height:1.6em;display:inline-block;${TEAM_HUE[myView] ? `filter:hue-rotate(${TEAM_HUE[myView]}deg)` : ''}"></span>
				<div class="logo">${t('play.passTitle', { name: playerLabel(uid) })}</div>
				<div class="sub">${t('play.passHint')}</div>
				<button class="btn primary" data-p="ready">${t('play.passReady')}</button>
			`)
			const finish = () => { ov.remove(); cancelHuman = null; sfx('sfx-select'); resolve() }
			cancelHuman = finish
			onClick(ov, 'data-p', finish)
			el.appendChild(ov)
		})
	}

	async function execMove(team, userId, from, to) {
		const legal = map.legalMovesFrom(userId, from).find(m => m.x === to.x && m.y === to.y)
		const fromPos = posStr(from), toPos = posStr(to)
		const before = map.fields.map(row => row.slice()) // 감염/파괴 diff 용 스냅샷
		if (legal.type === STATE.ATTACK.MOVE) {
			await playJump(board, ships[team], {
				fromPos, toPos,
				onPhase: phaseSfx,
				onPickup: () => { tileEl(fromPos).querySelector('.cell')?.remove() },
				onDrop: () => { map.applyMove(userId, from, to); sfx('sfx-spawn'); syncTile(toPos, { pop: true }); syncAll() }
			})
		} else {
			await playMove(board, ships[team], {
				pos: toPos,
				onPhase: phaseSfx,
				onImpact: () => { map.applyMove(userId, from, to); sfx('sfx-spawn'); syncTile(toPos, { pop: true }); syncAll() }
			})
		}
		postMove(before, toPos) // 감염 뒤집기 애니 + 점령 마을 파괴
		syncBattleBgm() // 수 반영 후 우세/열세 재평가
	}

	// 시작 카운트다운 — 3·2·1·시작! 보드 위 오버레이 (게임 시작 안내)
	async function countdown() {
		const ov = div('countdown')
		board.appendChild(ov)
		const beat = (txt, playBeat) => {
			ov.textContent = txt
			playBeat()
			ov.animate(
				[{ transform: 'scale(1.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .35 }, { transform: 'scale(1)', opacity: 1 }],
				{ duration: 560, easing: 'ease-out' }
			)
		}
		for (const n of ['3', '2', '1']) {
			while (paused && running) await sleep(120) // 카운트다운 중 일시정지 존중
			if (!running) break
			beat(n, () => sfx('sfx-select', { rate: 1.25 }))
			await sleep(620)
		}
		while (paused && running) await sleep(120)
		if (running) {
			beat(t('play.start'), () => sfx('sfx-turn'))
			await sleep(560)
		}
		ov.remove()
	}

	async function playAiMove(uid) {
		await sleep(450)
		if (!running) return // 대기 중 씬 이탈 — 죽은 씬에서 수(애니+사운드) 두지 않음
		// 대형 보드: hard(negamax depth3)는 이동 조합 폭발 → 응답성 위해 greedy(normal)로 클램프
		const lvl = BIG && AI_LEVEL[uid] === 'hard' ? 'normal' : AI_LEVEL[uid]
		const mv = pickMove(map, uid, lvl, aiRng)
		if (mv) await execMove(viewOf(uid), uid, mv.from, mv.to)
	}

	// 자동 마무리 — 인터랙션 차단, CLONE 만(빈칸 단조 감소 → 타팀 부활 불가) 순차 채움
	async function autoFinish(filler) {
		clearHints()
		turnEl.textContent = t('play.finishing')
		setTurnTeam(viewOf(filler))
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
				onPhase: p => { if (p === 'laser') sfx('sfx-laser', { rate: 1.2, gain: 0.5 }) }, // 연속 발사 — 저게인 변조
				onImpact: () => { map.applyMove(filler, mv.from, mv.to); sfx('sfx-spawn', { gain: 0.6, rate: 1.1 }); syncTile(posStr(mv.to), { pop: true }); syncAll() }
			})
			postMove(before, posStr(mv.to))
			syncBattleBgm()
		}
		if (running) await shipHome(ship)
		if (running) finishGame()
	}

	function finishGame() {
		running = false
		clearHints()
		if (mode === 'local') {
			const winnerUid = map.winner()
			const ranking = ENGINE_TEAMS
				.map(uid => ({ team: viewOf(uid), name: playerLabel(uid), cells: map.count[uid], controller: CONTROLLER[uid] }))
				.sort((a, b) => b.cells - a.cells)
			ctx.go('result', { mode, stage, difficulty, turns, ranking, winnerTeam: winnerUid ? viewOf(winnerUid) : null, players, stageData: customStage, prefill })
			return
		}
		const own = map.count[HUMAN]
		const enemy = Math.max(...ENGINE_TEAMS.filter(u => u !== HUMAN).map(u => map.count[u]))
		ctx.go('result', { mode, stage, difficulty, result: map.winner() === HUMAN ? 'win' : 'lose', own, enemy, turns })
	}

	async function turnLoop() {
		ships = await mountShips(board, VIEW_TEAMS)
		reset()
		setTurnTeam(null) // 카운트다운 동안 전원 정지
		await countdown()
		if (!running) return
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

			const humanNow = isHuman(cur)
			turnEl.textContent = humanNow
				? (mode === 'local' ? t('play.localTurn', { name: playerLabel(cur) }) : t('play.yourTurn'))
				: (mode === 'local' ? t('play.aiThink', { name: playerLabel(cur) }) : t('play.aiTurn'))
			setTurnTeam(viewOf(cur)) // 현재 턴 마스코트만 걷기 애니
			if (humanNow) sfx('sfx-turn') // "내 차례" 알림음 (AI 좌석은 무음 — N:N/AI 스팸 방지, 사람 좌석은 전부 재생)
			if (humanNow) {
				if (mode === 'local' && ENGINE_TEAMS.filter(isHuman).length > 1) {
					await passOverlay(cur) // 로컬 핫싯: 기기를 넘기는 확인 화면 — 탭 전까지 board 리스너 미부착
					if (!running) return
				}
				const mv = await humanTurn(cur)
				if (!running) return
				if (mv) {
					clearHints()
					await execMove(viewOf(cur), cur, mv.from, mv.to)
				} else if (isHuman(cur)) {
					return // 진짜 취소(quit 등) — 컨트롤러 그대로 사람인데 수가 없음 = 씬 파괴
				} else {
					await playAiMove(cur) // 대기 중 기권(→AI) 발생 → 같은 턴을 AI가 즉시 대신 둠
				}
			} else {
				await playAiMove(cur)
			}
			turns++
		}
	}
	turnLoop()

	function openPause() {
		// 로컬 대전 중인 사람 좌석만 기권(→ AI easy 대타) 옵션 노출
		const forfeitRow = mode === 'local' && ENGINE_TEAMS.some(isHuman)
			? `<div class="btn-row">${ENGINE_TEAMS.filter(isHuman).map(uid =>
				`<button class="btn" data-forfeit="${uid}">${t('play.forfeitSeat', { name: playerLabel(uid) })}</button>`).join('')}</div>`
			: ''
		const ov = div('pause-overlay', `
			<div class="logo">${t('play.paused')}</div>
			<button class="btn primary" data-p="resume">${t('play.resume')}</button>
			<button class="btn" data-p="settings">${t('play.settings')}</button>
			${forfeitRow}
			<button class="btn" data-p="quit">${t('play.quit')}</button>
		`)
		onClick(ov, 'data-p', p => {
			if (p === 'resume') { paused = false; ov.remove() }
			else if (p === 'settings') { ov.remove(); openSettingsOverlay() } // 인게임 설정 = 모달(게임 보존), 씬 전환 아님
			else if (p === 'quit') ctx.go(mode === 'local' ? 'local-setup' : 'stage-select', mode === 'local' ? { prefill } : { difficulty })
		})
		onClick(ov, 'data-forfeit', uid => {
			CONTROLLER[uid] = 'ai'
			AI_LEVEL[uid] = 'easy'
			const tag = el.querySelector(`[data-ai-tag="${viewOf(uid)}"]`)
			if (tag) tag.style.display = '' // 스코어 칩에 AI 뱃지 노출
			paused = false
			ov.remove()
			if (pendingHumanUid === uid) cancelHuman?.() // 지금 이 좌석 차례 대기 중이면 즉시 AI로 넘김
		})
		el.appendChild(ov)
	}

	// 인게임 설정 = play 위 모달 오버레이 (씬 파괴 없음 → 닫으면 일시정지 메뉴로 복귀, 게임 그대로).
	// 튜토리얼/크레딧은 게임 중 부적합이라 제외 — 언어/사운드/모션만.
	function openSettingsOverlay() {
		const ov = div('pause-overlay', `
			<div class="logo">${t('settings.title')}</div>
			<div id="settings-body"></div>
			<div class="btn-row"><button class="btn" data-back="1">${t('settings.back')}</button></div>
		`)
		// 언어 변경 시 오버레이 텍스트까지 갱신하려면 오버레이 전체 재렌더
		ov.querySelector('#settings-body').replaceWith(settingsControls(() => { ov.remove(); openSettingsOverlay() }))
		onClick(ov, 'data-back', () => { ov.remove(); openPause() }) // 설정 닫기 → 일시정지 메뉴 복귀
		el.appendChild(ov)
	}
	onClick(el, 'data-act', act => { if (act === 'pause') { paused = true; openPause() } })

	return { el, cleanup() { running = false; cancelHuman?.() } }
}
