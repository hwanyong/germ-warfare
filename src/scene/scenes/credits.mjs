// Credits/Legal 씬 — 저작권·출처·소유(필수). docs/LICENSES.md 와 일치.
import { div, onClick } from '../dom.mjs'

export function creditsScene(ctx) {
	const el = div('scene', `
		<button class="btn back-btn" data-act="back">← 뒤로</button>
		<div class="logo" style="font-size:2rem">크레딧</div>
		<div class="card credits-body">
			<div class="owner">Germ Warfare (세균전)</div>
			<div class="owner">© 2026 Hwanyong Yoo (UHD)</div>
			<div class="sub">기획 · 디자인 · 연출 · 코드</div>
			<hr style="width:100%;border:0;border-top:1px solid #0002" />
			<div>아트: <a href="https://kenney.nl" target="_blank" rel="noopener">Kenney</a> (CC0)</div>
			<div class="sub">Alien UFO · Cartography · Crosshair · Cursor · UI Pack</div>
			<div>종이: <a href="https://ambientcg.com/view?id=Paper001" target="_blank" rel="noopener">ambientCG Paper001</a> (CC0)</div>
			<div>폰트: <a href="https://fonts.google.com" target="_blank" rel="noopener">Google Fonts</a> — Orbitron · Gugi · Dongle (OFL)</div>
		</div>
	`)
	onClick(el, 'data-act', () => ctx.back())
	return { el }
}
