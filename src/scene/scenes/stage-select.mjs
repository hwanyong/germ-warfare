// StageSelect 씬 — 스테이지(현재 1개) + 난이도 선택 + 난이도별 최고점 표시(A5).
import { div, onClick } from '../dom.mjs'
import { STAGES, STAGE_ORDER } from '../../data/stages.mjs'
import { getRecord } from '../../storage/progress.mjs'

const DIFFS = ['easy', 'normal', 'hard']
const LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }

export function stageSelectScene(ctx) {
	let difficulty = ctx.params.difficulty ?? 'normal'
	const stageId = STAGE_ORDER[0]
	const stage = STAGES[stageId]

	const el = div('scene', `
		<div class="logo" style="font-size:2rem">스테이지 선택</div>
		<div class="card">
			<div style="font-family:var(--font-title)">STAGE 01 · ${stage.name}</div>
			<div>최고점 <span class="num" id="best">—</span> <span class="sub" id="wins"></span></div>
			<div class="btn-row" id="diffs">
				${DIFFS.map(d => `<button class="btn" data-diff="${d}"${d === difficulty ? ' aria-selected="true"' : ''}>${LABEL[d]}</button>`).join('')}
			</div>
		</div>
		<div class="btn-row">
			<button class="btn primary" data-act="play">시작</button>
			<button class="btn" data-act="back">뒤로</button>
		</div>
	`)

	const bestEl = el.querySelector('#best')
	const winsEl = el.querySelector('#wins')
	const refreshBest = () => {
		const rec = getRecord(stageId, difficulty)
		bestEl.textContent = rec.best > 0 ? String(rec.best) : '—'
		winsEl.textContent = rec.plays > 0 ? `(${rec.wins}승/${rec.plays}판)` : ''
	}

	onClick(el, 'data-diff', d => {
		difficulty = d
		el.querySelectorAll('[data-diff]').forEach(b => b.removeAttribute('aria-selected'))
		el.querySelector(`[data-diff="${d}"]`).setAttribute('aria-selected', 'true')
		refreshBest()
	})
	onClick(el, 'data-act', act => {
		if (act === 'play') ctx.go('play', { stage: stageId, difficulty })
		else if (act === 'back') ctx.go('title')
	})

	refreshBest()
	return { el }
}
