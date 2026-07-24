// StageSelect 씬 — 캠페인 챕터×스테이지 그리드 + 해금(직전 승리) + 난이도 + 최고점.
// 카드 정보: 번호·이름 / 보드·지형·적군 수·AI 기본레벨(★) / 난이도별 best.
import { div, onClick } from '../dom.mjs'
import { STAGES, STAGE_ORDER, CHAPTERS } from '../../data/stages.mjs'
import { getRecord, hasWin } from '../../storage/progress.mjs'
import { t, getLang } from '../../i18n/index.mjs'

const DIFFS = ['easy', 'normal', 'hard']
const LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }
// UI 이모지 금지 규약 — 텍스트 심볼만 (★=AI 레벨, ▲=바위, VS=적군 수)
const STARS = { easy: '★', normal: '★★', hard: '★★★' }

export function stageSelectScene(ctx) {
	let difficulty = ctx.params.difficulty ?? 'normal'
	const lang = getLang()

	// 해금: 첫 스테이지 or 직전 스테이지 승리
	const isUnlocked = id => {
		const i = STAGE_ORDER.indexOf(id)
		return i === 0 || hasWin(STAGE_ORDER[i - 1])
	}
	// 기본 선택 = 진행 중인 스테이지 (해금됐지만 미승리) — 없으면 마지막 해금
	const firstOpen = STAGE_ORDER.find(id => isUnlocked(id) && !hasWin(id))
		?? STAGE_ORDER.filter(isUnlocked).at(-1)
	let stageId = (ctx.params.stage && isUnlocked(ctx.params.stage)) ? ctx.params.stage : firstOpen

	const card = id => {
		const s = STAGES[id]
		const num = String(STAGE_ORDER.indexOf(id) + 1).padStart(2, '0')
		if (!isUnlocked(id)) {
			return `
			<div class="card stage-card locked">
				<div class="stage-num">${num}</div>
				<div class="sub">${t('stage.locked')}</div>
			</div>`
		}
		const enemies = (s.teams ?? 2) - 1
		return `
		<div class="card stage-card" data-stage="${id}"${id === stageId ? ' aria-selected="true"' : ''} style="cursor:url(/germ-warfare/assets/cursor/hand.png) 6 2, pointer">
			<div class="stage-num">${num} · ${s.name[lang] ?? s.name.en}</div>
			<div class="sub">${s.grid.w}×${s.grid.h}${s.blocked?.length ? ` · ▲${s.blocked.length}` : ''} · VS${enemies} · ${STARS[s.ai ?? 'normal']}</div>
			<div>${t('stage.best')} <span class="num" data-best="${id}">—</span> <span class="sub" data-wins="${id}"></span></div>
		</div>`
	}

	const el = div('scene stage-select-scene', `
		<div class="logo" style="font-size:2rem">${t('stage.title')}</div>
		<div class="stage-list" id="stages">
			${CHAPTERS.map(ch => `
			<div class="chapter">
				<div class="chapter-head">${ch.name[lang] ?? ch.name.en}</div>
				<div class="stage-grid">${ch.stages.map(card).join('')}</div>
			</div>`).join('')}
		</div>
		<div class="stage-actions">
			<div class="btn-row" id="diffs">
				${DIFFS.map(d => `<button class="btn" data-diff="${d}"${d === difficulty ? ' aria-selected="true"' : ''}>${LABEL[d]}</button>`).join('')}
			</div>
			<div class="btn-row">
				<button class="btn primary" data-act="play">${t('stage.start')}</button>
				<button class="btn" data-act="back">${t('stage.back')}</button>
			</div>
		</div>
	`)

	// 진행 중(선택된) 스테이지가 첫 화면에 보이게 — 긴 목록에서 스크롤 미아 방지
	queueMicrotask(() => el.querySelector('.stage-card[aria-selected="true"]')?.scrollIntoView({ block: 'center' }))

	const refreshBest = () => {
		for (const id of STAGE_ORDER) {
			const bestEl = el.querySelector(`[data-best="${id}"]`)
			if (!bestEl) continue // 잠금 카드
			const rec = getRecord(id, difficulty)
			bestEl.textContent = rec.best > 0 ? String(rec.best) : '—'
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
