const FACE_WIDTH_BY_PD_RATIO = 2.22;

export function buildFaceMeasurement({
  faceWidthMm,
  pupilDistanceMm,
  measurementMode,
  faceWidthEdited
}) {
  const manualFaceWidth = toReasonableNumber(faceWidthMm, 110, 190);
  const pd = toReasonableNumber(pupilDistanceMm, 50, 80);
  const pdFaceWidth = pd ? roundMm(pd * FACE_WIDTH_BY_PD_RATIO) : null;
  const usedGuideFrame = measurementMode === "guide-frame";

  if (faceWidthEdited && manualFaceWidth && pdFaceWidth) {
    const gap = Math.abs(manualFaceWidth - pdFaceWidth);
    const estimatedFaceWidthMm = gap <= 8 ? roundMm((manualFaceWidth + pdFaceWidth) / 2) : manualFaceWidth;

    return {
      faceWidthMm: estimatedFaceWidthMm,
      source: gap <= 8 ? "manual-and-pd" : "manual",
      sourceText: gap <= 8 ? "手动脸宽 + 瞳距校准" : "手动脸宽",
      confidence: gap <= 8 ? "high" : "medium",
      confidenceText: gap <= 8 ? "较高" : "中等",
      note: gap <= 8
        ? "手动脸宽和瞳距推算结果接近，本次采用两者平均值。"
        : "手动脸宽和瞳距推算差异较大，本次优先采用手动脸宽。"
    };
  }

  if (pdFaceWidth) {
    return {
      faceWidthMm: pdFaceWidth,
      source: "pupil-distance",
      sourceText: "瞳距推算",
      confidence: "medium",
      confidenceText: "中等",
      note: `按瞳距 ${pd}mm 推算脸宽，适合做镜架宽度初筛。`
    };
  }

  if (usedGuideFrame && manualFaceWidth) {
    return {
      faceWidthMm: manualFaceWidth,
      source: "guide-frame",
      sourceText: "框内拍照估算",
      confidence: "medium-low",
      confidenceText: "中低",
      note: "按取景框对齐结果估算脸宽，建议后续接入人脸关键点检测提高精度。"
    };
  }

  return {
    faceWidthMm: manualFaceWidth || 145,
    source: "manual",
    sourceText: "手动估算",
    confidence: "low",
    confidenceText: "较低",
    note: "当前使用默认或手动输入脸宽，建议输入瞳距 PD 或使用框内拍照。"
  };
}

function toReasonableNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }

  return number;
}

function roundMm(value) {
  return Number(value.toFixed(1));
}
