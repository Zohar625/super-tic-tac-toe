import Cell from './Cell';
import type { CellValue } from '../state/types';
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
