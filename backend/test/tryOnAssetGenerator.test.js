import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { generateTryOnAssetFromCover } from "../src/services/tryOnAssetGenerator.js";

test("auto try-on asset keeps the front frame and removes long product-photo temples", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tryon-asset-"));
  const coverPath = path.join(tempDir, "cover.png");
  const publicDir = path.join(tempDir, "public");

  await sharp(Buffer.from(`
    <svg width="1200" height="600" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="600" fill="white"/>
      <g fill="none" stroke="#55514b" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
        <rect x="120" y="210" width="250" height="145" rx="34"/>
        <rect x="430" y="210" width="250" height="145" rx="34"/>
        <path d="M370 275 C390 245 410 245 430 275"/>
        <path d="M510 220 C545 260 585 300 625 345"/>
        <path d="M680 230 C780 210 980 210 1140 235"/>
      </g>
      <g fill="#111827" font-family="Arial" font-weight="700">
        <text x="255" y="335" font-size="28">SC857 150</text>
        <text x="480" y="335" font-size="42">SEROVA</text>
      </g>
    </svg>
  `))
    .png()
    .toFile(coverPath);

  const publicPath = await generateTryOnAssetFromCover({
    coverPath,
    publicDir,
    productId: "frame-long-temple"
  });
  const outputPath = path.join(publicDir, publicPath.replace("/static/", ""));
  const { data, info } = await sharp(outputPath).raw().toBuffer({ resolveWithObject: true });

  const box = getAlphaBox(data, info);
  assert.ok(box, "generated asset should contain visible pixels");
  assert.ok(
    box.width / box.height < 3.35,
    `expected front-frame aspect, got ${(box.width / box.height).toFixed(2)}`
  );
  assert.ok(
    box.width < 760,
    `expected long right temple to be cropped, got visible width ${box.width}`
  );
  const rightLensInteriorPixels = countVisiblePixels(data, info, {
    left: Math.round(info.width * 0.52),
    top: Math.round(info.height * 0.3),
    width: Math.round(info.width * 0.18),
    height: Math.round(info.height * 0.38)
  });
  assert.ok(
    rightLensInteriorPixels < 120,
    `expected right lens interior to be clear, got ${rightLensInteriorPixels} visible pixels`
  );

});

function getAlphaBox(data, info) {
  let left = info.width;
  let right = -1;
  let top = info.height;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 20) {
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

function countVisiblePixels(data, info, box) {
  let count = 0;

  for (let y = box.top; y < box.top + box.height; y += 1) {
    for (let x = box.left; x < box.left + box.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 20) {
        count += 1;
      }
    }
  }

  return count;
}
