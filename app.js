import { Game } from "./engine.mjs";
import { registerGameTools } from "./webmcp.mjs";

const game = new Game();
const byId = id => document.getElementById(id);
const startScreen = byId("start-screen");
const gameScreen = byId("game-screen");
const start = byId("start");
const back = byId("back");
const again = byId("again");
const turn = byId("turn");
const hint = byId("turn-hint");
const rule = byId("rule-hint");
const board = byId("board");
const cells = [...board.querySelectorAll(".cell")];
const marks = cells.map(cell => cell.querySelector(".mark"));
const playerX = byId("player-x");
const playerO = byId("player-o");
const theme = byId("theme-color");

function render() {
  const state = game.snapshot();
  const idle = state.phase === "idle";
  const won = state.phase === "won";
  const oldest = state.marks[state.turn].length === 3 && !won
    ? state.marks[state.turn][0] : -1;

  document.body.classList.toggle("is-active", !idle);
  document.documentElement.style.backgroundColor = idle ? "#F7F9FD" : "#111A2C";
  startScreen.hidden = !idle;
  gameScreen.hidden = idle;
  back.hidden = idle;
  byId("shared-screen").hidden = !idle;
  again.hidden = !won;
  theme.content = idle ? "#F7F9FD" : "#111A2C";
  playerX.classList.toggle("is-current", !idle && state.turn === "X");
  playerO.classList.toggle("is-current", !idle && state.turn === "O");

  turn.textContent = won ? `${state.winner} wins!`
    : state.phase === "ready" ? "X goes first" : `${state.turn}’s turn`;
  hint.textContent = won ? "Three in a row. Nicely played."
    : state.phase === "ready" ? "Tap any empty square to begin."
    : oldest >= 0 ? `Your outlined ${state.turn} disappears after your next move.`
    : "Make your move. Get three in a row.";
  rule.hidden = won;
  board.setAttribute("aria-describedby", won ? "turn-hint" : "rule-hint");

  for (let index = 0; index < cells.length; index++) {
    const value = state.board[index];
    const expires = index === oldest;
    const cell = cells[index];
    marks[index].dataset.mark = value ?? "";
    cell.classList.toggle("is-expiring", expires);
    cell.classList.toggle("is-winning", state.winningLine.includes(index));
    cell.setAttribute("aria-disabled", String(idle || won || value !== null));
    const description = `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}, ${value ?? "empty"}`;
    cell.setAttribute("aria-label", description + (expires
      ? `, disappears on ${state.turn}’s next move` : state.winningLine.includes(index) ? ", winning mark" : ""));
  }
  return state;
}

function startRound() {
  game.start();
  render();
  cells[0].focus({ preventScroll: true });
}

function resetRound() {
  game.reset();
  render();
  start.focus({ preventScroll: true });
}

start.addEventListener("click", startRound);
again.addEventListener("click", startRound);
back.addEventListener("click", resetRound);
board.addEventListener("click", event => {
  const cell = event.target.closest("button[data-cell]");
  if (!cell || !board.contains(cell) || !game.move(Number(cell.dataset.cell))) return;
  if (render().phase === "won") again.focus({ preventScroll: true });
});

render();
let unregisterTools;
function connectTools() {
  unregisterTools?.();
  unregisterTools = registerGameTools(game, () => {
    render();
    start.focus({ preventScroll: true });
  }, document);
}
connectTools();
window.addEventListener("pagehide", () => unregisterTools?.());
window.addEventListener("pageshow", event => { if (event.persisted) connectTools(); });
