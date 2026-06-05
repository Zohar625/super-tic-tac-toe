import { useReducer, useCallback, useEffect, useRef } from 'react';
import { gameReducer } from '../state/gameReducer';
import type { GameState, MultiplayerSession } from '../state/types';
import { createInitialState, checkWin, getNextBoard, isDraw } from '../state/gameLogic';
import { supabase } from '../supabase/client';
import { updateGameState, getRoom } from './roomManager';

export function useMultiplayer(session: MultiplayerSession) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const localVersionRef = useRef(session.localVersion);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Fetch and apply server state
  const fetchServerState = useCallback(async () => {
    const room = await getRoom(session.roomId);
    if (!room) return;
    if (room.version > localVersionRef.current) {
      localVersionRef.current = room.version;
      dispatch({ type: 'SET_GAME_STATE', state: room.gameState });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.roomId]);

  // Write path: handle local cell click
  const handleCellClick = useCallback(
    (globalRow: number, globalCol: number) => {
      // Only allow clicks during own turn
      if (stateRef.current.currentPlayer !== sessionRef.current.player) return;
      if (stateRef.current.winner) return;

      // Compute new state
      const nextBoard = stateRef.current.board.map((row) => [...row]);
      nextBoard[globalRow][globalCol] = stateRef.current.currentPlayer;

      const winner = checkWin(nextBoard, globalRow, globalCol);
      const smallRow = globalRow % 3;
      const smallCol = globalCol % 3;
      const nextBoardTarget = getNextBoard(nextBoard, smallRow, smallCol);
      const nextPlayer = stateRef.current.currentPlayer === 'X' ? 'O' : 'X';

      const newState: GameState = {
        board: nextBoard,
        currentPlayer: nextPlayer,
        nextBoard: nextBoardTarget,
        winner: winner || (isDraw(nextBoard) ? 'draw' : null),
        moveHistory: [
          ...stateRef.current.moveHistory,
          {
            player: stateRef.current.currentPlayer,
            globalRow,
            globalCol,
          },
        ],
      };

      // Optimistic local update
      dispatch({ type: 'SET_GAME_STATE', state: newState });
      const attemptedVersion = localVersionRef.current + 1;
      localVersionRef.current = attemptedVersion;

      // Write to Supabase
      const ok = updateGameState(
        sessionRef.current.roomId,
        newState,
        attemptedVersion - 1
      );

      ok.then((success) => {
        if (!success) {
          // Rollback: fetch server state
          fetchServerState();
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.roomId]
  );

  // Read path: subscribe to Realtime
  useEffect(() => {
    // Initial fetch
    fetchServerState();

    const channel = supabase
      .channel(`room:${session.roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${session.roomId}`,
        },
        (payload) => {
          const remoteState = payload.new.game_state as unknown as GameState;
          const remoteVersion = payload.new.version as number;

          if (remoteVersion > localVersionRef.current) {
            localVersionRef.current = remoteVersion;
            dispatch({ type: 'SET_GAME_STATE', state: remoteState });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.roomId]);

  return {
    state,
    handleCellClick,
  };
}
