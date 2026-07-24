// 씬 매니저 — 레지스트리 + 전환 + 뒤로가기 스택.
//
// 씬 = factory(ctx) => { el: HTMLElement, cleanup?: () => void }.
// ctx = { go(name, params), back(), params, store }.
// hooks.onEnter(name, params) = 씬 진입 알림(BGM 전환 등 횡단 관심사용 — 매니저는 소비처 무지).
// 참고: docs/roadmap.md PHASE A(A1)

export class SceneManager {
	#root
	#scenes
	#store
	#onEnter
	#current = null
	#stack = [] // [{ name, params }]

	constructor(root, scenes, store = {}, { onEnter } = {}) {
		this.#root = root
		this.#scenes = scenes
		this.#store = store
		this.#onEnter = onEnter
	}

	go(name, params = {}) {
		if (!this.#scenes[name]) {
			console.error('[scene] unknown:', name)
			return
		}
		this.#leave()
		this.#stack.push({ name, params })
		this.#enter(name, params)
	}

	back() {
		if (this.#stack.length < 2) return
		this.#leave()
		this.#stack.pop()
		const { name, params } = this.#stack[this.#stack.length - 1]
		this.#enter(name, params)
	}

	#enter(name, params) {
		const ctx = {
			go: (n, p) => this.go(n, p),
			back: () => this.back(),
			params,
			store: this.#store
		}
		this.#current = this.#scenes[name](ctx)
		this.#root.appendChild(this.#current.el)
		this.#onEnter?.(name, params)
	}

	#leave() {
		if (!this.#current) return
		this.#current.cleanup?.()
		this.#current.el.remove()
		this.#current = null
	}
}
