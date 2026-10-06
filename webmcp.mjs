/** Optional draft browser API. Unsupported or failed registration never blocks play. */
export function registerGameTools(game, update, documentObject) {
  const context = documentObject?.modelContext;
  if (typeof context?.registerTool !== "function") return () => {};
  const lifecycle = new AbortController();
  const schema = { type: "object", properties: {}, additionalProperties: false };
  const tools = [
    {
      name: "read_game_state", title: "Read tic tac toe state",
      description: "Read the board, current player, ordered marks, and result without changing the game.",
      inputSchema: schema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) { validateEmpty(input); return game.snapshot(); },
    },
    {
      name: "reset_game_round", title: "Reset tic tac toe round",
      description: "Clear the current round and return to the Start screen. Discards all marks and the result.",
      inputSchema: schema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) { validateEmpty(input); game.reset(); update(); return game.snapshot(); },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* An optional browser integration cannot interrupt a human game. */ }
  }
  return () => lifecycle.abort();
}

function validateEmpty(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).length !== 0) throw new Error("Expected an empty object.");
}
