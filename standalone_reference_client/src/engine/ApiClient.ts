/**
 * ApiClient — bridges the HedgeEm v5 REST API and the GameEngine.
 *
 * Attempts POST /api/deal before each game and converts the response into
 * a GameRecord that GameEngine can consume. Falls back silently to local
 * coredata if the API is unreachable, returns an error, or hasn't responded
 * in time.
 *
 * This is the only file in the reference client that knows about the API.
 * GameEngine and GameScene never call fetch() directly.
 *
 * Stub auth: the API accepts any Bearer token until HEDGE-31 wires up real
 * Supabase JWTs. Replace HEDGEEM_API_TOKEN with a real token then.
 */

import { type GameRecord, type HandStageInfo, GameStateEnum } from './types';

const HEDGEEM_API_BASE = 'https://hedgeem-v5.qeetoto.com';
const HEDGEEM_API_TOKEN = 'stub-token';
const FETCH_TIMEOUT_MS = 3_000;

export type ApiStatus = 'unknown' | 'available' | 'unavailable';

export class ApiClient {
  private _status: ApiStatus = 'unknown';
  private _pendingDeal: Promise<GameRecord | null> | null = null;

  get status(): ApiStatus {
    return this._status;
  }

  /**
   * Pre-fetches the next deal from the API.
   * Call this as early as possible (on game init) so the response is ready
   * by the time the player clicks Deal.
   */
  prefetch(numberOfHands: number): void {
    this._pendingDeal = this._fetchDeal(numberOfHands);
  }

  /**
   * Awaits the pre-fetched deal result.
   * Returns a GameRecord on success, null on failure (caller falls back to local data).
   */
  async getNextDeal(numberOfHands: number): Promise<GameRecord | null> {
    // If a prefetch is in flight, wait for it; otherwise fetch now
    const result = this._pendingDeal
      ? await this._pendingDeal
      : await this._fetchDeal(numberOfHands);

    this._pendingDeal = null;
    return result;
  }

  private async _fetchDeal(numberOfHands: number): Promise<GameRecord | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(`${HEDGEEM_API_BASE}/api/deal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HEDGEEM_API_TOKEN}`,
        },
        body: JSON.stringify({ numberOfHands }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this._status = 'available';
      return this._mapToGameRecord(data, numberOfHands);

    } catch (err) {
      this._status = 'unavailable';
      console.warn('[ApiClient] Unavailable — using local data.', err);
      return null;
    }
  }

  /**
   * Maps a POST /api/deal response to a GameRecord.
   *
   * The API returns hole-card odds only (pre-flop). For flop/turn/river
   * odds the engine falls back to the coredata base entry — those stages
   * will be replaced once POST /api/tables/:id/advance is wired (HEDGE-33).
   */
  private _mapToGameRecord(
    data: {
      hands: string[];
      handOdds: Array<{
        handIndex: number;
        bettingStage: number;
        handStatus: string;
        winPercentage: number;
        drawPercentage: number;
        odds: number;
      }>;
      remainingDeck: string[];
    },
    numberOfHands: number,
  ): GameRecord {
    // Build hole-stage HandStageInfo from API odds
    const holeStageInfo: HandStageInfo[] = data.handOdds.map((o) => ({
      handIndex: o.handIndex,
      gameState: 'STATUS_HOLE',
      enumGameState: GameStateEnum.STATUS_HOLE,
      handDescLong: '',   // not provided at pre-flop stage; filled by advance endpoint later
      handDescShort: '',
      percentWin: o.winPercentage / 100,
      percentDraw: o.drawPercentage / 100,
      percentWinOrDraw: (o.winPercentage + o.drawPercentage) / 100,
      oddsActual: o.odds,
      oddsRounded: o.odds,
      statusIsFavourite: o.handStatus === 'IN_PLAY_FAVOURITE',
      statusIsWinner: false,
      statusCantLose: false,
    }));

    // Deal board cards from the remaining deck (first 5 cards)
    const rd = data.remainingDeck;

    return {
      gameId: `api-${Date.now()}`,
      numberOfHands,
      numberOfBettingStages: 3,
      hands: data.hands,
      bc1: rd[0], bc2: rd[1], bc3: rd[2], bc4: rd[3], bc5: rd[4],
      // Flop/turn/river stage info will be populated by the advance endpoint (HEDGE-33).
      // For now only the hole stage is populated from the API.
      handStageInfoList: holeStageInfo,
    };
  }
}
