// 진입점 — 로딩 게이트 → 씬 매니저(Title 진입).
//
// 부팅: 이미지/폰트 프리로드(진행률) → 로딩 페이드아웃 → SceneManager.go('title').
// 씬 흐름·구조: docs/roadmap.md PHASE A. 씬 = src/scene/scenes/*.
import './styles/theme.css'
import './styles/board.css'
import './styles/fx.css'
import './styles/scene.css'
import { CRITICAL_IMAGES, DEFERRED_IMAGES } from './loading/assets.mjs'
import { preloadAll, preloadInBackground } from './loading/preload.mjs'
import { createManager } from './scene/index.mjs'
import { installAudio, unlockOnGesture, playSfx, playBgm, stopBgm } from './audio/audio.mjs'
import { initUpdater } from './pwa/update.mjs'

// 씬 → BGM 매핑: play = 전투 전용, result = 무음(징글만), 나머지 = 메인 테마 (ADR-009)
const SCENE_BGM = { play: 'bgm-battle', result: null }
const DEFAULT_BGM = 'bgm-main'

async function boot() {
	const pctEl = document.getElementById('load-pct')
	const fillEl = document.getElementById('load-fill')
	const loadingEl = document.getElementById('loading')

	// 1) 크리티컬(커서·버튼·배경·폰트)만 게이트 → 빠른 시작
	await preloadAll(CRITICAL_IMAGES, (done, total) => {
		const p = Math.round((done / total) * 100)
		if (pctEl) pctEl.textContent = `${p}%`
		if (fillEl) fillEl.style.width = `${p}%`
	})

	// 오디오 — 게이트 뒤 초기화(프리로드는 자체 fetch/decode, suspended 에서도 동작).
	// BGM 은 씬 진입마다 매핑 동기화, 실제 발음은 첫 유효 제스처 후(자동재생 정책, ADR-009).
	installAudio()
	let sceneBgm = DEFAULT_BGM
	const syncBgm = () => { sceneBgm ? playBgm(sceneBgm) : stopBgm() }

	const manager = createManager(document.getElementById('app'), {}, {
		onEnter: name => {
			sceneBgm = SCENE_BGM[name] === undefined ? DEFAULT_BGM : SCENE_BGM[name]
			syncBgm()
		}
	})
	manager.go('title')

	loadingEl?.classList.add('done')
	setTimeout(() => loadingEl?.remove(), 350)

	// 2) 나머지 게임 자산은 백그라운드로 (메뉴 보는 동안 로드)
	preloadInBackground(DEFERRED_IMAGES)

	unlockOnGesture(syncBgm)
	// 전 씬 공통 버튼음 — 모든 버튼이 .btn 클래스라 문서 위임 1곳으로 배선
	document.addEventListener('click', e => { if (e.target.closest('.btn')) playSfx('sfx-button') })
}

initUpdater() // SW 등록 — Settings 씬의 "적용하고 재시작"이 forceUpdate() 로 강제 리셋 (ADR-012)

boot()
