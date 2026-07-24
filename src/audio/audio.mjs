// 오디오 엔진 — Web Audio 기반 BGM/SFX 재생 (데모 전용 계층, ADR-009).
//
// installAudio() 1회 초기화(installFx 대칭) → 유저 제스처 후 resumeAudio() 로 언락.
// 그래프: source → per-play gain → (bgm|sfx) GainNode → master GainNode → destination.
// 에셋이 없거나 로드에 실패해도 앱은 무사하다(경고 후 무음 no-op).

import { AUDIO_BASE, SOUNDS } from './manifest.mjs'
import { loadSettings, saveSettings } from '../storage/settings.mjs'

let ctx = null
let master = null
let bgmGain = null
let sfxGain = null
let bgmSrc = null
let bgmSrcGain = null // 현재 BGM 소스의 개별 게인 — 전환 페이드용
let requestedBgm = null // 디코드 전 playBgm 호출 대비 지연 시작 + 현재 요청 곡 추적
let muted = false
let unlocked = false // 한 번이라도 running 이 된 적 있는지 — 인터럽션 복구 판단용
const buffers = new Map()

export function installAudio() {
	if (ctx) return
	ctx = new AudioContext() // 제스처 전엔 suspended — fetch/decode 프리로드는 그래도 동작
	master = ctx.createGain()
	bgmGain = ctx.createGain()
	sfxGain = ctx.createGain()
	bgmGain.connect(master)
	sfxGain.connect(master)
	master.connect(ctx.destination)

	muted = !!loadSettings().muted
	master.gain.value = muted ? 0 : 1

	// iOS 인터럽션(전화/Siri/앱 전환 → 비표준 'interrupted') 복구 — 언락된 적 있으면 탭 복귀 시 재시도
	ctx.addEventListener('statechange', () => { if (ctx.state === 'running') unlocked = true })
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden && unlocked && ctx.state !== 'running') ctx.resume()
	})

	for (const [name, def] of Object.entries(SOUNDS)) {
		fetch(`${AUDIO_BASE}/${def.file}`)
			.then(res => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				return res.arrayBuffer()
			})
			.then(buf => ctx.decodeAudioData(buf))
			.then(decoded => {
				buffers.set(name, decoded)
				if (requestedBgm === name && !bgmSrc) playBgm(name)
			})
			.catch(err => console.warn(`[audio] ${name} 로드 실패 — 무음 처리:`, err.message))
	}
}

/** 자동재생 정책 언락/복구 — 반드시 유저 제스처 핸들러의 동기 경로에서 호출 (iOS).
 * iOS 비표준 'interrupted' 상태도 복구해야 하므로 running 아님 전부 재시도 */
export function resumeAudio() {
	if (ctx && ctx.state !== 'running') ctx.resume()
}

/** 자동재생 언락 — 활성화를 부여하는 제스처(pointerup/keydown)마다 resume 을 재시도하고,
 * 실제 running 전환 순간 onUnlock 1회 후 리스너 정리.
 * (터치/펜은 pointerdown 이 유저 활성화를 부여하지 않는다 — pointerup/touchend 시점 부여) */
export function unlockOnGesture(onUnlock) {
	if (!ctx) return
	if (ctx.state === 'running') { onUnlock?.(); return } // 사이트 설정으로 자동재생 허용된 경우
	const events = ['pointerup', 'keydown']
	const tryResume = () => { if (ctx.state !== 'running') ctx.resume() }
	const onState = () => {
		if (ctx.state !== 'running') return
		ctx.removeEventListener('statechange', onState)
		events.forEach(e => window.removeEventListener(e, tryResume, true))
		onUnlock?.()
	}
	ctx.addEventListener('statechange', onState)
	events.forEach(e => window.addEventListener(e, tryResume, { capture: true }))
}

/** @returns 재생된 source(길게 우는 징글처럼 씬 이탈 시 직접 stop() 해야 하는 호출부용) — 미재생 시 null */
export function playSfx(name, { gain = 1, rate = 1 } = {}) {
	// suspended 중 start() 하면 resume 순간 밀린 소리가 한꺼번에 터진다 — running 아닐 땐 무시
	if (!ctx || ctx.state !== 'running') return null
	const buffer = buffers.get(name)
	const def = SOUNDS[name]
	if (!buffer || !def) return null
	const src = ctx.createBufferSource()
	src.buffer = buffer
	src.playbackRate.value = rate
	const g = ctx.createGain()
	g.gain.value = def.gain * gain
	src.connect(g)
	g.connect(sfxGain)
	src.start()
	return src
}

/** BGM 재생/전환 — 같은 곡이면 유지, 다른 곡이면 페이드아웃 후 교체 (씬별 BGM 매핑용) */
export function playBgm(name) {
	if (!ctx) return
	if (requestedBgm === name && bgmSrc) return // 멱등 — 같은 곡 재생 중
	requestedBgm = name
	fadeOutCurrentBgm()
	const buffer = buffers.get(name)
	const def = SOUNDS[name]
	if (!buffer || !def) return // 디코드 완료 시 installAudio 쪽에서 재시도
	const src = ctx.createBufferSource()
	src.buffer = buffer
	src.loop = true
	// mp3 인코더가 앞뒤에 심는 무음 갭을 잘라 갭리스 루프
	const { start, end } = trimBounds(buffer)
	src.loopStart = start
	src.loopEnd = end
	const g = ctx.createGain()
	// 페이드인 — 씬 전환 시 급시작 방지
	g.gain.setValueAtTime(0, ctx.currentTime)
	g.gain.linearRampToValueAtTime(def.gain, ctx.currentTime + 0.4)
	src.connect(g)
	g.connect(bgmGain)
	src.start(0, start)
	bgmSrc = src
	bgmSrcGain = g
}

export function stopBgm() {
	requestedBgm = null
	fadeOutCurrentBgm()
}

function fadeOutCurrentBgm() {
	if (!bgmSrc) return
	const src = bgmSrc
	const g = bgmSrcGain
	bgmSrc = null
	bgmSrcGain = null
	g.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
	try { src.stop(ctx.currentTime + 0.5) } catch { /* 이미 정지됨 */ }
}

export function setMuted(v) {
	muted = !!v
	if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02)
	saveSettings({ muted })
}

export function isMuted() {
	return muted
}

/** 채널0 진폭 스캔으로 실음원 구간(초)을 찾는다 — loopStart/loopEnd 용 */
function trimBounds(buffer, threshold = 1e-3) {
	const data = buffer.getChannelData(0)
	let s = 0
	let e = data.length - 1
	while (s < e && Math.abs(data[s]) < threshold) s++
	while (e > s && Math.abs(data[e]) < threshold) e--
	if (e <= s) return { start: 0, end: buffer.duration }
	return { start: s / buffer.sampleRate, end: (e + 1) / buffer.sampleRate }
}
