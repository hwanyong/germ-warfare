// Result 씬 — 승/패 분기(락인·이탈방지) + 점수 계산·기록(A5).
// params: { result:'win'|'lose', stage, difficulty, own, enemy, turns }
// 점수 = scoreBreakdown(승리 시만 기록, docs/roadmap.md A5 공식).
// 승리 시 점수 항목을 절차적으로 공개(항목별 카운트업 + 합산 상승), 탭/클릭 = 현재 단계 스킵.
import { div, onClick } from '../dom.mjs'
import { STAGES, STAGE_ORDER } from '../../data/stages.mjs'
import { SCORE, scoreBreakdown, recordPlay } from '../../storage/progress.mjs'
import { mascotSrc } from '../mascot.mjs'
import { t } from '../../i18n/index.mjs'
import { playSfx } from '../../audio/audio.mjs'

const NEXT = { easy: 'normal', normal: 'hard', hard: null }
const PREV = { hard: 'normal', normal: 'easy', easy: null }

export function resultScene(ctx) {
	const { result = 'win', stage = 'stage-01', difficulty = 'normal', own = 0, enemy = 0, turns = 0 } = ctx.params
	const win = result === 'win'
	const parTurns = STAGES[stage]?.parTurns ?? 20

	const bd = win ? scoreBreakdown({ own, enemy, turns, parTurns }) : null
	const score = bd?.total ?? 0
	const { best, newBest } = recordPlay(stage, difficulty, { win, score })

	// 절차 공개 스텝: 항목값(val 카운트업 | valText 그대로) + 그 시점의 누적 합산(after)
	const rows = win ? [
		{ label: `${t('result.scoreGerms')} ${own}×${SCORE.OWN}`, val: bd.germs, after: bd.germs },
		{ label: `${t('result.scoreMargin')} ${bd.margin}×${SCORE.MARGIN}`, val: bd.marginPts, after: bd.sub },
		...(bd.elim ? [{ label: t('result.scoreElim'), valText: `×${bd.mult}`, after: bd.sub * bd.mult }] : []),
		...(bd.fast > 0 ? [{ label: t('result.scoreFast'), val: bd.fast, after: bd.total }] : [])
	] : []

	const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1] ?? null
	const buttons = win
		? `
			${nextStage ? `<button class="btn primary" data-act="next">${t('result.nextStage')}</button>` : ''}
			<button class="btn ${nextStage ? '' : 'primary'}" data-act="rematch">${t('result.rematch')}</button>
			${NEXT[difficulty] ? `<button class="btn" data-act="harder">${t('result.harder')}</button>` : ''}
			<button class="btn" data-act="select">${t('result.select')}</button>
		`
		: `
			<button class="btn big" data-act="rematch">${t('result.tryAgain')}</button>
			${PREV[difficulty] ? `<button class="btn" data-act="easier">${t('result.easier')}</button>` : ''}
			<button class="btn" data-act="select">${t('result.select')}</button>
		`

	const winnerTeam = own > enemy ? 'p1' : 'p2'
	const el = div('scene', `
		<img class="result-mascot" src="${mascotSrc(winnerTeam, win ? 'fast' : '')}" alt="">
		<div class="result-head ${win ? 'win' : 'lose'}">${win ? t('result.win') : t('result.lose')}</div>
		<div class="card">
			<div>${t('result.you')} <span class="num">${own}</span> : <span class="num">${enemy}</span> ${t('result.enemy')} <span class="sub">(${turns} ${t('result.turns')})</span></div>
			${win ? `
			<div class="score-lines">
				${rows.map((r, i) => `<div class="score-line" data-row="${i}"><span>${r.label}</span><span class="num">${r.valText ?? 0}</span></div>`).join('')}
				<div class="score-line score-total"><span>${t('result.score')}</span><span class="num" id="score-total">0</span></div>
			</div>
			<div class="sub" id="tap-hint">${t('result.tapSkip')}</div>` : ''}
			<div id="best-line"${win ? ' style="visibility:hidden"' : ''}>${t('result.best')} <span class="num">${best}</span> ${newBest ? `<span class="badge-new">${t('result.newRecord')}</span>` : ''}</div>
		</div>
		<div class="btn-col">${buttons}</div>
	`)

	playSfx(win ? 'jingle-win' : 'jingle-lose') // 결과 징글 (BGM 위에 얹힘)

	// ---- 절차적 점수 연출 (승리 시) ----
	let alive = true
	let skip = null // 현재 진행 중 단계의 즉시완료 콜백 — 탭/클릭 = 스킵
	el.addEventListener('pointerdown', e => { if (!e.target.closest('.btn')) skip?.() })

	const sleepSkippable = ms => new Promise(res => {
		const id = setTimeout(fin, ms)
		function fin() { clearTimeout(id); skip = null; res() }
		skip = fin
	})
	// 한 단계 = 항목값 0→val 카운트업 + 합산 totalFrom→totalTo 동시 상승 (rAF 1개, 스킵 = 종값 즉시)
	const tweenStep = (valEl, val, totalEl, totalFrom, totalTo, dur = 480) => new Promise(res => {
		let raf, t0
		const fin = () => {
			cancelAnimationFrame(raf)
			if (valEl && val != null) valEl.textContent = String(val)
			totalEl.textContent = String(totalTo)
			skip = null
			res()
		}
		skip = fin
		const step = ts => {
			if (!alive) return fin()
			t0 ??= ts
			const k = Math.min(1, (ts - t0) / dur)
			const e = 1 - (1 - k) ** 2 // ease-out
			if (valEl && val != null) valEl.textContent = String(Math.round(val * e))
			totalEl.textContent = String(Math.round(totalFrom + (totalTo - totalFrom) * e))
			if (k >= 1) fin()
			else raf = requestAnimationFrame(step)
		}
		raf = requestAnimationFrame(step)
	})

	async function playScoreSeq() {
		const totalEl = el.querySelector('#score-total')
		let cur = 0
		for (let i = 0; i < rows.length && alive; i++) {
			const r = rows[i]
			const rowEl = el.querySelector(`[data-row="${i}"]`)
			rowEl.classList.add('shown')
			playSfx('sfx-select', { rate: 1.1, gain: 0.7 })
			await tweenStep(r.valText == null ? rowEl.querySelector('.num') : null, r.val, totalEl, cur, r.after)
			cur = r.after
			await sleepSkippable(260)
		}
		if (!alive) return
		el.querySelector('#tap-hint')?.remove()
		const bestLine = el.querySelector('#best-line')
		bestLine.style.visibility = ''
		if (newBest) playSfx('sfx-turn', { rate: 1.1 })
	}
	if (win) playScoreSeq()

	// TODO(F): result → 복귀 사이 광고 슬롯 훅

	onClick(el, 'data-act', act => {
		if (act === 'next') ctx.go('play', { stage: nextStage, difficulty })
		else if (act === 'rematch') ctx.go('play', { stage, difficulty })
		else if (act === 'harder') ctx.go('play', { stage, difficulty: NEXT[difficulty] })
		else if (act === 'easier') ctx.go('play', { stage, difficulty: PREV[difficulty] })
		else if (act === 'select') ctx.go('stage-select', { difficulty })
	})
	return { el, cleanup() { alive = false } }
}
