import { API_BASE_URL } from "../../utils/config";
import { request, uploadTryOn } from "../../utils/api";

Page({
  data: {
    product: null,
    photoPath: "",
    cameraOpen: false,
    cameraReady: false,
    measurementMode: "guide-frame",
    renderMode: "3d",
    headYawDeg: 0,
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
        faceWidthMm: "",
        measurementMode: this.data.measurementMode,
        faceWidthEdited: false,
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
