// 다국어(i18n) — 기본 영어(en), 한국어(ko). localStorage 저장.
// t(key) 로 번역. 씬은 마운트마다 t() 를 읽으므로 언어 변경 후 재진입 시 반영.

import { warmFonts } from '../loading/preload.mjs'

const DICT = {
	en: {
		'loading': 'LOADING',
		'title.play': 'Start Game', 'title.localPvp': 'Local PvP', 'title.tutorial': 'Tutorial', 'title.settings': 'Settings', 'title.credits': 'Credits',
		'title.tip1': 'Land next to me to clone!', 'title.tip2': 'Jump 2 tiles to move!',
		'title.tip3': 'Works offline too!',
		'stage.title': 'Stage Select', 'stage.name': 'Village Invasion', 'stage.best': 'Best', 'stage.start': 'Start', 'stage.back': 'Back', 'stage.locked': 'Locked',
		'localSetup.title': 'Local PvP', 'localSetup.humans': 'Humans', 'localSetup.ai': 'AI', 'localSetup.total': '{n} players', 'localSetup.aiLevel': 'AI Level',
		'localSetup.mapPreset': 'Preset', 'localSetup.mapCustom': 'Custom', 'localSetup.width': 'Width', 'localSetup.height': 'Height', 'localSetup.deadTiles': 'Dead tiles', 'localSetup.deadMax': 'max {n}',
		'localSetup.start': 'Start', 'localSetup.back': 'Back', 'localSetup.playerLabel': 'Player {n}',
		'play.yourTurn': 'Your turn — pick a germ', 'play.aiTurn': "AI's turn…",
		'play.localTurn': "{name}'s turn — pick a germ", 'play.aiThink': '{name} (AI) thinking…',
		'play.passTitle': "{name}'s turn", 'play.passHint': 'Pass the device, then tap to start', 'play.passReady': "I'm ready",
		'play.forfeitSeat': 'Forfeit {name} (→ AI)',
		'play.paused': 'Paused', 'play.resume': 'Resume', 'play.settings': 'Settings', 'play.quit': 'Quit',
		'play.clone': '＋ Clone', 'play.move': '↗ Move', 'play.finishing': 'Mopping up…', 'play.start': 'START!',
		'result.win': 'Victory!', 'result.lose': 'So close!', 'result.score': 'Score', 'result.best': 'Best', 'result.newRecord': 'New Record!',
		'result.you': 'You', 'result.enemy': 'Enemy', 'result.turns': 'turns',
		'result.scoreGerms': 'Germs', 'result.scoreMargin': 'Lead bonus', 'result.scoreElim': 'Elimination', 'result.scoreFast': 'Speed bonus', 'result.tapSkip': 'Tap to skip',
		'result.rematch': 'Rematch', 'result.nextStage': 'Next Stage →', 'result.harder': 'Harder ↑', 'result.easier': 'Easier ↓', 'result.tryAgain': 'Try Again', 'result.select': 'Stage Select',
		'result.draw': 'Draw', 'result.localWin': '{name} wins!', 'result.changeSeats': 'Change Setup', 'result.newMatch': 'New Match',
		'settings.title': 'Settings', 'settings.sound': 'Sound', 'settings.motion': 'Reduce Motion', 'settings.difficulty': 'Default Difficulty',
		'settings.language': 'Language', 'settings.tutorialAgain': 'Tutorial Again', 'settings.credits': 'Credits', 'settings.back': 'Back', 'settings.coming': 'soon',
		'settings.on': 'On', 'settings.off': 'Off',
		'settings.update': 'Update', 'settings.updateApply': 'Apply & Restart',
		'settings.updateConfirm': 'This clears cached game data and re-downloads it. If you are offline right now, the game may become unplayable until you are back online. Continue?',
		'settings.updateConfirmOk': 'Continue', 'settings.updateConfirmCancel': 'Cancel',
		'settings.qrExport': 'Export via QR', 'settings.qrImport': 'Import via QR',
		'settings.qrImportScanning': 'Point your camera at the QR code',
		'settings.qrImportError': 'Camera unavailable',
		'settings.qrImportSummary': '{n} stage(s) updated', 'settings.qrImportNoChange': 'No changes — already up to date',
		'settings.qrApply': 'Apply', 'settings.qrCancel': 'Cancel', 'settings.qrClose': 'Close',
		'tutorial.title': 'Tutorial', 'tutorial.skip': 'Skip', 'tutorial.done': 'Done',
		'tutorial.sel1': '① Select your germ (green)',
		'tutorial.clone': '② Now click the adjacent empty cell = Clone (source stays)',
		'tutorial.sel2': '③ Select a germ again',
		'tutorial.move': '④ Click the cell 2 away = Move (source removed)',
		'tutorial.sel3': '⑤ Select a germ',
		'tutorial.infect': '⑥ Place next to the enemy (pink) → infect!',
		'tutorial.fin': '✓ Done! The side with more cells wins.',
		'credits.made': 'Design · Direction · Code', 'credits.art': 'Art', 'credits.paper': 'Paper', 'credits.fonts': 'Fonts', 'credits.license': 'License audit', 'credits.back': 'Back'
	},
	ko: {
		'loading': '로딩중',
		'title.play': '게임 시작', 'title.localPvp': '로컬 대전', 'title.tutorial': '튜토리얼', 'title.settings': '설정', 'title.credits': '크레딧',
		'title.tip1': '옆에 놓으면 복제!', 'title.tip2': '두 칸 뛰면 이동!',
		'title.tip3': '오프라인에서도 플레이 가능!',
		'stage.title': '스테이지 선택', 'stage.name': '마을 침공', 'stage.best': '최고점', 'stage.start': '시작', 'stage.back': '뒤로', 'stage.locked': '잠김',
		'localSetup.title': '로컬 대전', 'localSetup.humans': '사람', 'localSetup.ai': 'AI', 'localSetup.total': '총 {n}명', 'localSetup.aiLevel': 'AI 난이도',
		'localSetup.mapPreset': '프리셋', 'localSetup.mapCustom': '커스텀', 'localSetup.width': '가로', 'localSetup.height': '세로', 'localSetup.deadTiles': '데드타일', 'localSetup.deadMax': '최대 {n}',
		'localSetup.start': '시작', 'localSetup.back': '뒤로', 'localSetup.playerLabel': '플레이어 {n}',
		'play.yourTurn': '내 차례 — 세균을 선택', 'play.aiTurn': 'AI 차례…',
		'play.localTurn': '{name} 차례 — 세균 선택', 'play.aiThink': '{name} (AI) 생각 중…',
		'play.passTitle': '{name} 차례', 'play.passHint': '기기를 넘기고 탭해서 시작', 'play.passReady': '준비됐어요',
		'play.forfeitSeat': '{name} 기권(→AI)',
		'play.paused': '일시정지', 'play.resume': '재개', 'play.settings': '설정', 'play.quit': '포기',
		'play.clone': '＋ 복제', 'play.move': '↗ 이동', 'play.finishing': '남은 칸 정리 중…', 'play.start': '시작!',
		'result.win': '승리!', 'result.lose': '아깝다!', 'result.score': '점수', 'result.best': '최고', 'result.newRecord': '신기록!',
		'result.you': '내 세균', 'result.enemy': '적 세균', 'result.turns': '턴',
		'result.scoreGerms': '내 세균', 'result.scoreMargin': '격차 보너스', 'result.scoreElim': '전멸', 'result.scoreFast': '스피드 보너스', 'result.tapSkip': '탭하여 스킵',
		'result.rematch': '재대결', 'result.nextStage': '다음 스테이지 →', 'result.harder': '난이도 ↑ 도전', 'result.easier': '난이도 ↓', 'result.tryAgain': '다시 도전', 'result.select': '스테이지 선택',
		'result.draw': '무승부', 'result.localWin': '{name} 승리!', 'result.changeSeats': '설정 변경', 'result.newMatch': '새 대전',
		'settings.title': '설정', 'settings.sound': '사운드', 'settings.motion': '모션 감소', 'settings.difficulty': '기본 난이도',
		'settings.language': '언어', 'settings.tutorialAgain': '튜토리얼 다시', 'settings.credits': '크레딧', 'settings.back': '뒤로', 'settings.coming': '준비중',
		'settings.on': '켬', 'settings.off': '끔',
		'settings.update': '업데이트', 'settings.updateApply': '적용하고 재시작',
		'settings.updateConfirm': '캐시된 게임 데이터를 지우고 새로 받습니다. 지금 오프라인 상태라면 다시 온라인이 될 때까지 게임을 실행할 수 없을 수 있습니다. 계속할까요?',
		'settings.updateConfirmOk': '계속', 'settings.updateConfirmCancel': '취소',
		'settings.qrExport': 'QR로 내보내기', 'settings.qrImport': 'QR로 가져오기',
		'settings.qrImportScanning': '카메라를 QR코드에 비추세요',
		'settings.qrImportError': '카메라를 사용할 수 없습니다',
		'settings.qrImportSummary': '{n}개 스테이지 갱신됩니다', 'settings.qrImportNoChange': '변경 사항 없음 — 이미 최신 상태',
		'settings.qrApply': '적용', 'settings.qrCancel': '취소', 'settings.qrClose': '닫기',
		'tutorial.title': '튜토리얼', 'tutorial.skip': '스킵', 'tutorial.done': '완료',
		'tutorial.sel1': '① 내 세균(초록)을 선택하세요',
		'tutorial.clone': '② 이제 바로 옆 빈칸을 클릭 = 복제 (원본 유지)',
		'tutorial.sel2': '③ 세균을 다시 선택하세요',
		'tutorial.move': '④ 두 칸 떨어진 칸을 클릭 = 이동 (원본 소멸)',
		'tutorial.sel3': '⑤ 세균을 선택하세요',
		'tutorial.infect': '⑥ 적(핑크) 옆에 놓으면 감염!',
		'tutorial.fin': '✓ 완료! 칸이 더 많은 쪽이 승리합니다.',
		'credits.made': '기획 · 연출 · 코드', 'credits.art': '아트', 'credits.paper': '종이', 'credits.fonts': '폰트', 'credits.license': '라이선스 감사 문서', 'credits.back': '뒤로'
	}
}

const KEY = 'gw-lang'
let lang = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'en'
document.documentElement.lang = lang

// 현재 언어 사전 전체 글리프 예열 — 게임 중 첫 등장 텍스트(hover 배지 등)가
// 폰트 서브셋 지연로드 → 문서 전체 재페인트를 일으키지 않게 한다 (preload.warmFonts 참조).
// 스테이지명(data/stages.mjs)은 씬 마운트 시점에 삽입되어 자체 예열되므로 제외.
const warmLangFonts = () => warmFonts(Object.values(DICT[lang]).join(''))
document.fonts?.ready.then(warmLangFonts) // 부팅: @font-face 등록 완료 후 1회

export function getLang() { return lang }
export function setLang(l) {
	lang = (l === 'ko') ? 'ko' : 'en'
	localStorage.setItem(KEY, lang)
	document.documentElement.lang = lang
	warmLangFonts()
}
export function t(k, vars) {
	let s = DICT[lang]?.[k] ?? DICT.en[k] ?? k
	if (vars) for (const key in vars) s = s.replaceAll(`{${key}}`, vars[key])
	return s
}
