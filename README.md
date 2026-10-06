# Infinite · Tic Tac Toe

A small, mobile-first game for two people sharing a screen. Plain HTML, CSS, and JavaScript; no runtime dependencies, package installation, build step, backend, or account. Its light Start screen and navy play screen borrow Fingertip's colors, rounded system typography, and pill buttons.

## Run locally

From this project folder:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Open [http://localhost:5173](http://localhost:5173). Serve the folder over HTTP because the app uses JavaScript modules; opening the HTML directly as a file is not the normal supported launch method.

To try it on a phone connected to the same Wi-Fi, use:

```sh
python3 -m http.server 5173 --bind 0.0.0.0
```

Open `http://<your-computer-LAN-IP>:5173` on the phone. This requires the computer's firewall to permit the connection.

## Rules

1. Press **Start** to reveal the board. X (Player 1) goes first. The first accepted cell tap starts the round.
2. Take turns placing X and O in empty squares. Each player keeps at most three marks.
3. On your fourth placement and every placement after it, your oldest mark disappears. The dashed outline identifies your mark that will disappear next.
4. A mark stays occupied until its replacement move completes. You cannot place directly on the outlined mark; the opponent can use that square after it disappears.
5. Three retained marks in a row, column, or diagonal win. The game removes the old mark **before** evaluating the winning line.
6. Repeated positions continue playing. There is no draw counter or automatic timeout.
7. **Play again** opens a fresh empty board with X first. The close button returns to Start. Refreshing discards the round.

Players are two humans taking turns on one device. There is no automated opponent or online room system.

## Checks

Requires Node.js 22 or newer for the development tests, not for playing:

```sh
node --test tests/*.test.mjs
node --check app.js
```

Tests cover both players' eight winning lines, invalid moves, removal order, apparent wins broken by removal, frozen results, replay/reset, isolated snapshots, 14,000 continuing moves through repeated positions, 1,000 fresh rounds, optional browser-tool contracts, and the 30 KB uncompressed browser-asset budget.

## Structure and memory

- `index.html`: the Start and game screens, nine native cell buttons, metadata, and inline favicon.
- `styles.css`: mobile-first layouts, Fingertip-inspired theme, marks, focus states, and reduced-motion styling.
- `app.js`: native button events, shared engine state, accessible status, and bounded DOM updates.
- `engine.mjs`: independent game rules. State is nine cells, two queues of at most three marks, turn, phase, and result. Snapshots are copies.
- `webmcp.mjs`: optional, feature-detected `read_game_state` and `reset_game_round` hooks. The tools share the same engine; reset returns to Start. Registration failures do not interrupt play, and page lifecycle cleanup aborts registration.
- `tests/`: Node's built-in behavior tests.

All five browser files together must stay below 30 KB uncompressed. The app downloads no fonts, images, libraries, or telemetry and uses no continuous animation loop, interval, move log, or browser storage. Game data stays bounded during long rounds. Total browser memory depends on the device and browser; the asset budget is not a claim about total process memory.

For static hosting later, upload the five browser files together to the same directory. This project has not been published.

## Verification status

See [TESTING.md](TESTING.md) for completed checks and the remaining phone/browser checklist.
