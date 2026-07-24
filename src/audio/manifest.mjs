// 오디오 에셋 매니페스트 — public/assets/audio 전 파일의 SSOT (ADR-009).
// 모든 오디오 에셋은 여기 등록해야 한다(데드 에셋 금지 규약의 오디오판).
// trigger 는 배선 지점 문서화 — 상세 표는 docs/design.md §8.

export const AUDIO_BASE = '/germ-warfare/assets/audio' // base 접두 규약: theme.css/fx.mjs 와 동일

export const SOUNDS = {
	'bgm-main': { file: 'bgm-main.mp3', kind: 'bgm', gain: 0.5, trigger: 'play/result 제외 전 씬 메인 테마 — 씬 매핑(main.mjs SCENE_BGM), 갭리스 루프' },
	'bgm-battle': { file: 'bgm-battle.mp3', kind: 'bgm', gain: 0.5, trigger: 'play 씬 전용 전투 루프 — 씬 전환 시 페이드 교체' },
	'sfx-launch': { file: 'sfx-launch.mp3', kind: 'sfx', gain: 0.9, trigger: 'playMove/playJump phase:launch (return 은 rate 0.85 재활용)' },
	'sfx-laser': { file: 'sfx-laser.mp3', kind: 'sfx', gain: 0.9, trigger: 'playMove phase:laser (playJump pickup 은 rate 0.8 재활용)' },
	'sfx-impact': { file: 'sfx-impact.mp3', kind: 'sfx', gain: 1.0, trigger: 'playMove phase:impact / playJump phase:drop' },
	'sfx-spawn': { file: 'sfx-spawn.mp3', kind: 'sfx', gain: 0.9, trigger: 'play 씬 onImpact/onDrop 셀 생성 pop (+autoFinish 저게인)' },
	'sfx-infect': { file: 'sfx-infect.mp3', kind: 'sfx', gain: 1.0, trigger: 'play 씬 postMove 뒤집기 diff>0 시 1회' },
	'sfx-button': { file: 'sfx-button.mp3', kind: 'sfx', gain: 0.8, trigger: '전 씬 .btn 클릭 — document 위임(main.mjs)' },
	'sfx-select': { file: 'sfx-select.mp3', kind: 'sfx', gain: 0.8, trigger: 'play 씬 소스 세균 선택' },
	'sfx-invalid': { file: 'sfx-invalid.mp3', kind: 'sfx', gain: 0.8, trigger: 'play 씬 소스 선택 상태에서 비합법 타겟 클릭' },
	'sfx-turn': { file: 'sfx-turn.mp3', kind: 'sfx', gain: 0.8, trigger: 'play 씬 내 턴 시작 (AI 턴 무음)' },
	'jingle-win': { file: 'jingle-win.mp3', kind: 'sfx', gain: 1.0, trigger: 'result 씬 마운트 — 승리' },
	'jingle-lose': { file: 'jingle-lose.mp3', kind: 'sfx', gain: 1.0, trigger: 'result 씬 마운트 — 패배' }
}
