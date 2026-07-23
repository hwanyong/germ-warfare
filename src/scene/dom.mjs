// 씬용 최소 DOM 헬퍼.

export function div(cls, html) {
	const d = document.createElement('div')
	if (cls) d.className = cls
	if (html != null) d.innerHTML = html
	return d
}

// [data-go] / [data-act] 클릭 위임 헬퍼
export function onClick(root, attr, fn) {
	root.addEventListener('click', e => {
		const t = e.target.closest(`[${attr}]`)
		if (t) fn(t.getAttribute(attr), t, e)
	})
}
