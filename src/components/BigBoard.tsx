import SmallBoard from './SmallBoard';
import type { GameState } from '../state/types';
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
