/**
 * Global Quick Order功能
 * 为所有页面提供统一的Quick Order体验
 * 如果 shop.astro 的实现存在，则优先使用；否则提供基础实现
 */

(function() {
  'use strict';

  // 如果 shop.astro 的 Quick Order 已经初始化，则不再重复初始化
  // shop.astro 有更完整的变体选择功能
  if (window.shopQuickOrderInitialized) {
    console.log('Shop Quick Order already initialized, using shop implementation');
    return;
  }

  // 如果已经有全局 openQuickOrderWithData 函数（来自 shop.astro），使用它
  if (typeof window.openQuickOrderWithData === 'function') {
    console.log('Using existing openQuickOrderWithData from shop.astro');
    window.quickOrderInitialized = true;
    return;
  }

  console.log('Initializing basic Quick Order for non-shop pages');

  // ... 保持原有的基础实现代码 ...

  // 检测移动端
  function isMobile() {
    return window.innerWidth < 1024;
  }

  // 获取Quick Order元素
  const quickOrderOverlay = document.getElementById('quickOrderOverlay');
  const quickOrderModal = document.getElementById('quickOrderModal');
  const quickOrderClose = document.getElementById('quickOrderClose');
  const quickOrderContent = document.getElementById('quickOrderContent');
  const quickOrderMobileOverlay = document.getElementById('quickOrderMobileOverlay');
  const quickOrderMobileSheet = document.getElementById('quickOrderMobileSheet');
  const quickOrderMobileClose = document.getElementById('quickOrderMobileClose');
  const mobileSheetHeader = document.getElementById('mobileSheetHeader');
  const quickOrderMobileContent = document.getElementById('quickOrderMobileContent');

  // 关闭Quick Order
  function closeQuickOrder() {
    if (isMobile()) {
      if (quickOrderMobileOverlay) quickOrderMobileOverlay.classList.remove('active');
      if (quickOrderMobileSheet) quickOrderMobileSheet.classList.remove('active');
    } else {
      if (quickOrderOverlay) quickOrderOverlay.classList.remove('active');
      if (quickOrderModal) quickOrderModal.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  // 绑定关闭事件
  if (quickOrderClose) {
    quickOrderClose.addEventListener('click', closeQuickOrder);
  }
  if (quickOrderMobileClose) {
    quickOrderMobileClose.addEventListener('click', closeQuickOrder);
  }
  if (quickOrderOverlay) {
    quickOrderOverlay.addEventListener('click', closeQuickOrder);
  }
  if (quickOrderMobileOverlay) {
    quickOrderMobileOverlay.addEventListener('click', closeQuickOrder);
  }

  // 添加到购物车
  function addToCart(productData, quantity = 1, selectedVariants = {}) {
    try {
      const currentCart = JSON.parse(localStorage.getItem('ebbelle_cart') || '[]');

      currentCart.push({
        cartItemId: Date.now().toString(),
        productId: productData.id,
        name: productData.name,
        price: parseFloat(productData.price).toFixed(2),
        quantity: quantity,
        image: productData.images && productData.images[0] ? productData.images[0].src : productData.image || '',
        selectedVariants: selectedVariants
      });

      localStorage.setItem('ebbelle_cart', JSON.stringify(currentCart));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: currentCart } }));

      // 关闭Quick Order
      closeQuickOrder();

      // 打开购物车
      if (typeof window.toggleCart === 'function') {
        window.toggleCart(true);
      }

      return true;
    } catch(err) {
      console.error('添加到购物车失败:', err);
      return false;
    }
  }

  // 渲染简单产品（没有变体）- 基础实现
  function renderSimpleProduct(product, mobile) {
    const price = parseFloat(product.price) || 0;
    const regularPrice = parseFloat(product.regular_price) || 0;
    const hasDiscount = regularPrice > price;
    const imageUrl = product.images && product.images[0] ? product.images[0].src : product.image || '';
    const stockStatus = product.stock_status || 'instock';
    const isOutOfStock = stockStatus === 'outofstock';

    if (mobile) {
      // 移动端渲染
      mobileSheetHeader.innerHTML = `
        <button class="mobile-sheet-close" onclick="window.closeQuickOrder()">
          <i class="fa-solid fa-times"></i>
        </button>
        <div style="display: flex; gap: 12px; align-items: center; flex: 1; padding-right: 40px;">
          <img src="${imageUrl}" alt="${product.name}"
               style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; background: #f5f5f5;">
          <div style="flex: 1; min-width: 0;">
            <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${product.name}
            </h3>
            ${hasDiscount ?
              `<div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px; font-weight: 700; color: var(--primary, #c9933f);">$${price.toFixed(2)}</span>
                <span style="font-size: 12px; color: #999; text-decoration: line-through;">$${regularPrice.toFixed(2)}</span>
              </div>` :
              `<p style="font-size: 16px; font-weight: 700; color: var(--primary, #c9933f); margin: 0;">$${price.toFixed(2)}</p>`
            }
          </div>
        </div>
      `;

      quickOrderMobileContent.innerHTML = `
        <div style="padding: 20px;">
          ${isOutOfStock ?
            '<div style="padding: 12px; background: #f8d7da; color: #721c24; border-radius: 8px; margin-bottom: 16px; font-size: 14px; text-align: center;">Out of Stock</div>' :
            '<div style="padding: 12px; background: #d4edda; color: #155724; border-radius: 8px; margin-bottom: 16px; font-size: 14px; text-align: center;">In Stock</div>'
          }
          <button onclick="window.quickOrderAddToCart(${product.id})"
                  ${isOutOfStock ? 'disabled' : ''}
                  style="width: 100%; padding: 16px; background: ${isOutOfStock ? '#ccc' : 'var(--primary, #c9933f)'}; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; text-transform: uppercase; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'};">
            ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      `;
    } else {
      // 桌面端渲染
      quickOrderContent.innerHTML = `
        <div style="display: grid; grid-template-columns: 400px 1fr; gap: 40px; padding: 40px;">
          <div style="display: flex; flex-direction: column;">
            <img src="${imageUrl}" alt="${product.name}"
                 style="width: 100%; border-radius: 12px; object-fit: cover; background: #f5f5f5;">
          </div>
          <div style="display: flex; flex-direction: column;">
            <h2 style="font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">${product.name}</h2>
            ${hasDiscount ?
              `<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: 700; color: var(--primary, #c9933f);">$${price.toFixed(2)}</span>
                <span style="font-size: 20px; color: #999; text-decoration: line-through;">$${regularPrice.toFixed(2)}</span>
              </div>` :
              `<p style="font-size: 32px; font-weight: 700; color: var(--primary, #c9933f); margin: 0 0 24px 0;">$${price.toFixed(2)}</p>`
            }
            ${isOutOfStock ?
              '<div style="display: inline-flex; padding: 10px 20px; background: #f8d7da; color: #721c24; border-radius: 6px; font-size: 14px; font-weight: 600; margin-bottom: 24px; align-self: flex-start;">Out of Stock</div>' :
              '<div style="display: inline-flex; padding: 10px 20px; background: #d4edda; color: #155724; border-radius: 6px; font-size: 14px; font-weight: 600; margin-bottom: 24px; align-self: flex-start;">In Stock</div>'
            }
            ${product.short_description ? `<div style="margin-bottom: 24px; color: #666; line-height: 1.6;">${product.short_description}</div>` : ''}
            ${product.description ? `<div style="margin-bottom: 24px; color: #666; line-height: 1.6; max-height: 200px; overflow-y: auto;">${product.description}</div>` : ''}
            <button onclick="window.quickOrderAddToCart(${product.id})"
                    ${isOutOfStock ? 'disabled' : ''}
                    style="padding: 16px 40px; background: ${isOutOfStock ? '#ccc' : 'var(--primary, #c9933f)'}; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-transform: uppercase; cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}; align-self: flex-start; transition: all 0.2s;">
              <i class="fa-solid fa-cart-shopping"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      `;
    }
  }

  // 打开Quick Order with 产品数据（基础实现，仅支持simple产品）
  window.openQuickOrderWithData = async function(product) {
    if (!product) {
      console.error('No product data provided');
      return;
    }

    console.log('Opening Basic Quick Order for:', product.name, 'Type:', product.type);

    // 如果是variable产品，显示警告
    if (product.type === 'variable') {
      console.warn('Variable products are not fully supported in basic Quick Order. Please use shop.astro implementation.');
      // 仍然显示，但只显示基础信息
    }

    const mobile = isMobile();

    // 保存当前产品数据到全局
    window.currentQuickOrderProduct = product;

    // 显示Modal/Sheet
    if (mobile) {
      if (quickOrderMobileOverlay) quickOrderMobileOverlay.classList.add('active');
      if (quickOrderMobileSheet) quickOrderMobileSheet.classList.add('active');
    } else {
      if (quickOrderOverlay) quickOrderOverlay.classList.add('active');
      if (quickOrderModal) quickOrderModal.classList.add('active');
    }
    document.body.style.overflow = 'hidden';

    // 渲染产品内容
    renderSimpleProduct(product, mobile);
  };

  // 添加到购物车（全局函数）
  window.quickOrderAddToCart = function(productId) {
    const product = window.currentQuickOrderProduct;
    if (!product) {
      console.error('No product data');
      return;
    }

    const success = addToCart(product, 1, {});
    if (success) {
      console.log('Product added to cart:', product.name);
    }
  };

  // 暴露关闭函数
  window.closeQuickOrder = closeQuickOrder;

  // 标记为已初始化（基础版本）
  window.quickOrderInitialized = true;

  console.log('Basic Global Quick Order initialized');
})();
