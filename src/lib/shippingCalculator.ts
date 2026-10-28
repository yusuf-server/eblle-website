// 运费计算工具函数
// 基于文档：国际运费计算规则与附加费配置表

/**
 * 计算基础运费
 * @param totalWeight 订单商品总重量（kg）
 * @returns 基础运费（USD）
 */
export function calculateBaseShipping(totalWeight: number): number {
  const weight = Math.max(0.03, totalWeight); // 最小重量 0.03kg
  const baseShipping = (161 * weight + 27) / 6.3 / 0.95;
  return parseFloat(baseShipping.toFixed(2));
}

/**
 * 国家附加费配置
 */
const COUNTRY_SURCHARGES: Record<string, number> = {
  // 特殊国家订单附加费
  'Argentina': 6,
  'Australia': 5,
  'Bahrain': 5,
  'Indonesia': 4,
  'Jordan': 2,
  'Kuwait': 5,
  'Mayotte': 35,
  'Morocco': 3,
  'Qatar': 3,
  'Saudi Arabia': 3,
  'Senegal': 20,
  'Seychelles': 35,
  'Zambia': 3,

  // 偏远地区附加费 +$30
  'Albania': 30,
  'Algeria': 30,
  'Andorra': 30,
  'Belarus': 30,
  'Benin': 30,
  'Bulgaria': 30,
  'Cape Verde': 30,
  'Chad': 30,
  'Croatia': 30,
  'Cyprus': 30,
  'Czech Republic': 30,
  'Côte d\'Ivoire': 30,
  'Democratic Republic of the Congo': 30,
  'Egypt': 30,
  'Eswatini': 30,
  'Faroe Islands': 30,
  'Gambia': 30,
  'Georgia': 30,
  'Ghana': 30,
  'Greece': 30,
  'Iceland': 30,
  'Iraq': 30,
  'Kenya': 30,
  'Laos': 30,
  'Lebanon': 30,
  'Lesotho': 30,
  'Liberia': 30,
  'Libya': 30,
  'Liechtenstein': 30,
  'Madagascar': 30,
  'Malawi': 30,
  'Maldives': 30,
  'Mali': 30,
  'Mauritania': 30,
  'Mauritius': 30,
  'Micronesia': 30,
  'Moldova': 30,
  'Mozambique': 30,
  'Namibia': 30,
  'Nepal': 30,
  'Niger': 30,
  'Nigeria': 30,
  'North Macedonia': 30,
  'Rwanda': 30,
  'Syria': 30,
  'Tanzania': 30,
  'Tunisia': 30,
  'Turkey': 30,
  'Uganda': 30,

  // 偏远/特殊区域附加费 +$43
  'American Samoa': 43,
  'Angola': 43,
  'Armenia': 43,
  'Bangladesh': 43,
  'Barbados': 43,
  'Bolivia': 43,
  'Collectivity of Saint Martin': 43,
  'Costa Rica': 43,
  'Ecuador': 43,
  'El Salvador': 43,
  'Fiji': 43,
  'French Guiana': 43,
  'French Polynesia': 43,
  'Grenada': 43,
  'Guadeloupe': 43,
  'Guatemala': 43,
  'Honduras': 43,
  'Marshall Islands': 43,
  'Martinique': 43,
  'New Caledonia': 43,
  'Nicaragua': 43,
  'Palau': 43,
  'Panama': 43,
  'Papua New Guinea': 43,
  'Paraguay': 43,
  'Peru': 43,
  'Sint Maarten': 43,
  'Suriname': 43,
  'Trinidad and Tobago': 43,
  'Uruguay': 43,
  'Venezuela': 43,
  'Western Samoa': 43,
};

/**
 * 获取国家附加费
 * @param country 国家名称
 * @returns 附加费（USD）
 */
export function getCountrySurcharge(country: string): number {
  return COUNTRY_SURCHARGES[country] || 0;
}

/**
 * 计算总运费（基础运费 + 国家附加费）
 * @param totalWeight 订单商品总重量（kg）
 * @param country 国家名称
 * @returns 总运费（USD）
 */
export function calculateTotalShipping(totalWeight: number, country: string): number {
  const baseShipping = calculateBaseShipping(totalWeight);
  const surcharge = getCountrySurcharge(country);
  return parseFloat((baseShipping + surcharge).toFixed(2));
}

/**
 * 获取运费详情
 * @param totalWeight 订单商品总重量（kg）
 * @param country 国家名称
 * @returns 运费详情对象
 */
export function getShippingDetails(totalWeight: number, country: string) {
  const baseShipping = calculateBaseShipping(totalWeight);
  const surcharge = getCountrySurcharge(country);
  const totalShipping = baseShipping + surcharge;

  return {
    totalWeight: parseFloat(totalWeight.toFixed(3)),
    baseShipping: parseFloat(baseShipping.toFixed(2)),
    surcharge: parseFloat(surcharge.toFixed(2)),
    totalShipping: parseFloat(totalShipping.toFixed(2)),
    hasSurcharge: surcharge > 0
  };
}
