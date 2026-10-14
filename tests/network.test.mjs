import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodePacket, decodePublish } from '../.test-build/multiplayer/mqtt.js';
import { RoomAuthority } from '../.test-build/multiplayer/roomProtocol.js';

test('MQTT 可变长度编码及发布消息解码', () => {
  const packet = encodePacket(0x30, new Uint8Array(130));
  assert.deepEqual([...packet.slice(0, 3)], [0x30, 130, 1]);
  const publish = encodePacket(0x30, new TextEncoder().encode('\u0000\u0003abc你好'));
  assert.deepEqual(decodePublish(publish), { topic: 'abc', payload: '你好' });
});
test('房间只接受一位客人，重复加入同一人不丢棋局', () => {
  const room = new RoomAuthority();
  assert.equal(room.join('guest-1'), true);
  assert.equal(room.join('guest-1'), true);
  assert.equal(room.join('guest-2'), false);
});
test('房主校验轮次、非法棋步和重复版本，双方可轮流落子', () => {
  const room = new RoomAuthority();
  room.join('guest');
  assert.equal(room.move('host', 0, 4, 4), false);
  assert.equal(room.move('guest', 0, 0, 1), false);
  assert.equal(room.move('host', 0, 0, 1), true);
  assert.equal(room.move('host', 0, 0, 1), false);
  assert.equal(room.move('unknown', 1, 0, 3), false);
  assert.equal(room.move('guest', 1, 0, 3), true);
  assert.equal(room.state.board[0][3], 'O');
  assert.equal(room.revision, 2);
});
test('重赛必须双方同意，互换先手，并使旧棋步版本失效', () => {
  const room = new RoomAuthority();
  room.join('guest');
  assert.equal(room.rematch('host'), false);
  room.state.winner = 'X';
  assert.equal(room.rematch('host'), false);
  assert.equal(room.rematch('guest'), true);
  assert.equal(room.hostSide, 'O');
  assert.equal(room.state.winner, null);
  assert.equal(room.revision, 1);
  assert.equal(room.move('host', 0, 0, 0), false);
});
