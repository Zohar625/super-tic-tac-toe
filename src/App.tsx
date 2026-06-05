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
import { useMultiplayer } from './multiplayer/useMultiplayer';
import { deleteRoom } from './multiplayer/roomManager';
import type { GameMode, MultiplayerSession } from './state/types';
import styles from './App.module.css';

function LocalGame({ onStartMultiplayer }: { onStartMultiplayer: () => void }) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  const handleCellClick = (globalRow: number, globalCol: number) => {
    dispatch({ type: 'PLACE_MARK', globalRow, globalCol });
  };

  const handleUndo = () => dispatch({ type: 'UNDO' });
  const handleReset = () => dispatch({ type: 'RESET' });

  const canUndo = state.moveHistory.length > 0 && state.winner === null;

  return (
    <>
      <GameHeader
        currentPlayer={state.currentPlayer}
        nextBoard={state.nextBoard}
        winner={state.winner}
        moveCount={state.moveHistory.length}
      />
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
  const { state, handleCellClick } = useMultiplayer(session);

  const isMyTurn =
    state.currentPlayer === session.player && state.winner === null;

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
    setMode('waiting');
  };

  const handleJoined = (version: number) => {
    setSession((prev) =>
      prev ? { ...prev, localVersion: version } : null
    );
    setMode('playing');
  };

  const handleLeave = async () => {
    if (session) {
      await deleteRoom(session.roomId);
    }
    setSession(null);
    setMode('local');
  };

  return (
    <ThemeProvider>
      <div className={styles.app}>
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
    </ThemeProvider>
  );
}

export default App;
