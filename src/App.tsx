import { useReducer } from 'react';
import { gameReducer } from './state/gameReducer';
import { createInitialState } from './state/gameLogic';
import { ThemeProvider } from './theme/ThemeContext';
import GameHeader from './components/GameHeader';
import BigBoard from './components/BigBoard';
import GameStatus from './components/GameStatus';
import ActionBar from './components/ActionBar';
import styles from './App.module.css';

function App() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  const handleCellClick = (globalRow: number, globalCol: number) => {
    dispatch({ type: 'PLACE_MARK', globalRow, globalCol });
  };

  const handleUndo = () => dispatch({ type: 'UNDO' });
  const handleReset = () => dispatch({ type: 'RESET' });

  const canUndo = state.moveHistory.length > 0 && state.winner === null;

  return (
    <ThemeProvider>
      <div className={styles.app}>
        <GameHeader
          currentPlayer={state.currentPlayer}
          nextBoard={state.nextBoard}
          winner={state.winner}
        />
        <BigBoard state={state} onCellClick={handleCellClick} />
        <ActionBar
          onUndo={handleUndo}
          onReset={handleReset}
          canUndo={canUndo}
        />
        <GameStatus winner={state.winner} onReset={handleReset} />
      </div>
    </ThemeProvider>
  );
}

export default App;
