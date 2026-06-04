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

  const symbol = value ? getPieceSymbol(theme.pieceSet, value) : '·';

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
