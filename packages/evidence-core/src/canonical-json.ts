import { AgentProofError } from "./errors.js";

function serialize(value: unknown, ancestors: Set<object>): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new AgentProofError(
          "AP_CANONICAL_JSON_INVALID",
          "Canonical JSON cannot contain a non-finite number.",
        );
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object": {
      if (ancestors.has(value)) {
        throw new AgentProofError(
          "AP_CANONICAL_JSON_CYCLE",
          "Canonical JSON cannot contain a cyclic value.",
        );
      }

      ancestors.add(value);
      try {
        if (Array.isArray(value)) {
          const serialized: string[] = [];
          for (let index = 0; index < value.length; index += 1) {
            if (!Object.hasOwn(value, index)) {
              throw new AgentProofError(
                "AP_CANONICAL_JSON_INVALID",
                "Canonical JSON cannot contain a sparse array.",
              );
            }
            serialized.push(serialize(value[index], ancestors));
          }
          const unexpectedKeys = Object.keys(value).filter(
            (key) => !/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= value.length,
          );
          if (unexpectedKeys.length > 0 || Object.getOwnPropertySymbols(value).length > 0) {
            throw new AgentProofError(
              "AP_CANONICAL_JSON_INVALID",
              "Canonical JSON arrays cannot contain custom properties.",
            );
          }
          return `[${serialized.join(",")}]`;
        }

        const prototype = Object.getPrototypeOf(value) as object | null;
        if (prototype !== Object.prototype && prototype !== null) {
          throw new AgentProofError(
            "AP_CANONICAL_JSON_INVALID",
            "Canonical JSON accepts only plain objects and arrays.",
          );
        }

        const record = value as Record<string, unknown>;
        const keys = Object.keys(record).sort();
        if (Reflect.ownKeys(record).length !== keys.length) {
          throw new AgentProofError(
            "AP_CANONICAL_JSON_INVALID",
            "Canonical JSON objects cannot contain hidden or symbol properties.",
          );
        }
        const entries = keys.map((key) => {
          const item = record[key];
          if (item === undefined) {
            throw new AgentProofError(
              "AP_CANONICAL_JSON_INVALID",
              `Canonical JSON property "${key}" is undefined.`,
            );
          }
          return `${JSON.stringify(key)}:${serialize(item, ancestors)}`;
        });
        return `{${entries.join(",")}}`;
      } finally {
        ancestors.delete(value);
      }
    }
    default:
      throw new AgentProofError(
        "AP_CANONICAL_JSON_INVALID",
        `Canonical JSON cannot contain a ${typeof value}.`,
      );
  }
}

export function canonicalJson(value: unknown): string {
  return serialize(value, new Set<object>());
}
