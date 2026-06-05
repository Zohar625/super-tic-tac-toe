import { useEffect, useState } from 'react';
import type { MultiplayerSession } from '../state/types';
import { supabase } from '../supabase/client';
import { deleteRoom } from '../multiplayer/roomManager';

interface WaitingRoomProps {
  session: MultiplayerSession;
  onJoined: (version: number) => void;
  onLeave: () => void;
}

export default function WaitingRoom({ session, onJoined, onLeave }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Watch for guest joining via Realtime
    const channel = supabase
      .channel(`room-guest:${session.roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${session.roomId}`,
        },
        (payload) => {
          if (payload.new.guest_id) {
            const version = payload.new.version as number;
            onJoined(version);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.roomId, onJoined]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(session.roomCode);
      setCopied(true);
    } catch {
      // Fallback for non-HTTPS
      const input = document.createElement('input');
      input.value = session.roomCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
    }
  };

  const handleCancel = async () => {
    await deleteRoom(session.roomId);
    onLeave();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh', padding: 24, gap: 24,
    }}>
      <h2 style={{ fontSize: 22, margin: 0 }}>等待对手加入</h2>

      <div style={{
        background: '#f5f5f5', borderRadius: 16, padding: '32px 48px', textAlign: 'center',
      }}>
        <p style={{ color: '#888', margin: '0 0 8px', fontSize: 14 }}>房间码</p>
        <p style={{
          fontSize: 56, fontWeight: 700, letterSpacing: 16, margin: '0 0 16px',
          fontFamily: 'monospace',
        }}>
          {session.roomCode}
        </p>
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 20px', fontSize: 14, borderRadius: 6,
            border: '2px solid #4caf50', background: copied ? '#e8f5e9' : 'white',
            color: '#4caf50', cursor: 'pointer',
          }}
        >
          {copied ? '已复制' : '复制房间码'}
        </button>
      </div>

      <p style={{ color: '#999', fontSize: 14 }}>将房间码发给对手，对方输入后自动开始</p>

      <button
        onClick={handleCancel}
        style={{
          padding: '10px 24px', fontSize: 14, borderRadius: 6,
          border: '2px solid #e53935', background: 'white',
          color: '#e53935', cursor: 'pointer', marginTop: 16,
        }}
      >
        取消房间
      </button>
    </div>
  );
}
