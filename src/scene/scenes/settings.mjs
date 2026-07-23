// Settings 씬 — 옵션(플레이스홀더). Title·Pause 양쪽에서 진입, back 으로 복귀.
// 실제 옵션 저장(사운드/모션/난이도 기본)은 후속.
import { div, onClick } from '../dom.mjs'

export function settingsScene(ctx) {
	const el = div('scene', `
		<button class="btn back-btn" data-act="back">← 뒤로</button>
		<div class="logo" style="font-size:2rem">설정</div>
		<div class="card">
			<div class="btn-row"><span>사운드</span> <button class="btn" data-toggle="sound">준비중</button></div>
			<div class="btn-row"><span>모션 감소</span> <button class="btn" data-toggle="motion">준비중</button></div>
			<div class="btn-row"><span>기본 난이도</span> <button class="btn" data-toggle="diff">NORMAL</button></div>
		</div>
	`)
	onClick(el, 'data-act', act => { if (act === 'back') ctx.back() })
	return { el }
}
