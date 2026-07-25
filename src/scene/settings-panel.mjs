// 설정 컨트롤(언어·사운드·모션) — 메뉴 Settings 씬 + 인게임 Pause 설정 오버레이 공용(SSOT).
// 인게임 설정은 "라우트(씬 전환)"가 아니라 게임 위 "모달"이어야 한다 — play 씬을 파괴하면
// 복귀 시 재생성 = 게임 재시작. 그래서 이 컨트롤을 두 맥락이 공유하되, 컨테이너 재렌더는
// onChange 콜백으로 위임한다(언어 변경 시 주변 텍스트까지 갱신하려면 컨테이너를 다시 그려야 함).
import { div, onClick } from './dom.mjs'
import { t, getLang, setLang } from '../i18n/index.mjs'
import { setMuted, isMuted, resumeAudio } from '../audio/audio.mjs'

/**
 * 설정 컨트롤 카드 element 반환. 토글 시 onChange() 호출 → 컨테이너가 전체 재렌더.
 * @param {() => void} onChange 언어/사운드 변경 후 컨테이너 재렌더 콜백
 */
export function settingsControls(onChange) {
	const lang = getLang()
	const muted = isMuted()
	const wrap = div('card', `
		<div class="btn-row"><span>${t('settings.language')}</span>
			<button class="btn" data-lang="en"${lang === 'en' ? ' aria-selected="true"' : ''}>English</button>
			<button class="btn" data-lang="ko"${lang === 'ko' ? ' aria-selected="true"' : ''}>한국어</button>
		</div>
		<div class="btn-row"><span>${t('settings.sound')}</span>
			<button class="btn" data-sound="on"${muted ? '' : ' aria-selected="true"'}>${t('settings.on')}</button>
			<button class="btn" data-sound="off"${muted ? ' aria-selected="true"' : ''}>${t('settings.off')}</button>
		</div>
		<div class="btn-row"><span>${t('settings.motion')}</span> <button class="btn">${t('settings.coming')}</button></div>
	`)
	onClick(wrap, 'data-lang', l => { setLang(l); onChange() })
	onClick(wrap, 'data-sound', v => { resumeAudio(); setMuted(v === 'off'); onChange() }) // resumeAudio = iOS 인터럽션 복구 겸
	return wrap
}
