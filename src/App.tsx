import { useState, useReducer } from 'react';
import { gameReducer } from './state/gameReducer';
import { createInitialState } from './state/gameLogic';
import { ThemeProvider } from './theme/ThemeContext';
import GameHeader from './components/GameHeader';
import BigBoard from './components/BigBoard';
import GameStatus from './components/GameStatus';
import ActionBar from './components/ActionBar';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import { getUserId } from './supabase/client';
import { useMultiplayer } from './multiplayer/useMultiplayer';
import { leaveRoom, cancelRoom } from './multiplayer/roomManager';
import type { Player, GameMode, MultiplayerSession } from './state/types';
import styles from './App.module.css';

function LocalGame({ onStartMultiplayer }: { onStartMultiplayer: () => void }) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [player1Side, setPlayer1Side] = useState<Player | null>(null);

  if (player1Side === null) {
    return (
      <div style={{ textAlign: 'center', marginTop: '15vh' }}>
        <h2 style={{ fontSize: 22, marginBottom: 24 }}>玩家1，选择你的棋子</h2>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button
            onClick={() => setPlayer1Side('X')}
            style={{
              padding: '16px 36px',
              fontSize: 22,
              fontWeight: 700,
              borderRadius: 12,
              border: '2px solid #2196f3',
              background: '#e3f2fd',
              color: '#1565c0',
              cursor: 'pointer',
            }}
          >
            X（先手）
          </button>
          <button
            onClick={() => setPlayer1Side('O')}
            style={{
              padding: '16px 36px',
              fontSize: 22,
              fontWeight: 700,
              borderRadius: 12,
              border: '2px solid #ff9800',
              background: '#fff3e0',
              color: '#e65100',
              cursor: 'pointer',
            }}
          >
            O（后手）
          </button>
        </div>
        <p style={{ color: '#999', marginTop: 12, fontSize: 14 }}>
          玩家1选择后，玩家2自动为另一方
        </p>
        <button
          onClick={onStartMultiplayer}
          style={{
            marginTop: 32,
            padding: '10px 28px',
            fontSize: 15,
            borderRadius: 8,
            border: '2px solid #4caf50',
            background: 'white',
            color: '#4caf50',
            cursor: 'pointer',
          }}
        >
          联机对战
        </button>
      </div>
    );
  }

  const player2Side = player1Side === 'X' ? 'O' : 'X';

  const handleCellClick = (globalRow: number, globalCol: number) => {
    dispatch({ type: 'PLACE_MARK', globalRow, globalCol });
  };

  const handleUndo = () => dispatch({ type: 'UNDO' });
  const handleReset = () => {
    dispatch({ type: 'RESET' });
    setPlayer1Side(null);
  };

  const canUndo = state.moveHistory.length > 0 && state.winner === null;

  return (
    <>
      <GameHeader
        currentPlayer={state.currentPlayer}
        nextBoard={state.nextBoard}
        winner={state.winner}
        moveCount={state.moveHistory.length}
      />
      <p style={{ fontSize: 13, color: '#999', margin: '4px 0 0' }}>
        玩家1: {player1Side} | 玩家2: {player2Side}
      </p>
      <BigBoard state={state} onCellClick={handleCellClick} />
      <ActionBar onUndo={handleUndo} onReset={handleReset} canUndo={canUndo} />
      <button
        onClick={onStartMultiplayer}
        style={{
          marginTop: 12,
          padding: '10px 28px',
          fontSize: 15,
          borderRadius: 8,
          border: '2px solid #4caf50',
          background: 'white',
          color: '#4caf50',
          cursor: 'pointer',
        }}
      >
        联机对战
      </button>
      <GameStatus winner={state.winner} onReset={handleReset} />
    </>
  );
}

function MultiplayerGame({
  session,
  onLeave,
}: {
  session: MultiplayerSession;
  onLeave: () => void;
}) {
  const { state, handleCellClick, opponentLeft } = useMultiplayer(session);

  const isMyTurn =
    !opponentLeft &&
    state.currentPlayer === session.player &&
    state.winner === null;

  return (
    <>
      <GameHeader
        currentPlayer={state.currentPlayer}
        nextBoard={state.nextBoard}
        winner={state.winner}
        moveCount={state.moveHistory.length}
        roomCode={session.roomCode}
        myPlayer={session.player}
      />
      {opponentLeft && (
        <p style={{ color: '#e53935', fontWeight: 600, margin: '8px 0' }}>
          对手已离开房间
        </p>
      )}
      <BigBoard
        state={state}
        onCellClick={handleCellClick}
        isMyTurn={isMyTurn}
      />
      <ActionBar
        multiplayer
        onLeave={onLeave}
        canUndo={false}
        onUndo={() => {}}
        onReset={() => {}}
      />
    </>
  );
}

function App() {
  const [mode, setMode] = useState<GameMode>('local');
  const [session, setSession] = useState<MultiplayerSession | null>(null);

  const handleStartWaiting = (s: MultiplayerSession) => {
    setSession(s);
    setMode(s.isHost ? 'waiting' : 'playing');
  };

  const handleJoined = (hostPlayer: Player) => {
    setSession((prev) =>
      prev ? { ...prev, player: hostPlayer } : null
    );
    setMode('playing');
  };

  const handleLeave = async () => {
    if (session) {
      await leaveRoom(session.roomId, getUserId());
    }
    setSession(null);
    setMode('lobby');
  };

  return (
    <ThemeProvider>
      <div className={styles.app}>
        <div className={styles.content}>
          {mode === 'local' && (
            <LocalGame onStartMultiplayer={() => setMode('lobby')} />
          )}
          {mode === 'lobby' && (
            <Lobby onStart={handleStartWaiting} onBack={() => setMode('local')} />
          )}
          {mode === 'waiting' && session && (
            <WaitingRoom
              session={session}
              onJoined={handleJoined}
              onLeave={handleLeave}
            />
          )}
          {mode === 'playing' && session && (
            <MultiplayerGame session={session} onLeave={handleLeave} />
          )}
        </div>
        <a
          href="https://github.com/Zohar625/super-tic-tac-toe"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footer}
        >
          ⭐ 觉得好玩？去 GitHub 点个 Star 吧
        </a>
      </div>
    </ThemeProvider>
  );
}

export default App;
