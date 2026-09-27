/**
 * Shop Quick Order - 完整的产品 Quick Order 功能
 * 支持变体选择、库存管理、价格计算等
 * 从 shop.astro 提取，供所有页面使用
 */

(function() {
  'use strict';

  // 防止重复初始化
  if (window.shopQuickOrderInitialized) {
    console.log('Shop Quick Order already initialized');
    return;
  }

  console.log('Initializing Shop Quick Order (full implementation)...');

  // 以下是从 shop.astro 提取的完整 Quick Order 代码

  // Quick Order Mobile控制
  const quickOrderMobileOverlay = document.getElementById('quickOrderMobileOverlay');
  const quickOrderMobileSheet = document.getElementById('quickOrderMobileSheet');
  const quickOrderMobileClose = document.getElementById('quickOrderMobileClose');
  const quickOrderMobileContent = document.getElementById('quickOrderMobileContent');
  const mobileSheetHeader = document.getElementById('mobileSheetHeader');

  // 检测是否为移动端
  function isMobile() {
    return window.innerWidth <= 768;
  }

  // 变体数据缓存
  const variationsCache = new Map();

  // 打开Quick Order Modal（直接使用产品数据）
  window.openQuickOrderWithData = async function(product) {
    console.log('打开Quick Order，产品:', product.name, '类型:', product.type);
    console.log('产品ID:', product.id);

    try {
      // 判断移动端或桌面端
      const mobile = isMobile();

      // 立即显示Modal和加载状态
      if (mobile) {
        quickOrderMobileOverlay.classList.add('active');
        quickOrderMobileSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderQuickOrderMobileLoading(product);
      } else {
        quickOrderOverlay.classList.add('active');
        quickOrderModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderQuickOrderLoading(product);
      }

      // 如果是变体产品，需要获取变体详情
      if (product.type === 'variable' && product.variations && product.variations.length > 0) {
        console.log('变体产品，获取变体详情...');

        // 检查缓存
        if (variationsCache.has(product.id)) {
          console.log('使用缓存的变体数据');
          product.variationsData = variationsCache.get(product.id);
        } else {
          console.log('从API获取变体数据');
          const response = await fetch(`/api/product-variations/${product.id}`);
          console.log('响应状态:', response.status);

          if (response.ok) {
            const variationsData = await response.json();
            product.variationsData = variationsData;
            // 缓存变体数据
            variationsCache.set(product.id, variationsData);
            console.log('变体详情已缓存:', variationsData.length, '个');
          } else {
            const errorText = await response.text();
            console.warn('获取变体详情失败:', errorText);
          }
        }
      }

      // 渲染完整内容
      if (mobile) {
        renderQuickOrderMobileContent(product);
      } else {
        renderQuickOrderContent(product);
      }

    } catch (error) {
      console.error('打开Quick Order失败:', error);
      closeQuickOrder();
      alert('打开Quick Order失败，请稍后重试');
    }
  };

  // 关闭Quick Order Modal
  function closeQuickOrder() {
    quickOrderOverlay.classList.remove('active');
    quickOrderModal.classList.remove('active');
    quickOrderMobileOverlay.classList.remove('active');
    quickOrderMobileSheet.classList.remove('active');
    document.body.style.overflow = '';
  }

  // 渲染加载状态
  function renderQuickOrderLoading(product) {
    const images = product.images || [];
    const mainImage = images[0]?.src || '';
    const name = product.name || '';

    let html = '';

    // 左侧：图片（不需要加载状态）
    html += '<div class="quick-order-images">';
    html += '<div class="quick-order-main-image">';
    html += `<img src="${mainImage}" alt="${name}">`;
    html += '</div>';
    html += '</div>';

    // 右侧：加载骨架屏
    html += '<div class="quick-order-details">';
    html += `<h2 class="quick-order-title">${name}</h2>`;
    html += '<div class="quick-order-loading">';
    html += '<div class="loading-spinner"></div>';
    html += '<p>Loading product details...</p>';
    html += '</div>';
    html += '</div>';

    quickOrderContent.innerHTML = html;
  }

  // 渲染移动端加载状态
  function renderQuickOrderMobileLoading(product) {
    const name = product.name || '';
    const images = product.images || [];
    const mainImage = images[0]?.src || '';
    const price = parseFloat(product.price) || 0;

    // 渲染Header
    let headerHTML = '';
    headerHTML += `<button class="mobile-sheet-close" id="quickOrderMobileClose">
      <i class="fa-solid fa-times"></i>
    </button>`;
    headerHTML += '<div class="mobile-sheet-product-image">';
    headerHTML += `<img src="${mainImage}" alt="${name}">`;
    headerHTML += '</div>';
    headerHTML += '<div class="mobile-sheet-header-right">';
    headerHTML += `<div class="mobile-sheet-title">${name}</div>`;
    headerHTML += `<div class="mobile-sheet-price">$${price.toFixed(2)}</div>`;
    headerHTML += '</div>';
    mobileSheetHeader.innerHTML = headerHTML;

    // 重新绑定关闭按钮
    const newCloseBtn = document.getElementById('quickOrderMobileClose');
    if (newCloseBtn) {
      newCloseBtn.addEventListener('click', closeQuickOrder);
    }

    // Content显示加载动画
    let html = '';
    html += '<div class="quick-order-loading">';
    html += '<div class="loading-spinner"></div>';
    html += '<p>Loading product details...</p>';
    html += '</div>';

    quickOrderMobileContent.innerHTML = html;
  }

  // 渲染移动端Quick Order内容
    function renderQuickOrderMobileContent(product) {
      const images = product.images || [];
      const mainImage = images[0]?.src || '';
      const name = product.name || '';
      const price = parseFloat(product.price) || 0;
      const variationsData = product.variationsData || [];
      const attributes = product.attributes || [];
      const type = product.type;

      console.log('渲染移动端Quick Order，变体数:', variationsData.length);

      // 保存产品数据到全局
      window.currentProductData = product;
      window.currentProductVariationsData = variationsData;
      window.currentProductType = type;
      window.currentProductAttributes = attributes;

      // 渲染Header（产品图片、标题、价格）
      let headerHTML = '';
      headerHTML += `<button class="mobile-sheet-close" id="quickOrderMobileClose">
        <i class="fa-solid fa-times"></i>
      </button>`;
      headerHTML += '<div class="mobile-sheet-product-image">';
      headerHTML += `<img src="${mainImage}" alt="${name}">`;
      headerHTML += '</div>';
      headerHTML += '<div class="mobile-sheet-header-right">';
      headerHTML += `<div class="mobile-sheet-title">${name}</div>`;
      headerHTML += `<div class="mobile-sheet-price">$${price.toFixed(2)}</div>`;
      headerHTML += '</div>';
      mobileSheetHeader.innerHTML = headerHTML;

      // 重新绑定关闭按钮
      const newCloseBtn = document.getElementById('quickOrderMobileClose');
      if (newCloseBtn) {
        newCloseBtn.addEventListener('click', closeQuickOrder);
      }

      // 渲染Content
      let html = '';

      // Wholesale价格表
      html += '<div class="mobile-quick-price-tiers">';
      html += '<div class="mobile-tier-header">';
      html += '<div class="mobile-tier-title">';
      html += '<i class="fa-solid fa-tag"></i>';
      html += '<span>Wholesale Pricing</span>';
      html += '</div>';
      html += '<span class="mobile-tier-badge">Volume Discounts</span>';
      html += '</div>';
      html += '<div class="mobile-pricing-grid">';

      html += '<div class="mobile-price-tier">';
      html += '<div class="mobile-tier-qty">1 – 9 pcs</div>';
      html += `<div class="mobile-tier-price">$${price.toFixed(2)}</div>`;
      html += '<div class="mobile-tier-label">Retail</div>';
      html += '</div>';

      html += '<div class="mobile-price-tier">';
      html += '<div class="mobile-tier-qty">10 – 49 pcs</div>';
      html += `<div class="mobile-tier-price">$${(price * 0.85).toFixed(2)}</div>`;
      html += '<div class="mobile-tier-save">Save 15%</div>';
      html += '</div>';

      html += '<div class="mobile-price-tier">';
      html += '<div class="mobile-tier-qty">50 – 99 pcs</div>';
      html += `<div class="mobile-tier-price">$${(price * 0.70).toFixed(2)}</div>`;
      html += '<div class="mobile-tier-save">Save 30%</div>';
      html += '</div>';

      html += '<div class="mobile-price-tier best">';
      html += '<div class="mobile-tier-qty">100+ pcs</div>';
      html += `<div class="mobile-tier-price">$${(price * 0.55).toFixed(2)}</div>`;
      html += '<div class="mobile-tier-best-badge">Best Value</div>';
      html += '</div>';

      html += '</div></div>';

      // 属性选择
      if (type === 'variable' && attributes.length > 0) {
        attributes.forEach(attr => {
          if (attr.variation && attr.options && attr.options.length > 0) {
            const firstOption = attr.options[0];
            html += '<div class="mobile-attribute-section">';
            html += `<div class="mobile-attribute-title">`;
            html += `<span class="mobile-attribute-title-label">${attr.name}:</span>`;
            html += `<span class="mobile-attribute-title-value" id="mobileAttrValue_${attr.name.replace(/\s+/g, '_')}">${firstOption}</span>`;
            html += `</div>`;
            html += `<div class="mobile-attribute-options" data-attribute="${attr.name}" data-option-count="${attr.options.length}">`;
            attr.options.forEach((option, index) => {
              html += `<button class="mobile-attribute-option ${index === 0 ? 'selected' : ''}"
                        data-value="${option}"
                        onclick="selectMobileAttribute(this, '${attr.name}')">
                        ${option}
                      </button>`;
            });
            html += '</div></div>';
          }
        });
      }

      // 数量选择
      html += '<div class="mobile-quantity-section">';
      html += '<div class="mobile-quantity-title">Quantity</div>';
      html += '<div class="mobile-quantity-selector">';
      html += '<button class="mobile-qty-btn" onclick="changeMobileQuantity(-1)">-</button>';
      html += '<input type="number" class="mobile-qty-input" id="mobileQtyInput" value="1" min="1" readonly>';
      html += '<button class="mobile-qty-btn" onclick="changeMobileQuantity(1)">+</button>';
      html += '</div>';

      // 库存状态
      html += '<div id="mobileStockStatus">';
      if (type === 'simple') {
        const stockStatus = product.stock_status;
        if (stockStatus === 'outofstock') {
          html += '<div class="mobile-stock-status out-of-stock">';
          html += '<i class="fa-solid fa-circle-xmark"></i> Out of Stock';
          html += '</div>';
        } else {
          html += '<div class="mobile-stock-status in-stock">';
          html += '<i class="fa-solid fa-circle-check"></i> In Stock';
          html += '</div>';
        }
      }
      html += '</div></div>';

      // 底部按钮
      html += '<div class="mobile-quick-footer">';
      const isOutOfStock = type === 'simple' && product.stock_status === 'outofstock';
      html += `<button class="mobile-quick-add-btn" id="mobileQuickAddBtn"
                onclick="addMobileQuickOrderToCart()" ${isOutOfStock ? 'disabled' : ''}>`;
      html += '<i class="fa-solid fa-cart-shopping"></i> ';
      html += isOutOfStock ? 'Out of Stock' : 'Add to Cart';
      html += '</button></div>';

      quickOrderMobileContent.innerHTML = html;

      // 变体产品初始库存检查
      if (type === 'variable') {
        setTimeout(() => {
          updateMobileVariationStock();
        }, 100);
      }
    }
   // 选择移动端属性
  window.selectMobileAttribute = function(element, attrName) {
    const container = element.closest('.mobile-attribute-options');
    container.querySelectorAll('.mobile-attribute-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    element.classList.add('selected');

    // 更新标题中的选中值
    const selectedValue = element.dataset.value;
    const valueDisplay = document.getElementById(`mobileAttrValue_${attrName.replace(/\s+/g, '_')}`);
    if (valueDisplay) {
      valueDisplay.textContent = selectedValue;
    }

    // 更新库存状态
    if (window.currentProductType === 'variable') {
      updateMobileVariationStock();
    }
  };

  // 修改移动端数量
  window.changeMobileQuantity = function(delta) {
    const input = document.getElementById('mobileQtyInput');
    if (!input) return;

    const currentQty = parseInt(input.value) || 1;
    const newQty = Math.max(1, currentQty + delta);
    input.value = newQty;
  };

  // 更新移动端变体库存
  function updateMobileVariationStock() {
    const variationsData = window.currentProductVariationsData;
    if (!variationsData || variationsData.length === 0) return;

    // 收集选中的属性
    const selectedAttributes = {};
    document.querySelectorAll('.mobile-attribute-options').forEach(optionsGroup => {
      const attrName = optionsGroup.dataset.attribute;
      const selected = optionsGroup.querySelector('.mobile-attribute-option.selected');
      if (attrName && selected) {
        selectedAttributes[attrName] = selected.dataset.value;
      }
    });

    // 查找匹配的变体
    const matchedVariation = variationsData.find(variation => {
      return variation.attributes.every(attr => {
        return selectedAttributes[attr.name] === attr.option;
      });
    });

    const stockContainer = document.getElementById('mobileStockStatus');
    const addBtn = document.getElementById('mobileQuickAddBtn');

    if (matchedVariation) {
      const stockStatus = matchedVariation.stock_status;
      const stockQuantity = matchedVariation.stock_quantity;

      let stockHTML = '';
      if (stockStatus === 'outofstock') {
        stockHTML = '<div class="mobile-stock-status out-of-stock">';
        stockHTML += '<i class="fa-solid fa-circle-xmark"></i> Out of Stock';
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Out of Stock';
      } else {
        stockHTML = '<div class="mobile-stock-status in-stock">';
        stockHTML += '<i class="fa-solid fa-circle-check"></i> In Stock';
        if (stockQuantity) {
          stockHTML += ` (${stockQuantity} available)`;
        }
        stockHTML += '</div>';
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add to Cart';
      }
      stockContainer.innerHTML = stockHTML;
    }
  }

  // 渲染Quick Order内容
  function renderQuickOrderContent(product) {
    const images = product.images || [];
    const mainImage = images[0]?.src || '';
    const price = parseFloat(product.price) || 0;
    const regularPrice = parseFloat(product.regular_price) || 0;
    const name = product.name || '';
    const attributes = product.attributes || [];
    const variations = product.variations || [];
    const variationsData = product.variationsData || [];
    const type = product.type;
    const stockStatus = product.stock_status;
    const stockQuantity = product.stock_quantity;

    console.log('产品类型:', type, '变体数据:', variationsData.length);

    // 保存产品数据和变体数据到全局，供addToCart使用
    window.currentProductData = product;
    window.currentProductVariationsData = variationsData;
    window.currentProductType = type;

    let html = '';

    // 左侧：图片
    html += '<div class="quick-order-images">';
    html += '<div class="quick-order-main-image">';
    html += `<img src="${mainImage}" alt="${name}" id="quickOrderMainImg">`;
    html += '</div>';

    if (images.length > 1) {
      html += '<div class="quick-order-thumbnails">';
      images.slice(0, 5).forEach((img, index) => {
        html += `<div class="quick-order-thumb ${index === 0 ? 'active' : ''}" onclick="changeQuickOrderImage('${img.src}', this)">`;
        html += `<img src="${img.src}" alt="${name}">`;
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';

    // 右侧：详情
    html += '<div class="quick-order-details">';
    html += `<h2 class="quick-order-title">${name}</h2>`;

    // 价格显示
    html += '<div id="quickOrderPriceContainer">';
    if (regularPrice > price) {
      html += '<div class="quick-order-price">';
      html += `<span class="quick-order-price-current">$${price.toFixed(2)}</span>`;
      html += `<span class="quick-order-price-regular">$${regularPrice.toFixed(2)}</span>`;
      html += '</div>';
    } else {
      html += `<div class="quick-order-price">$${price.toFixed(2)}</div>`;
    }
    html += '</div>';

    // 库存状态容器（变体产品会动态更新）
    html += '<div id="quickOrderStockContainer">';
    if (type === 'variable') {
      // 变体产品，初始不显示库存，等用户选择后显示
      html += '<div class="quick-order-stock-placeholder">Please select options</div>';
    } else {
      // 简单产品，直接显示库存
      if (stockStatus === 'outofstock') {
        html += '<div class="quick-order-stock out-of-stock">';
        html += '<i class="fa-solid fa-circle-xmark"></i> Out of Stock';
        html += '</div>';
      } else {
        html += '<div class="quick-order-stock in-stock">';
        html += '<i class="fa-solid fa-circle-check"></i> In Stock';
        if (stockQuantity) {
          html += ` (${stockQuantity} available)`;
        }
        html += '</div>';
      }
    }
    html += '</div>';

    // 变体属性（variable产品）
    if (type === 'variable' && attributes.length > 0) {
      attributes.forEach(attr => {
        if (attr.variation && attr.options && attr.options.length > 0) {
          html += '<div class="quick-order-section">';
          html += `<div class="quick-order-section-title">${attr.name}</div>`;
          html += `<div class="quick-order-options" data-attribute="${attr.name}">`;
          attr.options.forEach((option, index) => {
            html += `<button class="quick-order-option ${index === 0 ? 'selected' : ''}"
                      data-value="${option}"
                      onclick="selectQuickOrderOption(this, '${attr.name}')">
                      ${option}
                    </button>`;
          });
          html += '</div>';
          html += '</div>';
        }
      });
    }

    // 数量选择
    html += '<div class="quick-order-section">';
    html += '<div class="quick-order-section-title">Quantity</div>';
    html += '<div class="quick-order-quantity">';
    html += '<button class="quick-order-qty-btn" onclick="changeQuickOrderQty(-1)">-</button>';
    html += '<input type="number" class="quick-order-qty-input" id="quickOrderQty" value="1" min="1">';
    html += '<button class="quick-order-qty-btn" onclick="changeQuickOrderQty(1)">+</button>';
    html += '</div>';
    html += '</div>';

    // Add to Cart按钮
    const isOutOfStock = type === 'simple' && stockStatus === 'outofstock';
    html += `<button class="quick-order-add-btn ${isOutOfStock ? 'disabled' : ''}"
              id="quickOrderAddBtn"
              onclick="addQuickOrderToCart(${product.id}, '${type}')"
              ${isOutOfStock ? 'disabled' : ''}>`;
    html += '<i class="fa-solid fa-cart-shopping"></i> ';
    html += isOutOfStock ? 'Out of Stock' : 'Add to Cart';
    html += '</button>';

    html += '</div>';

    quickOrderContent.innerHTML = html;

    // 如果是变体产品，触发初始选择检查
    if (type === 'variable') {
      setTimeout(() => {
        updateQuickOrderVariationStock();
      }, 100);
    }
  }

  // 切换图片
  window.changeQuickOrderImage = function(src, element) {
    document.getElementById('quickOrderMainImg').src = src;
    document.querySelectorAll('.quick-order-thumb').forEach(thumb => {
      thumb.classList.remove('active');
    });
    element.classList.add('active');
  };

  // 选择选项
  window.selectQuickOrderOption = function(element, attrName) {
    const container = element.closest('.quick-order-options');
    container.querySelectorAll('.quick-order-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    element.classList.add('selected');

    // 变体产品选择后，更新库存和价格
    if (window.currentProductType === 'variable') {
      updateQuickOrderVariationStock();
    }
  };

  // 更新变体库存状态
  function updateQuickOrderVariationStock() {
    const variationsData = window.currentProductVariationsData;
    if (!variationsData || variationsData.length === 0) {
      console.log('没有变体数据');
      return;
    }

    // 收集当前选中的所有属性
    const selectedAttributes = {};
    document.querySelectorAll('.quick-order-options').forEach(optionsGroup => {
      const attrName = optionsGroup.dataset.attribute;
      const selected = optionsGroup.querySelector('.quick-order-option.selected');
      if (attrName && selected) {
        selectedAttributes[attrName] = selected.dataset.value;
      }
    });

    console.log('当前选中的属性:', selectedAttributes);

    // 查找匹配的变体
    const matchedVariation = variationsData.find(variation => {
      return variation.attributes.every(attr => {
        const attrName = attr.name;
        const attrValue = attr.option;
        return selectedAttributes[attrName] === attrValue;
      });
    });

    console.log('匹配的变体:', matchedVariation);

    const stockContainer = document.getElementById('quickOrderStockContainer');
    const priceContainer = document.getElementById('quickOrderPriceContainer');
    const addBtn = document.getElementById('quickOrderAddBtn');

    if (matchedVariation) {
      // 更新价格
      const price = parseFloat(matchedVariation.price) || 0;
      const regularPrice = parseFloat(matchedVariation.regular_price) || 0;

      let priceHTML = '';
      if (regularPrice > price) {
        priceHTML = '<div class="quick-order-price">';
        priceHTML += `<span class="quick-order-price-current">$${price.toFixed(2)}</span>`;
        priceHTML += `<span class="quick-order-price-regular">$${regularPrice.toFixed(2)}</span>`;
        priceHTML += '</div>';
      } else {
        priceHTML = `<div class="quick-order-price">$${price.toFixed(2)}</div>`;
      }
      priceContainer.innerHTML = priceHTML;

      // 更新库存状态
      const stockStatus = matchedVariation.stock_status;
      const stockQuantity = matchedVariation.stock_quantity;

      let stockHTML = '';
      if (stockStatus === 'outofstock') {
        stockHTML = '<div class="quick-order-stock out-of-stock">';
        stockHTML += '<i class="fa-solid fa-circle-xmark"></i> Out of Stock';
        stockHTML += '</div>';

        // 禁用按钮
        addBtn.classList.add('disabled');
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Out of Stock';
      } else {
        stockHTML = '<div class="quick-order-stock in-stock">';
        stockHTML += '<i class="fa-solid fa-circle-check"></i> In Stock';
        if (stockQuantity) {
          stockHTML += ` (${stockQuantity} available)`;
        }
        stockHTML += '</div>';

        // 启用按钮
        addBtn.classList.remove('disabled');
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add to Cart';
      }
      stockContainer.innerHTML = stockHTML;

    } else {
      // 未完全选择或没有匹配的变体
      stockContainer.innerHTML = '<div class="quick-order-stock-placeholder">Please select all options</div>';
      addBtn.classList.add('disabled');
      addBtn.disabled = true;
      addBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add to Cart';
    }
  }

  // 修改数量
  window.changeQuickOrderQty = function(change) {
    const input = document.getElementById('quickOrderQty');
    let qty = parseInt(input.value) || 1;
    qty = Math.max(1, qty + change);
    input.value = qty;
  };

  // 更改移动端变体数量
  window.changeMobileVariantQty = function(variationId, delta) {
    const input = document.getElementById(`mobileQty_${variationId}`);
    if (!input) return;

    const currentQty = parseInt(input.value) || 0;
    const newQty = Math.max(0, currentQty + delta);

    input.value = newQty;
    window.mobileVariantQuantities[variationId] = newQty;

    // 更新Add to Cart按钮状态
    updateMobileAddButtonState();
  };

  // 更新移动端Add按钮状态
  function updateMobileAddButtonState() {
    const addBtn = document.getElementById('mobileQuickAddBtn');
    if (!addBtn) return;

    const hasItems = Object.values(window.mobileVariantQuantities || {}).some(qty => qty > 0);

    if (hasItems) {
      addBtn.disabled = false;
      const totalQty = Object.values(window.mobileVariantQuantities).reduce((sum, qty) => sum + qty, 0);
      addBtn.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> Add ${totalQty} to Cart`;
    } else {
      addBtn.disabled = true;
      addBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add to Cart';
    }
  }

  // 移动端添加到购物车
  // 移动端添加到购物车
  window.addMobileQuickOrderToCart = function() {
    console.log('移动端添加到购物车');

    try {
      const productData = window.currentProductData || {};
      const variationsData = window.currentProductVariationsData || [];
      const type = window.currentProductType || 'simple';
      const qty = parseInt(document.getElementById('mobileQtyInput')?.value) || 1;

      // 收集选中的属性
      const selectedAttributes = {};
      document.querySelectorAll('.mobile-attribute-options').forEach(optionsGroup => {
        const attrName = optionsGroup.dataset.attribute;
        const selected = optionsGroup.querySelector('.mobile-attribute-option.selected');
        if (attrName && selected) {
          selectedAttributes[attrName] = selected.dataset.value;
        }
      });

      console.log('选中的属性:', selectedAttributes);
      console.log('数量:', qty);

      // 获取现有购物车
      let cart = [];
      try {
        const cartData = localStorage.getItem('ebbelle_cart');
        if (cartData) {
          cart = JSON.parse(cartData);
        }
      } catch (e) {
        console.error('读取购物车失败:', e);
      }

      let cartItem;
      let cartItemId;

      if (type === 'variable' && variationsData.length > 0) {
        // 查找匹配的变体
        const matchedVariation = variationsData.find(variation => {
          return variation.attributes.every(attr => {
            return selectedAttributes[attr.name] === attr.option;
          });
        });

        if (!matchedVariation) {
          console.error('未找到匹配的变体');
          return;
        }

        const variantName = matchedVariation.attributes.map(attr => attr.option).join(', ');
        const variationKey = Object.entries(selectedAttributes)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${String(v).trim().replace(/\s+/g, '_')}`)
          .join('|');
        cartItemId = `${productData.id}_${variationKey}`;

        cartItem = {
          cartItemId: cartItemId,
          id: productData.id,
          name: `${productData.name} - ${variantName}`,
          price: matchedVariation.price,
          quantity: qty,
          image: matchedVariation.image?.src || productData.images?.[0]?.src || '',
          selectedVariants: selectedAttributes,
          variationId: matchedVariation.id
        };
      } else {
        // 简单产品
        cartItemId = `${productData.id}_simple`;
        cartItem = {
          cartItemId: cartItemId,
          id: productData.id,
          name: productData.name,
          price: productData.price,
          quantity: qty,
          image: productData.images?.[0]?.src || '',
          selectedVariants: {},
          variationId: null
        };
      }

      // 检查是否已存在
      const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);

      if (existingIndex > -1) {
        cart[existingIndex].quantity += qty;
      } else {
        cart.push(cartItem);
      }

      // 保存到localStorage
      localStorage.setItem('ebbelle_cart', JSON.stringify(cart));

      // 触发购物车更新事件
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));

      console.log('购物车已更新:', cart);

      // 关闭Quick Order
      closeQuickOrder();

      // 打开购物车drawer
      setTimeout(() => {
        const cartDrawer = document.getElementById('cartDrawer');
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartDrawer && cartOverlay) {
          cartDrawer.classList.add('active');
          cartOverlay.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      }, 300);

    } catch (e) {
      console.error('添加到购物车失败:', e);
    }
  };

  // 添加到购物车
  window.addQuickOrderToCart = async function(productId, productType) {
    const qty = parseInt(document.getElementById('quickOrderQty').value) || 1;

    // 收集选中的变体
    const selectedVariations = {};
    document.querySelectorAll('.quick-order-section').forEach(section => {
      const title = section.querySelector('.quick-order-section-title')?.textContent;
      const selected = section.querySelector('.quick-order-option.selected');
      if (title && selected && title !== 'Quantity') {
        selectedVariations[title] = selected.textContent;
      }
    });

    console.log('添加到购物车:', {
      productId,
      productType,
      quantity: qty,
      variations: selectedVariations
    });

    try {
      // 获取当前产品的完整信息
      const productData = window.currentProductData || {};
      const variationsData = window.currentProductVariationsData || [];

      // 找到匹配的变体（如果是变体产品）
      let selectedVariation = null;
      let price = productData.price || '0';
      let productName = productData.name || '';
      let productImage = productData.images?.[0]?.src || '';

      if (productType === 'variable' && variationsData.length > 0) {
        selectedVariation = variationsData.find(variation => {
          return variation.attributes.every(attr => {
            const attrName = attr.name;
            const attrValue = attr.option;
            return selectedVariations[attrName] === attrValue;
          });
        });

        if (selectedVariation) {
          price = selectedVariation.price;
          if (selectedVariation.image?.src) {
            productImage = selectedVariation.image.src;
          }
        }
      }

      // 获取现有购物车
      let cart = [];
      try {
        const cartData = localStorage.getItem('ebbelle_cart');
        if (cartData) {
          cart = JSON.parse(cartData);
        }
      } catch (e) {
        console.error('读取购物车失败:', e);
      }

      // 生成唯一的cartItemId
      const variationKey = Object.entries(selectedVariations)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      const cartItemId = `${productId}_${variationKey || 'simple'}`;

      // 检查是否已存在相同产品和变体
      const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);

      if (existingIndex > -1) {
        // 已存在，增加数量
        cart[existingIndex].quantity += qty;
      } else {
        // 新增
        const cartItem = {
          cartItemId: cartItemId,
          id: productId,
          name: productName,
          price: price,
          quantity: qty,
          image: productImage,
          selectedVariants: selectedVariations,
          variationId: selectedVariation?.id || null
        };
        cart.push(cartItem);
      }

      // 保存到localStorage
      localStorage.setItem('ebbelle_cart', JSON.stringify(cart));

      // 触发购物车更新事件
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));

      console.log('购物车已更新:', cart);

      // 关闭Quick Order Modal
      closeQuickOrder();

      // 打开购物车drawer
      setTimeout(() => {
        const cartDrawer = document.getElementById('cartDrawer');
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartDrawer && cartOverlay) {
          cartDrawer.classList.add('active');
          cartOverlay.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      }, 300);

    } catch (e) {
      console.error('添加到购物车失败:', e);
    }
  };

  // 绑定事件
  if (quickOrderClose) {
    quickOrderClose.addEventListener('click', closeQuickOrder);
  }

  if (quickOrderOverlay) {
    quickOrderOverlay.addEventListener('click', closeQuickOrder);
  }

  if (quickOrderMobileClose) {
    quickOrderMobileClose.addEventListener('click', closeQuickOrder);
  }

  if (quickOrderMobileOverlay) {
    quickOrderMobileOverlay.addEventListener('click', closeQuickOrder);
  }

  // 标记已初始化
  window.shopQuickOrderInitialized = true;
  console.log("Shop Quick Order initialized successfully");
})();
