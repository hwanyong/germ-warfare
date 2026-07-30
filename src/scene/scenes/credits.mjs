// Credits/Legal 씬 — 저작권·출처·소유(필수). docs/LICENSES.md 와 일치.
import { div, onClick } from '../dom.mjs'
import { t } from '../../i18n/index.mjs'

export function creditsScene(ctx) {
	const el = div('scene', `
		<div class="logo" style="font-size:2rem">${t('title.credits')}</div>
		<div class="card credits-body">
			<div class="owner">Germ Warfare (세균전)</div>
			<div class="owner">© 2026 Hwanyong Yoo (UHD)</div>
			<div class="sub">${t('credits.made')}</div>
			<hr style="width:100%;border:0;border-top:1px solid #0002" />
			<div>${t('credits.art')}: <a href="https://kenney.nl" target="_blank" rel="noopener">Kenney</a> (CC0)</div>
			<div class="sub">Alien UFO · Cartography · Crosshair · Cursor · UI Pack</div>
			<div>${t('credits.paper')}: <a href="https://ambientcg.com/view?id=Paper001" target="_blank" rel="noopener">ambientCG Paper001</a> (CC0)</div>
			<div>${t('credits.fonts')}: Dongle · Gugi · Orbitron (OFL, self-hosted)</div>
			<div>${t('credits.license')}: <a href="https://github.com/hwanyong/germ-warfare/blob/main/docs/FONT-LICENSE-AUDIT.md" target="_blank" rel="noopener">FONT-LICENSE-AUDIT.md</a></div>
			<hr style="width:100%;border:0;border-top:1px solid #0002" />
			<div>${t('credits.follow')}:
				<a href="https://www.threads.com/@uhd_kr" target="_blank" rel="noopener">Threads</a> ·
				<a href="https://www.youtube.com/@uhd_tech" target="_blank" rel="noopener">YouTube</a> ·
				<a href="https://www.instagram.com/uhd_kr/" target="_blank" rel="noopener">Instagram</a>
			</div>
		</div>
		<div class="btn-row">
			<button class="btn" data-act="back">${t('credits.back')}</button>
		</div>
	`)
	onClick(el, 'data-act', () => ctx.back())
	return { el }
}
