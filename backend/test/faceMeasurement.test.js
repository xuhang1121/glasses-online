import assert from "node:assert/strict";
import test from "node:test";
import { buildFaceMeasurement } from "../src/services/faceMeasurement.js";

test("guide-frame measurement does not expose default face width as calibrated result", () => {
  const measurement = buildFaceMeasurement({
    faceWidthMm: 145,
    measurementMode: "guide-frame",
    faceWidthEdited: false
  });

  assert.equal(measurement.faceWidthMm, null);
  assert.equal(measurement.estimatedFaceWidthMm, 145);
  assert.equal(measurement.faceWidthText, "未校准");
  assert.equal(measurement.isCalibrated, false);
});

test("manual face width is treated as calibrated", () => {
  const measurement = buildFaceMeasurement({
    faceWidthMm: 150,
    measurementMode: "guide-frame",
    faceWidthEdited: true
  });

  assert.equal(measurement.faceWidthMm, 150);
  assert.equal(measurement.faceWidthText, "150mm");
  assert.equal(measurement.isCalibrated, true);
});
