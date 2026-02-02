import type { MessageSigner } from '@repo/web3';

/**
 * App session definition for Yellow Network
 */
export interface AppDefinition {
  /** Protocol identifier (e.g., 'reaction-v1') */
  protocol: string;
  /** Participants in the session [user, counterparty] */
  participants: [`0x${string}`, `0x${string}`];
  /** Voting weights for consensus */
  weights: [number, number];
  /** Quorum threshold for consensus */
  quorum: number;
  /** Challenge period in seconds (0 for PoC) */
  challenge: number;
  /** Unique nonce for the session */
  nonce: number;
}

/**
 * Allocation for a participant
 */
export interface Allocation {
  participant: `0x${string}`;
  asset: string;
  amount: string;
}

/**
 * Reaction session state
 */
export interface ReactionSession {
  /** Unique session ID from ClearNode */
  sessionId: string;
  /** Associated post/tweet ID */
  postId: string;
  /** Channel ID this session belongs to */
  channelId: `0x${string}`;
  /** Current user allocation */
  userAllocation: bigint;
  /** Current pool allocation */
  poolAllocation: bigint;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Number of reactions sent */
  reactionCount: number;
}

/**
 * Channel state for Yellow Network
 */
export interface ChannelState {
  /** Channel ID (from Custody contract) */
  channelId: `0x${string}`;
  /** User's address */
  userAddress: `0x${string}`;
  /** ReactionPool address */
  poolAddress: `0x${string}`;
  /** Total amount in channel */
  totalAmount: bigint;
  /** User's available balance (not in active sessions) */
  availableBalance: bigint;
  /** Active sessions for this channel */
  sessions: Map<string, ReactionSession>;
  /** Whether the channel is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * WebSocket message types from ClearNode
 */
export type ClearNodeMessageType =
  | 'create_app_session'
  | 'close_app_session'
  | 'app_session_created'
  | 'app_session_closed'
  | 'state_update'
  | 'error'
  | 'ping'
  | 'pong';

/**
 * ClearNode response message
 */
export interface ClearNodeResponse {
  type: ClearNodeMessageType;
  id?: string;
  app_session_id?: string;
  error?: string;
  data?: unknown;
}

/**
 * ClearNode connection state
 */
export interface ClearNodeConnection {
  /** WebSocket instance */
  ws: WebSocket | null;
  /** Connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Last error message */
  lastError?: string;
  /** Message signer for the connection */
  signer: MessageSigner | null;
}

/**
 * Create session parameters
 */
export interface CreateSessionParams {
  userAddress: `0x${string}`;
  poolAddress: `0x${string}`;
  channelId: `0x${string}`;
  postId: string;
  initialUserAmount: bigint;
}

/**
 * Session update result
 */
export interface SessionUpdateResult {
  session: ReactionSession;
  stateHash: `0x${string}`;
}

/**
 * Event types for the Yellow client
 */
export type YellowEventType =
  | 'connected'
  | 'disconnected'
  | 'session_created'
  | 'session_closed'
  | 'state_updated'
  | 'error';

/**
 * Event handler type
 */
export type YellowEventHandler<T = unknown> = (data: T) => void;
