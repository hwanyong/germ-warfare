// Settings 씬(메뉴) — 언어·사운드·모션 + 튜토리얼/크레딧. **Title 에서만 진입**.
// 인게임 설정은 여기로 오지 않는다 — play 의 Pause 설정 오버레이(play.mjs)가 별도로 처리
// (씬으로 오면 back 시 play 재생성 = 게임 재시작). 설정 컨트롤은 settings-panel.mjs 공유.
import { div, onClick } from '../dom.mjs'
import { t } from '../../i18n/index.mjs'
import { settingsControls } from '../settings-panel.mjs'

export function settingsScene(ctx) {
	const el = div('scene', `
		<div class="logo" style="font-size:2rem">${t('settings.title')}</div>
		<div id="settings-body"></div>
		<div class="btn-row">
			<button class="btn" data-act="tutorial">${t('settings.tutorialAgain')}</button>
			<button class="btn" data-act="credits">${t('settings.credits')}</button>
		</div>
		<div class="btn-row">
			<button class="btn" data-act="back">${t('settings.back')}</button>
		</div>
	`)
	// 언어 변경 시 주변 텍스트까지 갱신하려면 씬 재마운트 — replace(스택 중복 push 방지)
	el.querySelector('#settings-body').replaceWith(settingsControls(() => ctx.replace('settings')))
	onClick(el, 'data-act', act => {
		if (act === 'back') ctx.back()               // Title 에서만 진입 → title 복귀
		else if (act === 'tutorial') ctx.go('tutorial', {})
		else if (act === 'credits') ctx.go('credits')
	})
	return { el }
}
