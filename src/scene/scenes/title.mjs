// Title 씬 — 진입점.
import { div, onClick } from '../dom.mjs'
import { t } from '../../i18n/index.mjs'

export function titleScene(ctx) {
	const el = div('scene', `
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
