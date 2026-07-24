// Tutorial 씬(A6) — 3x3 축소 보드. **실제 게임과 동일한 절차**를 가르친다:
// 매 수 = 소스 세균 선택(클릭→사각 브래킷) → 타겟 칸 클릭(거리1 복제 / 거리2 이동, 감염).
// 3개 레슨(복제·이동·감염) 각각 select→target 2단계. 단계별 힌트 하이라이트 + 입력 게이팅.
import { div, onClick } from '../dom.mjs'
import { WOBBLE_VARIANTS } from '../../render/fx.mjs'
import { setTutorialDone } from '../../storage/progress.mjs'
import { t } from '../../i18n/index.mjs'

const idx = (x, y) => y * 3 + x
const xy = i => ({ x: i % 3, y: (i / 3) | 0 })
const dist = (a, b) => { const A = xy(a), B = xy(b); return Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y)) }

// 시나리오: p1=(0,0), p2=(2,2). 3 레슨 = 복제 → 이동 → 감염.
const LESSONS = [
	{ source: idx(0, 0), target: idx(1, 1), selKey: 'tutorial.sel1', actKey: 'tutorial.clone' }, // 복제(거리1)
	{ source: idx(0, 0), target: idx(2, 0), selKey: 'tutorial.sel2', actKey: 'tutorial.move' },  // 이동(거리2)
	{ source: idx(1, 1), target: idx(2, 1), selKey: 'tutorial.sel3', actKey: 'tutorial.infect' } // 감염((2,1) 옆 (2,2)=적)
]

export function tutorialScene(ctx) {
	const { returnTo, stage, difficulty, mode, players } = ctx.params
	const owners = Array(9).fill(null)
	owners[idx(0, 0)] = 'p1'
	owners[idx(2, 2)] = 'p2'

	let lesson = 0
	let phase = 'select' // 'select' | 'target'
	let selected = null

	const el = div('scene', `
		<button class="btn back-btn" data-act="skip">← ${t('tutorial.skip')}</button>
		<div class="logo" style="font-size:2rem">${t('tutorial.title')}</div>
		<div class="card" style="min-width:17em"><div id="tut-msg"></div></div>
		<div class="board" id="mini" style="width:min(60vmin,300px,max(150px,calc(100dvh - 13em)));grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr)">
			${Array.from({ length: 9 }, (_, i) => `<div class="tile frame-thin" data-i="${i}"></div>`).join('')}
		</div>
		<button class="btn primary" data-act="done" style="visibility:hidden">${t('tutorial.done')}</button>
	`)

	const msgEl = el.querySelector('#tut-msg')
	const mini = el.querySelector('#mini')
	const doneBtn = el.querySelector('[data-act="done"]')
	const tiles = [...mini.querySelectorAll('.tile')]

	function renderCells() {
		tiles.forEach((tile, i) => {
			let cell = tile.querySelector('.cell')
			if (!owners[i]) { cell?.remove(); return }
			if (!cell) {
				cell = document.createElement('div')
				cell.className = `cell w${Math.floor(Math.random() * WOBBLE_VARIANTS)}`
				cell.style.setProperty('--bdelay', `${(Math.random() * -3).toFixed(2)}s`)
				tile.appendChild(cell)
			}
			cell.dataset.owner = owners[i]
		})
	}
	function clearMarks() {
		tiles.forEach(tl => tl.classList.remove('selected', 'hint'))
	}
	// 현재 단계에서 클릭해야 할 칸 하이라이트 + 소스 선택 표시
	function renderStep() {
		clearMarks()
		if (lesson >= LESSONS.length) {
			msgEl.textContent = t('tutorial.fin')
			doneBtn.style.visibility = 'visible'
			return
		}
		const L = LESSONS[lesson]
		if (phase === 'select') {
			msgEl.textContent = t(L.selKey)
			tiles[L.source].classList.add('hint')
		} else {
			msgEl.textContent = t(L.actKey)
			tiles[selected].classList.add('selected')
			tiles[L.target].classList.add('hint')
		}
	}

	function pop(i) {
		tiles[i].querySelector('.cell')?.animate(
			[{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: .7 }, { transform: 'scale(1)' }],
			{ duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' }
		)
	}
	function flip(i) {
		tiles[i].querySelector('.cell')?.animate(
			[{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.3) rotate(180deg)', offset: .5 }, { transform: 'scale(1) rotate(360deg)' }],
			{ duration: 380, easing: 'ease-out' }
		)
	}
	function infect(center) {
		const c = xy(center)
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
			if (!dx && !dy) continue
			const nx = c.x + dx, ny = c.y + dy
			if (nx < 0 || nx > 2 || ny < 0 || ny > 2) continue
			const ni = idx(nx, ny)
			if (owners[ni] === 'p2') { owners[ni] = 'p1'; renderCells(); flip(ni) }
		}
	}

	mini.addEventListener('click', e => {
		const tile = e.target.closest('.tile')
		if (!tile || lesson >= LESSONS.length) return
		const i = +tile.dataset.i
		const L = LESSONS[lesson]

		if (phase === 'select') {
			if (i !== L.source || owners[i] !== 'p1') return // 게이팅: 지정 세균만
			selected = i
			phase = 'target'
			renderStep()
		} else {
			if (i !== L.target) return // 게이팅: 지정 타겟만
			const d = dist(selected, i)
			owners[i] = 'p1'          // 복제/이동 공통: 타겟 생성
			if (d === 2) owners[selected] = null // 이동: 원본 소멸
			renderCells()
			pop(i)
			infect(i)                 // 감염
			// 다음 레슨
			selected = null
			phase = 'select'
			lesson++
			renderStep()
		}
	})

	function finish() {
		setTutorialDone()
		if (returnTo === 'play') ctx.go('play', { stage, difficulty, mode, players })
		else ctx.back()
	}
	onClick(el, 'data-act', act => { if (act === 'skip' || act === 'done') finish() })

	renderCells()
	renderStep()
	return { el }
}
