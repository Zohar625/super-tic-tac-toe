import styles from '../styles/ActionBar.module.css';

interface ActionBarProps {
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  multiplayer?: boolean;
  onLeave?: () => void;
}

export default function ActionBar({
  onUndo,
  onReset,
  canUndo,
  multiplayer,
  onLeave,
}: ActionBarProps) {
  if (multiplayer) {
    return (
      <div className={styles.bar}>
        {onLeave && (
          <button className={styles.btn} onClick={onLeave}>
            离开房间
          </button>
        )}
      </div>
    );
  }

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
