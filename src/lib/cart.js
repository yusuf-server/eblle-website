// 购物车管理
const CART_STORAGE_KEY = 'ebbelle_cart';

// 获取购物车数据
export function getCart() {
  if (typeof window === 'undefined') return [];

  try {
    const cart = localStorage.getItem(CART_STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    console.error('Failed to get cart:', e);
    return [];
  }
}

// 保存购物车数据
export function saveCart(cart) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // 触发自定义事件通知购物车更新
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));
  } catch (e) {
    console.error('Failed to save cart:', e);
  }
}

// 添加商品到购物车
export function addToCart(product) {
  const cart = getCart();

  // 查找是否已存在相同的商品（相同ID和变体）
  const existingIndex = cart.findIndex(item =>
    item.id === product.id &&
    JSON.stringify(item.selectedVariants) === JSON.stringify(product.selectedVariants)
  );

  if (existingIndex > -1) {
    // 如果已存在，增加数量
    cart[existingIndex].quantity += product.quantity;
  } else {
    // 如果不存在，添加新商品
    cart.push({
      ...product,
      cartItemId: Date.now() + Math.random() // 唯一ID
    });
  }

  saveCart(cart);
  return cart;
}

// 更新购物车商品数量
export function updateCartItemQuantity(cartItemId, quantity) {
  const cart = getCart();
  const item = cart.find(item => item.cartItemId === cartItemId);

  if (item) {
    if (quantity <= 0) {
      // 如果数量为0或负数，删除商品
      return removeFromCart(cartItemId);
    }
    item.quantity = quantity;
    saveCart(cart);
  }

  return cart;
}

// 从购物车删除商品
export function removeFromCart(cartItemId) {
  let cart = getCart();
  cart = cart.filter(item => item.cartItemId !== cartItemId);
  saveCart(cart);
  return cart;
}

// 清空购物车
export function clearCart() {
  saveCart([]);
  return [];
}

// 获取购物车总数量
export function getCartCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

// 获取购物车总价
export function getCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    return total + (price * item.quantity);
  }, 0);
}
