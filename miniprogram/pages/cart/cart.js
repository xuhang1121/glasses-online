import { money } from "../../utils/api";

Page({
  data: {
    items: [],
    totalText: "¥0.00"
  },

  onShow() {
    this.refreshCart();
  },

  refreshCart() {
    const items = getApp().globalData.cart.map((item) => ({
      ...item,
      priceText: money(item.price),
      subtotalText: money(item.price * item.quantity)
    }));
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    this.setData({
      items,
      totalText: money(total)
    });
  },

  checkout() {
    if (!this.data.items.length) {
      wx.showToast({ title: "购物车为空", icon: "none" });
      return;
    }

    wx.showToast({ title: "支付接口待接入", icon: "none" });
  }
});

