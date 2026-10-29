import { describe, expect, it } from "vitest";
import { bootCatalogue, CatalogueInvalid, loadCatalogue, readiness } from "@aiuteur/providers";
import { SYNTHETIC_CATALOGUE_DATA } from "@aiuteur/testing";

// VC10 (VERIFICATION §3.2): the fake-never-default lines whose code lives in `providers`. Lines 1, 2, 3, 5 and 7 are
// tested where their code is (fake-transport.test.ts, arch-rules, static-rules, gate.test.ts); line 8's nightly derived
// check is tested on a real database in t0-05.test.ts.
const real = (): unknown => {
  const data = structuredClone(SYNTHETIC_CATALOGUE_DATA) as { offerings: { profile: { kind: string } }[] };
  for (const offering of data.offerings) offering.profile.kind = "real";
  return data;
};
const oneFake = (): unknown => {
  const data = real() as { offerings: { profile: { kind: string } }[] };
  data.offerings[3]!.profile.kind = "fake";
  return data;
};

describe("VC10 line 4: the Catalogue loader refuses a production boot that loads a fake Offering", () => {
  it("refuses production with fakes, even a single one among real Offerings, and names each", () => {
    expect(() => bootCatalogue("production", SYNTHETIC_CATALOGUE_DATA)).toThrow(CatalogueInvalid);
    expect(() => bootCatalogue("production", oneFake())).toThrow(/fake Offering fake-video in a production boot/);
  });
  it("boots production with real Offerings only, and boots every other environment with fakes", () => {
    expect(bootCatalogue("production", real()).offerings).toHaveLength(5);
    for (const environment of ["local", "ci", "staging"] as const) expect(bootCatalogue(environment, SYNTHETIC_CATALOGUE_DATA).offerings).toHaveLength(5);
  });
});

describe("VC10 line 8: readiness and the heartbeat fail when a production process reports a fake Offering", () => {
  it("is not ready in production with a fake loaded, and says which", () => {
    expect(readiness("production", loadCatalogue(oneFake()))).toStrictEqual({ ready: false, fakeOfferings: ["fake-video"] });
  });
  it("is ready in production with real Offerings, and ready elsewhere with fakes", () => {
    expect(readiness("production", loadCatalogue(real()))).toStrictEqual({ ready: true });
    expect(readiness("staging", loadCatalogue(SYNTHETIC_CATALOGUE_DATA))).toStrictEqual({ ready: true });
  });
});
