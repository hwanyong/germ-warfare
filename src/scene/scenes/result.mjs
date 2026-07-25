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
	const { mode = 'pve', result = 'win', stage = 'stage-01', difficulty = 'normal', own = 0, enemy = 0, turns = 0, ranking = [], winnerTeam: localWinnerTeam = null, players, stageData, prefill } = ctx.params
	if (mode === 'local') return localResultScene(ctx, { turns, ranking, winnerTeam: localWinnerTeam, players, stageData, prefill })

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

	// 결과 징글 (BGM 위에 얹힘) — SFX 는 재생 후 취소 불가라, 씬 이탈 시 cleanup() 에서 직접 stop()
	const jingle = playSfx(win ? 'jingle-win' : 'jingle-lose')

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
	return { el, cleanup() { alive = false; try { jingle?.stop() } catch { /* 이미 정지됨 */ } } }
}

// Local PvP 결과 — 순위(칸수 내림차순) + 무승부(공동 1위, map.winner()===null) 분기.
function localResultScene(ctx, { turns, ranking, winnerTeam, players, stageData, prefill }) {
	const draw = !winnerTeam
	const winner = ranking.find(r => r.team === winnerTeam)
	const HUE = { p3: 80, p4: 60 } // 보드 색 변주(play.mjs TEAM_HUE)와 일치 — p3/p4 스프라이트 재활용

	const el = div('scene', `
		${draw ? '' : `<img class="result-mascot" src="${mascotSrc(winnerTeam, 'fast')}" alt=""${HUE[winnerTeam] ? ` style="filter:hue-rotate(${HUE[winnerTeam]}deg)"` : ''}>`}
		<div class="result-head ${draw ? '' : 'win'}">${draw ? t('result.draw') : t('result.localWin', { name: winner.name })}</div>
		<div class="card">
			${ranking.map((r, i) => `
				<div class="rank-row">
					<span><span class="num">${i + 1}.</span>
						<span class="cell badge" data-owner="${r.team}" style="width:1em;height:1em;display:inline-block;vertical-align:middle;margin:0 .3em${HUE[r.team] ? `;filter:hue-rotate(${HUE[r.team]}deg)` : ''}"></span>
						${r.name}${r.controller === 'ai' ? ` <span class="sub">(AI)</span>` : ''}</span>
					<span class="num">${r.cells}</span>
				</div>`).join('')}
			<div class="sub">${turns} ${t('result.turns')}</div>
		</div>
		<div class="btn-col">
			<button class="btn primary" data-act="rematch">${t('result.rematch')}</button>
			<button class="btn" data-act="seats">${t('result.changeSeats')}</button>
			<button class="btn" data-act="select">${t('result.newMatch')}</button>
		</div>
	`)

	// 결과 징글 — playSfx 는 재생 후 취소 불가라 씬 이탈 시 cleanup() 에서 직접 stop() (7d4efe8 회귀 방지).
	// 승자든 무승부든 대칭 대전이라 패배 톤은 부적합 → win 징글로 통일.
	const jingle = playSfx('jingle-win')

	onClick(el, 'data-act', act => {
		if (act === 'rematch') ctx.go('play', { mode: 'local', stageData, players, prefill }) // 같은 맵·구성 재대결
		else if (act === 'seats') ctx.go('local-setup', { prefill })                          // 셋업 변경(프리필)
		else if (act === 'select') ctx.go('local-setup', {})                                   // 새 셋업
	})
	return { el, cleanup() { try { jingle?.stop() } catch { /* 이미 정지됨 */ } } }
}
