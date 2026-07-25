// 씬 레지스트리 + 매니저 생성.
import { SceneManager } from './manager.mjs'
import { titleScene } from './scenes/title.mjs'
import { stageSelectScene } from './scenes/stage-select.mjs'
import { localSetupScene } from './scenes/local-setup.mjs'
import { playScene } from './scenes/play.mjs'
import { resultScene } from './scenes/result.mjs'
import { settingsScene } from './scenes/settings.mjs'
import { tutorialScene } from './scenes/tutorial.mjs'
import { creditsScene } from './scenes/credits.mjs'

export const SCENES = {
	title: titleScene,
	'stage-select': stageSelectScene,
	'local-setup': localSetupScene,
	play: playScene,
	result: resultScene,
	settings: settingsScene,
	tutorial: tutorialScene,
	credits: creditsScene
}

export function createManager(root, store = {}, hooks = {}) {
	return new SceneManager(root, SCENES, store, hooks)
}
