// Regression tests for the AI output normalization layer.
// Run with: deno test supabase/functions/ai-command/normalize_test.ts

import { assertEquals, assert } from "jsr:@std/assert@1";
import { normalizeOperations } from "./normalize.ts";

Deno.test("stringified operation is parsed into object", () => {
  const stringified = JSON.stringify({ id: "tmp-1", intent: "crear_caja", payload: { codigos: ["A1"], uso: "engorda" } });
  const { normalized, rejected, logs } = normalizeOperations([stringified]);
  assertEquals(rejected.length, 0);
  assertEquals(normalized.length, 1);
  assertEquals(normalized[0].id, "tmp-1");
  assert(logs.some((l) => l.action === "parsed_string"));
});

Deno.test("data key is renamed to payload when payload missing", () => {
  const op = { id: "tmp-1", intent: "crear_caja", confidence: 0.9, data: { codigos: ["A1"], uso: "engorda" } };
  const { normalized, logs } = normalizeOperations([op]);
  assertEquals(normalized.length, 1);
  assert("payload" in normalized[0]);
  assert(!("data" in normalized[0]));
  assert(logs.some((l) => l.action === "data_to_payload"));
});

Deno.test("payload is preserved if both data and payload are present", () => {
  const op = { id: "tmp-1", intent: "crear_caja", payload: { keep: true }, data: { drop: true } };
  const { normalized } = normalizeOperations([op]);
  assertEquals((normalized[0].payload as any).keep, true);
});

Deno.test("malformed JSON string is rejected, not crashed", () => {
  const { normalized, rejected } = normalizeOperations(["{ not valid json", "totally not json", 42, null, []]);
  assertEquals(normalized.length, 0);
  assertEquals(rejected.length, 5);
});

Deno.test("mixed valid/invalid operations: valid kept, invalid rejected", () => {
  const ops = [
    { id: "tmp-1", intent: "crear_caja", payload: {} },
    "garbage",
    JSON.stringify({ id: "tmp-3", intent: "crear_lote", payload: {} }),
    null,
  ];
  const { normalized, rejected } = normalizeOperations(ops);
  assertEquals(normalized.length, 2);
  assertEquals(rejected.length, 2);
});

Deno.test("missing id gets assigned, duplicate id gets deduped", () => {
  const ops = [
    { intent: "crear_caja", payload: {} },
    { id: "tmp-1", intent: "crear_caja", payload: {} },
    { id: "tmp-1", intent: "crear_caja", payload: {} }, // duplicate
  ];
  const { normalized, logs } = normalizeOperations(ops);
  assertEquals(normalized.length, 3);
  const ids = normalized.map((o) => o.id);
  assertEquals(new Set(ids).size, 3);
  assert(logs.some((l) => l.action === "assigned_id"));
  assert(logs.some((l) => l.action === "deduped_id"));
});

Deno.test("guards against array as operation", () => {
  const { normalized, rejected } = normalizeOperations([["not", "an", "object"]]);
  assertEquals(normalized.length, 0);
  assertEquals(rejected.length, 1);
});
