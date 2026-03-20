/**
 * POST /api/tables/:tableId/sit
 *
 * Sits a player at a HedgeEm table with a buy-in amount.
 * Equivalent to: ws_sit_at_table_new → f_sit_at_table in HedgeEmServerAPI.cs
 *
 * Players can play as many HedgeEm tables as they like (though most will only
 * play one at a time). To support this they have to join a table. Joining a
 * table is similar to the real world where a gambler would take a seat and give
 * the croupier a 'buy-in' value.
 *
 * In this online version, to sit at a table you need to:
 *   1. Validate the table exists and is not null
 *   2. Validate the player exists and is not null
 *   3. Confirm the player has sufficient account balance (balance >= buyIn)
 *   4. Decrement the player's account balance by the buy-in value
 *   5. Credit the buy-in to the seat balance ('pot')
 *   6. Find a free seat at the table and assign the player to it
 *
 * STUB: Returns seat assignment. Wire to Supabase (HEDGE-32).
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from '../../_lib/cors';
import { authenticate } from '../../_lib/auth';
import { SitRequest, SitResponse } from '../../_lib/types';

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

  const body: SitRequest = req.body;

  if (!body || typeof body.buyInAmount !== 'number' || body.buyInAmount <= 0) {
    res.status(400).json({ error: 'buyInAmount must be a positive number.' });
    return;
  }

  // STUB: Always seats player at seat 1
  const response: SitResponse = {
    acknowledgement: 'ACK',
    seatId: 1,
    seatBalance: body.buyInAmount,
  };

  res.status(200).json(response);
}
