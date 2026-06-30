import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function composeTryOnImage({
  sourcePath,
  product,
  outputDir,
  renderMode = "3d",
  headYawDeg = 0
}) {
  await fs.mkdir(outputDir, { recursive: true });

  const image = sharp(sourcePath).rotate();
  const metadata = await image.metadata();
  const sourceWidth = metadata.width || 900;
  const sourceHeight = metadata.height || 1200;
  const width = Math.min(sourceWidth, 1200);
  const height = Math.round(sourceHeight * (width / sourceWidth));

  const frameWidth = Math.round(width * 0.58);
  const frameHeight = Math.round(frameWidth * 0.28);
  const left = Math.round((width - frameWidth) / 2);
  const top = Math.round(height * 0.34);
  const frameSvg = buildFrameSvg({
    width: frameWidth,
    height: frameHeight,
    color: product.color,
    renderMode,
    headYawDeg
  });

  const fileName = `tryon-${Date.now()}-${Math.round(Math.random() * 10000)}.png`;
  const outputPath = path.join(outputDir, fileName);

  await image
    .resize({ width, withoutEnlargement: true })
    .composite([
      {
        input: Buffer.from(frameSvg),
        left,
        top
      }
    ])
    .png()
    .toFile(outputPath);

  return {
    outputPath,
    publicPath: `/static/generated/${fileName}`
  };
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
