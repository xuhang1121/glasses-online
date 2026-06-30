import { API_BASE_URL } from "../../utils/config";
import { money, request } from "../../utils/api";

Page({
  data: {
    products: [],
    loading: true,
    apiBaseUrl: API_BASE_URL
  },

  onLoad() {
    this.loadProducts();
  },

  async loadProducts() {
    try {
      const res = await request({ url: "/api/products" });
      this.setData({
        products: res.items.map((item) => ({
          ...item,
          priceText: money(item.price),
          fullCoverUrl: `${API_BASE_URL}${item.coverUrl}`
        })),
        loading: false
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
      this.setData({ loading: false });
    }
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});

