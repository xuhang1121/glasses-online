import { API_BASE_URL } from "../../utils/config";
import { money, request } from "../../utils/api";

Page({
  data: {
    product: null,
    loading: true
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
          priceText: money(res.item.price),
          fullCoverUrl: `${API_BASE_URL}${res.item.coverUrl}`
        },
        loading: false
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
      this.setData({ loading: false });
    }
  },

  startTryOn() {
    wx.navigateTo({ url: `/pages/tryon/tryon?id=${this.data.product.id}` });
  },

  startArTryOn() {
    wx.navigateTo({ url: `/pages/ar-tryon/ar-tryon?id=${this.data.product.id}` });
  },

  addCart() {
    getApp().addToCart(this.data.product);
    wx.showToast({ title: "已加入购物车", icon: "success" });
  }
});
