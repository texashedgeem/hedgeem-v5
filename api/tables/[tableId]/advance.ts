// POST /api/tables/:tableId/advance
// Advances the game to the next stage (hole → flop → turn → river → next game).
// Equivalent to: get_next_game_state_object in hedgeem_server.
// STUB: Returns the next logical state. Wire to real game engine (HEDGE-33).
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
