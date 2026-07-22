import { defineConfig } from 'vite'

// GitHub Pages 프로젝트페이지 하위경로: https://hwanyong.github.io/germ-warfare/
// 참고: docs/decisions/ADR-004-github-pages-public-subpath.md
export default defineConfig({
	base: '/germ-warfare/'
})
