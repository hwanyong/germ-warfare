import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 프로젝트페이지 하위경로: https://hwanyong.github.io/germ-warfare/
// 참고: docs/decisions/ADR-004-github-pages-public-subpath.md
export default defineConfig({
	base: '/germ-warfare/',
	plugins: [
		VitePWA({
			registerType: 'prompt', // 자동 리로드 금지 — 대국 중 판 소실 방지 (ADR-010)
			injectRegister: null, // src/main.mjs 에서 virtual:pwa-register 직접 호출(단일 진입점 규약)
			workbox: {
				// 빌드 산출물 전체(dist)를 precache — 이미지/오디오/폰트 포함 (ADR-010, ADR-011)
				globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,mp3,xml,woff2,txt}'],
				cleanupOutdatedCaches: true
			},
			manifest: {
				id: '/germ-warfare/',
				start_url: '/germ-warfare/',
				scope: '/germ-warfare/',
				name: '세균전 (Germ Warfare)',
				short_name: '세균전',
				description: '세균전 (Ataxx) — client-side PvE web game demo',
				lang: 'ko',
				display: 'standalone',
				background_color: '#efeee7',
				theme_color: '#efeee7',
				categories: ['games'],
				icons: [
					{ src: '/germ-warfare/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/germ-warfare/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
				]
			}
		})
	]
})
