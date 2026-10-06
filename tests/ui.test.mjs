import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Tests the real browser adapter against a minimal DOM harness. This is not a
// browser renderer and cannot verify layout, touch behavior, or accessibility UI.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const elements = new Map();
const windowEvents = new Map();

class Element {
  hidden = false;
  textContent = "";
  dataset = {};
  style = {};
  attributes = new Map();
  events = new Map();
  classes = new Set();
  classList = {
    toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
    contains: name => this.classes.has(name),
  };
  constructor(tag, attributes = "") {
    this.tag = tag;
    for (const [, name, value] of attributes.matchAll(/([\w-]+)="([^\"]*)"/g)) {
      this.attributes.set(name, value);
      if (name === "id") this.id = value;
      if (name === "data-cell") this.dataset.cell = value;
      if (name === "class") value.split(" ").forEach(item => this.classes.add(item));
    }
    this.hidden = /\bhidden(?:\s|$)/.test(attributes);
  }
  addEventListener(name, callback) {
    const listeners = this.events.get(name) ?? [];
    listeners.push(callback); this.events.set(name, listeners);
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  focus() { document.activeElement = this; }
  closest(selector) { return selector === "button[data-cell]" ? this.cell ?? (this.dataset.cell ? this : null) : null; }
  querySelector(selector) { return selector === ".mark" ? this.mark : null; }
  querySelectorAll(selector) { return selector === ".cell" ? cells : []; }
  contains(target) { return this.id === "board" && cells.includes(target); }
  click() {
    for (const listener of this.events.get("click") ?? []) listener({ target: this });
    if (this.dataset.cell !== undefined) {
      for (const listener of elements.get("board").events.get("click") ?? []) listener({ target: this });
    }
  }
}

for (const [, tag, attributes] of html.matchAll(/<(\w+)([^>]*\bid="[^\"]+"[^>]*)>/g)) {
  const element = new Element(tag, attributes);
  elements.set(element.id, element);
}
const cells = [...html.matchAll(/<button([^>]*\bdata-cell="\d+"[^>]*)>/g)].map(([, attributes]) => {
  const cell = new Element("button", attributes);
  cell.mark = new Element("span");
  cell.mark.cell = cell;
  return cell;
});
globalThis.document = {
  body: new Element("body"), documentElement: new Element("html"),
  activeElement: null, getElementById: id => elements.get(id),
};
globalThis.window = {
  addEventListener(name, callback) {
    const listeners = windowEvents.get(name) ?? [];
    listeners.push(callback); windowEvents.set(name, listeners);
  },
};
const registered = [];
document.modelContext = { registerTool(tool, options) { registered.push({ tool, options }); } };
await import("../app.js");

const element = id => elements.get(id);
const boardValues = () => cells.map(cell => cell.mark.dataset.mark);
function startFresh() { element("back").click(); element("start").click(); }

test("The app starts at Start and immediately reveals an empty, focusable board", () => {
  assert.equal(element("start-screen").hidden, false);
  assert.equal(element("game-screen").hidden, true);
  assert.equal(element("back").hidden, true);
  assert.equal(cells.length, 9);
  assert.ok(!document.body.classList.contains("is-active"));
  element("start").click();
  assert.equal(element("start-screen").hidden, true);
  assert.equal(element("game-screen").hidden, false);
  assert.equal(element("turn").textContent, "X goes first");
  assert.deepEqual(boardValues(), Array(9).fill(""));
  assert.equal(document.activeElement, cells[0]);
  assert.ok(document.body.classList.contains("is-active"));
});

test("Cell activation updates turn labels and rejects a second tap on the occupied cell", () => {
  startFresh();
  cells[0].click();
  assert.equal(cells[0].mark.dataset.mark, "X");
  assert.equal(cells[0].getAttribute("aria-disabled"), "true");
  assert.equal(element("turn").textContent, "O’s turn");
  cells[0].click();
  assert.equal(element("turn").textContent, "O’s turn");
  cells[4].click();
  assert.equal(element("turn").textContent, "X’s turn");
  assert.equal(cells[4].getAttribute("aria-label"), "Row 2, column 2, O");
});

test("The oldest-mark outline and accessible hint follow the player whose turn is next", () => {
  startFresh();
  for (const index of [0, 1, 2, 3, 4, 5]) cells[index].click();
  assert.equal(cells.filter(cell => cell.classes.has("is-expiring")).length, 1);
  assert.ok(cells[0].classes.has("is-expiring"));
  assert.match(cells[0].getAttribute("aria-label"), /disappears on X/);
  assert.match(element("turn-hint").textContent, /outlined X/);
  cells[7].click();
  assert.equal(cells[0].mark.dataset.mark, "");
  assert.ok(cells[1].classes.has("is-expiring"));
  assert.match(element("turn-hint").textContent, /outlined O/);
});

test("Wins highlight the retained line, freeze input, focus replay, and reset cleanly", () => {
  startFresh();
  for (const index of [0, 3, 1, 4, 2]) cells[index].click();
  assert.equal(element("turn").textContent, "X wins!");
  assert.equal(element("again").hidden, false);
  assert.equal(element("rule-hint").hidden, true);
  assert.equal(document.activeElement, element("again"));
  assert.deepEqual(cells.filter(cell => cell.classes.has("is-winning")).map(cell => +cell.dataset.cell), [0, 1, 2]);
  const before = boardValues();
  cells[8].click();
  assert.deepEqual(boardValues(), before);
  element("again").click();
  assert.deepEqual(boardValues(), Array(9).fill(""));
  assert.equal(element("turn").textContent, "X goes first");
  assert.equal(element("again").hidden, true);
  assert.equal(cells.filter(cell => cell.classes.has("is-winning")).length, 0);
});

test("Back clears the game, restores light setup, and returns focus to Start", () => {
  startFresh(); cells[0].click();
  element("back").click();
  assert.equal(element("start-screen").hidden, false);
  assert.equal(element("game-screen").hidden, true);
  assert.equal(element("shared-screen").hidden, false);
  assert.equal(document.activeElement, element("start"));
  assert.deepEqual(boardValues(), Array(9).fill(""));
  assert.ok(!document.body.classList.contains("is-active"));
  assert.equal(document.documentElement.style.backgroundColor, "#F7F9FD");
});

test("Repeated rounds retain the original nine buttons and their event listeners", () => {
  const originalCells = [...cells];
  for (let round = 0; round < 1000; round++) {
    startFresh();
    for (const index of [0, 3, 1, 4, 2]) cells[index].click();
    element("again").click();
    assert.equal(element("turn").textContent, "X goes first");
  }
  assert.deepEqual(cells, originalCells);
  assert.equal(element("board").events.get("click").length, 1);
  assert.equal(element("start").events.get("click").length, 1);
});

test("Registered tools read the live screen state and reset the visible UI", () => {
  startFresh(); cells[4].click();
  const read = registered.find(({ tool }) => tool.name === "read_game_state").tool;
  const reset = registered.find(({ tool }) => tool.name === "reset_game_round").tool;
  assert.equal(read.execute({}).board[4], cells[4].mark.dataset.mark);
  assert.equal(reset.execute({}).phase, "idle");
  assert.equal(element("game-screen").hidden, true);
  assert.equal(document.activeElement, element("start"));
  assert.deepEqual(boardValues(), Array(9).fill(""));
  const oldSignals = registered.map(({ options }) => options.signal);
  for (const listener of windowEvents.get("pagehide")) listener({});
  assert.ok(oldSignals.every(signal => signal.aborted));
  for (const listener of windowEvents.get("pageshow")) listener({ persisted: true });
  assert.equal(registered.length, 4);
  assert.ok(!registered[3].options.signal.aborted);
});
