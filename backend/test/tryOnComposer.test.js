import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { composeTryOnImage } from "../src/services/tryOnComposer.js";

test("try-on render scales frame width from measured face width and product mm width", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tryon-compose-"));
  const sourcePath = path.join(tempDir, "face.png");
  const publicDir = path.join(tempDir, "public");
  const outputDir = path.join(publicDir, "generated");
  const assetDir = path.join(publicDir, "tryon-assets");
  const assetPath = path.join(assetDir, "frame.png");

  await fs.mkdir(assetDir, { recursive: true });
  await sharp({
    create: {
      width: 1000,
      height: 1200,
      channels: 3,
      background: "#f4c7ad"
    }
  }).png().toFile(sourcePath);
  await sharp(Buffer.from(`
    <svg width="600" height="160" viewBox="0 0 600 160" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="160" fill="none"/>
      <rect x="20" y="28" width="238" height="104" rx="26" fill="none" stroke="#111827" stroke-width="18"/>
      <rect x="342" y="28" width="238" height="104" rx="26" fill="none" stroke="#111827" stroke-width="18"/>
      <path d="M258 82 C292 54 308 54 342 82" fill="none" stroke="#111827" stroke-width="18"/>
    </svg>
  `)).png().toFile(assetPath);

  const result = await composeTryOnImage({
    sourcePath,
    outputDir,
    product: {
      frameWidthMm: 150,
      tryOnAssetUrl: "/static/tryon-assets/frame.png"
    },
    faceWidthMm: 150,
    faceWidthPixelRatio: 0.62,
    frameTopPercent: 39,
    frameOffsetXPercent: 0
  });

  const { data, info } = await sharp(result.outputPath).raw().toBuffer({ resolveWithObject: true });
  const darkBox = getDarkBox(data, info);

  assert.ok(darkBox, "rendered output should contain a frame");
  assert.ok(
    Math.abs(darkBox.width - 620) <= 24,
    `expected rendered frame close to measured face width 620px, got ${darkBox.width}px`
  );
});

function getDarkBox(data, info) {
  let left = info.width;
  let right = -1;
  let top = info.height;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
      if (brightness < 80) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) {
    return null;
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1
  };
}
