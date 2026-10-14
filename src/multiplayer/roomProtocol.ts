import type { GameState, Player } from '../state/types';
import { createInitialState } from '../state/gameLogic';
import { gameReducer } from '../state/gameReducer';
export type RoomStatus = 'connecting' | 'waiting' | 'playing' | 'reconnecting' | 'left' | 'error';
export type RematchStatus = 'none' | 'waiting' | 'opponent-ready';
export interface RoomSnapshot { code: string; state: GameState; status: RoomStatus; player: Player; error: string; revision: number; rematch: RematchStatus; pending: boolean; }
export class RoomAuthority {
  state = createInitialState();
  revision = 0;
  guest: string | null = null;
  hostSide: Player = 'X';
  hostReady = false;
  guestReady = false;
  join(id: string): boolean { if (this.guest && this.guest !== id) return false; this.guest = id; return true; }
  move(id: string, revision: number, row: number, col: number): boolean {
    if (!this.guest || revision !== this.revision) return false;
    const player = id === 'host' ? this.hostSide : id === this.guest ? (this.hostSide === 'X' ? 'O' : 'X') : null;
    if (this.state.currentPlayer !== player) return false;
    const next = gameReducer(this.state, { type: 'PLACE_MARK', globalRow: row, globalCol: col });
    if (next === this.state) return false;
    this.state = next; this.revision++; return true;
  }
  rematch(id: string): boolean {
    if (!this.state.winner || !this.guest) return false;
    if (id === 'host') this.hostReady = true;
    else if (id === this.guest) this.guestReady = true;
    else return false;
    if (!this.hostReady || !this.guestReady) return false;
    this.state = createInitialState(); this.revision++;
    this.hostSide = this.hostSide === 'X' ? 'O' : 'X';
    this.hostReady = this.guestReady = false; return true;
  }
}

export function replayMoves(value: unknown): GameState | null {
  if (!Array.isArray(value) || value.length > 81) return null;
  let state = createInitialState();
  for (const move of value) {
    if (!move || typeof move !== 'object' || move.player !== state.currentPlayer) return null;
    const next = gameReducer(state, { type: 'PLACE_MARK', globalRow: move.globalRow, globalCol: move.globalCol });
    if (next === state) return null;
    state = next;
  }
  return state;
}
