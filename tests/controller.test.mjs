import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomController } from '../.test-build/multiplayer/RoomController.js';
import { isValidMove } from '../.test-build/state/gameLogic.js';
import { replayMoves } from '../.test-build/multiplayer/roomProtocol.js';

class Bus {
  clients = new Set();
  transport() {
    const bus = this;
    return { onMessage: () => {}, onOffline: () => {},
      online: false, dropNext: false,
      async connect() { this.online = true; bus.clients.add(this); },
      send(message) { if (!this.online) throw new Error('offline'); if (this.dropNext) { this.dropNext = false; return; } for (const client of [...bus.clients]) client.onMessage(structuredClone(message)); },
      close() { this.online = false; bus.clients.delete(this); },
    };
  }
}
test('完整房间流程：创建、加入、拒绝第三人、对局、双方重赛、离开', async () => {
  const bus = new Bus();
  const hostTransport = bus.transport();
  const host = new RoomController('345678', true, hostTransport);
  const guest = new RoomController('345678', false, bus.transport());
  const third = new RoomController('345678', false, bus.transport());
  try {
    await host.start(); await guest.start(); await third.start();
    assert.equal(host.getSnapshot().status, 'playing');
    assert.equal(guest.getSnapshot().status, 'playing');
    assert.equal(third.getSnapshot().status, 'error');
    host.move(4, 4);
    assert.equal(host.getSnapshot().state.moveHistory.length, 0);
    // Deterministically choose legal moves until a three-in-a-row completes.
    for (let step = 0; step < 81 && !host.getSnapshot().state.winner; step++) {
      const state = host.getSnapshot().state;
      const choices = [];
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (isValidMove(state, r, c)) choices.push([r, c]);
      const [r, c] = choices[(step * 7 + 2) % choices.length];
      (state.currentPlayer === host.getSnapshot().player ? host : guest).move(r, c);
      assert.deepEqual(host.getSnapshot().state, guest.getSnapshot().state);
    }
    assert.ok(host.getSnapshot().state.winner);
    host.rematch(); assert.equal(host.getSnapshot().rematch, 'waiting');
    guest.rematch();
    assert.equal(host.getSnapshot().state.winner, null);
    assert.equal(host.getSnapshot().player, 'O');
    assert.equal(guest.getSnapshot().player, 'X');
    guest.move(0, 0);
    assert.equal(host.getSnapshot().state.board[0][0], 'X');
    guest.stop(); assert.equal(host.getSnapshot().status, 'left');
    hostTransport.onOffline();
    assert.equal(host.getSnapshot().status, 'left', 'ended room must not reconnect');
  } finally { host.stop(); guest.stop(); third.stop(); }
});
test('丢失棋步不乐观修改状态，双方断线后恢复同一对局与版本', async () => {
  const bus = new Bus(), hostTransport = bus.transport(), guestTransport = bus.transport();
  const host = new RoomController('654321', true, hostTransport);
  const guest = new RoomController('654321', false, guestTransport);
  const wait = async predicate => {
    for (let i = 0; i < 60; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
    assert.fail('connection did not recover');
  };
  try {
    await host.start(); await guest.start(); host.move(0, 1);
    guestTransport.dropNext = true; guest.move(0, 3);
    assert.equal(guest.getSnapshot().pending, true);
    assert.equal(guest.getSnapshot().state.moveHistory.length, 1);
    guestTransport.close(); guestTransport.onOffline();
    assert.equal(guest.getSnapshot().status, 'reconnecting');
    assert.equal(guest.getSnapshot().pending, false);
    await wait(() => guest.getSnapshot().status === 'playing');
    assert.equal(guest.getSnapshot().revision, 1);
    guest.move(0, 3); assert.equal(host.getSnapshot().revision, 2);
    hostTransport.close(); hostTransport.onOffline();
    assert.equal(host.getSnapshot().status, 'reconnecting');
    host.move(0, 0); assert.equal(host.getSnapshot().revision, 2);
    await wait(() => host.getSnapshot().status === 'playing');
    assert.deepEqual(host.getSnapshot().state, guest.getSnapshot().state);
    host.move(0, 0); assert.equal(host.getSnapshot().revision, 3);
  } finally { host.stop(); guest.stop(); }
});
test('同步历史拒绝错误轮次、超长历史和非法坐标', () => {
  assert.equal(replayMoves([{ player: 'O', globalRow: 0, globalCol: 0 }]), null);
  assert.equal(replayMoves([{ player: 'X', globalRow: 0.5, globalCol: 0 }]), null);
  assert.equal(replayMoves(Array(82).fill(null)), null);
});
