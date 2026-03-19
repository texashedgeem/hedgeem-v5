import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleOptions } from './_lib/cors';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  res.status(200).json({
    status: 'ok',
    service: 'hedgeem-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}
