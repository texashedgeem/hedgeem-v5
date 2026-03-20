/**
 * POST /api/tables/:tableId/topup
 *
 * Sets the player's seat balance at a given table.
 * Equivalent to: ws_top_up_chips_at_table → f_set_players_balance_at_a_given_table in HedgeEmServerAPI.cs
 *
 * Note: in the original C# implementation this sets the seat balance to the absolute
 * value supplied (not an increment). The original server had a known bug noted in comments:
 * "the balance is not set / seat id is ignored" — this will need care when wiring to Supabase.
 *
 * Note: this is distinct from the initial buy-in (sit). Top-up is used mid-game when a player's
 * seat balance runs low and they want to add more chips from their account balance.
 *
 * STUB: Returns updated balances. Wire to Supabase (HEDGE-34).
 */
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
