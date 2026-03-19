// GET /api/tables/:tableId/state
// Returns the current game state for a table.
// STUB: Returns a realistic STATUS_HOLE game state. Wire to Supabase (HEDGE-32/33).
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from '../../_lib/cors';
import { BettingStage, GameState, HandStatus } from '../../_lib/enums';
import { HedgeEmGameState } from '../../_lib/types';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const tableId = parseInt(req.query.tableId as string, 10);
  if (isNaN(tableId) || tableId <= 0) {
    res.status(400).json({ error: 'Invalid tableId.' });
    return;
  }

  // STUB: Realistic STATUS_HOLE game state
  const state: HedgeEmGameState = {
    tableId,
    gameId: 'game-stub-001',
    gameState: GameState.STATUS_HOLE,
    bettingStage: BettingStage.HOLE,
    numberOfHands: 4,
    numberOfSeats: 6,
    jackpotValue: 1250.00,
    hands: ['AcKd', 'QsJs', '8h7c', '5d2c'],
    flopCard1: null,
    flopCard2: null,
    flopCard3: null,
    turnCard: null,
    riverCard: null,
    seats: [
      {
        seatId: 1,
        playerId: 'stub-player-id-001',
        playerName: 'Simon',
        seatBalance: 500.00,
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
    bets: [],
    handOdds: [
      { handIndex: 0, bettingStage: BettingStage.HOLE, handStatus: HandStatus.IN_PLAY_FAVOURITE, winPercentage: 62.4, drawPercentage: 2.1, odds: 1.6 },
      { handIndex: 1, bettingStage: BettingStage.HOLE, handStatus: HandStatus.IN_PLAY_BETTING_STAGE_ACTIVE, winPercentage: 21.3, drawPercentage: 1.8, odds: 4.7 },
      { handIndex: 2, bettingStage: BettingStage.HOLE, handStatus: HandStatus.IN_PLAY_BETTING_STAGE_ACTIVE, winPercentage: 10.2, drawPercentage: 0.9, odds: 9.8 },
      { handIndex: 3, bettingStage: BettingStage.HOLE, handStatus: HandStatus.IN_PLAY_BETTING_STAGE_ACTIVE, winPercentage: 6.1, drawPercentage: 0.5, odds: 16.4 },
    ],
  };

  res.status(200).json(state);
}
