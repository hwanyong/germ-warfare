// Seats 씬 (신규) — Local PvP 좌석 설정. 스테이지의 teams 수만큼 좌석을 뿌리고
// 좌석별 [사람|AI] 토글 + AI 좌석 난이도를 고른 뒤 Play(mode='local')로 넘긴다.
// 이름 입력 없음 — 좌석은 항상 "Player N" 고정 라벨(i18n seats.playerLabel).
import { div, onClick } from '../dom.mjs'
import { STAGES } from '../../data/stages.mjs'
import { DIFFS, LABEL } from './stage-select.mjs'
import { t, getLang } from '../../i18n/index.mjs'

export function seatsScene(ctx) {
	const { stage = 'stage-01', difficulty = 'normal', players: prevPlayers } = ctx.params
	const stageData = STAGES[stage]
	const lang = getLang()
	const nTeams = stageData.teams ?? 2
	const teams = Array.from({ length: nTeams }, (_, i) => `p${i + 1}`)

	// 기본: 좌석1·2 = 사람(로컬대전 핵심), 나머지 = AI. 전부 토글 가능.
	// "좌석 변경"(Result 복귀)으로 들어온 경우 이전 players 로 프리필.
	const seats = teams.map((tm, i) => {
		const prev = prevPlayers?.find(p => p.team === tm)
		return {
			team: tm,
			controller: prev?.controller ?? (i < 2 ? 'human' : 'ai'),
			aiDifficulty: prev?.aiDifficulty ?? difficulty
		}
	})

	const seatRow = s => `
		<div class="seat-row" data-seat="${s.team}">
			<span class="cell badge" data-owner="${s.team}" style="width:1.3em;height:1.3em;display:inline-block"></span>
			<span class="seat-name">${t('seats.playerLabel', { n: teams.indexOf(s.team) + 1 })}</span>
			<div class="btn-row">
				<button class="btn" data-ctrl="human"${s.controller === 'human' ? ' aria-selected="true"' : ''}>${t('seats.human')}</button>
				<button class="btn" data-ctrl="ai"${s.controller === 'ai' ? ' aria-selected="true"' : ''}>${t('seats.ai')}</button>
			</div>
			<div class="btn-row seat-diff"${s.controller === 'ai' ? '' : ' style="visibility:hidden"'}>
				${DIFFS.map(d => `<button class="btn" data-diff="${d}"${d === s.aiDifficulty ? ' aria-selected="true"' : ''}>${LABEL[d]}</button>`).join('')}
			</div>
		</div>`

	const el = div('scene', `
		<div class="logo" style="font-size:2rem">${t('seats.title')}</div>
		<div class="sub">${stageData.name[lang] ?? stageData.name.en}</div>
		<div class="card seat-list">${seats.map(seatRow).join('')}</div>
		<div class="btn-row">
			<button class="btn primary" data-act="start" id="seats-start">${t('seats.start')}</button>
			<button class="btn" data-act="back">${t('seats.back')}</button>
		</div>
	`)

	const startBtn = el.querySelector('#seats-start')
	function syncStartState() {
		const hasHuman = seats.some(s => s.controller === 'human')
		startBtn.disabled = !hasHuman
		startBtn.style.opacity = hasHuman ? '' : '.4'
	}

	onClick(el, 'data-ctrl', (val, node) => {
		const row = node.closest('.seat-row')
		const s = seats.find(x => x.team === row.dataset.seat)
		s.controller = val
		row.querySelectorAll('[data-ctrl]').forEach(b => b.removeAttribute('aria-selected'))
		node.setAttribute('aria-selected', 'true')
		row.querySelector('.seat-diff').style.visibility = val === 'ai' ? 'visible' : 'hidden'
		syncStartState()
	})
	onClick(el, 'data-diff', (val, node) => {
		const row = node.closest('.seat-row')
		const s = seats.find(x => x.team === row.dataset.seat)
		s.aiDifficulty = val
		row.querySelectorAll('[data-diff]').forEach(b => b.removeAttribute('aria-selected'))
		node.setAttribute('aria-selected', 'true')
	})
	onClick(el, 'data-act', act => {
		if (act === 'start') {
			if (startBtn.disabled) return
			const players = seats.map(s => ({ team: s.team, controller: s.controller, aiDifficulty: s.aiDifficulty }))
			ctx.go('play', { stage, difficulty, mode: 'local', players })
		} else if (act === 'back') ctx.back()
	})

	syncStartState()
	return { el }
}
