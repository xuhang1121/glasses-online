App({
  globalData: {
    cart: []
  },

  addToCart(product) {
    const cart = this.globalData.cart;
    const item = cart.find((entry) => entry.id === product.id);

    if (item) {
      item.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
  }
});

