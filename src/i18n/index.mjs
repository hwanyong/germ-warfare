// 다국어(i18n) — 기본 영어(en), 한국어(ko). localStorage 저장.
// t(key) 로 번역. 씬은 마운트마다 t() 를 읽으므로 언어 변경 후 재진입 시 반영.

const DICT = {
	en: {
		'loading': 'LOADING',
		'title.play': 'Start Game', 'title.tutorial': 'Tutorial', 'title.settings': 'Settings', 'title.credits': 'Credits',
		'stage.title': 'Stage Select', 'stage.name': 'Village Invasion', 'stage.best': 'Best', 'stage.start': 'Start', 'stage.back': 'Back',
		'play.yourTurn': 'Your turn — pick a germ', 'play.aiTurn': "AI's turn…",
		'play.paused': 'Paused', 'play.resume': 'Resume', 'play.settings': 'Settings', 'play.quit': 'Quit',
		'play.clone': '＋ Clone', 'play.move': '↗ Move', 'play.finishing': 'Mopping up…',
		'result.win': 'Victory! 🎉', 'result.lose': 'So close! 😵', 'result.score': 'Score', 'result.best': 'Best', 'result.newRecord': 'New Record!',
		'result.you': 'You', 'result.enemy': 'Enemy', 'result.turns': 'turns',
		'result.rematch': 'Rematch', 'result.nextStage': 'Next Stage →', 'result.harder': 'Harder ↑', 'result.easier': 'Easier ↓', 'result.tryAgain': 'Try Again', 'result.select': 'Stage Select',
		'settings.title': 'Settings', 'settings.sound': 'Sound', 'settings.motion': 'Reduce Motion', 'settings.difficulty': 'Default Difficulty',
		'settings.language': 'Language', 'settings.tutorialAgain': 'Tutorial Again', 'settings.credits': 'Credits', 'settings.back': 'Back', 'settings.coming': 'soon',
		'settings.on': 'On', 'settings.off': 'Off',
		'tutorial.title': 'Tutorial', 'tutorial.skip': 'Skip', 'tutorial.done': 'Done',
		'tutorial.sel1': '① Select your germ (green)',
		'tutorial.clone': '② Now click the adjacent empty cell = Clone (source stays)',
		'tutorial.sel2': '③ Select a germ again',
		'tutorial.move': '④ Click the cell 2 away = Move (source removed)',
		'tutorial.sel3': '⑤ Select a germ',
		'tutorial.infect': '⑥ Place next to the enemy (pink) → infect!',
		'tutorial.fin': '✓ Done! The side with more cells wins.',
		'credits.made': 'Design · Direction · Code', 'credits.art': 'Art', 'credits.paper': 'Paper', 'credits.fonts': 'Fonts', 'credits.back': 'Back'
	},
	ko: {
		'loading': '로딩중',
		'title.play': '게임 시작', 'title.tutorial': '튜토리얼', 'title.settings': '설정', 'title.credits': '크레딧',
		'stage.title': '스테이지 선택', 'stage.name': '마을 침공', 'stage.best': '최고점', 'stage.start': '시작', 'stage.back': '뒤로',
		'play.yourTurn': '내 차례 — 세균을 선택', 'play.aiTurn': 'AI 차례…',
		'play.paused': '일시정지', 'play.resume': '재개', 'play.settings': '설정', 'play.quit': '포기',
		'play.clone': '＋ 복제', 'play.move': '↗ 이동', 'play.finishing': '남은 칸 정리 중…',
		'result.win': '승리! 🎉', 'result.lose': '아깝다! 😵', 'result.score': '점수', 'result.best': '최고', 'result.newRecord': '신기록!',
		'result.you': '내 세균', 'result.enemy': '적 세균', 'result.turns': '턴',
		'result.rematch': '재대결', 'result.nextStage': '다음 스테이지 →', 'result.harder': '난이도 ↑ 도전', 'result.easier': '난이도 ↓', 'result.tryAgain': '다시 도전', 'result.select': '스테이지 선택',
		'settings.title': '설정', 'settings.sound': '사운드', 'settings.motion': '모션 감소', 'settings.difficulty': '기본 난이도',
		'settings.language': '언어', 'settings.tutorialAgain': '튜토리얼 다시', 'settings.credits': '크레딧', 'settings.back': '뒤로', 'settings.coming': '준비중',
		'settings.on': '켬', 'settings.off': '끔',
		'tutorial.title': '튜토리얼', 'tutorial.skip': '스킵', 'tutorial.done': '완료',
		'tutorial.sel1': '① 내 세균(초록)을 선택하세요',
		'tutorial.clone': '② 이제 바로 옆 빈칸을 클릭 = 복제 (원본 유지)',
		'tutorial.sel2': '③ 세균을 다시 선택하세요',
		'tutorial.move': '④ 두 칸 떨어진 칸을 클릭 = 이동 (원본 소멸)',
		'tutorial.sel3': '⑤ 세균을 선택하세요',
		'tutorial.infect': '⑥ 적(핑크) 옆에 놓으면 감염!',
		'tutorial.fin': '✓ 완료! 칸이 더 많은 쪽이 승리합니다.',
		'credits.made': '기획 · 연출 · 코드', 'credits.art': '아트', 'credits.paper': '종이', 'credits.fonts': '폰트', 'credits.back': '뒤로'
	}
}

const KEY = 'gw-lang'
let lang = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'en'
document.documentElement.lang = lang

export function getLang() { return lang }
export function setLang(l) {
	lang = (l === 'ko') ? 'ko' : 'en'
	localStorage.setItem(KEY, lang)
	document.documentElement.lang = lang
}
export function t(k) { return DICT[lang]?.[k] ?? DICT.en[k] ?? k }
