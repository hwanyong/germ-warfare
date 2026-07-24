// Title 씬 — 진입점. 마스코트(걷는 세균)·우주선 데코 + 간단 애니(CSS, scene.css §title).
import { div, onClick } from '../dom.mjs'
import { mascotSrc } from '../mascot.mjs'
import { t } from '../../i18n/index.mjs'

const A = '/germ-warfare/assets'

export function titleScene(ctx) {
	const el = div('scene title-scene', `
		<div class="title-deco" aria-hidden="true">
			<img class="t-ship t-ship-p1" src="${A}/ship/ship-p1.png" alt="">
			<img class="t-ship t-ship-p2" src="${A}/ship/ship-p2.png" alt="">
			<img class="t-walk t-walk-p1" src="${mascotSrc('p1', 'left')}" alt="">
			<img class="t-walk t-walk-p2" src="${mascotSrc('p2', 'left')}" alt="">
		</div>
		<div class="logo">세균전</div>
		<div class="sub">GERM WARFARE</div>
		<div class="btn-col">
			<button class="btn primary" data-go="stage-select">${t('title.play')}</button>
			<div class="btn-row">
				<button class="btn" data-go="tutorial">${t('title.tutorial')}</button>
				<button class="btn" data-go="settings">${t('title.settings')}</button>
				<button class="btn" data-go="credits">${t('title.credits')}</button>
			</div>
		</div>
	`)
	onClick(el, 'data-go', name => ctx.go(name))
	return { el }
}
