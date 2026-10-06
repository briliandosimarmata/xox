import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";

const lines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
  [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
];

function play(moves) {
  const game = new Game();
  game.start();
  for (const cell of moves) assert.equal(game.move(cell), true, `Move ${cell} must be accepted`);
  return game;
}

test("Start reveals a ready board; only a valid first placement begins the round", () => {
  const game = new Game();
  assert.equal(game.snapshot().phase, "idle");
  assert.equal(game.move(0), false);
  game.start();
  assert.equal(game.snapshot().phase, "ready");
  assert.deepEqual(game.snapshot().board, Array(9).fill(null));
  assert.equal(game.move(0), true);
  assert.equal(game.snapshot().phase, "playing");
  assert.equal(game.snapshot().board[0], "X");
  assert.equal(game.snapshot().turn, "O");
  assert.equal(game.move(4), true);
  assert.equal(game.snapshot().board[4], "O");
  assert.equal(game.snapshot().turn, "X");
});

test("Invalid values and occupied cells leave every part of the state unchanged", () => {
  const game = play([0, 1, 2, 3, 4, 5]);
  const before = game.snapshot();
  for (const input of [0, 1, 2, 3, 4, 5, -1, 9, 1.5, "7", null, undefined, NaN, Infinity, {}, []]) {
    assert.equal(game.move(input), false);
    assert.deepEqual(game.snapshot(), before);
  }
});

test("Fourth moves remove only the current player's oldest mark and free it for the opponent", () => {
  const game = play([0, 1, 2, 3, 4, 5]);
  assert.equal(game.move(7), true);
  assert.deepEqual(game.snapshot().marks.X, [2, 4, 7]);
  assert.deepEqual(game.snapshot().marks.O, [1, 3, 5]);
  assert.equal(game.snapshot().board[0], null);
  assert.equal(game.move(0), true);
  assert.deepEqual(game.snapshot().marks.O, [3, 5, 0]);
  assert.equal(game.snapshot().board[1], null);
  assert.equal(game.snapshot().board[0], "O");
});

test("An apparent line that includes the disappearing mark is not a win", () => {
  const game = play([0, 1, 4, 2, 5, 6, 8]);
  const state = game.snapshot();
  assert.equal(state.board[0], null);
  assert.deepEqual(state.marks.X, [4, 5, 8]);
  assert.equal(state.phase, "playing");
  assert.equal(state.winner, null);
  assert.deepEqual(state.winningLine, []);
  assert.equal(state.turn, "O");
});

test("A fourth move can win with the three retained marks", () => {
  const state = play([0, 1, 2, 3, 4, 5, 6]).snapshot();
  assert.equal(state.board[0], null);
  assert.equal(state.phase, "won");
  assert.equal(state.winner, "X");
  assert.deepEqual(state.winningLine, [2, 4, 6]);
});

for (const line of lines) {
  const outside = Array.from({ length: 9 }, (_, index) => index).filter(index => !line.includes(index));
  test(`X wins on line ${line.join("-")}`, () => {
    const game = play([line[0], outside[0], line[1], outside[1], line[2]]);
    const result = game.snapshot();
    assert.equal(result.winner, "X");
    assert.deepEqual(result.winningLine, line);
    for (let cell = 0; cell < 9; cell++) {
      assert.equal(game.move(cell), false);
      assert.deepEqual(game.snapshot(), result);
    }
  });
  test(`O wins on line ${line.join("-")}`, () => {
    const state = play([outside[0], line[0], outside[1], line[1], outside[3], line[2]]).snapshot();
    assert.equal(state.phase, "won");
    assert.equal(state.winner, "O");
    assert.deepEqual(state.winningLine, line);
  });
}

test("Reading state cannot change the engine through returned arrays", () => {
  const game = play([0, 1]);
  const before = game.snapshot();
  const external = game.snapshot();
  external.board.fill("O");
  external.marks.X.push(8);
  external.marks.O.length = 0;
  external.winningLine.push(1);
  external.turn = "X";
  assert.deepEqual(game.snapshot(), before);
});

test("Replay and Back clear all marks and results; X starts the next round", () => {
  const game = play([0, 3, 1, 4, 2]);
  game.start();
  assert.deepEqual(game.snapshot(), {
    phase: "ready", board: Array(9).fill(null), turn: "X",
    marks: { X: [], O: [] }, winner: null, winningLine: [],
  });
  game.move(8);
  game.reset();
  assert.equal(game.snapshot().phase, "idle");
  assert.deepEqual(game.snapshot().board, Array(9).fill(null));
  assert.equal(game.move(4), false);
});

test("Repeated positions keep playing for 14,000 moves with bounded live state", () => {
  const prefix = [0, 1, 2, 3, 4, 5, 7, 0, 6, 1, 2, 3, 5, 4, 0, 6, 1, 7, 3, 2, 4, 0, 6, 5, 1, 3, 2, 7, 4, 0, 5, 1, 6, 3, 2, 4, 0, 7, 5, 6, 1, 2, 3, 0, 4, 5, 6, 1, 7, 2, 0, 3, 4, 5, 1];
  const cycle = [6, 2, 0, 3, 4, 5, 1, 6, 2, 0, 3, 4, 5, 1];
  const game = play(prefix);
  const repeated = game.snapshot();
  for (let repeat = 0; repeat < 1000; repeat++) {
    for (const cell of cycle) {
      assert.equal(game.move(cell), true);
      const state = game.snapshot();
      assert.equal(state.phase, "playing");
      assert.equal(state.board.length, 9);
      for (const player of ["X", "O"]) {
        assert.equal(state.marks[player].length, 3);
        assert.equal(new Set(state.marks[player]).size, 3);
        assert.equal(state.board.filter(mark => mark === player).length, 3);
        for (const index of state.marks[player]) assert.equal(state.board[index], player);
      }
    }
    assert.deepEqual(game.snapshot(), repeated);
  }
});

test("Repeated rounds do not carry marks or turn state forward", () => {
  const game = new Game();
  for (let round = 0; round < 1000; round++) {
    game.start();
    for (const cell of [0, 3, 1, 4, 2]) assert.equal(game.move(cell), true);
    assert.equal(game.snapshot().winner, "X");
    game.reset();
    assert.deepEqual(game.snapshot().marks, { X: [], O: [] });
    assert.equal(game.snapshot().winner, null);
  }
});
