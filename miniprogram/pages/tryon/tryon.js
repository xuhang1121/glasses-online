import { API_BASE_URL } from "../../utils/config";
import { request, uploadTryOn } from "../../utils/api";

Page({
  data: {
    product: null,
    photoPath: "",
    faceWidthMm: 145,
    faceWidthEdited: false,
    pupilDistanceMm: "",
    cameraOpen: false,
    cameraReady: false,
    measurementMode: "manual",
    measurementText: "手动输入脸宽",
    renderMode: "3d",
    headYawDeg: 0,
    headYawText: "正面",
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
          fullCoverUrl: `${API_BASE_URL}${res.item.coverUrl}`
        }
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album"],
      success: (res) => {
        this.setData({
          photoPath: res.tempFiles[0].tempFilePath,
          cameraOpen: false,
          measurementMode: "manual",
          measurementText: "相册照片，手动输入脸宽",
          result: null
        });
      }
    });
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
        const faceWidthMm = Number(this.data.faceWidthMm || 145);
        this.setData({
          photoPath: res.tempImagePath,
          cameraOpen: false,
          measurementMode: "guide-frame",
          measurementText: `框内拍摄估算脸宽 ${faceWidthMm}mm`,
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
    this.setData({
      faceWidthMm: event.detail.value,
      faceWidthEdited: true,
      measurementText: "已手动调整脸宽"
    });
  },

  onPdInput(event) {
    this.setData({ pupilDistanceMm: event.detail.value });
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
      wx.showToast({ title: "请先上传正脸照片", icon: "none" });
      return;
    }

    this.setData({ uploading: true });

    try {
      const result = await uploadTryOn({
        filePath: this.data.photoPath,
        productId: this.data.product.id,
        faceWidthMm: this.data.faceWidthMm || 145,
        pupilDistanceMm: this.data.pupilDistanceMm,
        measurementMode: this.data.measurementMode,
        faceWidthEdited: this.data.faceWidthEdited,
        renderMode: this.data.renderMode,
        headYawDeg: this.data.headYawDeg
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
  }
});
