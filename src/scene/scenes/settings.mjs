// Settings 씬 — 옵션 + 언어(영/한) 선택. Title·Pause 진입, back 복귀.
import { div, onClick } from '../dom.mjs'
import { t, getLang, setLang } from '../../i18n/index.mjs'
import { setMuted, isMuted, resumeAudio } from '../../audio/audio.mjs'

export function settingsScene(ctx) {
	const lang = getLang()
	const muted = isMuted()
	const el = div('scene', `
		<button class="btn back-btn" data-act="back">← ${t('settings.back')}</button>
		<div class="logo" style="font-size:2rem">${t('settings.title')}</div>
		<div class="card">
			<div class="btn-row"><span>${t('settings.language')}</span>
				<button class="btn" data-lang="en"${lang === 'en' ? ' aria-selected="true"' : ''}>English</button>
				<button class="btn" data-lang="ko"${lang === 'ko' ? ' aria-selected="true"' : ''}>한국어</button>
			</div>
			<div class="btn-row"><span>${t('settings.sound')}</span>
				<button class="btn" data-sound="on"${muted ? '' : ' aria-selected="true"'}>${t('settings.on')}</button>
				<button class="btn" data-sound="off"${muted ? ' aria-selected="true"' : ''}>${t('settings.off')}</button>
			</div>
			<div class="btn-row"><span>${t('settings.motion')}</span> <button class="btn">${t('settings.coming')}</button></div>
		</div>
		<div class="btn-row">
			<button class="btn" data-act="tutorial">${t('settings.tutorialAgain')}</button>
			<button class="btn" data-act="credits">${t('settings.credits')}</button>
		</div>
	`)
	onClick(el, 'data-lang', l => { setLang(l); ctx.go('settings') }) // 언어 변경 → 재마운트
	onClick(el, 'data-sound', v => { resumeAudio(); setMuted(v === 'off'); ctx.go('settings') }) // resumeAudio = iOS 인터럽션 복구 겸
	onClick(el, 'data-act', act => {
		if (act === 'back') ctx.back()
		else if (act === 'tutorial') ctx.go('tutorial', {})
		else if (act === 'credits') ctx.go('credits')
	})
	return { el }
}
