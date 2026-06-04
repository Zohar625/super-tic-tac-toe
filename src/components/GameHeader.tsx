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
