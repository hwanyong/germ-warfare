// 진행기록 QR 기기간 이전 — 카메라/QR 라이브러리를 감싸는 UI 레이어.
// 라이브러리(qrcode, jsqr)는 버튼 클릭 시점에 동적 import(초기 번들에 안 실림).
// 모달은 settings.mjs 의 pause-overlay 패턴(div('pause-overlay', ...) → el.appendChild/ov.remove()) 재사용.
import { div, onClick } from './dom.mjs'
import { t } from '../i18n/index.mjs'
import { exportBinary, decodeBinary, previewImport, applyImport } from '../storage/progress.mjs'

/** 내보내기 — 진행기록을 바이너리 그대로(raw byte-mode) QR로 그려 보여준다. */
export async function showExportOverlay(el) {
	const bytes = exportBinary()
	const { default: QRCode } = await import('qrcode')
	const ov = div('pause-overlay', `
		<div class="logo">${t('settings.qrExport')}</div>
		<canvas class="qr-canvas"></canvas>
		<div class="btn-row">
			<button class="btn" data-c="close">${t('settings.qrClose')}</button>
		</div>
	`)
	el.appendChild(ov)
	onClick(ov, 'data-c', () => ov.remove())
	await QRCode.toCanvas(ov.querySelector('canvas'), [{ data: bytes, mode: 'byte' }], {
		errorCorrectionLevel: 'M', margin: 1, width: 260
	})
}

/** 가져오기 — 카메라로 QR 스캔 → 디코드 → 병합 요약 확인 → 적용(merge-max, ADR-006). */
export async function showImportOverlay(el) {
	const { default: jsQR } = await import('jsqr')
	const ov = div('pause-overlay', `
		<div class="logo">${t('settings.qrImport')}</div>
		<div class="msg" data-role="hint">${t('settings.qrImportScanning')}</div>
		<video class="qr-video" playsinline muted></video>
		<canvas class="qr-canvas" hidden></canvas>
		<div class="btn-row">
			<button class="btn" data-c="cancel">${t('settings.qrCancel')}</button>
		</div>
	`)
	el.appendChild(ov)

	const video = ov.querySelector('video')
	const canvas = ov.querySelector('canvas')
	const canvasCtx = canvas.getContext('2d')
	const hint = ov.querySelector('[data-role="hint"]')
	let stream = null
	let rafId = null
	let stopped = false

	const stopCamera = () => {
		stopped = true
		if (rafId) cancelAnimationFrame(rafId)
		stream?.getTracks().forEach(tr => tr.stop())
	}
	onClick(ov, 'data-c', c => { if (c === 'cancel') { stopCamera(); ov.remove() } })

	try {
		stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
	}
	catch {
		hint.textContent = t('settings.qrImportError')
		video.remove()
		return
	}
	if (stopped) { stream.getTracks().forEach(tr => tr.stop()); return } // 스트림 뜨기 전에 취소됨

	video.srcObject = stream
	await video.play()
	canvas.width = video.videoWidth
	canvas.height = video.videoHeight

	const tick = () => {
		if (stopped) return
		canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height)
		const frame = canvasCtx.getImageData(0, 0, canvas.width, canvas.height)
		const result = jsQR(frame.data, frame.width, frame.height)
		if (result) { stopCamera(); onDecoded(result); return }
		rafId = requestAnimationFrame(tick)
	}
	rafId = requestAnimationFrame(tick)

	function onDecoded(result) {
		let parsed
		try { parsed = decodeBinary(new Uint8Array(result.binaryData)) }
		catch {
			hint.textContent = t('settings.qrImportError')
			video.remove()
			return
		}
		showConfirm(parsed)
	}

	function showConfirm(parsed) {
		const { changedStages, newBests } = previewImport(parsed)
		const summary = changedStages > 0
			? t('settings.qrImportSummary', { n: changedStages }) + (newBests > 0 ? ` (${newBests}★)` : '')
			: t('settings.qrImportNoChange')
		ov.innerHTML = `
			<div class="logo">${t('settings.qrImport')}</div>
			<div class="msg">${summary}</div>
			<div class="btn-row">
				<button class="btn primary" data-c="apply">${t('settings.qrApply')}</button>
				<button class="btn" data-c="cancel">${t('settings.qrCancel')}</button>
			</div>
		`
		onClick(ov, 'data-c', c => {
			if (c === 'apply') applyImport(parsed)
			ov.remove()
		})
	}
}
