import type { Player } from '../state/types';
import { useTheme } from '../theme/ThemeContext';
import { getPieceSymbol } from '../theme/themes';

interface PlayerBadgeProps {
  myPlayer: Player;
  currentPlayer: Player;
}

export default function PlayerBadge({ myPlayer, currentPlayer }: PlayerBadgeProps) {
  const { theme } = useTheme();
  const symbol = getPieceSymbol(theme.pieceSet, myPlayer);
  const isMyTurn = myPlayer === currentPlayer;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: isMyTurn ? '#e8f5e9' : '#f5f5f5',
      border: `2px solid ${isMyTurn ? '#4caf50' : '#ccc'}`,
      fontSize: 14,
    }}>
      <span>你是 {symbol}</span>
      <span style={{ fontSize: 12, color: isMyTurn ? '#4caf50' : '#999' }}>
        {isMyTurn ? '你的回合' : '等待对手'}
      </span>
    </div>
  );
}
