// POST /api/tables/:tableId/bet
// Places a bet on a hand at the current betting stage.
// Equivalent to: ws_place_bet in hedgeem_server.
// STUB: Validates and acknowledges the bet. Wire to Supabase (HEDGE-34).
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from '../../_lib/cors';
import { authenticate } from '../../_lib/auth';
import { PlaceBetRequest, PlaceBetResponse } from '../../_lib/types';

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

  const body: PlaceBetRequest = req.body;

  if (!body || typeof body.betAmount !== 'number' || body.betAmount <= 0) {
    res.status(400).json({ error: 'betAmount must be a positive number.' });
    return;
  }
  if (typeof body.handIndex !== 'number' || body.handIndex < 0 || body.handIndex > 3) {
    res.status(400).json({ error: 'handIndex must be 0–3.' });
    return;
  }
  if (typeof body.seatIndex !== 'number' || body.seatIndex < 0) {
    res.status(400).json({ error: 'seatIndex must be a non-negative integer.' });
    return;
  }

  // STUB: Always ACK with reduced seat balance
  const response: PlaceBetResponse = {
    acknowledgement: 'ACK',
    message: 'Bet placed successfully.',
    updatedSeatBalance: 500.00 - body.betAmount,
  };

  res.status(200).json(response);
}
