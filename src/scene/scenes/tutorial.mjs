// Tutorial 씬(A6) — 별도 3x3 축소 보드 실습.
// 고정 시나리오(규칙 엔진 재구현 없음 — 시각 시연): ①소스 선택 ②거리1 복제
// ③거리2 이동 ④감염 ⑤완료. crosshair 로 클릭 타겟 안내, 단계별 입력 게이팅.
// 완료 시 tutorialDone 저장 → returnTo(플레이) 또는 back.
import { div, onClick } from '../dom.mjs'
import { WOBBLE_VARIANTS } from '../../render/fx.mjs'
import { setTutorialDone } from '../../storage/progress.mjs'

const A = '/germ-warfare/assets'
const idx = (x, y) => y * 3 + x

// 시나리오: p1=(0,1), p2=(2,0). 복제→이동→감염 순.
const STEPS = [
	{ msg: '① 내 세균(초록)을 클릭!', target: idx(0, 1), aim: null },
	{ msg: '② 바로 옆 빈칸 클릭 = 복제 (원본 유지)', target: idx(1, 1), aim: 'aim-clone' },
	{ msg: '③ 두 칸 떨어진 빈칸 클릭 = 이동 (원본 소멸)', target: idx(2, 2), aim: 'aim-move' },
	{ msg: '④ 적(핑크) 옆에 두면 감염! 클릭해 보자', target: idx(1, 0), aim: 'aim-clone' },
	{ msg: '⑤ 완료! 칸이 더 많은 쪽이 승리한다', target: null, aim: null }
]

export function tutorialScene(ctx) {
	const { returnTo, stage, difficulty } = ctx.params
	let step = 0
	// 보드 상태: null | 'p1' | 'p2'
	const owners = Array(9).fill(null)
	owners[idx(0, 1)] = 'p1'
	owners[idx(2, 0)] = 'p2'

	const el = div('scene', `
		<button class="btn back-btn" data-act="skip">← 스킵</button>
		<div class="logo" style="font-size:2rem">튜토리얼</div>
		<div class="card" style="min-width:16em"><div id="tut-msg"></div></div>
		<div class="board" id="mini" style="width:min(60vmin,300px);grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr)">
			${Array.from({ length: 9 }, (_, i) => `<div class="tile frame-thin" data-i="${i}"></div>`).join('')}
		</div>
		<button class="btn primary" data-act="done" style="visibility:hidden">완료</button>
	`)

	const msgEl = el.querySelector('#tut-msg')
	const mini = el.querySelector('#mini')
	const doneBtn = el.querySelector('[data-act="done"]')
	const tiles = [...mini.querySelectorAll('.tile')]

	function renderCells() {
		tiles.forEach((t, i) => {
			let cell = t.querySelector('.cell')
			if (!owners[i]) { cell?.remove(); return }
			if (!cell) {
				cell = document.createElement('div')
				cell.className = `cell w${Math.floor(Math.random() * WOBBLE_VARIANTS)}`
				cell.style.setProperty('--bdelay', `${(Math.random() * -3).toFixed(2)}s`)
				t.appendChild(cell)
			}
			cell.dataset.owner = owners[i]
		})
	}
	function renderStep() {
		const s = STEPS[step]
		msgEl.textContent = s.msg
		// crosshair 안내: 타겟 칸에 aim 이미지 표시
		tiles.forEach(t => t.querySelector('.tut-aim')?.remove())
		if (s.target != null && s.aim) {
			const img = document.createElement('img')
			img.className = 'tut-aim'
			img.src = `${A}/crosshair/${s.aim}.png`
			img.style.cssText = 'position:absolute;inset:12%;width:76%;height:76%;pointer-events:none;'
			tiles[s.target].appendChild(img)
		}
		if (s.target == null) doneBtn.style.visibility = 'visible'
	}

	function pop(i) {
		tiles[i].querySelector('.cell')?.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: 0.7 }, { transform: 'scale(1)' }],
			{ duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' }
		)
	}

	mini.addEventListener('click', e => {
		const t = e.target.closest('.tile')
		if (!t) return
		const i = +t.dataset.i
		const s = STEPS[step]
		if (s.target !== i) return // 단계 입력 게이팅

		if (step === 0) { /* 소스 선택 — 하이라이트만 */ }
		else if (step === 1) { owners[i] = 'p1'; pop(i) }                     // 복제
		else if (step === 2) { owners[idx(1, 1)] = null; owners[i] = 'p1'; pop(i) } // 이동(원본 소멸)
		else if (step === 3) { owners[i] = 'p1'; owners[idx(2, 0)] = 'p1'; pop(i); pop(idx(2, 0)) } // 감염
		renderCells()
		step++
		renderStep()
	})

	function finish() {
		setTutorialDone()
		if (returnTo === 'play') ctx.go('play', { stage, difficulty })
		else ctx.back()
	}
	onClick(el, 'data-act', act => { if (act === 'skip' || act === 'done') finish() })

	renderCells()
	renderStep()
	return { el }
}
