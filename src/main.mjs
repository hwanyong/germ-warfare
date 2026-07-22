// 진입점 (P0 이전 스모크 — 디자인 아이덴티티 적용).
//
// 현재: 순수 규칙 엔진(src/game)이 브라우저에서 돌고, "손그림 종이 보드게임"
// 테마(한지 배경 · 세균 말 · 손그림 프레임 · Orbitron/Gugi/Dongle)로 보드를 렌더한다.
// 실제 게임(메뉴 / 스테이지 / 턴 플레이 / AI)은 P0에서 src/{menu,match,ai,render}.
// 참고: docs/design.md, docs/architecture.md 로드맵

import './styles/theme.css'
import './styles/board.css'
import { GameMap, USERS } from './game/index.mjs'

const ownerAttr = owner => (owner === USERS.ID0 ? 'p1' : owner === USERS.ID1 ? 'p2' : 'none')

function renderBoard(map) {
	const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
	let html = '<div class="board">'
	map.fields.forEach((row, y) => {
		row.forEach((owner, x) => {
			const o = ownerAttr(owner)
			const cell = o === 'none' ? '' : `<div class="cell" data-owner="${o}"></div>`
			html += `<div class="tile frame-thin" data-pos="${rows[y]}${x}">${cell}</div>`
		})
	})
	html += '</div>'
	return html
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
	<div class="smoke">
		<h1 class="title">세균전</h1>
		<div class="scoreline">
			<span class="cell badge" data-owner="p1"></span>
			<span class="num">${String(map.count[USERS.ID0]).padStart(2, '0')}</span>
			<span class="vs">:</span>
			<span class="num">${String(map.count[USERS.ID1]).padStart(2, '0')}</span>
			<span class="cell badge" data-owner="p2"></span>
		</div>
		${renderBoard(map)}
		<p class="note">규칙 엔진 + 디자인 스모크 (seed=${map.seed}). 실제 게임은 P0.</p>
	</div>
`
