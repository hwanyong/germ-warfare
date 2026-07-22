// 규칙/흐름 상수 (SSOT).
//
// 원본 GameRoomSystem services/germwarfare/modules/constants.mjs 에서 추출.
// Twitch 채팅/투표 개념(STATE.MESSAGE.CHAT/VOTE)은 PvE 전환으로 제거됨.

const STATE = {
	GAME: {
		LOAD: 'load',
		WAIT: 'wait',
		COUNTDOWN: 'countdown',
		PLAY: 'play',
		END: 'end'
	},
	ATTACK: {
		IMPOSSIBLE: -1,
		INIT: 0,
		CLONE: 1,
		MOVE: 2
	}
}

export { STATE }
