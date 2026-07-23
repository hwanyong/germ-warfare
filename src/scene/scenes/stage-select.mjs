// StageSelect 씬 — 스테이지(현재 1개) + 난이도 선택 + 난이도별 최고점 표시.
// 최고점 store 연동은 A5(진행저장)에서. 지금은 '—' 플레이스홀더.
import { div, onClick } from '../dom.mjs'

const DIFFS = ['easy', 'normal', 'hard']
const LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }

export function stageSelectScene(ctx) {
	let difficulty = 'normal'

	const el = div('scene', `
		<div class="logo" style="font-size:2rem">스테이지 선택</div>
		<div class="card">
			<div style="font-family:var(--font-title)">STAGE 01 · 마을 침공</div>
			<div>최고점 <span class="num" id="best">—</span></div>
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
	const refreshBest = () => {
		// TODO(A5): store 에서 stage-01 × difficulty 최고점 읽기
		bestEl.textContent = '—'
	}

	onClick(el, 'data-diff', d => {
		difficulty = d
		el.querySelectorAll('[data-diff]').forEach(b => b.removeAttribute('aria-selected'))
		el.querySelector(`[data-diff="${d}"]`).setAttribute('aria-selected', 'true')
		refreshBest()
	})
	onClick(el, 'data-act', act => {
		if (act === 'play') ctx.go('play', { stage: 'stage-01', difficulty })
		else if (act === 'back') ctx.go('title')
	})

	refreshBest()
	return { el }
}
