/**
 * coredata.ts — Hardcoded game records, ported from HedgeEmJavaScriptClient.
 *
 * Source files:
 *   HedgeEmJavaScriptClient/odobo/src/js/dev/coredata.js   — 200 four-handed games
 *   HedgeEmJavaScriptClient/odobo/src/js/dev/coredata.js   — 50 three-handed games
 *   HedgeEmJavaScriptClient/odobo/src/js/dev/demodata.js   — 17 demo games
 *
 * TODO: Port the full 200-game coreData and 50-game threeHandedGameData arrays
 *       from the JS source. The structure is a direct JSON mapping — each object
 *       maps to a GameRecord with handStageInfoList replacing hand_stage_info_list.
 *
 * Field mapping from JS → TypeScript:
 *   hand_stage_info_list[n].hand_desc_long   → handDescLong
 *   hand_stage_info_list[n].hand_desc_short  → handDescShort
 *   hand_stage_info_list[n].percent_win      → percentWin
 *   hand_stage_info_list[n].percent_draw     → percentDraw
 *   hand_stage_info_list[n].percent_win_or_draw → percentWinOrDraw
 *   hand_stage_info_list[n].odds_actual      → oddsActual
 *   hand_stage_info_list[n].odds_rounded     → oddsRounded
 *   hand_stage_info_list[n].status_is_favourite → statusIsFavourite
 *   hand_stage_info_list[n].status_is_winner    → statusIsWinner
 *   hand_stage_info_list[n].status_cant_lose    → statusCantLose
 *   hand_stage_info_list[n].enum_game_state     → enumGameState
 *   hand_stage_info_list[n].game_state          → gameState
 *   bc1…bc5                                  → bc1…bc5 (unchanged)
 *   number_of_hands                          → numberOfHands
 *   number_of_betting_stages                 → numberOfBettingStages
 *   game_id                                  → gameId
 */

import type { GameRecord } from '../engine/types';

// Placeholder — replace with the full ported array from coredata.js
export const coreData: GameRecord[] = [
  {
    gameId: 'stub-4h-001',
    numberOfHands: 4,
    numberOfBettingStages: 3,
    hands: ['AcKd', 'QsJs', '8h7c', '5d2c'],
    bc1: 'Ah', bc2: '3s', bc3: '9d', bc4: '2h', bc5: 'Kc',
    handStageInfoList: [
      // STATUS_HOLE (enumGameState 6) — 4 entries
      { handIndex: 0, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Ace high', handDescShort: 'Ace high', percentWin: 0.624, percentDraw: 0.021, percentWinOrDraw: 0.645, oddsActual: 1.6, oddsRounded: 1.6, statusIsFavourite: true,  statusIsWinner: false, statusCantLose: false },
      { handIndex: 1, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.213, percentDraw: 0.018, percentWinOrDraw: 0.231, oddsActual: 4.7, oddsRounded: 4.7, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 2, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Eight high', handDescShort: 'Eight high', percentWin: 0.102, percentDraw: 0.009, percentWinOrDraw: 0.111, oddsActual: 9.8, oddsRounded: 9.8, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 3, gameState: 'STATUS_HOLE', enumGameState: 6, handDescLong: 'Five high', handDescShort: 'Five high', percentWin: 0.061, percentDraw: 0.005, percentWinOrDraw: 0.066, oddsActual: 16.4, oddsRounded: 16.4, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      // STATUS_FLOP (enumGameState 10) — 4 entries
      { handIndex: 0, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Two pair, Aces and Threes', handDescShort: 'Two pair', percentWin: 0.782, percentDraw: 0.031, percentWinOrDraw: 0.813, oddsActual: 1.28, oddsRounded: 1.28, statusIsFavourite: true,  statusIsWinner: false, statusCantLose: false },
      { handIndex: 1, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.124, percentDraw: 0.012, percentWinOrDraw: 0.136, oddsActual: 8.1, oddsRounded: 8.1, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 2, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Eight high', handDescShort: 'Eight high', percentWin: 0.000, percentDraw: 0.000, percentWinOrDraw: 0.000, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 3, gameState: 'STATUS_FLOP', enumGameState: 10, handDescLong: 'Five high', handDescShort: 'Five high', percentWin: 0.094, percentDraw: 0.003, percentWinOrDraw: 0.097, oddsActual: 10.6, oddsRounded: 10.6, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      // STATUS_TURN (enumGameState 11) — 4 entries
      { handIndex: 0, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Two pair, Aces and Kings', handDescShort: 'Two pair', percentWin: 0.932, percentDraw: 0.000, percentWinOrDraw: 0.932, oddsActual: 1.07, oddsRounded: 1.07, statusIsFavourite: true,  statusIsWinner: false, statusCantLose: false },
      { handIndex: 1, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.068, percentDraw: 0.000, percentWinOrDraw: 0.068, oddsActual: 14.7, oddsRounded: 14.7, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 2, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Eight high', handDescShort: 'Eight high', percentWin: 0.000, percentDraw: 0.000, percentWinOrDraw: 0.000, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 3, gameState: 'STATUS_TURN', enumGameState: 11, handDescLong: 'Five high', handDescShort: 'Five high', percentWin: 0.000, percentDraw: 0.000, percentWinOrDraw: 0.000, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      // STATUS_RIVER (enumGameState 12) — 4 entries
      { handIndex: 0, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Two pair, Aces and Kings', handDescShort: 'Two pair', percentWin: 1.0, percentDraw: 0.0, percentWinOrDraw: 1.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: true,  statusCantLose: false },
      { handIndex: 1, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Queen high', handDescShort: 'Queen high', percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 2, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Eight high', handDescShort: 'Eight high', percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
      { handIndex: 3, gameState: 'STATUS_RIVER', enumGameState: 12, handDescLong: 'Five high', handDescShort: 'Five high', percentWin: 0.0, percentDraw: 0.0, percentWinOrDraw: 0.0, oddsActual: 0.0, oddsRounded: 0.0, statusIsFavourite: false, statusIsWinner: false, statusCantLose: false },
    ],
  },
];

// Placeholder — replace with the full 50-game three-handed array
export const threeHandedGameData: GameRecord[] = [];

export const CORE_MODULUS = coreData.length;
export const CORE_MODULUS_THREE_HANDED = threeHandedGameData.length || 1;
