import { useState } from 'react';
import { getUserId } from '../supabase/client';
import { createRoom, joinRoom } from '../multiplayer/roomManager';
import type { Player, MultiplayerSession } from '../state/types';

interface LobbyProps {
  onStart: (session: MultiplayerSession) => void;
  onBack: () => void;
}

export default function Lobby({ onStart, onBack }: LobbyProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [side, setSide] = useState<Player>('X');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const userId = getUserId();
      const room = await createRoom(userId, side);
      onStart({
        roomId: room.id,
        roomCode: room.code,
        player: side,
        isHost: true,
        localVersion: 0,
      });
    } catch {
      setError('创建房间失败，请重试');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (joinCode.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      const userId = getUserId();
      const room = await joinRoom(userId, joinCode, side);
      if (!room) {
        setError('房间不存在或已满');
        setLoading(false);
        return;
      }
      onStart({
        roomId: room.id,
        roomCode: joinCode,
        player: room.player,
        isHost: false,
        localVersion: 0,
      });
    } catch {
      setError('加入房间失败，请重试');
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh', padding: 24, gap: 24,
    }}>
      <h2 style={{ fontSize: 24, margin: 0 }}>联机对战</h2>

      <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '2px solid #4caf50' }}>
        <button
          onClick={() => { setTab('create'); setError(''); }}
          style={{
            padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: 16,
            background: tab === 'create' ? '#4caf50' : 'white',
            color: tab === 'create' ? 'white' : '#333',
          }}
        >
          创建房间
        </button>
        <button
          onClick={() => { setTab('join'); setError(''); }}
          style={{
            padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: 16,
            background: tab === 'join' ? '#4caf50' : 'white',
            color: tab === 'join' ? 'white' : '#333',
          }}
        >
          加入房间
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, color: '#666' }}>选择棋子:</span>
        <button
          onClick={() => setSide(side === 'X' ? 'O' : 'X')}
          style={{
            padding: '8px 20px',
            fontSize: 18,
            fontWeight: 700,
            borderRadius: 8,
            border: `2px solid ${side === 'X' ? '#2196f3' : '#ff9800'}`,
            background: side === 'X' ? '#e3f2fd' : '#fff3e0',
            color: side === 'X' ? '#1565c0' : '#e65100',
            cursor: 'pointer',
            minWidth: 100,
          }}
        >
          {side}（{side === 'X' ? '先手' : '后手'}）
        </button>
      </div>

      {tab === 'create' ? (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              padding: '14px 40px', fontSize: 18, borderRadius: 8,
              border: 'none', background: '#4caf50', color: 'white', cursor: 'pointer',
            }}
          >
            {loading ? '创建中...' : '创建房间'}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
            placeholder="输入4位房间码"
            style={{
              fontSize: 28, width: 160, textAlign: 'center', letterSpacing: 8,
              padding: '10px 16px', borderRadius: 8, border: '2px solid #ccc',
              display: 'block', margin: '0 auto 16px',
            }}
          />
          <button
            onClick={handleJoin}
            disabled={loading || joinCode.length !== 4}
            style={{
              padding: '14px 40px', fontSize: 18, borderRadius: 8,
              border: 'none', background: joinCode.length === 4 ? '#4caf50' : '#ccc',
              color: 'white', cursor: joinCode.length === 4 ? 'pointer' : 'default',
            }}
          >
            {loading ? '加入中...' : '加入房间'}
          </button>
        </div>
      )}

      {error && <p style={{ color: '#e53935', margin: 0 }}>{error}</p>}

      <button
        onClick={onBack}
        style={{
          padding: '8px 20px', fontSize: 14, borderRadius: 6,
          border: '2px solid #999', background: 'white', cursor: 'pointer', color: '#555',
        }}
      >
        返回本地模式
      </button>
    </div>
  );
}
