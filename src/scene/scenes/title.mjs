// Title 씬 — 진입점. 마스코트(걷는 세균)·우주선 데코 + 간단 애니(CSS, scene.css §title) + 말풍선 순환.
import { div, onClick } from '../dom.mjs'
import { mascotSrc } from '../mascot.mjs'
import { scheduleBubbleTour } from '../speechBubble.mjs'
import { t } from '../../i18n/index.mjs'

const A = '/germ-warfare/assets'

const TIPS = () => [t('title.tip1'), t('title.tip2'), t('title.tip3')]

export function titleScene(ctx) {
	const el = div('scene title-scene', `
		<div class="title-deco" aria-hidden="true">
			<div class="t-ship-wrap t-ship-p1">
				<img class="t-ship" src="${A}/ship/ship-p1.png" alt="">
			</div>
			<div class="t-ship-wrap t-ship-p2">
				<img class="t-ship" src="${A}/ship/ship-p2.png" alt="">
			</div>
			<div class="t-walk-wrap t-walk-p1">
				<img class="t-walk" src="${mascotSrc('p1', 'right')}" alt="">
			</div>
			<div class="t-walk-wrap t-walk-p2">
				<img class="t-walk" src="${mascotSrc('p2', 'right')}" alt="">
			</div>
		</div>
		<div class="logo">세균전</div>
		<div class="sub">GERM WARFARE</div>
		<div class="btn-col">
			<button class="btn primary" data-go="stage-select">${t('title.play')}</button>
			<button class="btn" data-go="local-setup">${t('title.localPvp')}</button>
			<div class="btn-row">
				<button class="btn" data-go="tutorial">${t('title.tutorial')}</button>
				<button class="btn" data-go="settings">${t('title.settings')}</button>
				<button class="btn" data-go="credits">${t('title.credits')}</button>
			</div>
		</div>
	`)
	onClick(el, 'data-go', name => ctx.go(name))

	// 걷는 마스코트 + 떠 있는 우주선 = 기능 소개용 말풍선. 4마리 중 매번 하나만 무작위로 골라
	// 톡 튀어나왔다 사라지는 "가끔 뜨는 팁" 느낌(동시에 항상 최대 1개 — scheduleBubbleTour 참고).
	const stopTour = scheduleBubbleTour(
		[
			{ container: el.querySelector('.t-walk-p1'), owner: 'p1' },
			{ container: el.querySelector('.t-walk-p2'), owner: 'p2' },
			{ container: el.querySelector('.t-ship-p1'), owner: 'p1' },
			{ container: el.querySelector('.t-ship-p2'), owner: 'p2' },
		],
		{ messages: TIPS() },
	)

	return { el, cleanup: stopTour }
}
