// POST /api/tables/:tableId/sit
// Sits a player at a table with a buy-in from their account balance.
// Equivalent to: ws_sit_at_table_new in hedgeem_server.
// STUB: Returns seat assignment. Wire to Supabase (HEDGE-32).
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
