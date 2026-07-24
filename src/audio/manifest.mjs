// 오디오 에셋 매니페스트 — public/assets/audio 전 파일의 SSOT (ADR-009).
// 모든 오디오 에셋은 여기 등록해야 한다(데드 에셋 금지 규약의 오디오판).
// trigger 는 배선 지점 문서화 — FUTURE 항목은 해당 기능 구현 시 배선한다(docs/design.md §사운드).

export const AUDIO_BASE = '/germ-warfare/assets/audio' // base 접두 규약: theme.css/fx.mjs 와 동일

export const SOUNDS = {
	'bgm-battle': { file: 'bgm-battle.mp3', kind: 'bgm', gain: 0.5, trigger: '첫 제스처 시 시작, 갭리스 루프' },
	'sfx-launch': { file: 'sfx-launch.mp3', kind: 'sfx', gain: 0.9, trigger: 'playMove phase:launch (+return 은 rate 0.85 재활용)' },
	'sfx-laser': { file: 'sfx-laser.mp3', kind: 'sfx', gain: 0.9, trigger: 'playMove phase:laser' },
	'sfx-impact': { file: 'sfx-impact.mp3', kind: 'sfx', gain: 1.0, trigger: 'playMove phase:impact' },
	'sfx-spawn': { file: 'sfx-spawn.mp3', kind: 'sfx', gain: 0.9, trigger: 'onImpact 셀 생성 pop' },
	'sfx-infect': { file: 'sfx-infect.mp3', kind: 'sfx', gain: 1.0, trigger: 'onImpact 감염(상대 count 감소) 시 +120ms' },
	'sfx-button': { file: 'sfx-button.mp3', kind: 'sfx', gain: 0.8, trigger: 'UI 버튼 클릭(사운드 토글 등)' },
	'sfx-select': { file: 'sfx-select.mp3', kind: 'sfx', gain: 0.8, trigger: 'FUTURE(P0): 셀 선택' },
	'sfx-invalid': { file: 'sfx-invalid.mp3', kind: 'sfx', gain: 0.8, trigger: 'FUTURE(P0): 무효 이동' },
	'sfx-turn': { file: 'sfx-turn.mp3', kind: 'sfx', gain: 0.8, trigger: 'FUTURE(P1): 턴 교대' },
	'jingle-win': { file: 'jingle-win.mp3', kind: 'sfx', gain: 1.0, trigger: 'FUTURE(P1): 승리 판정' },
	'jingle-lose': { file: 'jingle-lose.mp3', kind: 'sfx', gain: 1.0, trigger: 'FUTURE(P1): 패배 판정' }
}
