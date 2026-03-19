// POST /api/tables/:tableId/topup
// Transfers chips from the player's account balance to their seat balance.
// Equivalent to: ws_top_up_chips_at_table in hedgeem_server.
// STUB: Returns updated balances. Wire to Supabase (HEDGE-34).
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from '../../_lib/cors';
import { authenticate } from '../../_lib/auth';
import { TopUpRequest, TopUpResponse } from '../../_lib/types';

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

  const body: TopUpRequest = req.body;

  if (!body || typeof body.amount !== 'number' || body.amount <= 0) {
    res.status(400).json({ error: 'amount must be a positive number.' });
    return;
  }

  // STUB: Always ACK with adjusted balances
  const response: TopUpResponse = {
    acknowledgement: 'ACK',
    newSeatBalance: 500.00 + body.amount,
    newAccountBalance: 1000.00 - body.amount,
  };

  res.status(200).json(response);
}
