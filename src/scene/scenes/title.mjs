// Title 씬 — 진입점.
import { div, onClick } from '../dom.mjs'

export function titleScene(ctx) {
	const el = div('scene', `
		<div class="logo">세균전</div>
		<div class="sub">GERM WARFARE</div>
		<div class="btn-col">
			<button class="btn primary" data-go="stage-select">게임 시작</button>
			<div class="btn-row">
				<button class="btn" data-go="tutorial">튜토리얼</button>
				<button class="btn" data-go="settings">설정</button>
				<button class="btn" data-go="credits">크레딧</button>
			</div>
		</div>
	`)
	onClick(el, 'data-go', name => ctx.go(name))
	return { el }
}
