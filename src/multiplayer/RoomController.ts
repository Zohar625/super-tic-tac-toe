import { MqttTransport, type RoomTransport } from './mqtt';
import { RoomAuthority, replayMoves, type RoomSnapshot } from './roomProtocol';

interface Message {
  kind: 'probe' | 'join' | 'snapshot' | 'move' | 'rematch' | 'leave' | 'ping' | 'full' | 'reject';
  sender: string; room?: string; target?: string; revision?: number;
  row?: number; col?: number; moves?: unknown; guest?: string | null;
  hostSide?: 'X' | 'O'; hostReady?: boolean; guestReady?: boolean;
}

export class RoomController {
  readonly code: string;
  readonly isHost: boolean;
  readonly id = crypto.randomUUID();
  private room = '';
  private authority = new RoomAuthority();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private occupied = false;
  private lastPeer = Date.now();
  private began = Date.now();
  private pendingSince = 0;
  private hostId = '';
  private transport: RoomTransport;
  private snapshot: RoomSnapshot;
  constructor(code: string, isHost: boolean, transport?: RoomTransport) {
    this.code = code; this.isHost = isHost;
    this.transport = transport ?? new MqttTransport(code);
    this.snapshot = { code, state: this.authority.state, status: 'connecting', player: isHost ? 'X' : 'O', error: '', revision: 0, rematch: 'none', pending: false };
    this.transport.onMessage = value => this.receive(value);
    this.transport.onOffline = () => {
      if (this.stopped) return;
      this.update({ status: 'reconnecting', error: '网络中断，正在重新连接…', pending: false });
      this.retry = setTimeout(() => void this.reconnect(), 2000);
    };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(partial: Partial<RoomSnapshot>) { this.snapshot = { ...this.snapshot, ...partial }; this.listeners.forEach(listener => listener()); }
  private send(message: Omit<Message, 'sender'>) {
    try { this.transport.send({ ...message, sender: this.id }); } catch { this.update({ status: 'reconnecting', error: '连接中断，棋步未提交。', pending: false }); }
  }
  async start() {
    try {
      await this.transport.connect();
      if (this.stopped) return;
      this.began = Date.now();
      if (this.isHost) {
        this.send({ kind: 'probe' });
        await new Promise(resolve => setTimeout(resolve, 1200));
        if (this.stopped) return;
        if (this.occupied) { this.update({ status: 'error', error: '这个房间码已有人使用，请换一个。' }); this.transport.close(); return; }
        this.room = crypto.randomUUID();
        this.update({ status: 'waiting' });
        this.broadcast();
      } else this.send({ kind: 'join' });
      if (!this.stopped) this.timer = setInterval(() => this.tick(), 3000);
    } catch (error) { if (!this.stopped) this.update({ status: 'error', error: error instanceof Error ? error.message : '连接失败，请重试。' }); }
  }
  private async reconnect() {
    if (this.stopped) return;
    try {
      await this.transport.connect();
      if (this.stopped) return;
      this.lastPeer = Date.now();
      if (this.isHost) { this.update({ status: this.authority.guest ? 'reconnecting' : 'waiting', error: '' }); this.broadcast(); }
      else this.send({ kind: 'join', room: this.room });
    } catch { if (!this.stopped) this.retry = setTimeout(() => void this.reconnect(), 4000); }
  }
  private tick() {
    if (this.stopped || this.snapshot.status === 'left' || this.snapshot.status === 'error') return;
    if (this.isHost) this.broadcast();
    else this.send({ kind: this.room ? 'ping' : 'join', room: this.room });
    const elapsed = Date.now() - this.lastPeer;
    if (!this.room && Date.now() - this.began > 12000) { this.update({ status: 'error', error: '没有收到房主响应。请核对六位房间码，并确认房主页面仍然打开。' }); this.transport.close(); clearInterval(this.timer); }
    else if ((this.authority.guest || !this.isHost) && elapsed > 12000) this.update({ status: 'reconnecting', error: '暂时没有收到对方响应，恢复连接后继续。', pending: false });
    if (this.snapshot.pending && Date.now() - this.pendingSince > 7000) this.update({ pending: false, error: '棋步未确认，请等待连接恢复后重试。' });
  }
  private broadcast(target?: string) {
    if (!this.room) return;
    this.send({ kind: 'snapshot', room: this.room, target, moves: this.authority.state.moveHistory, revision: this.authority.revision, guest: this.authority.guest, hostSide: this.authority.hostSide, hostReady: this.authority.hostReady, guestReady: this.authority.guestReady });
  }
  private applyAuthority() {
    const a = this.authority;
    this.update({ state: a.state, revision: a.revision, player: a.hostSide, status: 'playing', error: '', pending: false, rematch: a.hostReady ? 'waiting' : a.guestReady ? 'opponent-ready' : 'none' });
  }
  private receive(value: unknown) {
    if (!value || typeof value !== 'object' || this.stopped) return;
    const m = value as Message;
    if (typeof m.sender !== 'string' || m.sender === this.id || (m.target && m.target !== this.id)) return;
    if (this.isHost) {
      if (!this.room) { if (m.kind === 'snapshot') this.occupied = true; return; }
      if (m.kind === 'snapshot' && m.room !== this.room && m.sender < this.id) { this.update({ status: 'error', error: '房间码发生冲突，请重新创建。' }); this.stop(false); return; }
      if (m.kind === 'probe') { this.broadcast(); return; }
      if (m.kind === 'join') {
        if (m.room && m.room !== this.room) return;
        if (!this.authority.join(m.sender)) { this.send({ kind: 'full', target: m.sender, room: this.room }); return; }
        this.lastPeer = Date.now(); this.applyAuthority(); this.broadcast(m.sender); return;
      }
      if (m.room !== this.room || m.sender !== this.authority.guest) return;
      this.lastPeer = Date.now();
      if (m.kind === 'move') {
        if (!this.authority.move(m.sender, m.revision ?? -1, m.row ?? -1, m.col ?? -1)) this.send({ kind: 'reject', room: this.room, target: m.sender });
        this.applyAuthority(); this.broadcast();
      } else if (m.kind === 'rematch') { this.authority.rematch(m.sender); this.applyAuthority(); this.broadcast(); }
      else if (m.kind === 'leave') { this.update({ status: 'left', error: '对手已离开。请创建新房间开始下一局。' }); this.stop(false); }
      else if (m.kind === 'ping') { if (this.snapshot.status === 'reconnecting') this.applyAuthority(); this.broadcast(m.sender); }
    } else {
      if (this.hostId && m.sender !== this.hostId) return;
      if (m.kind === 'full') { this.update({ status: 'error', error: '房间已满，请让朋友创建新房间。' }); this.stop(false); return; }
      if (m.kind === 'snapshot') {
        if (!m.room || (this.room && m.room !== this.room)) return;
        if (m.guest !== this.id) { if (!this.room) this.send({ kind: 'join', room: m.room }); return; }
        if (!Number.isInteger(m.revision) || m.revision! < this.snapshot.revision || !['X', 'O'].includes(m.hostSide ?? '')) return;
        const state = replayMoves(m.moves);
        if (!state) return;
        this.room = m.room; this.hostId = m.sender; this.lastPeer = Date.now();
        const changed = m.revision !== this.snapshot.revision;
        this.update({ state, revision: m.revision!, player: m.hostSide === 'X' ? 'O' : 'X', status: 'playing', error: '', pending: changed ? false : this.snapshot.pending, rematch: m.guestReady ? 'waiting' : m.hostReady ? 'opponent-ready' : 'none' });
      } else if (m.room === this.room && m.kind === 'leave') { this.update({ status: 'left', error: '房主已离开，房间已结束。' }); this.stop(false); }
      else if (m.room === this.room && m.kind === 'reject') this.update({ pending: false, error: '这步未被接受，已同步最新棋盘，请重新选择。' });
    }
  }
  move(row: number, col: number) {
    if (this.snapshot.status !== 'playing' || this.snapshot.pending || this.snapshot.state.currentPlayer !== this.snapshot.player) return;
    if (this.isHost) {
      if (this.authority.move('host', this.authority.revision, row, col)) { this.applyAuthority(); this.broadcast(); }
    } else { this.pendingSince = Date.now(); this.update({ pending: true, error: '' }); this.send({ kind: 'move', room: this.room, row, col, revision: this.snapshot.revision }); }
  }
  rematch() {
    if (this.snapshot.status !== 'playing' || !this.snapshot.state.winner) return;
    if (this.isHost) { this.authority.rematch('host'); this.applyAuthority(); this.broadcast(); }
    else { this.send({ kind: 'rematch', room: this.room }); this.update({ rematch: 'waiting' }); }
  }
  stop(announce = true) {
    if (this.stopped) return;
    if (announce && this.room) this.send({ kind: 'leave', room: this.room });
    this.stopped = true; clearInterval(this.timer); clearTimeout(this.retry); this.transport.close();
  }
}
