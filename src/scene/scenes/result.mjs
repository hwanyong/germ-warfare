// Result 씬 — 승/패 분기(락인·이탈방지) + 점수 계산·기록(A5).
// params: { result:'win'|'lose', stage, difficulty, own, enemy, turns }
// 점수 = computeScore(승리 시만 기록, docs/roadmap.md A5 공식).
import { div, onClick } from '../dom.mjs'
import { STAGES } from '../../data/stages.mjs'
import { computeScore, recordPlay } from '../../storage/progress.mjs'

const NEXT = { easy: 'normal', normal: 'hard', hard: null }
const PREV = { hard: 'normal', normal: 'easy', easy: null }

export function resultScene(ctx) {
	const { result = 'win', stage = 'stage-01', difficulty = 'normal', own = 0, enemy = 0, turns = 0 } = ctx.params
	const win = result === 'win'
	const parTurns = STAGES[stage]?.parTurns ?? 20

	const score = win ? computeScore({ own, enemy, turns, parTurns }) : 0
	const { best, newBest } = recordPlay(stage, difficulty, { win, score })

	const buttons = win
		? `
			<button class="btn primary" data-act="rematch">재대결</button>
			${NEXT[difficulty] ? `<button class="btn" data-act="harder">난이도 ↑ 도전</button>` : ''}
			<button class="btn" data-act="select">스테이지 선택</button>
		`
		: `
			<button class="btn big" data-act="rematch">다시 도전</button>
			${PREV[difficulty] ? `<button class="btn" data-act="easier">난이도 ↓</button>` : ''}
			<button class="btn" data-act="select">스테이지 선택</button>
		`

	const el = div('scene', `
		<div class="result-head ${win ? 'win' : 'lose'}">${win ? '승리! 🎉' : '아깝다! 😵'}</div>
		<div class="card">
			<div>내 세균 <span class="num">${own}</span> : <span class="num">${enemy}</span> 적 세균 <span class="sub">(${turns}턴)</span></div>
			${win ? `<div>점수 <span class="num">${score}</span></div>` : ''}
			<div>최고 <span class="num">${best}</span> ${newBest ? '<span class="badge-new">신기록!</span>' : ''}</div>
		</div>
		<div class="btn-col">${buttons}</div>
	`)

	// TODO(F): result → 복귀 사이 광고 슬롯 훅

	onClick(el, 'data-act', act => {
		if (act === 'rematch') ctx.go('play', { stage, difficulty })
		else if (act === 'harder') ctx.go('play', { stage, difficulty: NEXT[difficulty] })
		else if (act === 'easier') ctx.go('play', { stage, difficulty: PREV[difficulty] })
		else if (act === 'select') ctx.go('stage-select', { difficulty })
	})
	return { el }
}
