import { supabase } from '../supabase/client';
import type { GameState } from '../state/types';
import { createInitialState } from '../state/gameLogic';

export async function generateUniqueCode(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { count } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('code', code);
    if (count === 0) return code;
  }
  throw new Error('Failed to generate unique room code');
}

export async function createRoom(userId: string) {
  const code = await generateUniqueCode();
  const initialState = createInitialState();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_id: userId,
      game_state: initialState,
      version: 0,
    })
    .select('id, code')
    .single();

  if (error) throw error;
  return data as { id: string; code: string };
}

export async function joinRoom(
  userId: string,
  code: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('rooms')
    .update({ guest_id: userId, updated_at: new Date().toISOString() })
    .eq('code', code)
    .is('guest_id', null)
    .neq('host_id', userId)
    .select('id')
    .single();

  if (error || !data) return null;
  return { id: data.id };
}

export async function getRoom(roomId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('game_state, version, host_id, guest_id')
    .eq('id', roomId)
    .single();

  if (error || !data) return null;
  return {
    gameState: data.game_state as unknown as GameState,
    version: data.version as number,
    hostId: data.host_id as string,
    guestId: data.guest_id as string | null,
  };
}

export async function updateGameState(
  roomId: string,
  gameState: GameState,
  expectedVersion: number
): Promise<boolean> {
  const newVersion = expectedVersion + 1;
  const { error, count } = await supabase
    .from('rooms')
    .update({
      game_state: gameState,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .eq('version', expectedVersion)
    .select('id', { count: 'exact', head: true });

  if (error) return false;
  return count === 1;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await supabase.from('rooms').delete().eq('id', roomId);
}
