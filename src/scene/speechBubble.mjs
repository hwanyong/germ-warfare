// 말풍선 — CSS border-image 프레임(내용 크기에 맞춰 자유 신축) + 별도 꼬리 요소(4변 자유 배치).
// 배선: src/styles/scene.css §말풍선, src/styles/theme.css --frame-bubble-p1·p2/--bubble-tail-p1·p2,
// 에셋: public/assets/frame/bubble-p1·p2.png(테두리) + bubble-tail-p1·p2.png(꼬리). docs/assets.md 참고.
import { div } from './dom.mjs'

/**
 * @param {object} opts
 * @param {'p1'|'p2'} [opts.owner='p1'] 테두리·꼬리 색(캐릭터 컬러 페어링)
 * @param {string} opts.text 말풍선 내용(innerHTML)
 * @param {'top'|'right'|'bottom'|'left'} [opts.tailSide='bottom'] 꼬리가 붙는 변
 * @param {string} [opts.tailOffset='50%'] 그 변 위에서 꼬리 위치(0%=변의 시작 쪽 모서리)
 */
export function speechBubble({ owner = 'p1', text = '', tailSide = 'bottom', tailOffset = '50%' } = {}) {
	const el = div('speech-bubble', `
		<div class="bubble-body">${text}</div>
		<div class="bubble-tail"></div>
	`)
	el.dataset.owner = owner
	const tail = el.querySelector('.bubble-tail')
	tail.dataset.side = tailSide
	tail.style.setProperty('--tail-offset', tailOffset)
	return el
}

const HOLD_MS = 3700 // 말풍선 유지시간. 팝인/팝아웃 소요시간은 CSS(.pop-in/.pop-out)가 쥐고 있고,
// 여기선 그 animationend 이벤트를 기다리므로 서로 duration 이 어긋날 일이 없다.

/**
 * 여러 캐릭터(slots) 중 매번 하나만 무작위로 골라 말풍선을 팝인→HOLD_MS 유지→팝아웃 시키고,
 * 완전히 사라진 뒤에야 무작위 침묵 구간을 두고 다음 캐릭터를 고른다. 항상 동시에 1개만 뜨므로
 * "화면 전체에 늘 켜져 있는" 느낌이 아니라 "가끔 툭 튀어나오는 팁" 느낌을 낸다.
 * (게임 규칙 아닌 장식용 타이밍이라 Math.random 사용 — src/scene/scenes/play.mjs 의 웍지터 연출과 동일 관례)
 * 씬 전환 시 반드시 반환된 stop() 을 호출해 타이머가 씬 밖에서 계속 도는 걸 막는다
 * (SceneManager 의 scene.cleanup 훅에 연결).
 * @param {Array<{container: HTMLElement, owner: 'p1'|'p2', tailSide?: string}>} slots 후보 캐릭터들
 * @param {object} opts
 * @param {string[]} opts.messages 순환할 메시지 목록(1개 이상)
 * @param {number} [opts.idleMinMs=1800] 한 말풍선이 사라진 뒤 최소 침묵 시간
 * @param {number} [opts.idleMaxMs=4200] 최대 침묵 시간(idleMinMs~idleMaxMs 사이 무작위)
 * @returns {() => void} stop — 타이머 정리 + 화면에 남은 말풍선 제거
 */
export function scheduleBubbleTour(slots, { messages, idleMinMs = 1800, idleMaxMs = 4200 } = {}) {
	if (!slots?.length || !messages?.length) return () => {}
	let stopped = false
	let msgIdx = 0
	let lastSlot = -1
	let timer = null
	const schedule = (fn, ms) => { timer = setTimeout(fn, ms) }
	const randMs = (min, max) => min + Math.random() * (max - min)

	function round() {
		if (stopped) return
		let i = Math.floor(Math.random() * slots.length)
		if (slots.length > 1 && i === lastSlot) i = (i + 1) % slots.length // 같은 캐릭터 연달아 방지
		lastSlot = i
		const slot = slots[i]

		const bubble = speechBubble({ owner: slot.owner, text: messages[msgIdx % messages.length], tailSide: slot.tailSide ?? 'bottom' })
		msgIdx++
		bubble.classList.add('above', 'pop-in')
		slot.container.append(bubble)

		const onPopIn = e => {
			if (e.animationName !== 'bubble-pop-in') return
			bubble.removeEventListener('animationend', onPopIn)
			schedule(() => {
				if (stopped) { bubble.remove(); return }
				bubble.classList.replace('pop-in', 'pop-out')
				bubble.addEventListener('animationend', function onPopOut(e2) {
					if (e2.animationName !== 'bubble-pop-out') return
					bubble.remove()
					if (!stopped) schedule(round, randMs(idleMinMs, idleMaxMs))
				}, { once: true })
			}, HOLD_MS)
		}
		bubble.addEventListener('animationend', onPopIn)
	}

	schedule(round, randMs(0, idleMaxMs))
	return () => {
		stopped = true
		clearTimeout(timer)
		slots.forEach(s => s.container.querySelectorAll(':scope > .speech-bubble').forEach(b => b.remove()))
	}
}
