// Result 씬 — 승/패 분기(락인·이탈방지) + 점수 계산·기록(A5).
// params: { result:'win'|'lose', stage, difficulty, own, enemy, turns }
// 점수 = computeScore(승리 시만 기록, docs/roadmap.md A5 공식).
import { div, onClick } from '../dom.mjs'
import { STAGES, STAGE_ORDER } from '../../data/stages.mjs'
import { computeScore, recordPlay } from '../../storage/progress.mjs'
import { t } from '../../i18n/index.mjs'
import { playSfx } from '../../audio/audio.mjs'

const NEXT = { easy: 'normal', normal: 'hard', hard: null }
const PREV = { hard: 'normal', normal: 'easy', easy: null }

export function resultScene(ctx) {
	const { result = 'win', stage = 'stage-01', difficulty = 'normal', own = 0, enemy = 0, turns = 0 } = ctx.params
	const win = result === 'win'
	const parTurns = STAGES[stage]?.parTurns ?? 20

	const score = win ? computeScore({ own, enemy, turns, parTurns }) : 0
	const { best, newBest } = recordPlay(stage, difficulty, { win, score })

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
		<div class="cell result-badge" data-owner="${winnerTeam}"></div>
		<div class="result-head ${win ? 'win' : 'lose'}">${win ? t('result.win') : t('result.lose')}</div>
		<div class="card">
			<div>${t('result.you')} <span class="num">${own}</span> : <span class="num">${enemy}</span> ${t('result.enemy')} <span class="sub">(${turns} ${t('result.turns')})</span></div>
			${win ? `<div>${t('result.score')} <span class="num">${score}</span></div>` : ''}
			<div>${t('result.best')} <span class="num">${best}</span> ${newBest ? `<span class="badge-new">${t('result.newRecord')}</span>` : ''}</div>
		</div>
		<div class="btn-col">${buttons}</div>
	`)

	playSfx(win ? 'jingle-win' : 'jingle-lose') // 결과 징글 (BGM 위에 얹힘)

	// TODO(F): result → 복귀 사이 광고 슬롯 훅

	onClick(el, 'data-act', act => {
		if (act === 'next') ctx.go('play', { stage: nextStage, difficulty })
		else if (act === 'rematch') ctx.go('play', { stage, difficulty })
		else if (act === 'harder') ctx.go('play', { stage, difficulty: NEXT[difficulty] })
		else if (act === 'easier') ctx.go('play', { stage, difficulty: PREV[difficulty] })
		else if (act === 'select') ctx.go('stage-select', { difficulty })
	})
	return { el }
}
