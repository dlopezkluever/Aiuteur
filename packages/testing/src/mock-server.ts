import { ROUTES, ROUTE_RESPONSES, responseJsonSchema, type RouteKey } from "@aiuteur/contract";

// VC6: the generated mock server. Every answer is derived from the contract's response schemas, so it cannot drift from them.
type Json = Record<string, unknown>;
const UUID_V7 = "01890000-0000-7000-8000-000000000001";
const UUID_V4 = "11111111-1111-4111-8111-111111111111";

/** Optional properties are included: a refinement may require one beside another (a run that names its Generation).
 * The first valid-looking value of a JSON Schema (draft 2020-12 as Zod emits it). Deterministic. */
export function sample(schema: Json): unknown {
  if ("const" in schema) return schema["const"];
  if (Array.isArray(schema["enum"])) return schema["enum"][0];
  for (const key of ["anyOf", "oneOf"] as const) {
    const options = schema[key];
    // A nullable value is null: the plainest answer, and the one a sibling refinement most often expects.
    if (Array.isArray(options)) return sample((options.find((o) => (o as Json)["type"] === "null") ?? options[0]) as Json);
  }
  if (Array.isArray(schema["allOf"])) return Object.assign({}, ...(schema["allOf"] as Json[]).map((s) => sample(s) as object));
  const type = Array.isArray(schema["type"]) ? schema["type"][0] : schema["type"];
  switch (type) {
    case "object": {
      const properties = (schema["properties"] ?? {}) as Record<string, Json>;
      return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, sample(value)]));
    }
    case "array": return Array.from({ length: Number(schema["minItems"] ?? 0) }, () => sample((schema["items"] ?? {}) as Json));
    case "integer": case "number": return Math.max(Number(schema["minimum"] ?? 0), Number(schema["exclusiveMinimum"] ?? -Infinity) + 1, 1);
    case "boolean": return false;
    case "null": return null;
    case "string": {
      const format = schema["format"];
      if (format === "uuid") return String(schema["pattern"] ?? "").includes("-4[") ? UUID_V4 : UUID_V7;
      if (format === "date-time") return "2026-01-01T00:00:00.000Z";
      if (format === "date") return "2026-01-01";
      if (format === "email") return "mock@example.test";
      return "x".repeat(Math.max(Number(schema["minLength"] ?? 1), 1));
    }
    default: return {};
  }
}

const matchers = ROUTES.filter((r) => r.access !== "auth").map((route) => ({
  key: `${route.method} ${route.path}` as RouteKey,
  pattern: new RegExp(`^${route.path.replace(/:[A-Za-z]+/g, "[^/]+")}$`),
  method: route.method as string,
}));

/** A mock of the contract's API. Returns each route's response schema's sample with its status; anything else is the contract's `not-found`. */
export function createMockServer(): (request: Request) => Response {
  return (request) => {
    const path = new URL(request.url).pathname;
    const hit = matchers.find((m) => m.method === request.method && m.pattern.test(path));
    if (!hit) return Response.json({ code: "not-found" }, { status: 404 });
    return Response.json(sample(responseJsonSchema(hit.key)), { status: ROUTE_RESPONSES[hit.key].status });
  };
}
