import { supabase } from '../supabase/client';
import type { GameState, Player } from '../state/types';
import { createInitialState } from '../state/gameLogic';

function resolveSides(hostPref: Player, guestPref: Player): { host: Player; guest: Player } {
  if (hostPref !== guestPref) {
    return { host: hostPref, guest: guestPref };
  }
  return Math.random() < 0.5
    ? { host: 'X', guest: 'O' }
    : { host: 'O', guest: 'X' };
}

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

async function cleanupStaleRooms(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('rooms').delete().lt('created_at', cutoff);
}

export async function createRoom(userId: string, preferredSide: Player) {
  await cleanupStaleRooms();
  const code = await generateUniqueCode();
  const initialState = createInitialState();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      code,
      host_id: userId,
      host_side: preferredSide,
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
  code: string,
  preferredSide: Player
): Promise<{ id: string; player: Player } | null> {
  // Atomic UPDATE: set guest_id and return host_side
  const { data, error } = await supabase
    .from('rooms')
    .update({ guest_id: userId, updated_at: new Date().toISOString() })
    .eq('code', code)
    .is('guest_id', null)
    .select('id, host_side')
    .single();

  if (error) {
    console.error('joinRoom failed:', error.code, error.message);
    return null;
  }

  const hostPref = (data.host_side as Player) || 'X';
  const { host, guest } = resolveSides(hostPref, preferredSide);

  // Fix host_side if reassigned (fires after join, poll catches final value)
  if (host !== hostPref) {
    await supabase
      .from('rooms')
      .update({ host_side: host })
      .eq('id', data.id);
  }

  return { id: data.id, player: guest };
}

export async function getRoom(roomId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('game_state, version, host_id, guest_id, host_side')
    .eq('id', roomId)
    .single();

  if (error || !data) return null;
  return {
    gameState: data.game_state as unknown as GameState,
    version: data.version as number,
    hostId: data.host_id as string,
    guestId: data.guest_id as string | null,
    hostSide: data.host_side as Player | null,
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
    .select('id', { count: 'exact' });

  if (error) return false;
  return count === 1;
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, guest_id')
    .eq('id', roomId)
    .single();

  if (!room) return;

  if (room.host_id === userId) {
    // Host leaves: delete room entirely
    await supabase.from('rooms').delete().eq('id', roomId);
  } else if (room.guest_id === userId) {
    // Guest leaves: clear guest_id, room returns to waiting
    await supabase
      .from('rooms')
      .update({ guest_id: null, updated_at: new Date().toISOString() })
      .eq('id', roomId);
  }
}

export async function cancelRoom(roomId: string): Promise<void> {
  await supabase.from('rooms').delete().eq('id', roomId);
}
