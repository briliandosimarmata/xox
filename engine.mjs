const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/** Fixed-size game state. Rendering, timing, and browser APIs stay outside. */
export class Game {
  #phase;
  #board;
  #turn;
  #marks;
  #winner;
  #winningLine;

  constructor() { this.reset(); }

  start() { this.#clear("ready"); }
  reset() { this.#clear("idle"); }

  #clear(phase) {
    this.#phase = phase;
    this.#board = Array(9).fill(null);
    this.#turn = "X";
    this.#marks = { X: [], O: [] };
    this.#winner = null;
    this.#winningLine = [];
  }

  /** Return false on rejected input; never change state for an invalid move. */
  move(cell) {
    if (!Number.isInteger(cell) || cell < 0 || cell > 8 ||
        !["ready", "playing"].includes(this.#phase) || this.#board[cell] !== null) return false;

    const player = this.#turn;
    const marks = this.#marks[player];
    if (marks.length === 3) this.#board[marks.shift()] = null;
    marks.push(cell);
    this.#board[cell] = player;

    const line = LINES.find(cells => cells.every(index => this.#board[index] === player));
    if (line) {
      this.#phase = "won";
      this.#winner = player;
      this.#winningLine = [...line];
    } else {
      this.#phase = "playing";
      this.#turn = player === "X" ? "O" : "X";
    }
    return true;
  }

  /** Copies keep consumers from mutating the engine's source of truth. */
  snapshot() {
    return {
      phase: this.#phase, board: [...this.#board], turn: this.#turn,
      marks: { X: [...this.#marks.X], O: [...this.#marks.O] },
      winner: this.#winner, winningLine: [...this.#winningLine],
    };
  }
}
