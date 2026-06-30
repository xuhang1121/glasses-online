import { API_BASE_URL } from "../../utils/config";
import { request } from "../../utils/api";

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
          fullCoverUrl: `${API_BASE_URL}${res.item.coverUrl}`
        },
        loading: false
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
      this.setData({ loading: false });
    }
  },

  addCart() {
    getApp().addToCart(this.data.product);
    wx.showToast({ title: "已加入购物车", icon: "success" });
  }
});
