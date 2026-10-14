import { useState } from 'react';
import Icon from './Icon';
import type { RoomController } from '../multiplayer/RoomController';
import styles from '../App.module.css';
interface Props { onStart: (code: string, host: boolean) => void; onBack: () => void; controller: RoomController | null; }
export default function Lobby({ onStart, onBack }: Props) {
  const [code, setCode] = useState('');
  return <div className={styles.lobby}>
    <span className={styles.eyebrow}>和朋友下一局</span><h2>另一端，也有一片草地。</h2>
    <p>创建一个房间，把六位房间码告诉朋友。<br/>无需注册，加入后就能开始。</p>
    <div className={styles.lobbyOptions}>
      <div className={styles.lobbyOption}><Icon name="sun" size={30}/><h3>我来开房间</h3><p>你执 X 先手，朋友执 O 后手。</p><button className={styles.primary} onClick={() => onStart(String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000), true)}>创建房间 <Icon name="arrow"/></button></div>
      <div className={styles.lobbyOption}><Icon name="link" size={30}/><h3>加入朋友的房间</h3><label htmlFor="room-code">六位房间码</label><input id="room-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="off" placeholder="例如 628415" maxLength={6}/><button className={styles.secondary} disabled={code.length !== 6} onClick={() => onStart(code, false)}>加入房间 <Icon name="arrow"/></button></div>
    </div>
    <p className={styles.smallNote}>免费中转服务偶尔可能不可用。房主需保持页面打开，刷新会结束房间。</p>
    <button className={styles.textButton} onClick={onBack}>返回本地对局</button>
  </div>;
}
