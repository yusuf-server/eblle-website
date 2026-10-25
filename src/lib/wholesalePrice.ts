/**
 * 批发价格计算工具
 * 价格阶梯：
 * - 1-9 件：原价 (100%)
 * - 10-49 件：3% 折扣 (97%)
 * - 50-99 件：6% 折扣 (94%)
 * - 100+ 件：10% 折扣 (90%)
 */

export interface PriceTier {
  minQty: number;
  maxQty: number | null;
  discount: number; // 折扣百分比 (0-100)
  multiplier: number; // 价格乘数
  label: string;
}

export const PRICE_TIERS: PriceTier[] = [
  { minQty: 1, maxQty: 9, discount: 0, multiplier: 1.00, label: '1-9 pcs' },
  { minQty: 10, maxQty: 49, discount: 3, multiplier: 0.97, label: '10-49 pcs' },
  { minQty: 50, maxQty: 99, discount: 6, multiplier: 0.94, label: '50-99 pcs' },
  { minQty: 100, maxQty: null, discount: 10, multiplier: 0.90, label: '100+ pcs' },
];

/**
 * 根据数量获取价格阶梯
 */
export function getPriceTier(quantity: number): PriceTier {
  for (const tier of PRICE_TIERS) {
    if (quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)) {
      return tier;
    }
  }
  return PRICE_TIERS[0]; // 默认返回第一档
}

/**
 * 计算批发价格
 * @param basePrice 基础价格（原价）
 * @param quantity 购买数量
 * @returns 批发价格
 */
export function calculateWholesalePrice(basePrice: number, quantity: number): number {
  const tier = getPriceTier(quantity);
  return basePrice * tier.multiplier;
}

/**
 * 格式化价格显示（带货币符号）
 * @param price 价格
 * @param currency 货币代码（USD, EUR, GBP 等）
 * @param locale 语言代码（en, fr, de, es）
 * @returns 格式化的价格字符串
 */
export function formatPrice(price: number, currency: string = 'USD', locale: string = 'en'): string {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'CA$',
    'AUD': 'A$',
    'JPY': '¥',
  };

  const symbol = currencySymbols[currency] || currency;
  const formattedPrice = price.toFixed(2);

  // 某些货币符号在前，某些在后
  if (currency === 'EUR') {
    return `${formattedPrice}${symbol}`;
  }

  return `${symbol}${formattedPrice}`;
}

/**
 * 获取所有价格阶梯的显示信息
 * @param basePrice 基础价格
 * @param currency 货币代码
 * @param locale 语言代码
 * @returns 价格阶梯数组（用于显示）
 */
export function getWholesalePriceTiers(
  basePrice: number,
  currency: string = 'USD',
  locale: string = 'en'
): Array<{
  range: string;
  price: string;
  discount: string;
  savings: string;
}> {
  return PRICE_TIERS.map(tier => {
    const tierPrice = basePrice * tier.multiplier;
    const savings = basePrice - tierPrice;

    return {
      range: tier.label,
      price: formatPrice(tierPrice, currency, locale),
      discount: tier.discount > 0 ? `${tier.discount}% OFF` : 'Regular',
      savings: savings > 0 ? formatPrice(savings, currency, locale) : '-',
    };
  });
}
