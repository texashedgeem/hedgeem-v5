// Ported from hedgeem_client_class_library (HedgeEmGameState, HedgeEmSeat, HedgeEmBet, HedgeEmPlayer)
import { BettingStage, GameState, HandStatus, UserRole } from './enums';

export interface HedgeEmSeat {
  seatId: number;
  playerId: string;         // UUID (Supabase auth.users.id)
  playerName: string;
  seatBalance: number;
  avatarImageUrl: string;
}

export interface HedgeEmBet {
  playerId: string;
  bettingStage: BettingStage;
  seatIndex: number;
  handIndex: number;        // 0-3
  betAmount: number;
  recordedOdds: number;
}

// Per-hand, per-stage odds panel — equivalent to the betting panel data in DotNetHedgeEmClient
export interface HedgeEmHandOdds {
  handIndex: number;        // 0-3
  bettingStage: BettingStage;
  handStatus: HandStatus;
  winPercentage: number;
  drawPercentage: number;
  odds: number;             // e.g. 4.5 → displayed as "1:4.5"
}

export interface HedgeEmGameState {
  tableId: number;
  gameId: string;
  gameState: GameState;
  bettingStage: BettingStage;
  numberOfHands: number;
  numberOfSeats: number;
  jackpotValue: number;
  hands: string[];          // e.g. ["AcKd", "QsJs", "8h7c", "5d2c"] — null before STATUS_HOLE
  flopCard1: string | null;
  flopCard2: string | null;
  flopCard3: string | null;
  turnCard: string | null;
  riverCard: string | null;
  seats: HedgeEmSeat[];
  bets: HedgeEmBet[];
  handOdds: HedgeEmHandOdds[];
}

export interface HedgeEmPlayer {
  playerId: string;         // UUID (Supabase auth.users.id)
  username: string;
  displayName: string;
  accountBalance: number;
  avatarImageUrl: string;
  role: UserRole;
  isActive: boolean;
  personalTableId: number | null;
}

// Request / response shapes for REST endpoints

export interface PlaceBetRequest {
  playerId: string;
  seatIndex: number;
  handIndex: number;        // 0-3
  betAmount: number;
}

export interface PlaceBetResponse {
  acknowledgement: 'ACK' | 'NACK';
  message: string;
  updatedSeatBalance: number;
}

export interface TopUpRequest {
  playerId: string;
  amount: number;
}

export interface TopUpResponse {
  acknowledgement: 'ACK' | 'NACK';
  newSeatBalance: number;
  newAccountBalance: number;
}

export interface SitRequest {
  playerId: string;
  buyInAmount: number;
}

export interface SitResponse {
  acknowledgement: 'ACK' | 'NACK';
  seatId: number;
  seatBalance: number;
}

export interface ApiError {
  error: string;
}
