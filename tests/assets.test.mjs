import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const assets = ["index.html", "styles.css", "app.js", "engine.mjs", "webmcp.mjs"];
const root = new URL("../", import.meta.url);

test("All browser assets fit the 30 KB uncompressed budget", () => {
  const bytes = assets.reduce((sum, name) => sum + statSync(new URL(name, root)).size, 0);
  assert.ok(bytes <= 30 * 1024, `Browser assets total ${bytes} bytes`);
});

test("The browser entry and module graph reference existing local assets", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  for (const [, path] of html.matchAll(/(?:src|href)="([^\"]+)"/g)) {
    if (path.startsWith("data:")) continue;
    assert.ok(assets.includes(path), `Unexpected or external asset: ${path}`);
    assert.ok(statSync(new URL(path, root)).isFile());
  }
  for (const name of ["app.js", "engine.mjs", "webmcp.mjs"]) {
    const source = readFileSync(new URL(name, root), "utf8");
    for (const [, path] of source.matchAll(/\bfrom\s+"([^\"]+)"/g)) {
      assert.ok(path.startsWith("./"), `External dependency: ${path}`);
      assert.ok(statSync(new URL(path, root)).isFile());
    }
  }
});
