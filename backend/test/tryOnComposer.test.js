import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { composeTryOnImage } from "../src/services/tryOnComposer.js";

test("try-on render scales frame from guide face pixels instead of product mm width", async () => {
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
    faceWidthMm: 145,
    faceWidthPixelRatio: 0.56,
    frameTopPercent: 39,
    frameOffsetXPercent: 0
  });

  const { data, info } = await sharp(result.outputPath).raw().toBuffer({ resolveWithObject: true });
  const darkBox = getDarkBox(data, info);

  assert.ok(darkBox, "rendered output should contain a frame");
  assert.ok(
    Math.abs(darkBox.width - 515) <= 24,
    `expected rendered frame close to guide pixel width 515px, got ${darkBox.width}px`
  );
});

test("try-on render ignores product mm width when face is not calibrated", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tryon-compose-"));
  const sourcePath = path.join(tempDir, "face.png");
  const publicDir = path.join(tempDir, "public");
  const outputDir = path.join(publicDir, "generated");

  await sharp({
    create: {
      width: 1000,
      height: 1200,
      channels: 3,
      background: "#f4c7ad"
    }
  }).png().toFile(sourcePath);

  const baseRender = await composeTryOnImage({
    sourcePath,
    outputDir,
    product: {
      frameWidthMm: 150,
      color: "black"
    },
    faceWidthMm: 145,
    faceWidthPixelRatio: 0.56
  });
  const wideRender = await composeTryOnImage({
    sourcePath,
    outputDir,
    product: {
      frameWidthMm: 180,
      color: "black"
    },
    faceWidthMm: 145,
    faceWidthPixelRatio: 0.56
  });

  const baseBox = await getRenderedDarkBox(baseRender.outputPath);
  const wideBox = await getRenderedDarkBox(wideRender.outputPath);

  assert.ok(baseBox, "base render should contain a frame");
  assert.ok(wideBox, "wide render should contain a frame");
  assert.ok(
    Math.abs(baseBox.width - wideBox.width) <= 3,
    `expected mm width not to affect uncalibrated render, got ${baseBox.width}px and ${wideBox.width}px`
  );
});

test("try-on render prefers detected face pixel width over fixed guide ratio", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tryon-compose-"));
  const sourcePath = path.join(tempDir, "face.png");
  const publicDir = path.join(tempDir, "public");
  const outputDir = path.join(publicDir, "generated");

  await sharp(Buffer.from(`
    <svg width="1000" height="1200" viewBox="0 0 1000 1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="1000" height="1200" fill="#eef1f4"/>
      <ellipse cx="500" cy="520" rx="320" ry="390" fill="#e0a17d"/>
      <path d="M210 520 C320 480 680 480 790 520" fill="none" stroke="#111827" stroke-width="14"/>
    </svg>
  `))
    .png()
    .toFile(sourcePath);

  const result = await composeTryOnImage({
    sourcePath,
    outputDir,
    product: {
      frameWidthMm: 150,
      color: "black"
    },
    faceWidthPixelRatio: 0.56
  });

  const darkBox = await getRenderedDarkBox(result.outputPath);

  assert.ok(darkBox, "rendered output should contain a frame");
  assert.ok(
    result.render.faceWidthPixelRatio > 0.61,
    `expected detected face ratio over 0.61, got ${result.render.faceWidthPixelRatio}`
  );
  assert.ok(
    Math.abs(darkBox.width - 589) <= 28,
    `expected rendered frame to scale with detected 640px face width, got ${darkBox.width}px`
  );
});

test("try-on render keeps product asset visible width when asset aspect is tall", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tryon-compose-"));
  const sourcePath = path.join(tempDir, "face.png");
  const publicDir = path.join(tempDir, "public");
  const outputDir = path.join(publicDir, "generated");
  const assetDir = path.join(publicDir, "tryon-assets");
  const assetPath = path.join(assetDir, "tall-frame.png");

  await fs.mkdir(assetDir, { recursive: true });
  await sharp(Buffer.from(`
    <svg width="1000" height="1200" viewBox="0 0 1000 1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="1000" height="1200" fill="#eef1f4"/>
      <ellipse cx="500" cy="520" rx="320" ry="390" fill="#e0a17d"/>
    </svg>
  `))
    .png()
    .toFile(sourcePath);
  await sharp(Buffer.from(`
    <svg width="660" height="288" viewBox="0 0 660 288" xmlns="http://www.w3.org/2000/svg">
      <rect width="660" height="288" fill="none"/>
      <rect x="8" y="36" width="644" height="168" rx="42" fill="none" stroke="#111827" stroke-width="18"/>
    </svg>
  `))
    .png()
    .toFile(assetPath);

  const result = await composeTryOnImage({
    sourcePath,
    outputDir,
    product: {
      frameWidthMm: 150,
      tryOnAssetUrl: "/static/tryon-assets/tall-frame.png"
    },
    faceWidthPixelRatio: 0.56
  });

  const darkBox = await getRenderedDarkBox(result.outputPath);

  assert.ok(darkBox, "rendered output should contain a frame");
  assert.ok(
    darkBox.width > 550,
    `expected tall product asset to keep target visual width, got ${darkBox.width}px`
  );
});

async function getRenderedDarkBox(outputPath) {
  const { data, info } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });
  return getDarkBox(data, info);
}

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
