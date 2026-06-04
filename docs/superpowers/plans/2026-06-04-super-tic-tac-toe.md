# 超级井字棋 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Super Tic-Tac-Toe game with React + TypeScript + Vite, deployable to GitHub Pages.

**Architecture:** Pure game logic functions in `state/gameLogic.ts` with no React dependency. Global state managed via `useReducer` in `App.tsx`. UI split into focused components (BigBoard → SmallBoard → Cell). Theme system via React Context with config-driven skin switching.

**Tech Stack:** React 18, TypeScript, Vite, CSS Modules, gh-pages

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `src/main.tsx`, `src/vite-env.d.ts`
- Create: `public/favicon.svg`

- [ ] **Step 1: Initialize Vite React TypeScript project**

Run:
```bash
cd "d:/SystemDir/超级井字棋"
npm create vite@latest . -- --template react-ts
```

Expected: Scaffold files generated. Answer "yes" to overwriting existing files.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
```

Expected: node_modules created, no errors.

- [ ] **Step 3: Verify dev server starts**

Run:
```bash
npx vite --host
```

Expected: Dev server starts on localhost. Kill it after confirming.

- [ ] **Step 4: Clean up Vite boilerplate**

Remove Vite's default `src/App.css`, remove demo content from `src/App.tsx` and `src/index.css`. Clear `src/App.tsx` to a minimal shell:

```tsx
// src/App.tsx
function App() {
  return <div>Super Tic-Tac-Toe</div>;
}

export default App;
```

Clear `src/index.css` to empty.

- [ ] **Step 5: Add gh-pages deploy config to vite.config.ts**

Modify `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/super-tic-tac-toe/',
});
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

### Task 2: Types and Game Logic

**Files:**
- Create: `src/state/types.ts`
- Create: `src/state/gameLogic.ts`

- [ ] **Step 1: Write types**

Create `src/state/types.ts`:

```typescript
export type Player = 'X' | 'O';

export type CellValue = Player | null;

// Board is 9x9 represented as 2D array
export type Board = CellValue[][];

export interface Move {
  player: Player;
  globalRow: number;
  globalCol: number;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  nextBoard: { row: number; col: number } | null;
  winner: Player | 'draw' | null;
  moveHistory: Move[];
}

export interface ThemeConfig {
  boardSkin: 'classic' | 'grass';
  pieceSet: 'X-O' | 'cat-dog' | 'sun-moon';
}

export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}
```

- [ ] **Step 2: Write gameLogic.ts — checkWin**

Create `src/state/gameLogic.ts`:

```typescript
import { Board, CellValue, GameState } from './types';

// Directions to check: horizontal, vertical, two diagonals
const DIRECTIONS = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal down-right
  [1, -1], // diagonal down-left
];

/**
 * Check if the last move created a winning 3-in-a-row.
 * Scans all 4 directions. Returns the winning player, or null.
 */
export function checkWin(
  board: Board,
  lastRow: number,
  lastCol: number
): CellValue {
  const player = board[lastRow][lastCol];
  if (!player) return null;

  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;

    // Scan forward
    for (let i = 1; i < 3; i++) {
      const r = lastRow + dr * i;
      const c = lastCol + dc * i;
      if (r >= 0 && r < 9 && c >= 0 && c < 9 && board[r][c] === player) {
        count++;
      } else break;
    }

    // Scan backward
    for (let i = 1; i < 3; i++) {
      const r = lastRow - dr * i;
      const c = lastCol - dc * i;
      if (r >= 0 && r < 9 && c >= 0 && c < 9 && board[r][c] === player) {
        count++;
      } else break;
    }

    if (count >= 3) return player;
  }

  return null;
}
```

- [ ] **Step 3: Write gameLogic.ts — isSmallBoardFull**

Append to `src/state/gameLogic.ts`:

```typescript
export function isSmallBoardFull(
  board: Board,
  bigRow: number,
  bigCol: number
): boolean {
  const startRow = bigRow * 3;
  const startCol = bigCol * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}
```

- [ ] **Step 4: Write gameLogic.ts — isValidMove**

Append to `src/state/gameLogic.ts`:

```typescript
export function isValidMove(
  state: GameState,
  globalRow: number,
  globalCol: number
): boolean {
  if (
    globalRow < 0 || globalRow > 8 ||
    globalCol < 0 || globalCol > 8
  ) return false;

  // Cell must be empty
  if (state.board[globalRow][globalCol] !== null) return false;

  // Game must not be over
  if (state.winner) return false;

  // If nextBoard specified, move must be in that small board
  if (state.nextBoard) {
    const targetBigRow = Math.floor(globalRow / 3);
    const targetBigCol = Math.floor(globalCol / 3);
    return (
      targetBigRow === state.nextBoard.row &&
      targetBigCol === state.nextBoard.col
    );
  }

  // nextBoard is null: can play anywhere
  return true;
}
```

- [ ] **Step 5: Write gameLogic.ts — getNextBoard**

Append to `src/state/gameLogic.ts`:

```typescript
export function getNextBoard(
  board: Board,
  smallRow: number,
  smallCol: number
): { row: number; col: number } | null {
  if (isSmallBoardFull(board, smallRow, smallCol)) {
    return null; // full → free choice
  }
  return { row: smallRow, col: smallCol };
}
```

- [ ] **Step 6: Write gameLogic.ts — createInitialState**

Append to `src/state/gameLogic.ts`:

```typescript
import { createEmptyBoard } from './types';

export function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'X',
    nextBoard: { row: 1, col: 1 }, // first move must be in center board
    winner: null,
    moveHistory: [],
  };
}

export function isDraw(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}
```

- [ ] **Step 7: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/state/types.ts src/state/gameLogic.ts
git commit -m "feat: add game types and core logic (checkWin, isValidMove, etc.)"
```

---

### Task 3: Game Reducer

**Files:**
- Create: `src/state/gameReducer.ts`

- [ ] **Step 1: Write the reducer**

Create `src/state/gameReducer.ts`:

```typescript
import { GameState, Move } from './types';
import {
  checkWin,
  createInitialState,
  getNextBoard,
  isDraw,
  isValidMove,
} from './gameLogic';

export type GameAction =
  | {
      type: 'PLACE_MARK';
      globalRow: number;
      globalCol: number;
    }
  | { type: 'UNDO' }
  | { type: 'RESET' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_MARK': {
      const { globalRow, globalCol } = action;

      if (!isValidMove(state, globalRow, globalCol)) return state;

      const newBoard = state.board.map((row) => [...row]);
      newBoard[globalRow][globalCol] = state.currentPlayer;

      const move: Move = {
        player: state.currentPlayer,
        globalRow,
        globalCol,
      };

      const winner = checkWin(newBoard, globalRow, globalCol);

      // smallRow/col are the position within the 3x3 small board
      const smallRow = globalRow % 3;
      const smallCol = globalCol % 3;
      const nextBoard = getNextBoard(newBoard, smallRow, smallCol);

      const nextPlayer = state.currentPlayer === 'X' ? 'O' : 'X';

      return {
        board: newBoard,
        currentPlayer: nextPlayer,
        nextBoard,
        winner: winner || (isDraw(newBoard) ? 'draw' : null),
        moveHistory: [...state.moveHistory, move],
      };
    }

    case 'UNDO': {
      if (state.moveHistory.length === 0) return state;

      const newHistory = state.moveHistory.slice(0, -1);
      const lastMove = state.moveHistory[state.moveHistory.length - 1];

      const newBoard = state.board.map((row) => [...row]);
      newBoard[lastMove.globalRow][lastMove.globalCol] = null;

      // Recalculate nextBoard from the move before last
      let nextBoard: { row: number; col: number } | null = { row: 1, col: 1 };
      if (newHistory.length) {
        const prev = newHistory[newHistory.length - 1];
        const sr = prev.globalRow % 3;
        const sc = prev.globalCol % 3;
        nextBoard = getNextBoard(newBoard, sr, sc);
      }

      return {
        board: newBoard,
        currentPlayer: lastMove.player,
        nextBoard,
        winner: null,
        moveHistory: newHistory,
      };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/state/gameReducer.ts
git commit -m "feat: add game reducer with PLACE_MARK, UNDO, RESET actions"
```

---

### Task 4: Theme System

**Files:**
- Create: `src/theme/themes.ts`
- Create: `src/theme/ThemeContext.tsx`

- [ ] **Step 1: Write theme configs**

Create `src/theme/themes.ts`:

```typescript
import { ThemeConfig } from '../state/types';

export const classicTheme: ThemeConfig = {
  boardSkin: 'classic',
  pieceSet: 'X-O',
};

export const grassTheme: ThemeConfig = {
  boardSkin: 'grass',
  pieceSet: 'cat-dog',
};

export const pieceSymbols: Record<string, Record<string, string>> = {
  'X-O': { X: '✖', O: '◯' },
  'cat-dog': { X: '🐱', O: '🐶' },
  'sun-moon': { X: '☀️', O: '🌙' },
};

export function getPieceSymbol(pieceSet: string, player: string): string {
  return pieceSymbols[pieceSet]?.[player] ?? player;
}
```

- [ ] **Step 2: Write ThemeContext**

Create `src/theme/ThemeContext.tsx`:

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeConfig } from '../state/types';
import { classicTheme } from './themes';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: classicTheme,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(classicTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/theme/
git commit -m "feat: add theme system with classic and grass skins"
```

---

### Task 5: Cell Component

**Files:**
- Create: `src/components/Cell.tsx`
- Create: `src/styles/Cell.module.css`

- [ ] **Step 1: Write CSS Module**

Create `src/styles/Cell.module.css`:

```css
.cell {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid #999;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: clamp(16px, 4vw, 32px);
  transition: background 0.15s;
  user-select: none;
  -webkit-user-select: none;
  padding: 0;
  line-height: 1;
}

.cell:hover {
  background: #e3f2fd;
}

.empty {
  color: transparent;
}

.xMark {
  color: #e53935;
  font-weight: bold;
}

.oMark {
  color: #1e88e5;
  font-weight: bold;
}
```

- [ ] **Step 2: Write Cell component**

Create `src/components/Cell.tsx`:

```typescript
import { useTheme } from '../theme/ThemeContext';
import { getPieceSymbol } from '../theme/themes';
import styles from '../styles/Cell.module.css';

interface CellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  disabled: boolean;
}

export default function Cell({ value, onClick, disabled }: CellProps) {
  const { theme } = useTheme();

  const handleClick = () => {
    if (!disabled && value === null) onClick();
  };

  const markClass =
    value === 'X' ? styles.xMark : value === 'O' ? styles.oMark : styles.empty;

  const symbol = value ? getPieceSymbol(theme.pieceSet, value) : '';

  return (
    <button
      className={`${styles.cell} ${markClass}`}
      onClick={handleClick}
      disabled={disabled && value === null}
      aria-label={value ? `${value}` : 'empty cell'}
    >
      {symbol}
    </button>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Cell.tsx src/styles/Cell.module.css
git commit -m "feat: add Cell component with theme-aware piece rendering"
```

---

### Task 6: SmallBoard Component

**Files:**
- Create: `src/components/SmallBoard.tsx`
- Create: `src/styles/SmallBoard.module.css`

- [ ] **Step 1: Write CSS Module**

Create `src/styles/SmallBoard.module.css`:

```css
.smallBoard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 2px;
  border-radius: 4px;
  transition: opacity 0.2s, box-shadow 0.2s;
}

.active {
  box-shadow: 0 0 0 3px #4caf50;
  opacity: 1;
}

.inactive {
  opacity: 0.4;
  pointer-events: none;
}

.classic {
  background: #f5f0e1;
  border: 2px solid #555;
}

.grass {
  background: #7ec850;
  border: 2px solid #4a7c2e;
}
```

- [ ] **Step 2: Write SmallBoard component**

Create `src/components/SmallBoard.tsx`:

```typescript
import Cell from './Cell';
import { CellValue } from '../state/types';
import { useTheme } from '../theme/ThemeContext';
import styles from '../styles/SmallBoard.module.css';

interface SmallBoardProps {
  bigRow: number;
  bigCol: number;
  // 3x3 slice of the global board
  cells: CellValue[][];
  isActive: boolean;
  onCellClick: (smallRow: number, smallCol: number) => void;
}

export default function SmallBoard({
  bigRow,
  bigCol,
  cells,
  isActive,
  onCellClick,
}: SmallBoardProps) {
  const { theme } = useTheme();

  const skinClass = styles[theme.boardSkin] || styles.classic;
  const activeClass = isActive ? styles.active : styles.inactive;

  return (
    <div className={`${styles.smallBoard} ${activeClass} ${skinClass}`}>
      {cells.map((row, r) =>
        row.map((value, c) => (
          <Cell
            key={`${bigRow}-${bigCol}-${r}-${c}`}
            value={value}
            onClick={() => onCellClick(r, c)}
            disabled={!isActive}
          />
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SmallBoard.tsx src/styles/SmallBoard.module.css
git commit -m "feat: add SmallBoard component with active/inactive states"
```

---

### Task 7: BigBoard Component

**Files:**
- Create: `src/components/BigBoard.tsx`
- Create: `src/styles/BigBoard.module.css`

- [ ] **Step 1: Write CSS Module**

Create `src/styles/BigBoard.module.css`:

```css
.bigBoard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
  max-width: min(90vw, 90vh - 140px);
  margin: 0 auto;
  aspect-ratio: 1;
}
```

- [ ] **Step 2: Write BigBoard component**

Create `src/components/BigBoard.tsx`:

```typescript
import SmallBoard from './SmallBoard';
import { Board, GameState } from '../state/types';
import styles from '../styles/BigBoard.module.css';

interface BigBoardProps {
  state: GameState;
  onCellClick: (globalRow: number, globalCol: number) => void;
}

export default function BigBoard({ state, onCellClick }: BigBoardProps) {
  const { board, nextBoard, winner } = state;

  const handleCellClick = (
    bigRow: number,
    bigCol: number,
    smallRow: number,
    smallCol: number
  ) => {
    const globalRow = bigRow * 3 + smallRow;
    const globalCol = bigCol * 3 + smallCol;
    onCellClick(globalRow, globalCol);
  };

  const isSmallBoardActive = (bigRow: number, bigCol: number): boolean => {
    if (winner) return false;
    if (!nextBoard) return true; // null = free choice everywhere
    return nextBoard.row === bigRow && nextBoard.col === bigCol;
  };

  return (
    <div className={styles.bigBoard}>
      {Array.from({ length: 3 }, (_, bigRow) =>
        Array.from({ length: 3 }, (_, bigCol) => {
          const startRow = bigRow * 3;
          const startCol = bigCol * 3;
          const cells = board
            .slice(startRow, startRow + 3)
            .map((row) => row.slice(startCol, startCol + 3));

          return (
            <SmallBoard
              key={`${bigRow}-${bigCol}`}
              bigRow={bigRow}
              bigCol={bigCol}
              cells={cells}
              isActive={isSmallBoardActive(bigRow, bigCol)}
              onCellClick={(sr, sc) =>
                handleCellClick(bigRow, bigCol, sr, sc)
              }
            />
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/BigBoard.tsx src/styles/BigBoard.module.css
git commit -m "feat: add BigBoard component composing 9 SmallBoards"
```

---

### Task 8: GameHeader Component

**Files:**
- Create: `src/components/GameHeader.tsx`
- Create: `src/styles/GameHeader.module.css`

- [ ] **Step 1: Write CSS Module**

Create `src/styles/GameHeader.module.css`:

```css
.header {
  text-align: center;
  padding: 12px 16px;
  max-width: min(90vw, 600px);
  margin: 0 auto;
}

.title {
  font-size: clamp(20px, 5vw, 32px);
  margin: 0 0 4px;
  font-weight: 700;
}

.turn {
  font-size: clamp(14px, 3vw, 20px);
  color: #555;
  margin: 0;
}

.hint {
  font-size: clamp(12px, 2.5vw, 16px);
  color: #888;
  margin: 2px 0 0;
}
```

- [ ] **Step 2: Write GameHeader component**

Create `src/components/GameHeader.tsx`:

```typescript
import { Player } from '../state/types';
import { useTheme } from '../theme/ThemeContext';
import { getPieceSymbol } from '../theme/themes';
import styles from '../styles/GameHeader.module.css';

interface GameHeaderProps {
  currentPlayer: Player;
  nextBoard: { row: number; col: number } | null;
  winner: Player | 'draw' | null;
}

export default function GameHeader({
  currentPlayer,
  nextBoard,
  winner,
}: GameHeaderProps) {
  const { theme } = useTheme();
  const symbol = getPieceSymbol(theme.pieceSet, currentPlayer);

  let statusText: string;
  if (winner === 'draw') {
    statusText = '平局！';
  } else if (winner) {
    const winSymbol = getPieceSymbol(theme.pieceSet, winner);
    statusText = `${winSymbol} 获胜！`;
  } else {
    statusText = `轮到: ${symbol}`;
  }

  let hintText = '';
  if (!winner && nextBoard) {
    hintText = `请下在棋盘 (${nextBoard.row + 1}, ${nextBoard.col + 1})`;
  } else if (!winner && !nextBoard) {
    hintText = '可在任意棋盘落子';
  }

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>超级井字棋</h1>
      <p className={styles.turn}>{statusText}</p>
      {hintText && <p className={styles.hint}>{hintText}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/GameHeader.tsx src/styles/GameHeader.module.css
git commit -m "feat: add GameHeader with turn indicator and board hint"
```

---

### Task 9: GameStatus Modal

**Files:**
- Create: `src/components/GameStatus.tsx`

- [ ] **Step 1: Write GameStatus component**

Create `src/components/GameStatus.tsx`:

```typescript
import { Player } from '../state/types';
import { useTheme } from '../theme/ThemeContext';
import { getPieceSymbol } from '../theme/themes';

interface GameStatusProps {
  winner: Player | 'draw' | null;
  onReset: () => void;
}

export default function GameStatus({ winner, onReset }: GameStatusProps) {
  const { theme } = useTheme();

  if (!winner) return null;

  let message: string;
  if (winner === 'draw') {
    message = '平局！双方实力相当 🎉';
  } else {
    const symbol = getPieceSymbol(theme.pieceSet, winner);
    message = `${symbol} 获胜！`;
  }

  return (
    <div
      onClick={onReset}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        cursor: 'pointer',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: '90vw',
        }}
      >
        <h2 style={{ fontSize: 28, margin: '0 0 8px' }}>{message}</h2>
        <p style={{ color: '#888', margin: '0 0 24px' }}>点击任意位置重新开始</p>
        <button
          onClick={onReset}
          style={{
            padding: '12px 32px',
            fontSize: 18,
            borderRadius: 8,
            border: 'none',
            background: '#4caf50',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          再来一局
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/GameStatus.tsx
git commit -m "feat: add GameStatus win/draw modal"
```

---

### Task 10: ActionBar Component

**Files:**
- Create: `src/components/ActionBar.tsx`
- Create: `src/styles/ActionBar.module.css`

- [ ] **Step 1: Write CSS Module**

Create `src/styles/ActionBar.module.css`:

```css
.bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
}

.btn {
  padding: 8px 24px;
  font-size: clamp(13px, 2.5vw, 16px);
  border: 2px solid #555;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:hover {
  background: #f0f0f0;
}

.btn:disabled {
  opacity: 0.4;
  cursor: default;
}
```

- [ ] **Step 2: Write ActionBar component**

Create `src/components/ActionBar.tsx`:

```typescript
import styles from '../styles/ActionBar.module.css';

interface ActionBarProps {
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
}

export default function ActionBar({
  onUndo,
  onReset,
  canUndo,
}: ActionBarProps) {
  return (
    <div className={styles.bar}>
      <button
        className={styles.btn}
        onClick={onReset}
      >
        重新开始
      </button>
      <button
        className={styles.btn}
        onClick={onUndo}
        disabled={!canUndo}
      >
        悔棋
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ActionBar.tsx src/styles/ActionBar.module.css
git commit -m "feat: add ActionBar with reset and undo buttons"
```

---

### Task 11: Assemble App and Global Styles

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.module.css`
- Modify: `src/index.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write global styles**

Replace `src/index.css`:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f9f9f9;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 2: Write App styles**

Create `src/App.module.css`:

```css
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  min-height: 100dvh;
  padding: 8px;
}
```

- [ ] **Step 3: Write App component**

Replace `src/App.tsx`:

```tsx
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
```

- [ ] **Step 4: Update main.tsx**

Replace `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Verify build**

Run:
```bash
npx tsc --noEmit
npx vite build
```

Expected: No errors, `dist/` directory produced.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.module.css src/index.css src/main.tsx
git commit -m "feat: assemble App with all components and game state"
```

---

### Task 12: Deployment Setup

**Files:**
- Modify: `package.json` (add deploy script)

- [ ] **Step 1: Install gh-pages**

Run:
```bash
npm install --save-dev gh-pages
```

- [ ] **Step 2: Add deploy script to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "deploy": "vite build && gh-pages -d dist"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add gh-pages deploy script"
```

---

### Task 13: Playtest and Polish

- [ ] **Step 1: Start dev server and playtest**

Run:
```bash
npx vite --host
```

Play through these scenarios:
1. First move restricted to center board (1,1)
2. Move restriction working (playing in cell position sends opponent to that board)
3. Full board free choice (force a board to fill, verify null nextBoard works)
4. Cross-board win detection (horizontal, vertical, diagonals)
5. Draw detection (accept a full board)
6. Undo restores previous state correctly
7. Reset works from any state
8. GameStatus modal appears on win/draw
9. Responsive on narrow viewport (mobile)

- [ ] **Step 2: Fix any issues found**

Fix any bugs discovered during playtesting. Commit after each fix.

- [ ] **Step 3: Final build check**

Run:
```bash
npx tsc --noEmit
npx vite build --mode production
```

Expected: Clean build.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final polish and fixes from playtesting"
```
