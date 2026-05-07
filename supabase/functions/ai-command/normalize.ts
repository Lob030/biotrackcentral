// Defensive normalization layer between LLM tool output and zod validation.
// The LLM (especially Gemini via tool-calling) occasionally returns:
//   - operations as JSON-encoded strings instead of objects
//   - { data: {...} } instead of { payload: {...} }
//   - missing/duplicate ids
//   - non-object junk entries
// This module never throws: it returns either a normalized object or null,
// and always logs what it did so we can trace malformed AI outputs.

export interface NormalizationLog {
  index: number;
  action:
    | "parsed_string"
    | "data_to_payload"
    | "assigned_id"
    | "deduped_id"
    | "rejected"
    | "parsed_payload_string"
    | "invalid_payload_string";
  detail?: string;
}

export interface NormalizeResult {
  normalized: Array<Record<string, unknown>>;
  rejected: Array<{ index: number; raw: unknown; reason: string }>;
  logs: NormalizationLog[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Try to coerce one raw operation into a plain object. Returns null if impossible. */
function coerceToObject(raw: unknown, index: number, logs: NormalizationLog[]): Record<string, unknown> | null {
  if (isPlainObject(raw)) return { ...raw };

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (isPlainObject(parsed)) {
        logs.push({ index, action: "parsed_string", detail: "Operation was a JSON string; parsed to object." });
        return { ...parsed };
      }
    } catch (e) {
      // unparsable JSON string — drop
      console.warn("[ai-normalize] unparsable string operation", index, (e as Error).message);
    }
  }
  return null;
}

export function normalizeOperations(rawOps: unknown[]): NormalizeResult {
  const normalized: Array<Record<string, unknown>> = [];
  const rejected: NormalizeResult["rejected"] = [];
  const logs: NormalizationLog[] = [];
  const seenIds = new Set<string>();

  rawOps.forEach((raw, index) => {
    const obj = coerceToObject(raw, index, logs);
    if (!obj) {
      logs.push({ index, action: "rejected", detail: "Not an object and not a JSON-decodable string." });
      rejected.push({ index, raw, reason: "Operación no es un objeto válido." });
      console.warn("[ai-normalize] rejected non-object op at", index, "type=", typeof raw);
      return;
    }

    // data → payload
    if (!("payload" in obj) && "data" in obj && isPlainObject(obj.data)) {
      obj.payload = obj.data;
      delete obj.data;
      logs.push({ index, action: "data_to_payload" });
    }

    // id hardening
    const currentId = typeof obj.id === "string" ? obj.id.trim() : "";
    if (!currentId) {
      obj.id = `tmp-${index + 1}`;
      logs.push({ index, action: "assigned_id", detail: String(obj.id) });
    } else if (seenIds.has(currentId)) {
      const newId = `tmp-${index + 1}`;
      logs.push({ index, action: "deduped_id", detail: `${currentId} → ${newId}` });
      obj.id = newId;
    } else {
      obj.id = currentId;
    }
    seenIds.add(String(obj.id));

    normalized.push(obj);
  });

  if (logs.length > 0) {
    console.log("[ai-normalize] applied", logs.length, "normalization(s):", JSON.stringify(logs));
  }
  return { normalized, rejected, logs };
}
