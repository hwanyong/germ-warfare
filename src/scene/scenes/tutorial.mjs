// Tutorial 씬 — 별도 축소 보드(플레이스홀더). 첫 플레이 자동 + 재실행.
// 단계별 조작 안내(소스선택→복제→이동→감염→승리조건) + crosshair 는 A6에서 구현.
import { div, onClick } from '../dom.mjs'

export function tutorialScene(ctx) {
	const el = div('scene', `
		<button class="btn back-btn" data-act="skip">← 스킵</button>
		<div class="logo" style="font-size:2rem">튜토리얼</div>
		<div class="card">
			<div>① 내 세균 선택 → ② 거리1 빈칸 = 복제</div>
			<div>③ 거리2 빈칸 = 이동 → ④ 인접 적 감염</div>
			<div class="sub">(축소 보드 실습은 A6에서 구현)</div>
		</div>
		<button class="btn primary" data-act="done">완료</button>
	`)
	onClick(el, 'data-act', () => ctx.back())
	return { el }
}
