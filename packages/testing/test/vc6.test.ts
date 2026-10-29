import { describe, expect, it } from "vitest";
import { JOB_STATES, readVocabulary, ROUTES, ROUTE_RESPONSES, type RouteKey } from "@aiuteur/contract";
import { createMockServer } from "@aiuteur/testing";

// VC6 (VERIFICATION §4 Contract): the client against the generated mock server, and an unknown closed-vocabulary value
// rendering neutrally. "Server against the same schema" is the api suites, which parse every answer with these schemas.
const mock = createMockServer();
const concrete = (path: string) => path.replace(/:[A-Za-z]+/g, "01890000-0000-7000-8000-000000000001");

describe("VC6: the generated mock server answers every owned route with a body its response schema accepts", () => {
  const owned = ROUTES.filter((r) => r.access !== "auth");
  it("covers every owned route, and the response table has no extra key", () => {
    expect(owned.length).toBeGreaterThan(10);
    expect(Object.keys(ROUTE_RESPONSES).sort()).toStrictEqual(owned.map((r) => `${r.method} ${r.path}`).sort());
  });
  it.each(owned.map((r) => [`${r.method} ${r.path}`, r] as const))("%s", async (key, route) => {
    const response = mock(new Request(`https://mock.test${concrete(route.path)}`, { method: route.method }));
    const { status, schema } = ROUTE_RESPONSES[key as RouteKey];
    expect(response.status).toBe(status);
    expect(schema.safeParse(await response.json()).success, key).toBe(true);
  });
  it("answers an unknown path with the contract's not-found", async () => {
    const response = mock(new Request("https://mock.test/api/nothing"));
    expect([response.status, await response.json()]).toStrictEqual([404, { code: "not-found" }]);
  });
});

describe("VC6: an unknown closed-vocabulary value renders neutrally", () => {
  it("reads a known value as itself and anything else as the neutral reading, never throwing", () => {
    expect(readVocabulary(JOB_STATES, "queued")).toStrictEqual({ known: true, value: "queued" });
    const neutral = { known: false, tone: "neutral", label: "Unknown" };
    for (const raw of ["teleporting", "", "QUEUED", null, undefined, 7, {}]) expect(readVocabulary(JOB_STATES, raw)).toStrictEqual(neutral);
  });
});
