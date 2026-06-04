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
