import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { registerGameTools } from "../webmcp.mjs";

test("Unsupported browsers need no integration to play", () => {
  const game = new Game();
  for (const documentObject of [undefined, {}, { modelContext: {} }]) {
    const cleanup = registerGameTools(game, () => assert.fail("Unexpected render"), documentObject);
    assert.doesNotThrow(cleanup);
  }
  game.start();
  assert.equal(game.move(0), true);
});

test("Read and reset tools share the game, declare their effects, and clean up", () => {
  const game = new Game();
  game.start(); game.move(0);
  const registered = [];
  let updates = 0;
  const cleanup = registerGameTools(game, () => updates++, {
    modelContext: { registerTool(tool, options) { registered.push({ tool, options }); } },
  });
  assert.deepEqual(registered.map(({ tool }) => tool.name), ["read_game_state", "reset_game_round"]);
  const [read, reset] = registered.map(({ tool }) => tool);
  assert.equal(read.annotations.readOnlyHint, true);
  assert.equal(reset.annotations.readOnlyHint, false);
  for (const { tool, options } of registered) {
    assert.deepEqual(tool.inputSchema, { type: "object", properties: {}, additionalProperties: false });
    assert.equal(tool.annotations.untrustedContentHint, false);
    assert.equal(options.signal.aborted, false);
  }
  const before = game.snapshot();
  assert.deepEqual(read.execute({}), before);
  assert.deepEqual(game.snapshot(), before);
  assert.equal(updates, 0);
  for (const tool of [read, reset]) {
    for (const input of [null, undefined, [], "", 0, { cell: 0 }]) {
      assert.throws(() => tool.execute(input), /empty object/);
      assert.deepEqual(game.snapshot(), before);
    }
  }
  const result = reset.execute({});
  assert.equal(result.phase, "idle");
  assert.deepEqual(result.board, Array(9).fill(null));
  assert.deepEqual(result, game.snapshot());
  assert.equal(updates, 1);
  cleanup();
  for (const { options } of registered) assert.equal(options.signal.aborted, true);
});

test("Synchronous and asynchronous registration failures cannot break gameplay", async () => {
  const game = new Game();
  for (const registerTool of [() => { throw new Error("Unavailable"); }, () => Promise.reject(new Error("Unavailable"))]) {
    assert.doesNotThrow(() => registerGameTools(game, () => {}, { modelContext: { registerTool } })());
  }
  await new Promise(resolve => setImmediate(resolve));
  game.start();
  assert.equal(game.move(4), true);
});
