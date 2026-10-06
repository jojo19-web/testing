import { describe, expect, it } from "vitest";
import { HEALTHY_MODEL_CLASSES } from "./model-classes";

describe("healthy model classes", () => {
  it("keeps the healthy outputs in their reserved model slots", () => {
    expect(HEALTHY_MODEL_CLASSES.map(({ index }) => index)).toEqual([2, 3]);
    expect(HEALTHY_MODEL_CLASSES.map(({ label }) => label)).toEqual(["Healthy Leaf", "Healthy Plant"]);
  });
});
