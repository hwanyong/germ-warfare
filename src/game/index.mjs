// 규칙 엔진 배럴 (SSOT 진입점).
// 클라이언트(플레이), AI(탐색), 미래 서버(재시뮬 검증)가 모두 여기서 import.

export { GameMap, USERS } from './map.mjs'
export { STATE } from './constants.mjs'
export { mulberry32, randomSeed } from './rng.mjs'
