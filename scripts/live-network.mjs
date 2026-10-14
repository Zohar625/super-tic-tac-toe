// Two independent real WebSocket connections, no database or local mock server.
import { RoomController } from '../.test-build/multiplayer/RoomController.js';
import { isValidMove } from '../.test-build/state/gameLogic.js';
import assert from 'node:assert/strict';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label) {
  for (let i = 0; i < 70; i++) { if (predicate()) return; await sleep(200); }
  throw new Error('Timed out: ' + label);
}
const code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
const host = new RoomController(code, true);
const guest = new RoomController(code, false);
try {
  await host.start(); assert.equal(host.getSnapshot().status, 'waiting'); console.log('PASS create room');
  await guest.start(); await until(() => guest.getSnapshot().status === 'playing', 'join room'); console.log('PASS join room');
  for (let step = 0; step < 81 && !host.getSnapshot().state.winner; step++) {
    const state = host.getSnapshot().state, choices = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (isValidMove(state, r, c)) choices.push([r, c]);
    const [r, c] = choices[(step * 7 + 2) % choices.length];
    const expected = host.getSnapshot().revision + 1;
    (state.currentPlayer === host.getSnapshot().player ? host : guest).move(r, c);
    await until(() => host.getSnapshot().revision === expected && guest.getSnapshot().revision === expected, 'move ' + step);
    assert.deepEqual(host.getSnapshot().state, guest.getSnapshot().state);
  }
  assert.ok(host.getSnapshot().state.winner); console.log('PASS turn order, state sync, and victory');
  host.rematch(); await until(() => guest.getSnapshot().rematch === 'opponent-ready', 'rematch invitation'); guest.rematch();
  await until(() => !host.getSnapshot().state.winner && !guest.getSnapshot().state.winner, 'rematch reset');
  assert.equal(host.getSnapshot().player, 'O'); assert.equal(guest.getSnapshot().player, 'X'); console.log('PASS rematch and side swap');
  guest.stop(); await until(() => host.getSnapshot().status === 'left', 'leave'); console.log('PASS leave room');
} finally { host.stop(); guest.stop(); }
