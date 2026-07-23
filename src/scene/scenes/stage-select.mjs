// StageSelect 씬 — 스테이지 카드 목록(PHASE E: 다수) + 난이도 + 스테이지×난이도 최고점.
import { div, onClick } from '../dom.mjs'
import { STAGES, STAGE_ORDER } from '../../data/stages.mjs'
import { getRecord } from '../../storage/progress.mjs'
import { t, getLang } from '../../i18n/index.mjs'

const DIFFS = ['easy', 'normal', 'hard']
const LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }

export function stageSelectScene(ctx) {
	let difficulty = ctx.params.difficulty ?? 'normal'
	let stageId = ctx.params.stage ?? STAGE_ORDER[0]
	const lang = getLang()

	const el = div('scene', `
		<div class="logo" style="font-size:2rem">${t('stage.title')}</div>
		<div class="btn-col" id="stages" style="gap:.5em">
			${STAGE_ORDER.map((id, i) => {
				const s = STAGES[id]
				return `
				<div class="card stage-card" data-stage="${id}"${id === stageId ? ' aria-selected="true"' : ''} style="min-width:17em;cursor:url(/germ-warfare/assets/cursor/hand.png) 6 2, pointer">
					<div style="font-family:var(--font-title)">STAGE ${String(i + 1).padStart(2, '0')} · ${s.name[lang] ?? s.name.en}</div>
					<div class="sub">${s.grid.w}×${s.grid.h}${s.blocked?.length ? ` · ⛰${s.blocked.length}` : ''}</div>
					<div>${t('stage.best')} <span class="num" data-best="${id}">—</span> <span class="sub" data-wins="${id}"></span></div>
				</div>`
			}).join('')}
		</div>
		<div class="btn-row" id="diffs">
			${DIFFS.map(d => `<button class="btn" data-diff="${d}"${d === difficulty ? ' aria-selected="true"' : ''}>${LABEL[d]}</button>`).join('')}
		</div>
		<div class="btn-row">
			<button class="btn primary" data-act="play">${t('stage.start')}</button>
			<button class="btn" data-act="back">${t('stage.back')}</button>
		</div>
	`)

	const refreshBest = () => {
		for (const id of STAGE_ORDER) {
			const rec = getRecord(id, difficulty)
			el.querySelector(`[data-best="${id}"]`).textContent = rec.best > 0 ? String(rec.best) : '—'
			el.querySelector(`[data-wins="${id}"]`).textContent = rec.plays > 0 ? `(${rec.wins}/${rec.plays})` : ''
		}
	}

	onClick(el, 'data-stage', id => {
		stageId = id
		el.querySelectorAll('[data-stage]').forEach(c => c.removeAttribute('aria-selected'))
		el.querySelector(`[data-stage="${id}"]`).setAttribute('aria-selected', 'true')
	})
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
