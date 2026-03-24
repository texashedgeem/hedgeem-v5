/**
 * HEDGE-122: Generate two_handed_game_data dataset for the JS client.
 *
 * Uses the compiled utils from dist/api/_lib/utils.js (run `npm run build` first).
 *
 * Outputs a JS file containing:
 *   var two_handed_game_data = [...];
 *   var CORE_MODULUS_TWO_HANDED_GAME = 50;
 *
 * The format matches coreData / three_handed_game_data in coredata.js exactly,
 * including the enum_game_state values the JS client uses to look up odds:
 *   CC_STATUS_HOLE  = 6
 *   CC_STATUS_FLOP  = 10
 *   CC_STATUS_TURN  = 11
 *   CC_STATUS_RIVER = 12
 *
 * Usage:
 *   node scripts/generate-two-handed-data.js > /tmp/two_handed_game_data.js
 *   # then review and paste the output into coredata.js in HedgeEmJavaScriptClient
 */

'use strict';

const path = require('path');
const {
  dealGame,
  calculatePreFlopOdds,
  calculateFlopOdds,
  calculateTurnOdds,
  calculateRiverOdds,
  computeOddsChain,
  getBestFiveCards,
  getHandDescriptionShort,
  getHandDescriptionLong,
} = require(path.join(__dirname, '../dist/api/_lib/utils'));

// JS client game state constants (from defines.js)
const ENUM_STATUS_HOLE  = 6;
const ENUM_STATUS_FLOP  = 10;
const ENUM_STATUS_TURN  = 11;
const ENUM_STATUS_RIVER = 12;

const NUMBER_OF_GAMES  = 50;
const NUMBER_OF_HANDS  = 2;
const TARGET_RTP       = 0.97;
const MONTE_CARLO_ITER = 10_000;

function buildStageEntries(hands, community, enumGameState, oddsResults) {
  const n = hands.length;

  // Determine favourite (highest win%) and best-rtp (highest rounded odds)
  const chains = oddsResults.map(r => computeOddsChain(r.winPercentage, r.drawPercentage, TARGET_RTP));

  let favouriteIdx = 0;
  let bestRtpIdx   = 0;
  for (let i = 0; i < n; i++) {
    if (oddsResults[i].winPercentage > oddsResults[favouriteIdx].winPercentage) favouriteIdx = i;
    if (chains[i].oddsRounded      > chains[bestRtpIdx].oddsRounded)            bestRtpIdx   = i;
  }

  const isRiver = enumGameState === ENUM_STATUS_RIVER;

  return hands.map((hand, i) => {
    const r = oddsResults[i];
    const c = chains[i];

    const totalCards = 2 + community.length;
    const allCards   = [hand.slice(0, 2), hand.slice(2, 4), ...community];
    const hasBoard   = totalCards >= 5;

    return {
      enum_game_state:     enumGameState,
      hand_index:          i,
      percent_win:         r.winPercentage,
      percent_draw:        r.drawPercentage,
      percent_win_or_draw: parseFloat((r.winPercentage + r.drawPercentage).toFixed(1)),
      odds_actual:         c.oddsActual,
      odds_margin:         c.oddsMargin,
      odds_rounded:        c.oddsRounded,
      actual_rtp:          c.actualRtp,
      rounding_rake:       c.roundingRake,
      status_is_winner:    isRiver && (r.winPercentage === 100 || r.drawPercentage === 100),
      status_cant_lose:    (r.winPercentage + r.drawPercentage) >= 99.9,
      status_is_favourite: i === favouriteIdx,
      status_best_rtp:     i === bestRtpIdx,
      best_five_cards:     hasBoard ? getBestFiveCards(allCards).join(' ') : null,
      hand_desc_short:     hasBoard ? getHandDescriptionShort(allCards) : null,
      hand_desc_long:      hasBoard ? getHandDescriptionLong(allCards)  : null,
    };
  });
}

function generateGame(gameIndex) {
  const dealt = dealGame(NUMBER_OF_HANDS);
  const { hands, bc1, bc2, bc3, bc4, bc5 } = dealt;
  const flop = [bc1, bc2, bc3];

  const holeOdds  = calculatePreFlopOdds(hands, MONTE_CARLO_ITER);
  const flopOdds  = calculateFlopOdds(hands, flop, MONTE_CARLO_ITER);
  const turnOdds  = calculateTurnOdds(hands, flop, bc4, MONTE_CARLO_ITER);
  const riverOdds = calculateRiverOdds(hands, [bc1, bc2, bc3, bc4, bc5]);

  const hand_stage_info_list = [
    ...buildStageEntries(hands, [],                         ENUM_STATUS_HOLE,  holeOdds),
    ...buildStageEntries(hands, flop,                       ENUM_STATUS_FLOP,  flopOdds),
    ...buildStageEntries(hands, [...flop, bc4],             ENUM_STATUS_TURN,  turnOdds),
    ...buildStageEntries(hands, [bc1, bc2, bc3, bc4, bc5],  ENUM_STATUS_RIVER, riverOdds),
  ];

  return {
    game_name:              null,
    game_description:       null,
    number_of_hands:        NUMBER_OF_HANDS,
    number_of_betting_stages: 3,
    hands,
    bc1, bc2, bc3, bc4, bc5,
    hand_stage_info_list,
  };
}

// ---- Main ----

process.stderr.write(`Generating ${NUMBER_OF_GAMES} two-handed games (${MONTE_CARLO_ITER.toLocaleString()} Monte Carlo iterations each)...\n`);

const games = [];
for (let i = 0; i < NUMBER_OF_GAMES; i++) {
  if ((i + 1) % 10 === 0) process.stderr.write(`  ${i + 1}/${NUMBER_OF_GAMES}\n`);
  games.push(generateGame(i));
}

process.stderr.write('Done.\n\n');

// Output as JS variable assignments
const json = JSON.stringify(games, null, 2);
process.stdout.write(`var two_handed_game_data = ${json};\n\n`);
process.stdout.write(`var CORE_MODULUS_TWO_HANDED_GAME = ${NUMBER_OF_GAMES};\n`);
