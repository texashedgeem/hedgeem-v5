/**
 * convert-coredata.mjs
 *
 * Reads the raw JS data files from HedgeEmJavaScriptClient and converts them
 * to typed TypeScript (GameRecord[]) for standalone_reference_client.
 *
 * Usage:
 *   node scripts/convert-coredata.mjs
 *
 * Reads:
 *   ../../HedgeEmJavaScriptClient/odobo/src/js/dev/coredata.js
 *   ../../HedgeEmJavaScriptClient/odobo/src/js/dev/demodata.js
 *
 * Writes:
 *   src/data/coredata.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ----------------------------------------------------------------
// Load source JS files by evaluating them in a sandboxed context
// ----------------------------------------------------------------

function loadJsDataFile(filePath) {
  const src = readFileSync(filePath, 'utf8');
  // Run the JS source in an isolated VM context. All var declarations become
  // properties on the sandbox object, which we can read after execution.
  const sandbox = {
    coreData: [], three_handed_game_data: [], demoData: [],
    CORE_MODULUS: 0, CORE_MODULUS_THREE_HANDED_GAME: 0, DEMO_MODULUS: 0,
    // Stub out any browser/game globals the file might reference
    NUMBER_OF_HANDS: 4,
  };
  vm.runInNewContext(src, sandbox);
  return sandbox;
}

// ----------------------------------------------------------------
// Field mapping: JS snake_case → TS camelCase
// ----------------------------------------------------------------

function mapHandStageInfo(h) {
  return {
    handIndex:        h.hand_index,
    gameState:        h.game_state,
    enumGameState:    h.enum_game_state,
    handDescLong:     h.hand_desc_long  ?? '',
    handDescShort:    h.hand_desc_short ?? '',
    percentWin:       h.percent_win,
    percentDraw:      h.percent_draw,
    percentWinOrDraw: h.percent_win_or_draw,
    oddsActual:       h.odds_actual,
    oddsRounded:      h.odds_rounded,
    statusIsFavourite: h.status_is_favourite,
    statusIsWinner:    h.status_is_winner,
    statusCantLose:    h.status_cant_lose,
  };
}

function mapGameRecord(r, index) {
  return {
    gameId:                 r.game_id ?? `game-${index}`,
    numberOfHands:          r.number_of_hands,
    numberOfBettingStages:  r.number_of_betting_stages,
    hands:                  r.hands,
    bc1: r.bc1, bc2: r.bc2, bc3: r.bc3, bc4: r.bc4, bc5: r.bc5,
    gameName:               r.table_name ?? undefined,
    gameDescription:        r.game_description ?? undefined,
    handStageInfoList:      r.hand_stage_info_list.map(mapHandStageInfo),
  };
}

// ----------------------------------------------------------------
// Serialise to TypeScript source
// ----------------------------------------------------------------

// Produce a compact but readable TS literal for one HandStageInfo
function serializeHSI(h) {
  return `{ handIndex: ${h.handIndex}, gameState: '${h.gameState}', enumGameState: ${h.enumGameState}, ` +
    `handDescLong: ${JSON.stringify(h.handDescLong)}, handDescShort: ${JSON.stringify(h.handDescShort)}, ` +
    `percentWin: ${h.percentWin}, percentDraw: ${h.percentDraw}, percentWinOrDraw: ${h.percentWinOrDraw}, ` +
    `oddsActual: ${h.oddsActual}, oddsRounded: ${h.oddsRounded}, ` +
    `statusIsFavourite: ${h.statusIsFavourite}, statusIsWinner: ${h.statusIsWinner}, statusCantLose: ${h.statusCantLose} }`;
}

function serializeRecord(r) {
  const hsiLines = r.handStageInfoList.map(h => `    ${serializeHSI(h)}`).join(',\n');
  const gameNameLine = r.gameName ? `\n  gameName: ${JSON.stringify(r.gameName)},` : '';
  const gameDescLine = r.gameDescription ? `\n  gameDescription: ${JSON.stringify(r.gameDescription)},` : '';
  return `{
  gameId: ${JSON.stringify(r.gameId)},
  numberOfHands: ${r.numberOfHands},
  numberOfBettingStages: ${r.numberOfBettingStages},
  hands: ${JSON.stringify(r.hands)},
  bc1: '${r.bc1}', bc2: '${r.bc2}', bc3: '${r.bc3}', bc4: '${r.bc4}', bc5: '${r.bc5}',${gameNameLine}${gameDescLine}
  handStageInfoList: [
${hsiLines}
  ],
}`;
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------

const srcDir = path.resolve(__dirname, '../../../HedgeEmJavaScriptClient/odobo/src/js/dev');
const outFile = path.resolve(__dirname, '../src/data/coredata.ts');

console.log('Loading coredata.js…');
const coreResult = loadJsDataFile(path.join(srcDir, 'coredata.js'));

console.log('Loading demodata.js…');
const demoResult = loadJsDataFile(path.join(srcDir, 'demodata.js'));

const coreData4         = coreResult.coreData.map(mapGameRecord);
const threeHandedData   = coreResult.three_handed_game_data.map(mapGameRecord);
const demoData          = demoResult.demoData.map(mapGameRecord);

console.log(`  coreData:            ${coreData4.length} records`);
console.log(`  threeHandedGameData: ${threeHandedData.length} records`);
console.log(`  demoData:            ${demoData.length} records`);

const coreDataTs   = coreData4.map(serializeRecord).join(',\n\n');
const threeHandedTs = threeHandedData.map(serializeRecord).join(',\n\n');
const demoDataTs   = demoData.map(serializeRecord).join(',\n\n');

const output = `/**
 * coredata.ts — Auto-generated from HedgeEmJavaScriptClient source files.
 * DO NOT EDIT BY HAND — re-run scripts/convert-coredata.mjs to regenerate.
 *
 * Source:
 *   HedgeEmJavaScriptClient/odobo/src/js/dev/coredata.js   (${coreData4.length} four-handed + ${threeHandedData.length} three-handed games)
 *   HedgeEmJavaScriptClient/odobo/src/js/dev/demodata.js   (${demoData.length} demo games)
 *
 * Field mapping (JS → TS):
 *   hand_stage_info_list  → handStageInfoList
 *   hand_desc_long/short  → handDescLong/Short
 *   percent_win/draw      → percentWin/Draw
 *   odds_actual/rounded   → oddsActual/Rounded
 *   status_is_favourite   → statusIsFavourite
 *   status_is_winner      → statusIsWinner
 *   status_cant_lose      → statusCantLose
 *   enum_game_state       → enumGameState
 *   number_of_hands       → numberOfHands
 */

import type { GameRecord } from '../engine/types';

// ----------------------------------------------------------------
// Four-handed games (${coreData4.length} records)
// ----------------------------------------------------------------

export const coreData: GameRecord[] = [
${coreDataTs}
];

// ----------------------------------------------------------------
// Three-handed games (${threeHandedData.length} records)
// ----------------------------------------------------------------

export const threeHandedGameData: GameRecord[] = [
${threeHandedTs}
];

// ----------------------------------------------------------------
// Demo games (${demoData.length} records)
// ----------------------------------------------------------------

export const demoData: GameRecord[] = [
${demoDataTs}
];

export const CORE_MODULUS             = coreData.length;
export const CORE_MODULUS_THREE_HANDED = threeHandedGameData.length;
export const DEMO_MODULUS             = demoData.length;
`;

writeFileSync(outFile, output, 'utf8');
console.log(`\nWrote ${outFile}`);
console.log(`File size: ${(output.length / 1024).toFixed(0)} KB`);
