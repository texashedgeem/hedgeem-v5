/**
 * POST /api/tables/:tableId/advance
 *
 * Advances the game to the next state and returns the new game state.
 * Equivalent to: get_next_game_state_object → f_change_table_game_state in HedgeEmServerAPI.cs
 *
 * The only way to change a game's state is via the HedgeEm Master Server.
 * Clients call this method so the server needs to know as much as possible about the caller.
 *
 * Game state machine (from HedgeEmTable.f_transistion_to_next_game_state):
 *   STATUS_START → STATUS_HOLE → STATUS_FLOP → STATUS_TURN → STATUS_RIVER → STATUS_START
 *
 * Key transitions:
 *   - STATUS_START: shuffles deck, deals hole cards, calculates opening odds
 *   - STATUS_FLOP: deals 3 community cards, recalculates odds
 *   - STATUS_TURN: deals 1 community card, recalculates odds
 *   - STATUS_RIVER: deals final card, calls f_pay_winners(), persists game record to DB
 *   - Back to STATUS_START: increments games played count, clears cards, prepares next game
 *
 * Note: in FASTPLAY_FLOP mode the game skips STATUS_TURN and goes directly FLOP → RIVER.
 *
 * STUB: Returns the next logical state. Wire to real game engine (HEDGE-33).
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from '../../_lib/cors';
import { authenticate } from '../../_lib/auth';
import { BettingStage, GameState, HandStatus } from '../../_lib/enums';
import { HedgeEmGameState } from '../../_lib/types';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const auth = authenticate(req, res);
  if (!auth) return;

  const tableId = parseInt(req.query.tableId as string, 10);
  if (isNaN(tableId) || tableId <= 0) {
    res.status(400).json({ error: 'Invalid tableId.' });
    return;
  }

  // STUB: Advances from STATUS_HOLE → STATUS_FLOP with 3 community cards dealt
  const state: HedgeEmGameState = {
    tableId,
    gameId: 'game-stub-001',
    gameState: GameState.STATUS_FLOP,
    bettingStage: BettingStage.FLOP,
    numberOfHands: 4,
    numberOfSeats: 6,
    jackpotValue: 1250.00,
    hands: ['AcKd', 'QsJs', '8h7c', '5d2c'],
    flopCard1: 'Ah',
    flopCard2: '3s',
    flopCard3: '9d',
    turnCard: null,
    riverCard: null,
    seats: [
      {
        seatId: 1,
        playerId: 'stub-player-id-001',
        playerName: 'Simon',
        seatBalance: 450.00,
        avatarImageUrl: '/avatars/user_square.jpg',
      },
      {
        seatId: 2,
        playerId: 'stub-player-id-002',
        playerName: 'Guest',
        seatBalance: 250.00,
        avatarImageUrl: '/avatars/user_square.jpg',
      },
    ],
    bets: [
      { playerId: 'stub-player-id-001', bettingStage: BettingStage.HOLE, seatIndex: 0, handIndex: 0, betAmount: 50.00, recordedOdds: 1.6 },
    ],
    handOdds: [
      { handIndex: 0, bettingStage: BettingStage.FLOP, handStatus: HandStatus.IN_PLAY_FAVOURITE, winPercentage: 78.2, drawPercentage: 3.1, odds: 1.28 },
      { handIndex: 1, bettingStage: BettingStage.FLOP, handStatus: HandStatus.IN_PLAY_BETTING_STAGE_ACTIVE, winPercentage: 12.4, drawPercentage: 1.2, odds: 8.1 },
      { handIndex: 2, bettingStage: BettingStage.FLOP, handStatus: HandStatus.IN_PLAY_DEAD, winPercentage: 0.0, drawPercentage: 0.0, odds: 0.0 },
      { handIndex: 3, bettingStage: BettingStage.FLOP, handStatus: HandStatus.IN_PLAY_BETTING_STAGE_ACTIVE, winPercentage: 9.4, drawPercentage: 0.3, odds: 10.6 },
    ],
  };

  res.status(200).json(state);
}
