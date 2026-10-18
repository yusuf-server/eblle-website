/**
 * 货币工具函数
 * 处理多货币切换、符号显示和汇率转换
 */

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD';

export interface CurrencyInfo {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  rate: number; // 相对于 USD 的汇率
}

// 货币配置
export const CURRENCIES: Record<SupportedCurrency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rate: 1.0
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rate: 0.92 // 1 USD = 0.92 EUR (示例汇率，实际应该从API获取)
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rate: 0.79 // 1 USD = 0.79 GBP
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    rate: 1.36 // 1 USD = 1.36 CAD
  }
};

/**
 * 获取当前选中的货币
 */
export function getCurrentCurrency(): SupportedCurrency {
  if (typeof window === 'undefined') return 'USD';

  const saved = localStorage.getItem('ebbelle_currency');
  if (saved && saved in CURRENCIES) {
    return saved as SupportedCurrency;
  }
  return 'USD';
}

/**
 * 获取货币符号
 */
export function getCurrencySymbol(currency?: SupportedCurrency): string {
  const curr = currency || getCurrentCurrency();
  return CURRENCIES[curr]?.symbol || '$';
}

/**
 * 转换价格到目标货币
 */
export function convertPrice(priceUSD: number, targetCurrency?: SupportedCurrency): number {
  const currency = targetCurrency || getCurrentCurrency();
  const rate = CURRENCIES[currency]?.rate || 1.0;
  return priceUSD * rate;
}

/**
 * 格式化价格显示
 */
export function formatPrice(priceUSD: number, targetCurrency?: SupportedCurrency): string {
  const currency = targetCurrency || getCurrentCurrency();
  const converted = convertPrice(priceUSD, currency);
  const symbol = getCurrencySymbol(currency);

  // 格式化为两位小数
  const formatted = converted.toFixed(2);

  // EUR 符号通常放在后面
  if (currency === 'EUR') {
    return `${formatted}${symbol}`;
  }

  return `${symbol}${formatted}`;
}

/**
 * 监听货币切换事件
 */
export function onCurrencyChange(callback: (currency: SupportedCurrency) => void) {
  if (typeof window === 'undefined') return;

  window.addEventListener('currencyChanged', ((event: CustomEvent) => {
    callback(event.detail.currency);
  }) as EventListener);
}

/**
 * 派发货币切换事件（用于手动触发）
 */
export function dispatchCurrencyChange(currency: SupportedCurrency) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('ebbelle_currency', currency);
  window.dispatchEvent(new CustomEvent('currencyChanged', {
    detail: { currency }
  }));
}
