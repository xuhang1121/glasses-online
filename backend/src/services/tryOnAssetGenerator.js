import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function generateTryOnAssetFromCover({ coverPath, publicDir, productId }) {
  const image = sharp(coverPath).rotate();
  const metadata = await image.metadata();
  const width = metadata.width || 1000;
  const height = metadata.height || 1000;
  const crop = getFrameCrop(width, height);
  const outputDir = path.join(publicDir, "tryon-assets");
  const outputName = `${productId}-auto-${Date.now()}.png`;
  const outputPath = path.join(outputDir, outputName);

  await fs.mkdir(outputDir, { recursive: true });

  await image
    .extract(crop)
    .resize({ width: 900, withoutEnlargement: true })
    .removeAlpha()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      for (let index = 0; index < data.length; index += info.channels) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const brightness = (red + green + blue) / 3;
        const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue);
        const isWhiteBackground = brightness > 226 && colorSpread < 28;

        if (isWhiteBackground) {
          data[index + 3] = 0;
        } else if (brightness > 205 && colorSpread < 22) {
          data[index + 3] = 90;
        } else {
          data[index + 3] = 255;
        }
      }

      softenTinyArtifacts(data, info);
      const frontFrameCrop = clampCrop(getFrontFrameCrop(data, info), info);
      const cropped = cropRawImage(data, info, frontFrameCrop);
      const trimmed = trimRawImage(cropped.data, cropped.info);
      const padded = padRawImage(trimmed.data, trimmed.info, 24);
      clearLensInteriors(padded.data, padded.info, {
        left: 0,
        top: 0,
        width: padded.info.width,
        height: padded.info.height
      });

      return sharp(padded.data, {
        raw: {
          width: padded.info.width,
          height: padded.info.height,
          channels: info.channels
        }
      })
        .png()
        .toFile(outputPath);
    });

  return `/static/tryon-assets/${outputName}`;
}

function getFrameCrop(width, height) {
  const top = Math.round(height * 0.28);
  const cropHeight = Math.round(height * 0.46);

  return {
    left: 0,
    top,
    width,
    height: Math.min(cropHeight, height - top)
  };
}

function getFrontFrameCrop(data, info) {
  const visibleBox = getAlphaBox(data, info);
  if (!visibleBox) {
    return { left: 0, top: 0, width: info.width, height: info.height };
  }

  const maxFrontAspect = 2.55;
  const maxFrontWidth = Math.round(visibleBox.height * maxFrontAspect);
  if (visibleBox.width <= maxFrontWidth) {
    return visibleBox;
  }

  const columns = new Array(info.width).fill(0);
  for (let y = visibleBox.top; y < visibleBox.top + visibleBox.height; y += 1) {
    for (let x = visibleBox.left; x < visibleBox.left + visibleBox.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 20) {
        columns[x] += 1;
      }
    }
  }

  let bestLeft = visibleBox.left;
  let bestScore = -1;
  let score = 0;
  for (let x = visibleBox.left; x < visibleBox.left + maxFrontWidth; x += 1) {
    score += columns[x] || 0;
  }

  for (
    let left = visibleBox.left;
    left <= visibleBox.left + visibleBox.width - maxFrontWidth;
    left += 1
  ) {
    if (score > bestScore) {
      bestScore = score;
      bestLeft = left;
    }
    score -= columns[left] || 0;
    score += columns[left + maxFrontWidth] || 0;
  }

  return {
    left: bestLeft,
    top: visibleBox.top,
    width: maxFrontWidth,
    height: visibleBox.height
  };
}

function clampCrop(crop, info) {
  const left = clamp(Math.round(crop.left), 0, Math.max(0, info.width - 1));
  const top = clamp(Math.round(crop.top), 0, Math.max(0, info.height - 1));
  const width = clamp(Math.round(crop.width), 1, info.width - left);
  const height = clamp(Math.round(crop.height), 1, info.height - top);

  return { left, top, width, height };
}

function cropRawImage(data, info, crop) {
  const cropped = Buffer.alloc(crop.width * crop.height * info.channels);

  for (let y = 0; y < crop.height; y += 1) {
    const sourceStart = ((crop.top + y) * info.width + crop.left) * info.channels;
    const sourceEnd = sourceStart + crop.width * info.channels;
    const targetStart = y * crop.width * info.channels;
    data.copy(cropped, targetStart, sourceStart, sourceEnd);
  }

  return {
    data: cropped,
    info: {
      width: crop.width,
      height: crop.height,
      channels: info.channels
    }
  };
}

function trimRawImage(data, info) {
  const box = getAlphaBox(data, info);
  if (!box) {
    return { data, info };
  }

  return cropRawImage(data, info, {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height
  });
}

function padRawImage(data, info, padding) {
  const width = info.width + padding * 2;
  const height = info.height + padding * 2;
  const channels = 4;
  const padded = Buffer.alloc(width * height * channels);

  for (let y = 0; y < info.height; y += 1) {
    const sourceStart = y * info.width * channels;
    const sourceEnd = sourceStart + info.width * channels;
    const targetStart = ((y + padding) * width + padding) * channels;
    data.copy(padded, targetStart, sourceStart, sourceEnd);
  }

  return {
    data: padded,
    info: { width, height, channels }
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function softenTinyArtifacts(data, info) {
  const alphaThreshold = 20;
  const visited = new Uint8Array(info.width * info.height);
  const stack = [];
  const component = [];
  const minUsefulArea = Math.max(90, Math.round(info.width * info.height * 0.00035));

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixelIndex = y * info.width + x;
      if (visited[pixelIndex] || getAlpha(data, info, pixelIndex) <= alphaThreshold) {
        continue;
      }

      stack.length = 0;
      component.length = 0;
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;
      visited[pixelIndex] = 1;
      stack.push(pixelIndex);

      while (stack.length) {
        const current = stack.pop();
        component.push(current);
        const cx = current % info.width;
        const cy = Math.floor(current / info.width);
        left = Math.min(left, cx);
        right = Math.max(right, cx);
        top = Math.min(top, cy);
        bottom = Math.max(bottom, cy);

        visitNeighbor(cx - 1, cy);
        visitNeighbor(cx + 1, cy);
        visitNeighbor(cx, cy - 1);
        visitNeighbor(cx, cy + 1);
      }

      const boxWidth = right - left + 1;
      const boxHeight = bottom - top + 1;
      const isUsefulPart = component.length >= minUsefulArea
        || boxWidth >= info.width * 0.08
        || boxHeight >= info.height * 0.18;

      if (!isUsefulPart) {
        for (const index of component) {
          data[index * info.channels + 3] = 0;
        }
      }
    }
  }

  function visitNeighbor(x, y) {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) {
      return;
    }

    const index = y * info.width + x;
    if (visited[index] || getAlpha(data, info, index) <= alphaThreshold) {
      return;
    }

    visited[index] = 1;
    stack.push(index);
  }
}

function clearLensInteriors(data, info, frontFrameCrop) {
  const boxes = getLensClearAreas(frontFrameCrop);

  for (const box of boxes) {
    clearBox(data, info, box);
  }

  removeLensTextArtifacts(data, info, frontFrameCrop);
}

function clearBox(data, info, box) {
  const left = clamp(Math.round(box.left), 0, info.width - 1);
  const top = clamp(Math.round(box.top), 0, info.height - 1);
  const right = clamp(Math.round(box.left + box.width), left, info.width);
  const bottom = clamp(Math.round(box.top + box.height), top, info.height);

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      data[(y * info.width + x) * info.channels + 3] = 0;
    }
  }
}

function removeLensTextArtifacts(data, info, frontFrameCrop) {
  const visited = new Uint8Array(info.width * info.height);
  const stack = [];
  const component = [];
  const lensArea = getLensInteriorArea(frontFrameCrop);
  const lensTextAreas = getLensTextAreas(frontFrameCrop);

  for (let y = lensArea.top; y < lensArea.top + lensArea.height; y += 1) {
    for (let x = lensArea.left; x < lensArea.left + lensArea.width; x += 1) {
      const pixelIndex = y * info.width + x;
      if (isDarkTextCandidate(data, info, pixelIndex) && isInsideAnyBox(x, y, lensTextAreas)) {
        data[pixelIndex * info.channels + 3] = 0;
      }
    }
  }

  for (let y = lensArea.top; y < lensArea.top + lensArea.height; y += 1) {
    for (let x = lensArea.left; x < lensArea.left + lensArea.width; x += 1) {
      const pixelIndex = y * info.width + x;
      if (visited[pixelIndex] || !isDarkTextCandidate(data, info, pixelIndex)) {
        continue;
      }

      stack.length = 0;
      component.length = 0;
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;
      visited[pixelIndex] = 1;
      stack.push(pixelIndex);

      while (stack.length) {
        const current = stack.pop();
        component.push(current);
        const cx = current % info.width;
        const cy = Math.floor(current / info.width);
        left = Math.min(left, cx);
        right = Math.max(right, cx);
        top = Math.min(top, cy);
        bottom = Math.max(bottom, cy);

        visitNeighbor(cx - 1, cy);
        visitNeighbor(cx + 1, cy);
        visitNeighbor(cx, cy - 1);
        visitNeighbor(cx, cy + 1);
      }

      const boxWidth = right - left + 1;
      const boxHeight = bottom - top + 1;
      const isTextLike = component.length < info.width * info.height * 0.025
        && boxWidth < info.width * 0.24
        && boxHeight < info.height * 0.2
        && top >= lensArea.top
        && bottom <= lensArea.top + lensArea.height;

      if (isTextLike) {
        for (const index of component) {
          data[index * info.channels + 3] = 0;
        }
      }
    }
  }

  function visitNeighbor(x, y) {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) {
      return;
    }

    const index = y * info.width + x;
    if (visited[index] || !isDarkTextCandidate(data, info, index)) {
      return;
    }

    visited[index] = 1;
    stack.push(index);
  }
}

function getLensClearAreas(crop) {
  return [
    {
      left: crop.left + Math.round(crop.width * 0.13),
      top: crop.top + Math.round(crop.height * 0.3),
      width: Math.round(crop.width * 0.27),
      height: Math.round(crop.height * 0.43)
    },
    {
      left: crop.left + Math.round(crop.width * 0.52),
      top: crop.top + Math.round(crop.height * 0.3),
      width: Math.round(crop.width * 0.27),
      height: Math.round(crop.height * 0.43)
    }
  ];
}

function getLensInteriorArea(crop) {
  const leftInset = Math.round(crop.width * 0.09);
  const topInset = Math.round(crop.height * 0.3);
  const bottomInset = Math.round(crop.height * 0.12);

  return {
    left: crop.left + leftInset,
    top: crop.top + topInset,
    width: Math.max(1, crop.width - leftInset * 2),
    height: Math.max(1, crop.height - topInset - bottomInset)
  };
}

function getLensTextAreas(crop) {
  return [
    {
      left: crop.left + Math.round(crop.width * 0.06),
      top: crop.top + Math.round(crop.height * 0.45),
      width: Math.round(crop.width * 0.35),
      height: Math.round(crop.height * 0.42)
    },
    {
      left: crop.left + Math.round(crop.width * 0.44),
      top: crop.top + Math.round(crop.height * 0.45),
      width: Math.round(crop.width * 0.36),
      height: Math.round(crop.height * 0.42)
    }
  ];
}

function isInsideAnyBox(x, y, boxes) {
  return boxes.some((box) => x >= box.left
    && x < box.left + box.width
    && y >= box.top
    && y < box.top + box.height);
}

function isDarkTextCandidate(data, info, pixelIndex) {
  const offset = pixelIndex * info.channels;
  const alpha = data[offset + 3];
  if (alpha <= 20) {
    return false;
  }

  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const brightness = (red + green + blue) / 3;
  const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

  return brightness < 150 && spread < 75;
}

function getAlpha(data, info, pixelIndex) {
  return data[pixelIndex * info.channels + 3];
}
