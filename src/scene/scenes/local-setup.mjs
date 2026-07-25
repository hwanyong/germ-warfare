// LocalSetup 씬 — Local PvP 셋업 (ADR-002 메뉴 흐름, ADR-005 addendum: 로컬 hot-seat).
// 캠페인 진행/난이도 개념이 무의미 → 자유 셋업: 인원(사람+AI, 합 2~4) · 맵(프리셋 지형 or
// 커스텀 grid+무작위 데드타일) · AI 공통 난이도. buildLocalStage(SSOT)로 런타임 조립 후 play 로.
import { div, onClick } from '../dom.mjs'
import { STAGES, STAGE_ORDER, CHAPTERS, buildLocalStage, LOCAL_LIMITS, maxDeadTiles } from '../../data/stages.mjs'
import { DIFFS, LABEL } from './stage-select.mjs'
import { t, getLang } from '../../i18n/index.mjs'

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function localSetupScene(ctx) {
	const lang = getLang()
	const pre = ctx.params.prefill ?? {} // changeSeats 재진입 프리필

	// ---- 상태 ----
	const st = {
		humans: pre.humans ?? 2,
		ai: pre.ai ?? 0,
		aiLevel: pre.aiLevel ?? 'normal',
		mapMode: pre.mapMode ?? 'preset',      // 'preset' | 'custom'
		presetId: pre.presetId ?? 'stage-01',
		w: pre.w ?? 7,
		h: pre.h ?? 7,
		dead: pre.dead ?? 0
	}
	const total = () => st.humans + st.ai

	// ---- 마크업 ----
	const presetCard = id => {
		const s = STAGES[id]
		const num = String(STAGE_ORDER.indexOf(id) + 1).padStart(2, '0')
		return `
		<div class="card stage-card ls-map" data-preset="${id}"${id === st.presetId ? ' aria-selected="true"' : ''} style="cursor:url(/germ-warfare/assets/cursor/hand.png) 6 2, pointer">
			<div class="stage-num">${num} · ${s.name[lang] ?? s.name.en}</div>
			<div class="sub">${s.grid.w}×${s.grid.h}${s.blocked?.length ? ` · ▲${s.blocked.length}` : ''}</div>
		</div>`
	}
	const stepper = (key, val) => `
		<div class="stepper">
			<button class="btn" data-step="${key}:-">−</button>
			<span class="num" data-val="${key}">${val}</span>
			<button class="btn" data-step="${key}:+">+</button>
		</div>`

	const el = div('scene local-setup', `
		<button class="btn back-btn" data-act="back">← ${t('localSetup.back')}</button>
		<div class="logo" style="font-size:2rem">${t('localSetup.title')}</div>

		<div class="card setup-card">
			<div class="setup-row">
				<span>${t('localSetup.humans')}</span> ${stepper('humans', st.humans)}
				<span>${t('localSetup.ai')}</span> ${stepper('ai', st.ai)}
			</div>
			<div class="sub" data-total>${t('localSetup.total', { n: total() })}</div>
			<div class="setup-row" data-ai-diff${st.ai > 0 ? '' : ' style="display:none"'}>
				<span>${t('localSetup.aiLevel')}</span>
				<div class="btn-row">${DIFFS.map(d => `<button class="btn" data-ailvl="${d}"${d === st.aiLevel ? ' aria-selected="true"' : ''}>${LABEL[d]}</button>`).join('')}</div>
			</div>
		</div>

		<div class="btn-row map-tabs">
			<button class="btn" data-maptab="preset"${st.mapMode === 'preset' ? ' aria-selected="true"' : ''}>${t('localSetup.mapPreset')}</button>
			<button class="btn" data-maptab="custom"${st.mapMode === 'custom' ? ' aria-selected="true"' : ''}>${t('localSetup.mapCustom')}</button>
		</div>

		<div class="ls-panel" data-mappanel="preset"${st.mapMode === 'preset' ? '' : ' style="display:none"'}>
			${CHAPTERS.map(ch => `
			<div class="chapter">
				<div class="chapter-head">${ch.name[lang] ?? ch.name.en}</div>
				<div class="stage-grid">${ch.stages.map(presetCard).join('')}</div>
			</div>`).join('')}
		</div>

		<div class="card ls-panel" data-mappanel="custom"${st.mapMode === 'custom' ? '' : ' style="display:none"'}>
			<div class="setup-row"><span>${t('localSetup.width')}</span> ${stepper('w', st.w)}</div>
			<div class="setup-row"><span>${t('localSetup.height')}</span> ${stepper('h', st.h)}</div>
			<div class="setup-row"><span>${t('localSetup.deadTiles')}</span> ${stepper('dead', st.dead)}</div>
			<div class="sub" data-deadmax>${t('localSetup.deadMax', { n: maxDeadTiles(st.w, st.h) })}</div>
		</div>

		<div class="stage-actions">
			<div class="btn-row">
				<button class="btn primary" data-act="start" id="ls-start">${t('localSetup.start')}</button>
			</div>
		</div>
	`)

	// ---- 갱신 헬퍼 ----
	const setVal = (key, v) => { el.querySelector(`[data-val="${key}"]`).textContent = String(v) }
	const refreshDeadMax = () => {
		const max = maxDeadTiles(st.w, st.h)
		st.dead = clampInt(st.dead, 0, max)
		setVal('dead', st.dead)
		el.querySelector('[data-deadmax]').textContent = t('localSetup.deadMax', { n: max })
	}
	const refreshPeople = () => {
		setVal('humans', st.humans)
		setVal('ai', st.ai)
		el.querySelector('[data-total]').textContent = t('localSetup.total', { n: total() })
		el.querySelector('[data-ai-diff]').style.display = st.ai > 0 ? '' : 'none'
	}

	// ---- 스테퍼 (인원 불변식: 사람 1~4, AI 0~3, 합 2~4) ----
	onClick(el, 'data-step', spec => {
		const [key, sign] = spec.split(':')
		const d = sign === '+' ? 1 : -1
		if (key === 'humans' || key === 'ai') {
			const next = { humans: st.humans, ai: st.ai }
			next[key] += d
			const tot = next.humans + next.ai
			if (next.humans < 1 || next.ai < 0 || tot < 2 || tot > LOCAL_LIMITS.maxTeams) return // 불변식 위반 무시
			st.humans = next.humans; st.ai = next.ai
			refreshPeople()
		} else if (key === 'w' || key === 'h') {
			st[key] = clampInt(st[key] + d, LOCAL_LIMITS.minSide, LOCAL_LIMITS.maxSide)
			setVal(key, st[key])
			refreshDeadMax() // grid 변경 → 데드타일 상한 재계산
		} else if (key === 'dead') {
			st.dead = clampInt(st.dead + d, 0, maxDeadTiles(st.w, st.h))
			setVal('dead', st.dead)
		}
	})

	onClick(el, 'data-ailvl', d => {
		st.aiLevel = d
		el.querySelectorAll('[data-ailvl]').forEach(b => b.removeAttribute('aria-selected'))
		el.querySelector(`[data-ailvl="${d}"]`).setAttribute('aria-selected', 'true')
	})

	onClick(el, 'data-maptab', tab => {
		st.mapMode = tab
		el.querySelectorAll('[data-maptab]').forEach(b => b.removeAttribute('aria-selected'))
		el.querySelector(`[data-maptab="${tab}"]`).setAttribute('aria-selected', 'true')
		el.querySelector('[data-mappanel="preset"]').style.display = tab === 'preset' ? '' : 'none'
		el.querySelector('[data-mappanel="custom"]').style.display = tab === 'custom' ? '' : 'none'
	})

	onClick(el, 'data-preset', id => {
		st.presetId = id
		el.querySelectorAll('[data-preset]').forEach(c => c.removeAttribute('aria-selected'))
		el.querySelector(`[data-preset="${id}"]`).setAttribute('aria-selected', 'true')
	})

	onClick(el, 'data-act', act => {
		if (act === 'back') { ctx.back(); return }
		if (act !== 'start') return
		const teams = total()
		// 무작위 시드 = 매치 시작 시각(UI 계층 — src/game 아님). buildLocalStage 내부 mulberry32 로 결정적 배치.
		const seed = (Date.now() ^ (st.w * 73856093) ^ (st.h * 19349663) ^ (st.dead * 83492791)) >>> 0
		const stageData = st.mapMode === 'preset'
			? buildLocalStage({ grid: STAGES[st.presetId].grid, blocked: STAGES[st.presetId].blocked, teams, seed, name: STAGES[st.presetId].name })
			: buildLocalStage({ grid: { w: st.w, h: st.h }, deadCount: st.dead, teams, seed })
		const players = Array.from({ length: teams }, (_, i) => i < st.humans
			? { team: `p${i + 1}`, controller: 'human' }
			: { team: `p${i + 1}`, controller: 'ai', aiDifficulty: st.aiLevel })
		// prefill = changeSeats 재진입 시 셋업 복원용
		const prefill = { humans: st.humans, ai: st.ai, aiLevel: st.aiLevel, mapMode: st.mapMode, presetId: st.presetId, w: st.w, h: st.h, dead: st.dead }
		ctx.go('play', { mode: 'local', stageData, players, prefill })
	})

	return { el }
}
