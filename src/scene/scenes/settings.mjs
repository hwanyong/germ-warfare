// Settings 씬(메뉴) — 언어·사운드·모션 + 튜토리얼/크레딧. **Title 에서만 진입**.
// 인게임 설정은 여기로 오지 않는다 — play 의 Pause 설정 오버레이(play.mjs)가 별도로 처리
// (씬으로 오면 back 시 play 재생성 = 게임 재시작). 설정 컨트롤은 settings-panel.mjs 공유.
import { div, onClick } from '../dom.mjs'
import { t } from '../../i18n/index.mjs'
import { settingsControls } from '../settings-panel.mjs'
import { forceUpdate } from '../../pwa/update.mjs'
import { showExportOverlay, showImportOverlay } from '../qr-transfer.mjs'

export function settingsScene(ctx) {
	const el = div('scene', `
		<div class="logo" style="font-size:2rem">${t('settings.title')}</div>
		<div id="settings-body"></div>
		<div class="btn-row"><span>${t('settings.update')}</span>
			<button class="btn" data-act="update-apply">${t('settings.updateApply')}</button>
		</div>
		<div class="btn-row">
			<button class="btn" data-act="tutorial">${t('settings.tutorialAgain')}</button>
			<button class="btn" data-act="credits">${t('settings.credits')}</button>
		</div>
		<div class="btn-row">
			<button class="btn" data-act="qr-export">${t('settings.qrExport')}</button>
			<button class="btn" data-act="qr-import">${t('settings.qrImport')}</button>
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
		else if (act === 'update-apply') openUpdateConfirm()
		else if (act === 'qr-export') showExportOverlay(el)
		else if (act === 'qr-import') showImportOverlay(el)
	})

	// 캐시 전체삭제+강제재시작 경고 — 네이티브 confirm() 은 종이질감 비주얼과 안 어울려
	// pause-overlay 패턴(play.mjs) 재사용한 인게임 모달로 대체.
	function openUpdateConfirm() {
		const ov = div('pause-overlay', `
			<div class="logo">${t('settings.updateApply')}</div>
			<div class="msg">${t('settings.updateConfirm')}</div>
			<div class="btn-row">
				<button class="btn primary" data-c="cancel">${t('settings.updateConfirmCancel')}</button>
				<button class="btn" data-c="ok">${t('settings.updateConfirmOk')}</button>
			</div>
		`)
		onClick(ov, 'data-c', c => {
			ov.remove()
			if (c === 'ok') forceUpdate()
		})
		el.appendChild(ov)
	}
	return { el }
}
