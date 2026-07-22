// 진입점 (P0 이전 스모크).
//
// 현재: 순수 규칙 엔진(src/game)이 브라우저에서 실제로 도는지 증명하고
// 보드를 렌더링한다. 실제 게임(메뉴 / 스테이지 선택 / 턴 플레이 / AI 상대)은
// P0에서 src/{menu,match,ai,render,storage} 로 구현.
// 참고: docs/architecture.md 로드맵

import { GameMap, USERS } from './game/index.mjs'

const sym = owner => (owner === USERS.ID0 ? '🟢' : owner === USERS.ID1 ? '🔴' : '·')

function renderBoard(map) {
	return map.fields.map(row => row.map(sym).join(' ')).join('\n')
}

// 결정적 짧은 시연 (seed 고정)
const map = new GameMap({ seed: 42 })
map.clear()
map.initField(USERS.ID0, { x: 0, y: 0 })
map.initField(USERS.ID0, { x: 6, y: 0 })
map.initField(USERS.ID1, { x: 0, y: 6 })
map.initField(USERS.ID1, { x: 6, y: 6 })
map.initialized()
map.setField(USERS.ID0, { x: 1, y: 0 })
map.setField(USERS.ID1, { x: 1, y: 6 })

document.getElementById('app').innerHTML = `
	<h1>🧬 Germ Warfare</h1>
	<p>규칙 엔진 스모크 — seed=${map.seed}. 실제 게임은 P0에서.</p>
	<pre>${renderBoard(map)}</pre>
	<p>🟢 ${map.count[USERS.ID0]} : ${map.count[USERS.ID1]} 🔴</p>
`
