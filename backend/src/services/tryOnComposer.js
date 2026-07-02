import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TRY_ON_FRAME_TO_FACE_RATIO = 0.92;
const DEFAULT_FACE_WIDTH_PIXEL_RATIO = 0.56;
const DEFAULT_EYE_LINE_RATIO = 0.45;

export async function composeTryOnImage({
  sourcePath,
  product,
  outputDir,
  faceWidthMm,
  faceWidthPixelRatio,
  renderMode = "3d",
  headYawDeg = 0,
  frameTopPercent = 39,
  frameWidthPercent = 58,
  frameOffsetXPercent = 0
}) {
  await fs.mkdir(outputDir, { recursive: true });

  const image = sharp(sourcePath).rotate();
  const metadata = await image.metadata();
  const sourceWidth = metadata.width || 900;
  const sourceHeight = metadata.height || 1200;
  const width = Math.min(sourceWidth, 1200);
  const height = Math.round(sourceHeight * (width / sourceWidth));
  const normalizedImage = image.resize({ width, withoutEnlargement: true });

  const guideFaceWidthPx = getGuideFaceWidthPx({
    imageWidth: width,
    faceWidthPixelRatio
  });
  const detectedFace = await detectFaceSkinBox(normalizedImage.clone(), { imageWidth: width });
  const measuredFaceWidthPx = detectedFace
    ? clamp(detectedFace.width, width * 0.35, width * 0.9)
    : guideFaceWidthPx;
  const measuredEyeLinePx = height * DEFAULT_EYE_LINE_RATIO;
  const frameTopRatio = clamp(Number(frameTopPercent) || 39, 18, 62) / 100;
  const frameOffsetXRatio = clamp(Number(frameOffsetXPercent) || 0, -20, 20) / 100;
  const frameWidth = getPixelScaledFrameWidth({
    imageWidth: width,
    measuredFaceWidthPx
  });
  const preferredFrameHeight = Math.round(frameWidth * 0.28);
  const hasFrameAsset = product.tryOnAssetUrl?.startsWith("/static/tryon-assets/");
  const frameAsset = hasFrameAsset
    ? await buildProductFrameAsset({
      product,
      publicDir: path.resolve(outputDir, ".."),
      frameWidth
    })
    : {
      input: Buffer.from(buildFrameSvg({
        width: frameWidth,
        height: preferredFrameHeight,
        color: product.color,
        renderMode,
        headYawDeg
      })),
      width: frameWidth,
      height: preferredFrameHeight
    };
  const frameHeight = frameAsset.height;
  const left = Math.round((width - frameAsset.width) / 2 + width * frameOffsetXRatio);
  const verticalAdjustment = height * ((frameTopRatio - 0.39) * 0.5);
  const frameTop = Math.round(measuredEyeLinePx - frameHeight * 0.48 + verticalAdjustment);
  const top = clamp(frameTop, 0, Math.max(0, height - frameHeight));

  const fileName = `tryon-${Date.now()}-${Math.round(Math.random() * 10000)}.png`;
  const outputPath = path.join(outputDir, fileName);

  await normalizedImage
    .composite([
      {
        input: frameAsset.input,
        left,
        top
      }
    ])
    .png()
    .toFile(outputPath);

  return {
    outputPath,
    publicPath: `/static/generated/${fileName}`,
    render: {
      scaleMode: "guide-frame-pixel",
      faceWidthPixelRatio: measuredFaceWidthPx / width,
      detectedFaceWidthPixelRatio: detectedFace ? detectedFace.width / width : null,
      facePixelSource: detectedFace ? "skin-detection" : "guide-frame",
      frameToFaceRatio: TRY_ON_FRAME_TO_FACE_RATIO,
      frameWidthPx: frameAsset.width,
      frameHeightPx: frameHeight,
      leftPx: left,
      topPx: top,
      eyeLinePx: Math.round(measuredEyeLinePx)
    }
  };
}

async function buildProductFrameAsset({ product, publicDir, frameWidth }) {
  if (!product.tryOnAssetUrl?.startsWith("/static/tryon-assets/")) {
    const frameHeight = Math.round(frameWidth * 0.28);
    return {
      input: Buffer.from(buildFrameSvg({
      width: frameWidth,
      height: frameHeight,
      color: product.color,
      renderMode: "3d",
      headYawDeg: 0
      })),
      width: frameWidth,
      height: frameHeight
    };
  }

  const relativePath = product.tryOnAssetUrl.replace("/static/", "");
  const assetPath = path.resolve(publicDir, relativePath);
  if (!assetPath.startsWith(publicDir)) {
    throw new Error("试戴素材路径无效");
  }

  const metadata = await sharp(assetPath).metadata();
  const assetWidth = metadata.width || frameWidth;
  const assetHeight = metadata.height || Math.round(frameWidth * 0.28);
  const frameHeight = Math.round(frameWidth * (assetHeight / assetWidth));
  const input = await sharp(assetPath)
    .resize({ width: frameWidth, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  return {
    input,
    width: frameWidth,
    height: frameHeight
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getGuideFaceWidthPx({ imageWidth, faceWidthPixelRatio }) {
  const ratio = Number(faceWidthPixelRatio);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return imageWidth * DEFAULT_FACE_WIDTH_PIXEL_RATIO;
  }

  return imageWidth * clamp(ratio, 0.35, 0.9);
}

function getPixelScaledFrameWidth({ imageWidth, measuredFaceWidthPx }) {
  const fallbackWidth = imageWidth * DEFAULT_FACE_WIDTH_PIXEL_RATIO * TRY_ON_FRAME_TO_FACE_RATIO;
  const frameWidth = (measuredFaceWidthPx || fallbackWidth) * TRY_ON_FRAME_TO_FACE_RATIO;
  return Math.round(clamp(frameWidth, imageWidth * 0.35, imageWidth * 0.78));
}

async function detectFaceSkinBox(image, { imageWidth }) {
  const sampleWidth = 240;
  const { data, info } = await image
    .resize({ width: sampleWidth, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const box = getSkinBox(data, info);
  if (!box) {
    return null;
  }

  const imageScale = imageWidth / info.width;
  return {
    left: box.left * imageScale,
    top: box.top * imageScale,
    width: box.width * imageScale,
    height: box.height * imageScale
  };
}

function getSkinBox(data, info) {
  const minY = Math.round(info.height * 0.12);
  const maxY = Math.round(info.height * 0.88);
  let left = info.width;
  let right = -1;
  let top = info.height;
  let bottom = -1;
  let count = 0;

  for (let y = minY; y < maxY; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      if (!isSkinPixel(data[index], data[index + 1], data[index + 2])) {
        continue;
      }

      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      count += 1;
    }
  }

  if (right < left || bottom < top) {
    return null;
  }

  const width = right - left + 1;
  const height = bottom - top + 1;
  const area = width * height;
  const fillRatio = count / area;
  const isPlausibleFace = width >= info.width * 0.38
    && width <= info.width * 0.92
    && height >= info.height * 0.28
    && fillRatio >= 0.28;

  if (!isPlausibleFace) {
    return null;
  }

  return { left, top, width, height };
}

function isSkinPixel(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return red > 95
    && green > 45
    && blue > 30
    && red > blue + 15
    && red >= green - 10
    && green >= blue - 5
    && max - min > 15;
}

function buildFrameSvg({ width, height, color, renderMode, headYawDeg }) {
  const stroke = color.includes("茶") ? "#7b5138" : color.includes("银") ? "#20242a" : "#4a4d55";
  const yaw = renderMode === "3d" ? Math.max(-25, Math.min(25, Number(headYawDeg) || 0)) / 25 : 0;
  const leftNear = yaw < 0;
  const rightNear = yaw > 0;
  const centerX = width * (0.5 + yaw * 0.035);
  const baseLensWidth = width * 0.38;
  const leftLensWidth = baseLensWidth * (1 - yaw * 0.14);
  const rightLensWidth = baseLensWidth * (1 + yaw * 0.14);
  const leftLensHeight = height * (leftNear ? 0.83 : 0.75);
  const rightLensHeight = height * (rightNear ? 0.83 : 0.75);
  const leftX = centerX - width * 0.08 - leftLensWidth;
  const rightX = centerX + width * 0.08;
  const leftY = height * (leftNear ? 0.06 : 0.12);
  const rightY = height * (rightNear ? 0.06 : 0.12);
  const bridgeWidth = width * 0.16;
  const strokeWidth = Math.max(5, width * 0.018);
  const templeDepth = width * 0.13;
  const leftTempleEnd = leftX - templeDepth * (leftNear ? 1.15 : 0.55);
  const rightTempleEnd = rightX + rightLensWidth + templeDepth * (rightNear ? 1.15 : 0.55);
  const leftOpacity = leftNear || yaw === 0 ? 1 : 0.58;
  const rightOpacity = rightNear || yaw === 0 ? 1 : 0.58;
  const shadowOpacity = renderMode === "3d" ? 0.18 : 0.08;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="${yaw * 8}" dy="${height * 0.035}" stdDeviation="${width * 0.012}" flood-color="#111827" flood-opacity="${shadowOpacity}" />
        </filter>
        <linearGradient id="lensTint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.35" />
          <stop offset="1" stop-color="#c7d7e8" stop-opacity="0.12" />
        </linearGradient>
      </defs>
      <g filter="url(#softShadow)" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
        <path opacity="${leftOpacity}" d="M ${leftX} ${leftY + leftLensHeight * 0.52} C ${leftX - width * 0.04} ${leftY + leftLensHeight * 0.34}, ${leftTempleEnd} ${leftY + leftLensHeight * 0.22}, ${leftTempleEnd} ${leftY + leftLensHeight * 0.08}" />
        <path opacity="${rightOpacity}" d="M ${rightX + rightLensWidth} ${rightY + rightLensHeight * 0.52} C ${rightX + rightLensWidth + width * 0.04} ${rightY + rightLensHeight * 0.34}, ${rightTempleEnd} ${rightY + rightLensHeight * 0.22}, ${rightTempleEnd} ${rightY + rightLensHeight * 0.08}" />
        <rect opacity="${leftOpacity}" x="${leftX}" y="${leftY}" width="${leftLensWidth}" height="${leftLensHeight}" rx="${height * 0.24}" />
        <rect opacity="${rightOpacity}" x="${rightX}" y="${rightY}" width="${rightLensWidth}" height="${rightLensHeight}" rx="${height * 0.24}" />
        <path d="M ${centerX - bridgeWidth / 2} ${height * 0.48} C ${centerX - bridgeWidth * 0.2} ${height * 0.31}, ${centerX + bridgeWidth * 0.2} ${height * 0.31}, ${centerX + bridgeWidth / 2} ${height * 0.48}" />
      </g>
      <g fill="url(#lensTint)" stroke="rgba(255,255,255,0.42)" stroke-width="2">
        <rect opacity="${leftOpacity}" x="${leftX}" y="${leftY}" width="${leftLensWidth}" height="${leftLensHeight}" rx="${height * 0.24}" />
        <rect opacity="${rightOpacity}" x="${rightX}" y="${rightY}" width="${rightLensWidth}" height="${rightLensHeight}" rx="${height * 0.24}" />
      </g>
      <path d="M ${leftX + leftLensWidth * 0.18} ${leftY + leftLensHeight * 0.2} L ${leftX + leftLensWidth * 0.42} ${leftY + leftLensHeight * 0.08}" stroke="#ffffff" stroke-width="3" stroke-opacity="0.45" stroke-linecap="round" />
      <path d="M ${rightX + rightLensWidth * 0.18} ${rightY + rightLensHeight * 0.2} L ${rightX + rightLensWidth * 0.42} ${rightY + rightLensHeight * 0.08}" stroke="#ffffff" stroke-width="3" stroke-opacity="0.45" stroke-linecap="round" />
    </svg>
  `;
}
