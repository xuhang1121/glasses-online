import { API_BASE_URL } from "../../utils/config";
import { money, request } from "../../utils/api";

Page({
  data: {
    products: [],
    loading: true,
    errorText: "",
    apiBaseUrl: API_BASE_URL
  },

  onShow() {
    this.loadProducts();
  },

  onPullDownRefresh() {
    this.loadProducts({ stopRefresh: true });
  },

  async loadProducts(options = {}) {
    if (!options.silent) {
      this.setData({ loading: true, errorText: "" });
    }

    try {
      const res = await request({ url: "/api/products" });
      const items = Array.isArray(res.items) ? res.items : [];
      this.setData({
        products: items.map((item) => ({
          ...item,
          priceText: money(item.price),
          fullCoverUrl: `${API_BASE_URL}${item.coverUrl}`
        })),
        loading: false,
        errorText: ""
      });
    } catch (error) {
      const message = error.errMsg || error.message || "商品加载失败";
      wx.showToast({ title: message, icon: "none" });
      this.setData({
        loading: false,
        products: [],
        errorText: `${message}：${API_BASE_URL}/api/products`
      });
    } finally {
      if (options.stopRefresh) {
        wx.stopPullDownRefresh();
      }
    }
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  retryLoad() {
    this.loadProducts();
  }
});
