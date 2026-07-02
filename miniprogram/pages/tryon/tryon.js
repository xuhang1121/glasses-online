import { API_BASE_URL } from "../../utils/config";
import { request, uploadTryOn } from "../../utils/api";

Page({
  data: {
    product: null,
    photoPath: "",
    faceWidthMm: "",
    faceWidthEdited: false,
    cameraOpen: false,
    cameraReady: false,
    measurementMode: "guide-frame",
    measurementText: "在线试戴按取景框内脸宽像素生成；脸宽 mm 不会默认写成 145。",
    renderMode: "3d",
    headYawDeg: 0,
    headYawText: "正面",
    frameTopPercent: 39,
    faceWidthPixelRatio: 0.56,
    frameOffsetXPercent: 0,
    uploading: false,
    result: null
  },

  onLoad(options) {
    this.loadProduct(options.id);
  },

  async loadProduct(id) {
    try {
      const res = await request({ url: `/api/products/${id}` });
      this.setData({
        product: {
          ...res.item,
          fullCoverUrl: `${API_BASE_URL}${res.item.frontImageUrl || res.item.coverUrl}`,
          hasTryOnAsset: Boolean(res.item.tryOnAssetUrl && res.item.tryOnAssetUrl.includes("/tryon-assets/"))
        }
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  openCamera() {
    wx.getSetting({
      success: (setting) => {
        if (setting.authSetting["scope.camera"]) {
          this.setData({ cameraOpen: true, cameraReady: false, result: null });
          return;
        }

        wx.authorize({
          scope: "scope.camera",
          success: () => {
            this.setData({ cameraOpen: true, cameraReady: false, result: null });
          },
          fail: () => {
            wx.showModal({
              title: "需要摄像头权限",
              content: "请允许使用摄像头，用于在测量框内拍摄正脸照片。",
              confirmText: "去设置",
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting();
                }
              }
            });
          }
        });
      }
    });
  },

  closeCamera() {
    this.setData({ cameraOpen: false });
  },

  onCameraReady() {
    this.setData({ cameraReady: true });
  },

  onCameraError(error) {
    this.setData({ cameraOpen: false, cameraReady: false });
    wx.showToast({
      title: error.detail?.errMsg || "摄像头启动失败",
      icon: "none"
    });
  },

  takeGuidePhoto() {
    if (!this.data.cameraReady) {
      wx.showToast({ title: "摄像头准备中", icon: "none" });
      return;
    }

    const camera = wx.createCameraContext();
    camera.takePhoto({
      quality: "high",
      success: (res) => {
        this.setData({
          photoPath: res.tempImagePath,
          cameraOpen: false,
          measurementMode: "guide-frame",
          measurementText: this.data.faceWidthEdited
            ? `框内拍照 + 手动脸宽 ${this.data.faceWidthMm}mm`
            : "框内拍照已获得脸宽像素比例，尺寸建议仍需手动校准 mm。",
          result: null
        }, () => {
          this.submitTryOn();
        });
      },
      fail: (error) => {
        wx.showToast({
          title: error.errMsg || "拍照失败",
          icon: "none"
        });
      }
    });
  },

  onFaceWidthInput(event) {
    const value = event.detail.value;
    this.setData({
      faceWidthMm: value,
      faceWidthEdited: Boolean(value),
      measurementText: value ? "已手动校准脸宽" : "在线试戴按取景框内脸宽像素生成；脸宽 mm 不会默认写成 145。"
    });
  },

  onHeadYawChange(event) {
    const value = Number(event.detail.value);
    this.setData({
      headYawDeg: value,
      headYawText: this.getHeadYawText(value)
    });
  },

  setHeadYaw(event) {
    const value = Number(event.currentTarget.dataset.value);
    this.setData({
      headYawDeg: value,
      headYawText: this.getHeadYawText(value)
    });
  },

  onFrameTopChange(event) {
    this.setData({ frameTopPercent: Number(event.detail.value) });
  },

  onFrameWidthChange(event) {
    this.setData({ faceWidthPixelRatio: Number(event.detail.value) / 100 });
  },

  onFrameOffsetXChange(event) {
    this.setData({ frameOffsetXPercent: Number(event.detail.value) });
  },

  resetFrameAdjust() {
    this.setData({
      frameTopPercent: 39,
      faceWidthPixelRatio: 0.56,
      frameOffsetXPercent: 0
    });
  },

  getHeadYawText(value) {
    if (value <= -12) {
      return "向左侧脸";
    }

    if (value >= 12) {
      return "向右侧脸";
    }

    return "正面";
  },

  async submitTryOn() {
    if (!this.data.photoPath) {
      wx.showToast({ title: "请先打开摄像机拍照", icon: "none" });
      return;
    }

    this.setData({ uploading: true });

    try {
      const result = await uploadTryOn({
        filePath: this.data.photoPath,
        productId: this.data.product.id,
        faceWidthMm: this.data.faceWidthEdited ? this.data.faceWidthMm : "",
        measurementMode: this.data.measurementMode,
        faceWidthEdited: this.data.faceWidthEdited,
        renderMode: this.data.renderMode,
        headYawDeg: this.data.headYawDeg,
        faceWidthPixelRatio: this.data.faceWidthPixelRatio,
        frameTopPercent: this.data.frameTopPercent,
        frameOffsetXPercent: this.data.frameOffsetXPercent
      });

      this.setData({ result, uploading: false });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
      this.setData({ uploading: false });
    }
  },

  addCart() {
    getApp().addToCart(this.data.product);
    wx.showToast({ title: "已加入购物车", icon: "success" });
  },

  openArTryOn() {
    wx.redirectTo({ url: `/pages/ar-tryon/ar-tryon?id=${this.data.product.id}` });
  }
});
