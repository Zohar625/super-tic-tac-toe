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
