// Auth middleware stub — will be replaced with real Supabase JWT verification (HEDGE-31)
import { VercelRequest, VercelResponse } from '@vercel/node';

export interface AuthContext {
  playerId: string;
  role: string;
}

// STUB: Extracts and validates the Supabase JWT from the Authorization header.
// Currently returns a stub user for any Bearer token.
// Replace with real Supabase JWT verification when HEDGE-31 is implemented.
export function authenticate(
  req: VercelRequest,
  res: VercelResponse
): AuthContext | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return null;
  }

  // STUB: In production this will be verified against Supabase Auth public key
  const _token = authHeader.slice(7);
  return {
    playerId: 'stub-player-id-001',
    role: 'BASIC_USER',
  };
}
