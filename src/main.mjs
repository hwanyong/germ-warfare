// 진입점 — 로딩 게이트 → 씬 매니저(Title 진입).
//
// 부팅: 이미지/폰트 프리로드(진행률) → 로딩 페이드아웃 → SceneManager.go('title').
// 씬 흐름·구조: docs/roadmap.md PHASE A. 씬 = src/scene/scenes/*.
import './styles/theme.css'
import './styles/board.css'
import './styles/fx.css'
import './styles/scene.css'
import { PRELOAD_IMAGES } from './loading/assets.mjs'
import { preloadAll } from './loading/preload.mjs'
import { createManager } from './scene/index.mjs'

async function boot() {
	const pctEl = document.getElementById('load-pct')
	const fillEl = document.getElementById('load-fill')
	const loadingEl = document.getElementById('loading')

	await preloadAll(PRELOAD_IMAGES, (done, total) => {
		const p = Math.round((done / total) * 100)
		if (pctEl) pctEl.textContent = `${p}%`
		if (fillEl) fillEl.style.width = `${p}%`
	})

	const manager = createManager(document.getElementById('app'))
	manager.go('title')

	loadingEl?.classList.add('done')
	setTimeout(() => loadingEl?.remove(), 350)
}

boot()
