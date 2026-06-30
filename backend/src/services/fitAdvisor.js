export function buildFitAdvice({ frameWidthMm, faceWidthMm, pupilDistanceMm }) {
  const difference = frameWidthMm - faceWidthMm;
  const absDifference = Math.abs(difference);
  const pdWarning = pupilDistanceMm && (pupilDistanceMm < 55 || pupilDistanceMm > 75);

  let level = "good";
  let title = "尺寸合适";
  let description = "镜架宽度和估算脸宽接近，适合继续试戴确认鼻托和镜腿舒适度。";

  if (difference > 10) {
    level = "wide";
    title = "可能偏宽";
    description = "镜架比估算脸宽宽出较多，实戴时可能容易下滑或两侧留白明显。";
  } else if (difference < -8) {
    level = "narrow";
    title = "可能偏窄";
    description = "镜架比估算脸宽窄，实戴时可能夹脸或镜腿外撑。";
  } else if (absDifference > 5) {
    level = difference > 0 ? "slightly-wide" : "slightly-narrow";
    title = difference > 0 ? "略宽" : "略窄";
    description = "整体仍可试戴，但建议结合鼻梁高度、镜腿松紧和个人偏好判断。";
  }

  return {
    level,
    title,
    description,
    differenceMm: Number(difference.toFixed(1)),
    frameWidthMm,
    faceWidthMm,
    pupilDistanceMm,
    pdWarning: Boolean(pdWarning)
  };
}

