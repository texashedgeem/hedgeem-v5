// GET /api/players/:playerId
// Returns a player's profile and account balance.
// Equivalent to: ws_get_player_account_balance in hedgeem_server.
// STUB: Returns stub player data. Wire to Supabase (HEDGE-31/32).
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from '../_lib/cors';
import { authenticate } from '../_lib/auth';
import { HedgeEmPlayer } from '../_lib/types';
import { UserRole } from '../_lib/enums';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const auth = authenticate(req, res);
  if (!auth) return;

  const { playerId } = req.query;
  if (!playerId || typeof playerId !== 'string') {
    res.status(400).json({ error: 'Invalid playerId.' });
    return;
  }

  // STUB: Returns stub player. Wire to Supabase Auth + profiles table (HEDGE-31).
  const player: HedgeEmPlayer = {
    playerId,
    username: 'simon.hewins@gmail.com',
    displayName: 'Simon',
    accountBalance: 1000.00,
    avatarImageUrl: '/avatars/user_square.jpg',
    role: UserRole.BASIC_USER,
    isActive: true,
    personalTableId: 1,
  };

  res.status(200).json(player);
}
