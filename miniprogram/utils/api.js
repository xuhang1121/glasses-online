import { API_BASE_URL } from "./config";

export function request({ url, method = "GET", data }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(res.data?.message || "请求失败"));
        }
      },
      fail: reject
    });
  });
}

export function uploadTryOn({
  filePath,
  productId,
  faceWidthMm,
  pupilDistanceMm,
  measurementMode,
  faceWidthEdited,
  renderMode,
  headYawDeg,
  faceWidthPixelRatio,
  frameTopPercent,
  frameWidthPercent,
  frameOffsetXPercent
}) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${API_BASE_URL}/api/try-on`,
      filePath,
      name: "photo",
      formData: {
        productId,
        faceWidthMm,
        pupilDistanceMm,
        measurementMode,
        faceWidthEdited,
        renderMode,
        headYawDeg,
        faceWidthPixelRatio,
        frameTopPercent,
        frameWidthPercent,
        frameOffsetXPercent
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(data.message || "试戴失败"));
          }
        } catch (error) {
          reject(error);
        }
      },
      fail: reject
    });
  });
}

export function money(cents) {
  return `¥${(cents / 100).toFixed(2)}`;
}
