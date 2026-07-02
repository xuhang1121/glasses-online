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
  const hasManualCalibration = Boolean(faceWidthEdited && manualFaceWidth);

  if (hasManualCalibration && pdFaceWidth) {
    const gap = Math.abs(manualFaceWidth - pdFaceWidth);
    const estimatedFaceWidthMm = gap <= 8 ? roundMm((manualFaceWidth + pdFaceWidth) / 2) : manualFaceWidth;

    return {
      faceWidthMm: estimatedFaceWidthMm,
      estimatedFaceWidthMm,
      faceWidthText: `${estimatedFaceWidthMm}mm`,
      isCalibrated: true,
      source: gap <= 8 ? "manual-and-pd" : "manual",
      sourceText: gap <= 8 ? "手动脸宽 + PD 校准" : "手动脸宽",
      confidence: gap <= 8 ? "high" : "medium",
      confidenceText: gap <= 8 ? "较高" : "中等",
      note: gap <= 8
        ? "手动脸宽和 PD 推算结果接近，本次采用两者平均值。"
        : "手动脸宽和 PD 推算差异较大，本次优先采用手动脸宽。"
    };
  }

  if (pdFaceWidth) {
    return {
      faceWidthMm: pdFaceWidth,
      estimatedFaceWidthMm: pdFaceWidth,
      faceWidthText: `${pdFaceWidth}mm`,
      isCalibrated: true,
      source: "pupil-distance",
      sourceText: "PD 推算脸宽",
      confidence: "medium",
      confidenceText: "中等",
      note: `按 PD ${pd}mm 推算脸宽，适合做镜架宽度初筛。`
    };
  }

  if (usedGuideFrame && hasManualCalibration) {
    return {
      faceWidthMm: manualFaceWidth,
      estimatedFaceWidthMm: manualFaceWidth,
      faceWidthText: `${manualFaceWidth}mm`,
      isCalibrated: true,
      source: "guide-frame-manual",
      sourceText: "框内拍照 + 手动校准",
      confidence: "medium-low",
      confidenceText: "中低",
      note: "取景框提供脸宽像素比例，毫米脸宽来自手动校准；后续接入人脸关键点后可提高精度。"
    };
  }

  if (usedGuideFrame) {
    return {
      faceWidthMm: null,
      estimatedFaceWidthMm: 145,
      faceWidthText: "未校准",
      isCalibrated: false,
      source: "guide-frame-default",
      sourceText: "取景框像素试戴",
      confidence: "low",
      confidenceText: "较低",
      note: "照片可以得到脸宽像素比例，用来生成试戴图；没有实物标尺时不能单独换算真实毫米脸宽。"
    };
  }

  return {
    faceWidthMm: hasManualCalibration ? manualFaceWidth : null,
    estimatedFaceWidthMm: manualFaceWidth || 145,
    faceWidthText: hasManualCalibration ? `${manualFaceWidth}mm` : "未校准",
    isCalibrated: hasManualCalibration,
    source: hasManualCalibration ? "manual" : "default",
    sourceText: hasManualCalibration ? "手动脸宽" : "未校准",
    confidence: hasManualCalibration ? "medium" : "low",
    confidenceText: hasManualCalibration ? "中等" : "较低",
    note: hasManualCalibration
      ? "当前使用手动输入脸宽估算镜架比例。"
      : "没有实物标尺时不能单独换算真实毫米脸宽，尺寸建议仅供参考。"
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
