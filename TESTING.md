# Verification

Checked on 2026-10-07 with Node.js 24.20.0 and headless Chrome 154.0.8037.98 on macOS.

## Completed

- **37 automated tests passed:** game rules, both players' eight winning lines, rejected moves, fourth-move removal, frozen wins, replay/reset, isolated snapshots, UI adapter behavior, optional browser-tool contracts, local asset references, and asset size.
- **Long-play checks passed:** 14,000 moves through repeated nonwinning positions, 1,000 engine rounds, and 1,000 UI-adapter rounds. Game state stays bounded; the UI adapter retains its original nine buttons and single event listeners.
- **JavaScript syntax checks passed** for all three browser modules.
- **HTML structure checks passed:** unique IDs, nine labeled native cell buttons, matching elements, and valid ARIA references.
- **Browser delivery passed:** the HTML, CSS, and all modules returned HTTP 200 from the local static server. Chrome reported no runtime exceptions.
- **Native keyboard checks passed:** Enter starts the game and makes the first move; Tab moves to the next cell; Space places the next mark. Start, replay, and Back restore the intended focus.
- **Emulated touch check passed:** one touch placed one X and began the round. This is browser emulation, not a physical-phone test.
- **Browser gameplay checks passed:** occupied-cell rejection, oldest-mark outline and removal, turn changes, three highlighted winning cells, frozen result, replay, Back, and refresh returning to Start.
- **Reduced-motion check passed:** mark transitions compute to `0s` under the reduced-motion preference.
- **200% text check passed:** both screens at 320×568 remained within the viewport width. Vertical scrolling is allowed for enlarged text.
- Start and play screenshots were visually inspected at phone and desktop sizes.

## Responsive game layouts

All these Chrome-emulated game viewports had a square board, cell widths above 44 CSS pixels, and no horizontal or vertical overflow at normal text size:

| Viewport | Board width | Cell width | Layout |
| --- | ---: | ---: | --- |
| 320×568 | 208 px | 69.3 px | Portrait |
| 390×844 | 346 px | 115.3 px | Portrait |
| 430×932 | 386 px | 128.7 px | Portrait |
| 844×390 | 278 px | 92.7 px | Landscape with controls beside the board |
| 1024×768 | 372 px | 124 px | Tablet / small desktop |
| 1440×900 | 420 px | 140 px | Desktop |

## Asset and memory budget

The five browser files total **21,222 bytes uncompressed** (about 20.7 KiB), below the 30 KiB test limit. They require no external requests or runtime dependencies.

The engine stores nine cells, two queues capped at three marks, the turn, phase, and result. Rendering updates the same nine buttons and uses no continuous animation loop or move history. The tests verify bounded state and retained DOM references; they do not measure total browser-process memory.

## Still requiring a physical device or assistive technology

1. Play with two people on actual iOS Safari and Android Chrome; check tap comfort and accidental touches.
2. Rotate a phone during play and show/hide browser controls. Check safe areas on a notched phone and the landscape controls.
3. Use VoiceOver or TalkBack to check cell labels, turn announcements, the expiring mark, and winner announcements. ARIA structure alone is not screen-reader validation.
4. Review colors in grayscale and common color-vision simulations. X/O shapes, outlines, and text supply cues alongside color.

Native WebMCP support was not available in the tested browser context. Read/reset contracts passed against mocks and the shared UI-adapter harness; unsupported browsers play normally.

## Re-run

```sh
node --test tests/*.test.mjs
node --check app.js
node --check engine.mjs
node --check webmcp.mjs
python3 -m http.server 5173 --bind 127.0.0.1
```

Open `http://localhost:5173` for manual browser checks. No dependency installation or production build is required.
